
import { ExtractedZplData, ZplSettings, OrderItem, GeneralSettings } from '../types';
import { getMultiplicadorFromSku } from '../lib/sku';
import { splitZpl, filterAndPairZplPages, simpleHash } from '../utils/zplUtils';
import { renderZpl } from './pdfGenerator';

export const extractFields = async (zplPage: string, patterns: ZplSettings['regex']): Promise<ExtractedZplData> => {
    const skus: { sku: string; qty: number }[] = [];
    let orderId: string | undefined;

    const lines = zplPage.split(/\^FS|\^XZ/);
    const itemLineRegex = /\^FD.*UN/i;

    for (const line of lines) {
        if (itemLineRegex.test(line)) {
            const fdIndex = line.toUpperCase().indexOf('^FD');
            if (fdIndex === -1) continue;
            const data = line.substring(fdIndex + 3);
            const parts = data.split(' - ');
            if (parts.length >= 2) {
                const rawSku = parts[0].trim().replace(/\\5f/gi, '_');
                const lastPart = parts[parts.length - 1];
                const qtyMatch = lastPart.match(/([\d,]+)\s*UN/i);
                if (rawSku && qtyMatch && qtyMatch[1]) {
                    const qtyString = qtyMatch[1].replace(',', '.');
                    const qty = parseFloat(qtyString);
                    if (!isNaN(qty)) skus.push({ sku: rawSku, qty });
                }
            }
        }
    }

    if (skus.length === 0) {
        try {
            const skuMatches = [...zplPage.matchAll(new RegExp(patterns.sku, 'gi'))];
            const qtyMatches = [...zplPage.matchAll(new RegExp(patterns.quantity, 'gi'))];
            const count = Math.min(skuMatches.length, qtyMatches.length);
            for (let i = 0; i < count; i++) {
                const sku = skuMatches[i][1];
                const qty = parseInt(qtyMatches[i][1], 10);
                if (sku && !isNaN(qty)) skus.push({ sku, qty });
            }
        } catch (e) {}
    }

    try {
        const orderIdMatch = zplPage.match(new RegExp(patterns.orderId, 'i'));
        if (orderIdMatch && orderIdMatch[1]) orderId = orderIdMatch[1].trim();
    } catch (e) {}

    return { orderId, skus };
};

export async function* processZplStream(
    zplInput: string,
    settings: ZplSettings,
    generalSettings: GeneralSettings,
    allOrders: OrderItem[],
    processingMode: 'completo' | 'rapido',
    printedPageHashes: Set<string>
) {
    try {
        if (!zplInput.trim()) {
            yield { type: 'error', message: 'Nenhum código ZPL para processar.' };
            return;
        }

        yield { type: 'progress', message: 'Analisando ZPL...' };
        const rawPages = splitZpl(zplInput);
        const { pairedZpl, extractedData } = await filterAndPairZplPages(rawPages, settings.regex, allOrders);
        
        const warnings: string[] = [];
        const hasMlWithoutProperDanfe = Array.from(extractedData.values()).some(
            data => data.isMercadoLivre && !data.hasDanfe && !data.containsDanfeInLabel
        );
        if (hasMlWithoutProperDanfe) {
            warnings.push('Aviso: Etiquetas ML sem DANFE detectadas.');
        }

        const printedStatus = pairedZpl.map(pageZpl => printedPageHashes.has(simpleHash(pageZpl)));

        yield { type: 'start', zplPages: pairedZpl, extractedData, warnings, hasMlWithoutDanfe: hasMlWithoutProperDanfe, printedStatus };
        
        const chunkSize = generalSettings.etiquetas.renderChunkSize || 3; // Padrão mais seguro se não definido
        const delayMs = generalSettings.etiquetas.apiRequestDelay_ms || 1200; // Padrão mais seguro se não definido

        for (let i = 0; i < pairedZpl.length; i += chunkSize) {
            // Notifica progresso
            yield { type: 'progress', message: `Processando etiquetas... (${i}/${pairedZpl.length})` };

            const chunk = pairedZpl.slice(i, i + chunkSize);
            const chunkPromises = chunk.map((zpl, chunkIndex) => {
                const originalIndex = i + chunkIndex;
                const isDanfePage = originalIndex % 2 === 0;
                if (processingMode === 'rapido' && isDanfePage) {
                    return Promise.resolve({ index: originalIndex, preview: 'SKIPPED' });
                }
                return renderZpl(zpl, settings, generalSettings)
                    .then(preview => ({ index: originalIndex, preview }))
                    .catch(() => ({ index: originalIndex, preview: 'ERROR' }));
            });

            const chunkResults = await Promise.all(chunkPromises);
            for (const result of chunkResults) {
                yield { type: 'preview', index: result.index, preview: result.preview };
            }

            // Pausa entre chunks para respeitar rate limit do Labelary
            if (i + chunkSize < pairedZpl.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        yield { type: 'done' };
    } catch (error: any) {
        yield { type: 'error', message: error.message };
    }
}
