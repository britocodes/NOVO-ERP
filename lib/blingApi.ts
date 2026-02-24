
// lib/blingApi.ts
import { OrderItem, BlingInvoice, BlingProduct } from '../types';
import { getMultiplicadorFromSku, classificarCor } from './sku';

// Status do Pedido no Bling v3 (IDs):
// 6 = Em aberto, 9 = Atendido, 15 = Em andamento, 12 = Cancelado
const BLING_V3_STATUS_MAP: { [key: string]: number } = {
    'EM ABERTO': 6,
    'EM ANDAMENTO': 15,
    'ATENDIDO': 9,
    'TODOS': 0,
};

// Situação da Nota Fiscal no Bling v3 (IDs):
// 1 = Pendente, 6 = Emitida
const BLING_V3_INVOICE_STATUS_MAP: { [key: string]: number } = {
    'PENDENTES': 1,
    'EMITIDAS': 6,
};

// Use local proxy via Vite
const PROXY_URL = '/api/bling'; 

function cleanMoney(value: string | number): number {
    if (typeof value === 'number') return value;
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : num;
}

function formatDateFromBling(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    return dateStr.split(' ')[0];
}

function handleBlingError(data: any, defaultMessage: string): void {
    if (data.error && typeof data.error === 'string') {
         throw new Error(`Bling API: ${data.error} ${data.error_description ? `(${data.error_description})` : ''}`);
    }
    if (data.error) {
        const msg = data.error.description || data.error.message || JSON.stringify(data.error);
        throw new Error(`Bling API Error: ${msg}`);
    }
    if (data.type === 'error') {
         throw new Error(`Bling API Error: ${data.message} (${data.description})`);
    }
}

// Helper for V3 fetch with Auth header
async function fetchV3(endpoint: string, apiKey: string, params: Record<string, string> = {}) {
    let cleanKey = apiKey ? apiKey.trim() : '';
    if (!cleanKey.toLowerCase().startsWith('bearer ')) {
        cleanKey = `Bearer ${cleanKey}`;
    }

    const url = new URL(`${window.location.origin}${PROXY_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': cleanKey,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch {
            throw new Error(`Erro na requisição Bling v3 (${response.status}): ${text}`);
        }
        
        // Verifica erro de token expirado
        if (json.error === "The access token provided is invalid" || json.error === "invalid_token" || response.status === 401) {
             throw new Error("TOKEN_EXPIRED"); // Erro especial para o frontend capturar
        }

        handleBlingError(json, `Erro ${response.status}`);
        return json;
    }

    return response.json();
}

/**
 * Troca o código de autorização pelo Access Token e Refresh Token.
 * OBRIGATÓRIO: redirect_uri deve ser idêntico ao usado na autorização.
 */
export async function executeBlingTokenExchange(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<any> {
    // Call our custom server endpoint which handles the form-urlencoded conversion and auth headers
    const response = await fetch('/api/bling/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code: code.trim(),
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri
        })
    });

    if (!response.ok) {
        const text = await response.text();
        let json;
        try { json = JSON.parse(text); } catch { throw new Error(`Erro ao trocar token: ${text}`); }
        handleBlingError(json, 'Falha na autenticação OAuth');
        return json;
    }

    return response.json();
}

/**
 * Renova o Access Token usando o Refresh Token.
 */
export async function executeTokenRefresh(refreshToken: string, clientId: string, clientSecret: string): Promise<any> {
    const response = await fetch('/api/bling/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro ao renovar token: ${text}`);
    }

    return response.json();
}


