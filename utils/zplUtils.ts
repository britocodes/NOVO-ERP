import { ZplSettings, ExtractedZplData, OrderItem } from '../types';
import { extractFields } from '../services/zplService';
import { getMultiplicadorFromSku } from '../lib/sku';

/**
 * Creates a simple hash from a string. Not for cryptographic use.
 * @param str The string to hash.
 * @returns A hash code as a string.
 */
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};

/**
 * Classifies a ZPL page based on its content.
 * - 'danfe': Contains specific invoice keywords like "DANFE".
 * - 'label': Contains shipping carrier keywords OR a graphic recall command (^XG), and is not a DANFE.
 * - 'other': Anything else, such as DANFE continuation pages or command-only pages.
 * @param zplPage The ZPL string of a single page.
 * @returns 'danfe', 'label', or 'other'.
 */
export const classifyPage = (zplPage: string): 'danfe' | 'label' | 'other' => {
    const upperZpl = zplPage.toUpperCase();

    // A page is a shipping label if it contains carrier identifiers, specific commands, or ML-specific fields.
    // Check this FIRST.
    const isLabelCandidate =
        upperZpl.includes('MERCADO ENVIOS') ||
        upperZpl.includes('PACK ID:') ||
        upperZpl.includes('SHOPEE XPRESS') ||
        upperZpl.includes('ID DE RASTREAMENTO') ||
        upperZpl.includes('SIGEP WEB') || // Correios
        upperZpl.includes('KANGU') ||
        upperZpl.includes('TOTAL EXPRESS') ||
        upperZpl.includes('^XG') || // Command to recall a graphic, common in carrier labels.
        (upperZpl.includes('^FX LOGO_MELI ^FS') && upperZpl.includes('SHIPMENT_NUMBER_BAR_CODE'));

    if (isLabelCandidate) {
        return 'label';
    }

    // A DANFE must contain specific text.
    if (upperZpl.includes('DANFE SIMPLIFICADO') || upperZpl.includes('CHAVE DE ACESSO')) {
        return 'danfe';
    }
    
    // Everything else (DANFE continuation pages, delete commands, etc.) is 'other'.
    return 'other';
};


/**
 * Filters, pairs, and extracts data from ZPL pages, correctly handling multi-page DANFEs.
 * It now prioritizes data extraction from the DANFE for Mercado Livre orders. If no DANFE is found,
 * it falls back to a more robust database lookup based on identifiers from the label.
 * @param rawPages An array of all ZPL pages from the input file.
 * @param regex The regex patterns from user settings for data extraction.
 * @param allOrders The list of all imported orders for database lookup.
 * @returns A promise that resolves to an object with the visually paired ZPL and the full extracted data.
 */
