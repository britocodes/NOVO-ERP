
// lib/parser.ts
import { OrderItem, ProcessedData, Canal, ResumidaItem, GeneralSettings, ColumnMapping } from '../types';
import { getMultiplicadorFromSku, classificarCor } from './sku';
import * as XLSX from 'xlsx';

const safeUpper = (val: any) => String(val || '').trim().toUpperCase();

// Helper para normalizar datas
const normalizeDate = (rawDate: any): string => {
    if (!rawDate) return '';
    
    if (rawDate instanceof Date) {
        const userTimezoneOffset = rawDate.getTimezoneOffset() * 60000;
        const dateAdjusted = new Date(rawDate.getTime() - userTimezoneOffset); 
        const year = dateAdjusted.getFullYear();
        const month = String(dateAdjusted.getMonth() + 1).padStart(2, '0');
        const day = String(dateAdjusted.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    let dateStr = String(rawDate).trim();
    // Remove hora se houver
    if (dateStr.includes(' ')) {
        dateStr = dateStr.split(' ')[0];
    }
    
    // Formatos DD/MM/YYYY ou DD-MM-YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    
    // Formatos YYYY-MM-DD
    const ymdMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
    }
    
    // Tenta parse nativo
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    
    return '';
};

// Nova função para extrair apenas as datas de envio disponíveis antes do processamento total
export const extractShippingDates = (
    fileBuffer: ArrayBuffer,
    settings: GeneralSettings,
    forcedCanal?: Canal | 'AUTO'
): { date: string; count: number }[] => {
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    // Reutiliza a lógica de detecção de cabeçalho
    let headerRowIndex = -1;
    let mappingToUse: ColumnMapping | null = null;
    let detectedChannel: Canal | null = null;

    let candidateChannels: Canal[] = [];
    if (forcedCanal && forcedCanal !== 'AUTO') {
        candidateChannels = [forcedCanal];
    } else {
        candidateChannels = ['ML', 'SHOPEE', 'SITE'];
    }

    let bestMatch = { rowIndex: -1, channel: null as Canal | null, score: 0 };

    for (let i = 0; i < Math.min(rawData.length, 50); i++) {
        const row = rawData[i];
        if (!Array.isArray(row) || row.length === 0) continue;
        const rowValues = row.map(cell => String(cell || '').trim().toUpperCase());

        for (const canal of candidateChannels) {
            const config = settings.importer[canal.toLowerCase() as 'ml' | 'shopee' | 'site'];
            if (!config) continue;
            // Procura por colunas críticas
            const criticalColumns = [config.orderId, config.sku].filter(Boolean).map(h => h!.trim().toUpperCase());
            if (criticalColumns.length === 0) continue;

            let matchCount = 0;
            for (const header of criticalColumns) {
                if (rowValues.includes(header)) matchCount++;
            }
            if (matchCount > bestMatch.score) {
                bestMatch = { rowIndex: i, channel: canal, score: matchCount };
            }
        }
    }

    if (bestMatch.rowIndex !== -1) {
        headerRowIndex = bestMatch.rowIndex;
        detectedChannel = bestMatch.channel;
    } else if (forcedCanal && forcedCanal !== 'AUTO') {
        // Fallback: se forçado e não achou, assume linha 0
        headerRowIndex = 0;
        detectedChannel = forcedCanal;
    }

    if (headerRowIndex === -1 || !detectedChannel) return [];

    // OBTEM A CONFIGURAÇÃO ESPECÍFICA DO CANAL
    mappingToUse = settings.importer[detectedChannel.toLowerCase() as 'ml' | 'shopee' | 'site'];
    
    // Se não tiver coluna de data de envio configurada, tenta usar data de venda ou retorna vazio
    // Prioriza dateShipping (ex: Coluna H da Shopee)
    const dateCol = mappingToUse.dateShipping || mappingToUse.date;
    if (!dateCol) return [];

    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { range: headerRowIndex, raw: false });
    const dateMap = new Map<string, number>();

    jsonData.forEach(row => {
        const dateVal = normalizeDate(row[dateCol]); // Usa a chave 'dateCol' para acessar a propriedade
        if (dateVal) {
            dateMap.set(dateVal, (dateMap.get(dateVal) || 0) + 1);
        }
    });

    return Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
};