export async function fetchBlingOrders(
    apiKey: string, 
    filters: { startDate: string, endDate: string, status: 'EM ABERTO' | 'EM ANDAMENTO' | 'ATENDIDO' | 'TODOS' }
): Promise<OrderItem[]> {
    const idSituacao = BLING_V3_STATUS_MAP[filters.status];
    
    const params: any = {
        dataInicial: filters.startDate,
        dataFinal: filters.endDate,
        limit: '100',
    };

    if (idSituacao > 0) {
        params.idsSituacoes = [idSituacao];
    }

    const data = await fetchV3('/pedidos/vendas', apiKey, params);

    if (!data.data) return [];

    const allOrders: OrderItem[] = [];
    
    for (const blingOrder of data.data) {
        const externalId = blingOrder.numeroLoja ? String(blingOrder.numeroLoja).trim() : '';
        const internalId = String(blingOrder.numero);
        const orderId = externalId || internalId;

        if (!blingOrder.itens || blingOrder.itens.length === 0) continue;

        for (const item of blingOrder.itens) {
            const sku = String(item.codigo || '');
            allOrders.push({
                id: `${blingOrder.id}_${sku}`,
                orderId: orderId,
                blingId: String(blingOrder.id),
                tracking: blingOrder.transporte?.codigoRastreamento || '',
                sku,
                qty_original: cleanMoney(item.quantidade),
                multiplicador: getMultiplicadorFromSku(sku),
                qty_final: Math.round(cleanMoney(item.quantidade) * getMultiplicadorFromSku(sku)),
                color: classificarCor(item.descricao || ''),
                canal: 'SITE',
                data: formatDateFromBling(blingOrder.data),
                status: 'NORMAL',
                customer_name: blingOrder.contato?.nome || 'Não informado',
                customer_cpf_cnpj: blingOrder.contato?.numeroDocumento || '',
                price_gross: cleanMoney(item.valor),
                price_total: cleanMoney(blingOrder.total),
                platform_fees: 0,
                shipping_fee: cleanMoney(blingOrder.transporte?.frete || 0),
                shipping_paid_by_customer: cleanMoney(blingOrder.transporte?.frete || 0),
                price_net: cleanMoney(item.valor),
            });
        }
    }
    return allOrders;
}

export async function fetchBlingInvoices(
    apiKey: string,
    filters: { startDate: string, endDate: string, status: 'PENDENTES' | 'EMITIDAS' }
): Promise<BlingInvoice[]> {
    const idSituacao = BLING_V3_INVOICE_STATUS_MAP[filters.status];
    
    const params: any = {
        dataEmissaoInicial: `${filters.startDate} 00:00:00`,
        dataEmissaoFinal: `${filters.endDate} 23:59:59`,
        tipo: 1, 
        limit: '100'
    };

    if (idSituacao) {
        params.situacao = idSituacao;
    }

    const data = await fetchV3('/nfe', apiKey, params);
    
    if (!data.data) return [];

    return data.data.map((nf: any): BlingInvoice => {
        return {
            id: String(nf.id),
            numero: String(nf.numero),
            serie: String(nf.serie),
            dataEmissao: formatDateFromBling(nf.dataEmissao),
            nomeCliente: nf.contato?.nome || 'Consumidor',
            valorNota: cleanMoney(nf.valorNota),
            situacao: String(nf.situacao),
            idPedidoVenda: '', 
            linkDanfe: nf.linkDanfe || nf.xml
        };
    });
}

export async function fetchEtiquetaZplForPedido(apiKey: string, idPedidoVenda: string): Promise<string> {
    throw new Error("A geração direta de ZPL pela API v3 requer configuração de integração logística específica. Por favor, utilize o painel do Bling para imprimir ou importe o arquivo de etiquetas.");
}

export async function fetchBlingProducts(apiKey: string): Promise<BlingProduct[]> {
    const params = {
        limit: '100',
        criterio: '1', 
        tipo: 'P'
    };

    const data = await fetchV3('/produtos', apiKey, params);

    if (!data.data) return [];

    return data.data.map((prod: any): BlingProduct => {
        return {
            id: String(prod.id),
            codigo: prod.codigo,
            descricao: prod.nome,
            preco: cleanMoney(prod.preco),
            estoqueAtual: cleanMoney(prod.estoque?.saldoVirtual || 0),
        };
    });
}