export const filterAndPairZplPages = async (
    rawPages: string[], 
    regex: ZplSettings['regex'],
    allOrders: OrderItem[]
): Promise<{ pairedZpl: string[]; extractedData: Map<number, ExtractedZplData> }> => {
    
    const classifiedPages = rawPages.map(p => ({ zpl: p, type: classifyPage(p) }));
    
    const pairedZpl: string[] = [];
    const extractedData = new Map<number, ExtractedZplData>();
    let i = 0;

    while (i < classifiedPages.length) {
        let danfePage: string | null = null;
        let labelPage: string | null = null;
        let fullDanfeForExtraction = '';

        if (classifiedPages[i].type === 'danfe') {
            danfePage = classifiedPages[i].zpl;
            fullDanfeForExtraction = danfePage;
            let nextIndex = i + 1;
            while (nextIndex < classifiedPages.length && classifiedPages[nextIndex].type === 'other') {
                fullDanfeForExtraction += '\n' + classifiedPages[nextIndex].zpl;
                nextIndex++;
            }
            if (nextIndex < classifiedPages.length && classifiedPages[nextIndex].type === 'label') {
                labelPage = classifiedPages[nextIndex].zpl;
                i = nextIndex + 1;
            } else {
                i = nextIndex;
            }
        } 
        else if (classifiedPages[i].type === 'label') {
            labelPage = classifiedPages[i].zpl;
            i++;
        } 
        else {
            i++;
            continue;
        }

        const visualDanfe = danfePage || '^XA^XZ';
        const visualLabel = labelPage || '^XA^XZ';

        const pairIndex = pairedZpl.length;
        pairedZpl.push(visualDanfe, visualLabel);

        const finalData: ExtractedZplData = { skus: [], hasDanfe: !!danfePage };
        let dataExtracted = false;

        if (labelPage) {
            finalData.isMercadoLivre = labelPage.toUpperCase().includes('MERCADO ENVIOS') || labelPage.toUpperCase().includes('PACK ID:');
            finalData.containsDanfeInLabel = labelPage.toUpperCase().includes('DANFE SIMPLIFICADO') || labelPage.toUpperCase().includes('CHAVE DE ACESSO');
        }

        if (finalData.isMercadoLivre) {
            // Priority 1: Extract from DANFE if present
            if (fullDanfeForExtraction) {
                const fromDanfe = await extractFields(fullDanfeForExtraction, regex);
                if (fromDanfe.skus.length > 0) {
                    finalData.orderId = fromDanfe.orderId;
                    finalData.skus = fromDanfe.skus.map(item => ({ ...item, qty: Math.round(item.qty * getMultiplicadorFromSku(item.sku)) }));
                    dataExtracted = true;
                }
            }
            
            // Priority 2: If no DANFE or DANFE extraction failed, use DB lookup
            if (!dataExtracted && labelPage) {
                let mlIdentifier: string | null = null;
                
                const packIdMatch = labelPage.match(/(?:PACK ID|MELI ID):?\s*(?:\d{5}\s*)?\s*(\d{10,})/i);
                if (packIdMatch?.[1]) {
                    mlIdentifier = packIdMatch[1];
                }

                if (!mlIdentifier) {
                    const barcodeMatch = labelPage.match(/\^BY[\d,]+\^BC[N,R,B,C,1][\s\S]*?\^FD>?:?([A-Z0-9-]{10,})\^FS/i);
                    if (barcodeMatch?.[1]) {
                        mlIdentifier = barcodeMatch[1];
                    }
                }

                if (mlIdentifier) {
                    const identifierToMatch = mlIdentifier.toUpperCase();
            
                    let matchedOrderId: string | undefined = undefined;

                    const potentialMatches = allOrders.filter(o => {
                        const orderId = (o.orderId || '').toUpperCase();
                        const tracking = (o.tracking || '').toUpperCase();

                        // More robust matching
                        if (orderId === identifierToMatch || tracking === identifierToMatch) return true;
                        if (tracking && identifierToMatch.endsWith(tracking)) return true;
                        if (orderId && identifierToMatch.endsWith(orderId)) return true;
                        if (tracking && tracking.endsWith(identifierToMatch)) return true;
                        if (tracking && tracking.includes(identifierToMatch)) return true;
                        if (orderId && orderId.includes(identifierToMatch)) return true;
                        
                        return false;
                    });
                    
                    const uniqueOrderIds = new Set(potentialMatches.map(o => o.orderId));

                    if (uniqueOrderIds.size === 1) {
                        matchedOrderId = Array.from(uniqueOrderIds)[0];
                    }

                    if (matchedOrderId) {
                        const allItemsForThisOrder = allOrders.filter(o => o.orderId === matchedOrderId);
                        if (allItemsForThisOrder.length > 0) {
                             finalData.orderId = matchedOrderId;
                             finalData.skus = allItemsForThisOrder.map(order => ({ sku: order.sku, qty: order.qty_final }));
                             dataExtracted = true;
                        }
                    }
                }
            }
        } else { // Shopee and others logic
            let orderIdFromLabel: string | undefined;
            let dataFromZpl: ExtractedZplData = { skus: [] };
            
            if (fullDanfeForExtraction) {
                dataFromZpl = await extractFields(fullDanfeForExtraction, regex);
            }
            
            if (labelPage) {
                const fromLabel = await extractFields(labelPage, regex);
                orderIdFromLabel = fromLabel.orderId;
            }

            const finalOrderId = orderIdFromLabel || dataFromZpl.orderId;
            finalData.orderId = finalOrderId;

            if (finalOrderId) {
                const dbOrders = allOrders.filter(o => o.orderId === finalOrderId);
                if (dbOrders.length > 0) {
                    finalData.skus = dbOrders.map(o => ({ sku: o.sku, qty: o.qty_final }));
                    dataExtracted = true;
                }
            }
            
            if (!dataExtracted) {
                finalData.skus = dataFromZpl.skus.map(item => ({ ...item, qty: Math.round(item.qty * getMultiplicadorFromSku(item.sku)) }));
            }
        }
        
        extractedData.set(pairIndex, finalData);
    }
    return { pairedZpl, extractedData };
};


const BLOCK_REGEX = new RegExp('(\\^FO(?:(?!\\^FO)[\\s\\S])*?INFORMA[\\s\\S]*?ADICIONAIS[\\s\\S]*?CONTRIBUINTE[\\s\\S]*?\\^FS)', 'gi');

/**
 * Removes the "Informações Adicionais" block from a ZPL page.
 * @param zplPage The ZPL string for a single label.
 * @returns The ZPL string without the block.
 */
export const hideAdditionalInfoFromZpl = (zplPage: string): string => {
    return zplPage.replace(BLOCK_REGEX, '');
};

/**
 * Splits a ZPL string into an array of individual labels and commands.
 * @param zpl The raw ZPL string containing one or more labels and commands.
 * @returns An array of strings, where each string is a single, complete, and renderable ZPL label.
 */
export const splitZpl = (zpl: string): string[] => {
    if (!zpl) return [];

    const cleanedZpl = zpl.replace(/\r(?!\n)/g, '');

    const tokens = cleanedZpl.match(/\^XA.*?\^XZ|~DGR.*?(?=\^XA|~DGR|$)/gis);

    if (!tokens) {
        if (cleanedZpl.trim().toUpperCase().startsWith('^XA')) {
            return [cleanedZpl.trim()];
        }
        return [];
    }

    const labels: string[] = [];
    let pendingDGR = '';

    for (const token of tokens) {
        const trimmedToken = token.trim();
        if (trimmedToken.toUpperCase().startsWith('~DGR')) {
            pendingDGR = trimmedToken;
        } else if (trimmedToken.toUpperCase().startsWith('^XA')) {
            let labelToSend = trimmedToken;
            if (trimmedToken.toUpperCase().includes('^XG') && pendingDGR) {
                labelToSend = pendingDGR + '\n' + trimmedToken;
                pendingDGR = '';
            }
            labels.push(labelToSend);
        }
    }
    return labels;
};