export const parseExcelFile = (
    fileBuffer: ArrayBuffer, 
    fileName: string, 
    allExistingOrders: OrderItem[], 
    settings: GeneralSettings, 
    options: { 
        importCpf: boolean; 
        importName: boolean;
        allowedShippingDates?: string[]; // Array of YYYY-MM-DD strings
    },
    forcedCanal?: Canal | 'AUTO' 
): ProcessedData => {
    // 1. Ler o arquivo bruto
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 2. Converter para Array de Arrays para "escanear" o cabeçalho
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    let canalDetectado: Canal | null = null;
    let headerRowIndex = -1;
    let mappingToUse: ColumnMapping | null = null;

    // Definição dos canais a testar
    let candidateChannels: Canal[] = [];
    if (forcedCanal && forcedCanal !== 'AUTO') {
        candidateChannels = [forcedCanal];
    } else {
        candidateChannels = ['ML', 'SHOPEE', 'SITE'];
    }

    // 3. Lógica de Pontuação para Detecção do Cabeçalho
    let bestMatch = { rowIndex: -1, channel: null as Canal | null, score: 0 };

    for (let i = 0; i < Math.min(rawData.length, 50); i++) {
        const row = rawData[i];
        if (!Array.isArray(row) || row.length === 0) continue;
        const rowValues = row.map(cell => String(cell || '').trim().toUpperCase());

        for (const canal of candidateChannels) {
            const configKey = canal.toLowerCase() as 'ml' | 'shopee' | 'site';
            const config = settings.importer[configKey];
            if (!config) continue;

            const criticalColumns = [config.orderId, config.sku, config.qty, config.tracking].filter(Boolean).map(h => h!.trim().toUpperCase());
            if (criticalColumns.length === 0) continue;

            let matchCount = 0;
            for (const header of criticalColumns) {
                if (rowValues.includes(header)) matchCount++;
            }

            if (matchCount > bestMatch.score) {
                bestMatch = { rowIndex: i, channel: canal, score: matchCount };
            }
        }
    }

    // 4. Validação e Seleção
    if (bestMatch.rowIndex !== -1 && bestMatch.score >= 1) {
        headerRowIndex = bestMatch.rowIndex;
        canalDetectado = bestMatch.channel;
        if (canalDetectado) {
            mappingToUse = settings.importer[canalDetectado.toLowerCase() as 'ml'|'shopee'|'site'];
        }
    }

    // Fallback
    if (!mappingToUse || headerRowIndex === -1) {
        if (forcedCanal && forcedCanal !== 'AUTO') {
            canalDetectado = forcedCanal;
            mappingToUse = settings.importer[forcedCanal.toLowerCase() as 'ml'|'shopee'|'site'];
            const isML = forcedCanal === 'ML';
            headerRowIndex = (isML && rawData.length > 5 && Array.isArray(rawData[5])) ? 5 : 0;
        } else {
             throw new Error(`Não foi possível detectar o formato da planilha automaticamente.`);
        }
    }

    // 5. Re-ler a planilha
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { range: headerRowIndex, raw: false });

    if (jsonData.length === 0) throw new Error('A planilha parece estar vazia após o cabeçalho detectado.');

    const cleanMoney = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        let str = String(val).trim().replace(/[R$\s\u00A0]/g, '');
        const hasComma = str.includes(',');
        const hasDot = str.includes('.');
        if (hasComma && hasDot) {
            if (str.indexOf('.') < str.indexOf(',')) { str = str.replace(/\./g, '').replace(',', '.'); } 
            else { str = str.replace(/,/g, ''); }
        } else if (hasComma) { str = str.replace(',', '.'); }
        str = str.replace(/[^0-9.-]/g, '');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    };

    // --- Processamento das Linhas ---
    const existingKeys = new Set(allExistingOrders.map(o => `${safeUpper(o.orderId)}|${safeUpper(o.sku)}`));
    let orders: OrderItem[] = [];

    const statusColumnName = mappingToUse!.statusColumn;
    const acceptedStatusValues = (mappingToUse!.acceptedStatusValues || []).map(v => v.trim().toLowerCase());
    
    // Set for O(1) lookup
    const allowedDatesSet = options.allowedShippingDates ? new Set(options.allowedShippingDates) : null;

    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // --- FILTRO DE DATA ---
        const dataEnvioStr = normalizeDate(row[mappingToUse!.dateShipping]);
        const dataVendaStr = normalizeDate(row[mappingToUse!.date]);
        
        // Data principal para filtro é a de envio, fallback para venda se não houver envio
        const dateToCheck = dataEnvioStr || dataVendaStr;

        if (allowedDatesSet && allowedDatesSet.size > 0) {
            // Se a lista de permitidas não for vazia, e a data da linha não estiver nela, pula
            if (!dateToCheck || !allowedDatesSet.has(dateToCheck)) {
                continue;
            }
        }

        // --- Filtro de Status ---
        let statusParaImportacao: 'NORMAL' | 'ERRO' = 'NORMAL';
        let errorReason = undefined;

        if (statusColumnName && acceptedStatusValues.length > 0) {
            const rawStatus = String(row[statusColumnName] || '').trim().toLowerCase();
            const isAccepted = acceptedStatusValues.includes(rawStatus);
            if (!isAccepted) {
                statusParaImportacao = 'ERRO';
                errorReason = `Status inválido: ${row[statusColumnName]}`;
            }
        }

        const orderId = safeUpper(row[mappingToUse!.orderId]);
        const sku = safeUpper(row[mappingToUse!.sku]);
        
        if (!orderId || !sku) continue;

        const qty_raw = Number(row[mappingToUse!.qty] || 0);
        if (qty_raw <= 0) continue;

        // --- Valores Financeiros ---
        let rawTotalValue = mappingToUse!.totalValue ? cleanMoney(row[mappingToUse!.totalValue]) : 0;
        let rawPriceColumn = mappingToUse!.priceGross ? cleanMoney(row[mappingToUse!.priceGross]) : 0;

        if (rawTotalValue === 0 && rawPriceColumn > 0) rawTotalValue = rawPriceColumn;
        else if (rawTotalValue > 0 && rawPriceColumn === 0) rawPriceColumn = rawTotalValue;

        const customerShipping = mappingToUse!.shippingPaidByCustomer ? Math.abs(cleanMoney(row[mappingToUse!.shippingPaidByCustomer])) : 0;
        const sellerShipping = mappingToUse!.shippingFee ? Math.abs(cleanMoney(row[mappingToUse!.shippingFee])) : 0;
        
        const fees = (mappingToUse!.fees || []).reduce((sum, f) => {
            const val = Math.abs(cleanMoney(row[f]));
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        let calculatedTotal = 0;
        let calculatedProduct = 0;

        if (rawTotalValue > 0) {
            calculatedTotal = rawTotalValue;
            calculatedProduct = Math.max(0, calculatedTotal - customerShipping);
        } else {
            calculatedProduct = rawPriceColumn;
            calculatedTotal = calculatedProduct + customerShipping;
        }

        const calculatedNet = calculatedProduct - fees - sellerShipping;
        const mult = getMultiplicadorFromSku(sku);
        
        orders.push({
            id: `${canalDetectado}_${Date.now()}_${i}`,
            orderId,
            tracking: safeUpper(row[mappingToUse!.tracking]),
            sku,
            qty_original: qty_raw,
            multiplicador: mult,
            qty_final: Math.round(qty_raw * mult),
            color: classificarCor(sku),
            canal: canalDetectado!,
            data: dataVendaStr, 
            data_prevista_envio: dataEnvioStr || undefined,
            status: statusParaImportacao,
            error_reason: errorReason,
            customer_name: options.importName ? String(row[mappingToUse!.customerName] || '') : undefined,
            customer_cpf_cnpj: options.importCpf ? String(row[mappingToUse!.customerCpf] || '') : undefined,
            
            price_total: calculatedTotal,
            price_gross: calculatedProduct,
            price_net: calculatedNet,
            
            platform_fees: fees,
            shipping_fee: sellerShipping,
            shipping_paid_by_customer: customerShipping,
        });
    }

    if (orders.length === 0) throw new Error('Nenhum pedido importado. Verifique se as datas selecionadas contêm pedidos ou se o mapeamento está correto.');

    const jaSalvos = orders.filter(o => existingKeys.has(`${safeUpper(o.orderId)}|${safeUpper(o.sku)}`)).length;

    return {
        importId: `imp_${Date.now()}`,
        canal: canalDetectado!,
        lists: { completa: orders, resumida: [], totaisPorCor: [] },
        skusNaoVinculados: Array.from(new Set(orders.map(o => o.sku))).map(sku => ({ sku, colorSugerida: classificarCor(sku) })),
        idempotencia: { lancaveis: orders.length, jaSalvos },
        summary: {
            totalPedidos: new Set(orders.map(o => o.orderId)).size,
            totalPacotes: orders.length,
            totalUnidades: orders.reduce((s, o) => s + o.qty_final, 0),
            totalUnidadesBranca: 0, totalUnidadesPreta: 0, totalUnidadesEspecial: 0, totalMiudos: 0
        }
    };
};
