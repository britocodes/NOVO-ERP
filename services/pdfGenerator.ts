
import jsPDF from 'jspdf';
import { ZplSettings, ExtractedZplData, GeneralSettings, StockItem, SkuLink, ZplPlatformSettings } from '../types';

// Helper to convert a Blob object to a Base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Renders a ZPL string into a PNG image using the Labelary API.
 * Includes a retry mechanism for rate limiting and network timeouts.
 * @param zpl The ZPL code to render.
 * @param settings The current label settings (for DPI and dimensions).
 * @param generalSettings The application's general settings for API URL.
 * @returns A promise that resolves to a Base64 encoded PNG image data URL.
 */
export const renderZpl = async (
    zpl: string, 
    settings: ZplSettings,
    generalSettings: GeneralSettings,
    maxRetries = 5, // Aumentado para 5 tentativas
    initialDelay = 1500 // Aumentado delay inicial
): Promise<string> => {
    // If ZPL is blank or just a placeholder, return a transparent pixel immediately.
    const trimmedZpl = zpl ? zpl.trim().toUpperCase() : '';
    if (!trimmedZpl || trimmedZpl === '^XA^XZ' || trimmedZpl === 'SKIPPED') {
        if(trimmedZpl === 'SKIPPED') return 'SKIPPED';
        // This is a blank 1x1 GIF. It's tiny and works everywhere.
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }

    // Fixed: convert DPI to number before arithmetic operation to resolve TS error.
    const dpiValue = settings.dpi === 'Auto' ? 203 : parseInt(settings.dpi, 10);
    const dpmm = Math.round(dpiValue / 25.4);
    const widthInInches = settings.pageWidth / 25.4;
    const heightInInches = settings.pageHeight / 25.4;

    const url = generalSettings.etiquetas.labelaryApiUrl
      .replace('{dpmm}', dpmm.toString())
      .replace('{width}', widthInInches.toString())
      .replace('{height}', heightInInches.toString());

    let attempt = 0;
    let delay = initialDelay;

    while (attempt <= maxRetries) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Aumentado para 30s para evitar timeout em lotes grandes

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: zpl,
                headers: { 
                    'Accept': 'image/png',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.status === 429) { // Rate limit exceeded
                if (attempt === maxRetries) throw new Error(`Labelary API Error: Request rate limit exceeded`);
                const retryAfterHeader = response.headers.get('Retry-After');
                const waitTime = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : delay;
                
                console.warn(`Rate limit hit. Retrying after ${waitTime}ms... (Attempt ${attempt + 1})`);
                await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Adiciona 1s extra de segurança
                
                delay *= 2; 
                attempt++;
                continue;
            }

            if (!response.ok) {
                // Se for erro 500/502/503 (servidor instável), tenta novamente
                if (response.status >= 500 && attempt < maxRetries) {
                    console.warn(`Server error ${response.status}. Retrying...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    attempt++;
                    continue;
                }

                const errorText = await response.text();
                throw new Error(errorText ? `Labelary API Error: ${errorText}` : `Labelary API Error: Received status ${response.status}`);
            }

            const blob = await response.blob();
            return blobToBase64(blob); // Success
        } catch (error: any) {
             clearTimeout(timeoutId);
             // Check if it's a timeout error or network error
             if (error.name === 'AbortError' || error instanceof TypeError) {
                 if (attempt === maxRetries) throw new Error('Renderização da etiqueta falhou por timeout ou rede após múltiplas tentativas.');
                 console.warn(`Fetch error (likely timeout) on attempt ${attempt + 1}. Retrying after ${delay}ms...`, error);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 delay *= 2;
                 attempt++;
             } else {
                 // Non-retryable error
                 throw error;
             }
        }
    }
    
    throw new Error('renderZpl failed after all retries.');
};

// Helper to get dimensions of a base64 image
const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        if (dataUrl.startsWith('data:image/gif')) { // Handle transparent pixel
            resolve({ width: 1, height: 1 });
            return;
        }
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = (err) => {
            // Em vez de rejeitar e quebrar o PDF inteiro, retorna um tamanho padrão
            console.error("Could not load image to get dimensions.", err);
            resolve({ width: 100, height: 100 }); 
        };
        img.src = dataUrl;
    });
};

function drawFooter(
    pdf: jsPDF,
    lines: string[],
    startX: number,
    startY: number,
    availableWidth: number,
    availableHeight: number,
    settings: ZplPlatformSettings['footer']
) {
    if (lines.length === 0 || availableHeight <= 2) return;

    pdf.setFont(settings.fontFamily, 'normal');
    const ptToMm = (pt: number) => pt * 0.352778;
    const initialLineHeightMm = ptToMm(settings.lineSpacing_pt);
    
    // 1. Determine column count
    let numColumns = 1;
    if (settings.multiColumn) {
        const initialTotalHeight = lines.length * initialLineHeightMm;
        if (initialTotalHeight > availableHeight) {
            numColumns = 2;
            const heightForTwoCols = Math.ceil(lines.length / 2) * initialLineHeightMm;
            if (heightForTwoCols > availableHeight) {
                numColumns = 3;
            }
        }
    }
    
    // 2. Determine font size scale factor if it still overflows
    const linesPerColumn = Math.ceil(lines.length / numColumns);
    let requiredHeight = linesPerColumn * initialLineHeightMm;
    let scaleFactor = 1.0;
    if (requiredHeight > availableHeight) {
        scaleFactor = availableHeight / requiredHeight;
    }

    const finalFontSize = settings.fontSize_pt * scaleFactor;
    const finalLineHeightMm = ptToMm(settings.lineSpacing_pt) * scaleFactor;
    pdf.setFontSize(finalFontSize);

    // 3. Draw columns
    const columnWidth = availableWidth / numColumns;
    let lineIndex = 0;

    for (let col = 0; col < numColumns; col++) {
        if (lineIndex >= lines.length) break;
        
        const colStartX = startX + (col * columnWidth);
        let currentY = startY;

        for (let i = 0; i < linesPerColumn; i++) {
            if (lineIndex >= lines.length) break;

            const line = lines[lineIndex];
            let x;
            
            if (settings.textAlign === 'center') {
                x = colStartX + (columnWidth / 2);
            } else if (settings.textAlign === 'right') {
                x = colStartX + columnWidth - 2; // small right margin
            } else { // left
                x = colStartX + 2; // small left margin
            }

            pdf.text(line, x, currentY, { align: settings.textAlign, maxWidth: columnWidth - 4 });
            
            currentY += finalLineHeightMm;
            lineIndex++;
        }
    }
}


/**
 * Generates a multi-page PDF from a correctly ordered array of pre-rendered ZPL images.
 * It assumes pages are already paired (DANFE, Label, DANFE, Label...).
 * @param previews An array of Base64 encoded PNG image data URLs for each label.
 * @param processedData A map containing data extracted from all pages, keyed by original index.
 * @param settings The current label settings.
 * @param includeDanfe Whether to include odd-numbered pages (DANFEs).
 * @param stockItems The list of all stock items to find product names.
 * @param skuLinks The list of SKU links to resolve product codes.
 * @returns A promise that resolves to the generated PDF as a Blob.
 */
export const buildPdf = async (
    previews: string[],
    processedData: Map<number, ExtractedZplData>,
    settings: ZplSettings,
    includeDanfe: boolean,
    stockItems: StockItem[],
    skuLinks: SkuLink[]
): Promise<Blob> => {
    const { pageWidth: width_mm, pageHeight: height_mm } = settings;
    const orientation = width_mm > height_mm ? 'l' : 'p';
    
    const pdf = new jsPDF(orientation, 'mm', [width_mm, height_mm]);
    pdf.deletePage(1);

    const skuLinkMap = new Map(skuLinks.map(link => [link.importedSku, link.masterProductSku]));
    const stockItemMap = new Map(stockItems.map(item => [item.code, item]));

    for (let i = 0; i < previews.length; i += 2) {
        const danfePage = previews[i];
        const labelPage = previews[i + 1];
        const pairData = processedData.get(i);

        // Determine platform-specific settings for this pair
        const platformSettings = pairData?.isMercadoLivre ? settings.mercadoLivre : settings.shopee;

        // Skip this pair entirely if the label page is invalid and we don't want the DANFE
        const isLabelInvalid = !labelPage || labelPage === 'ERROR' || labelPage.includes('R0lGOD') || labelPage === 'SKIPPED';
        if (isLabelInvalid && !includeDanfe) {
            continue;
        }
        
        pdf.addPage([width_mm, height_mm], orientation);

        // Case 1: Label Only (either no DANFE was paired, or user doesn't want it)
        if (!pairData?.hasDanfe || !includeDanfe) {
             if (!isLabelInvalid) {
                const imageAreaHeight = height_mm * (platformSettings.imageAreaPercentage_even / 100);
                const img = await getImageDimensions(labelPage);

                let finalWidth = width_mm;
                let finalHeight = finalWidth / (img.width / img.height);
                if (finalHeight > imageAreaHeight) {
                    finalHeight = imageAreaHeight;
                    finalWidth = finalHeight * (img.width / img.height);
                }
                const x = (width_mm - finalWidth) / 2;
                pdf.addImage(labelPage, 'PNG', x, 0, finalWidth, finalHeight, undefined, 'FAST');
                
                // Draw footer for label-only pages
                if (pairData && pairData.skus.length > 0) {
                    const lines = pairData.skus.map(item => {
                        const masterSku = skuLinkMap.get(item.sku);
                        const product = masterSku ? stockItemMap.get(masterSku) : undefined;
                        const finalSku = product ? product.code : item.sku;
                        const finalName = product ? product.name : item.sku;

                        return platformSettings.footer.template
                            .replace('{sku}', finalSku)
                            .replace('{name}', finalName)
                            .replace('{qty}', String(item.qty));
                    });

                    const { footer } = platformSettings;
                    let footerStartX, footerStartY;

                    if (footer.positionPreset === 'custom') {
                        footerStartX = footer.x_position_mm;
                        footerStartY = footer.y_position_mm;
                    } else {
                        footerStartX = 2; // Default left margin for presets
                        footerStartY = footer.positionPreset === 'above' 
                            ? footer.spacing_mm 
                            : imageAreaHeight + footer.spacing_mm;
                    }

                    const footerAvailableWidth = width_mm - footerStartX;
                    const footerAvailableHeight = height_mm - footerStartY;

                    drawFooter(pdf, lines, footerStartX, footerStartY, footerAvailableWidth, footerAvailableHeight, platformSettings.footer);
                }
            }
        // Case 2: DANFE and Label
        } else {
            // DANFE (Odd Page)
            const isDanfeInvalid = !danfePage || danfePage === 'ERROR' || danfePage.includes('R0lGOD') || danfePage === 'SKIPPED';
            if (!isDanfeInvalid) {
                const img = await getImageDimensions(danfePage);
                let finalWidth = width_mm * (settings.sourcePageScale_percent / 100);
                let finalHeight = finalWidth / (img.width / img.height);
                if (finalHeight > height_mm) {
                    finalHeight = height_mm;
                    finalWidth = finalHeight * (img.width / img.height);
                }
                const x = (width_mm - finalWidth) / 2;
                const y = (height_mm - finalHeight) / 2;
                pdf.addImage(danfePage, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
            }

            // Label (Even Page)
            if (!isLabelInvalid) {
                pdf.addPage([width_mm, height_mm], orientation);
                const imageAreaHeight = height_mm * (platformSettings.imageAreaPercentage_even / 100);
                const img = await getImageDimensions(labelPage);

                let finalWidth = width_mm;
                let finalHeight = finalWidth / (img.width / img.height);
                 if (finalHeight > imageAreaHeight) {
                    finalHeight = imageAreaHeight;
                    finalWidth = finalHeight * (img.width / img.height);
                }
                const x = (width_mm - finalWidth) / 2;
                pdf.addImage(labelPage, 'PNG', x, 0, finalWidth, finalHeight, undefined, 'FAST');
                
                if (pairData && pairData.skus.length > 0) {
                    const lines = pairData.skus.map(item => {
                        const masterSku = skuLinkMap.get(item.sku);
                        const product = masterSku ? stockItemMap.get(masterSku) : undefined;
                        const finalSku = product ? product.code : item.sku;
                        const finalName = product ? product.name : item.sku;

                        return platformSettings.footer.template
                            .replace('{sku}', finalSku)
                            .replace('{name}', finalName)
                            .replace('{qty}', String(item.qty));
                    });
                    
                    const { footer } = platformSettings;
                    let footerStartX, footerStartY;

                    if (footer.positionPreset === 'custom') {
                        footerStartX = footer.x_position_mm;
                        footerStartY = footer.y_position_mm;
                    } else {
                        footerStartX = 2; // Default left margin for presets
                        footerStartY = footer.positionPreset === 'above' 
                            ? footer.spacing_mm 
                            : imageAreaHeight + footer.spacing_mm;
                    }
                    
                    const footerAvailableWidth = width_mm - footerStartX;
                    const footerAvailableHeight = height_mm - footerStartY;
                    drawFooter(pdf, lines, footerStartX, footerStartY, footerAvailableWidth, footerAvailableHeight, platformSettings.footer);
                }
            }
        }
    }


    if (pdf.internal.getNumberOfPages() === 0) {
        throw new Error("Nenhuma página válida foi adicionada ao PDF.");
    }

    return pdf.output('blob');
};
