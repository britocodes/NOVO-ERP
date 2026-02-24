
// lib/xmlParser.ts
import { ParsedNfeItem, OrderItem } from '../types';
import { getMultiplicadorFromSku, classificarCor } from './sku';
import JSZip from 'jszip';

function mapUnit(xmlUnit: string): 'kg' | 'un' | 'm' | 'L' {
    const u = xmlUnit.toUpperCase();
    if (u.includes('KG')) return 'kg';
    if (u.includes('M')) return 'm';
    if (u.includes('L')) return 'L';
    return 'un';
}

// Helper para pegar valor de tag independente de namespace
const getTagValue = (parent: Element | Document, tagName: string): string => {
    const collections = parent.getElementsByTagName(tagName);
    if (collections.length > 0) {
        return collections[0].textContent || '';
    }
    // Tenta encontrar com namespaces comuns se falhar
    const withNs = parent.getElementsByTagName("nfe:" + tagName);
    if (withNs.length > 0) return withNs[0].textContent || '';
    return '';
};

export const parseNFeXML = (xmlString: string): Promise<ParsedNfeItem[]> => {
    return new Promise((resolve, reject) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");

            const parserError = xmlDoc.querySelector("parsererror");
            if (parserError) {
                reject(new Error("Arquivo XML malformatado."));
                return;
            }

            // Busca det -> prod (tenta com e sem namespace)
            let productNodes = Array.from(xmlDoc.getElementsByTagName("prod"));
            
            if (productNodes.length === 0) {
                reject(new Error("Nenhum produto (<prod>) encontrado na NFe."));
                return;
            }

            const items: ParsedNfeItem[] = [];
            productNodes.forEach(prod => {
                const code = getTagValue(prod, "cProd");
                const name = getTagValue(prod, "xProd");
                const quantity = getTagValue(prod, "qCom");
                const unit = getTagValue(prod, "uCom");

                if (code && name && quantity && unit) {
                    items.push({
                        code: code,
                        name: name,
                        quantity: parseFloat(quantity),
                        unit: mapUnit(unit)
                    });
                }
            });

            resolve(items);
        } catch (error) {
            reject(new Error("Erro inesperado ao processar o arquivo XML."));
        }
    });
};

export const extractXmlsFromZip = async (zipFile: File): Promise<{ content: string; fileName: string }[]> => {
    try {
        const zip = new JSZip();
        const result = await zip.loadAsync(zipFile);
        const xmls: { content: string; fileName: string }[] = [];

        // Itera sobre todos os arquivos dentro do zip
        const fileNames = Object.keys(result.files);
        
        for (const filename of fileNames) {
            // Verifica se é um arquivo XML e não uma pasta
            if (filename.toLowerCase().endsWith('.xml') && !result.files[filename].dir) {
                const content = await result.files[filename].async('string');
                xmls.push({ content, fileName: filename });
            }
        }
        return xmls;
    } catch (e) {
        console.error("Erro ao descompactar ZIP", e);
        throw new Error("Falha ao ler arquivo ZIP. Verifique se o arquivo está corrompido.");
    }
};

export const parseSalesNFeXML = (xmlString: string, fileName: string): Promise<OrderItem[]> => {
    return new Promise((resolve, reject) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");

            const parserError = xmlDoc.querySelector("parsererror");
            if (parserError) {
                // Silently fail or log, but for bulk import maybe just return empty or error
                console.warn(`Erro parse XML ${fileName}`);
                resolve([]); 
                return;
            }

            // 1. Dados do Cabeçalho (Pedido)
            const nNF = getTagValue(xmlDoc, "nNF"); // Número da Nota (Usar como Order ID)
            const dhEmi = getTagValue(xmlDoc, "dhEmi") || getTagValue(xmlDoc, "dEmi"); // Data Emissão
            
            // Cliente
            const destNode = xmlDoc.getElementsByTagName("dest")[0];
            const xNome = destNode ? getTagValue(destNode, "xNome") : "Cliente não identificado";
            const cpf = destNode ? (getTagValue(destNode, "CPF") || getTagValue(destNode, "CNPJ")) : "";

            if (!nNF) {
                resolve([]);
                return;
            }

            const orderId = nNF;
            const dateStr = dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0];

            // 2. Itens do Pedido
            const detNodes = Array.from(xmlDoc.getElementsByTagName("det"));
            const orders: OrderItem[] = [];

            detNodes.forEach((det, index) => {
                const prod = det.getElementsByTagName("prod")[0];
                if (!prod) return;

                const sku = getTagValue(prod, "cProd");
                const qCom = parseFloat(getTagValue(prod, "qCom") || "0");
                const vProd = parseFloat(getTagValue(prod, "vProd") || "0"); // Valor do Produto
                
                // Tentar extrair frete do item se houver rateio, ou deixar 0
                const vFrete = parseFloat(getTagValue(det, "vFrete") || "0");

                const multiplicador = getMultiplicadorFromSku(sku); // Tenta inferir multiplicador do nome/sku se possível, ou padrao
                const qtyFinal = Math.round(qCom * multiplicador);

                orders.push({
                    id: `XML_${nNF}_${index}_${Date.now()}`,
                    orderId: orderId,
                    tracking: '', // XML de NFe geralmente não tem rastreio da transportadora fácil
                    sku: sku,
                    qty_original: qCom,
                    multiplicador: multiplicador,
                    qty_final: qtyFinal,
                    color: classificarCor(getTagValue(prod, "xProd") || sku), // Classifica cor pelo nome do produto
                    canal: 'SITE', // Assumimos SITE para importação manual de XML, ou poderia ser uma opção
                    data: dateStr,
                    status: 'BIPADO', // Venda importada de XML geralmente já foi faturada/processada
                    customer_name: xNome,
                    customer_cpf_cnpj: cpf,
                    price_gross: vProd,
                    price_total: vProd + vFrete, // Aproximação
                    platform_fees: 0, // XML não tem taxa de marketplace
                    shipping_fee: 0, // Custo interno desconhecido no XML
                    shipping_paid_by_customer: vFrete,
                    price_net: vProd, // Valor líquido do produto
                });
            });

            resolve(orders);

        } catch (error) {
            console.error(error);
            resolve([]); // Retorna vazio em caso de erro para não travar o lote
        }
    });
};
