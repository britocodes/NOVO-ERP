// lib/sku.ts

/**
 * Extracts a multiplier (pack size) from a SKU string.
 * Covers formats like: XUNIDADES, x3UNIDADES, 3UNIDADES, x 3 unidade, 10 metros, etc.
 * @param rawSku The SKU string to parse.
 * @returns The detected multiplier, or 1 if none is found.
 */
export function getMultiplicadorFromSku(rawSku: string): number {
  if (!rawSku) return 1;
  const sku = String(rawSku);

  // 1) Formatos colados (sem espaço), ex: "x3unidades", "3unidades", "3unidade"
  const skuTight = sku.replace(/[\s._-]+/g, '').toLowerCase();
  let m =
    skuTight.match(/^x(\d+)unidades?$/i) ||
    skuTight.match(/x(\d+)unidades?/i) ||
    skuTight.match(/(\d+)unidades?/i);
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n > 1) return n;
  }

  // 2) Formatos com espaço ou variações, ex: "x 3 unidades", "com 2 unidade(s)"
  m =
    sku.match(/(?:^|[\s._-])x\s*(\d+)\s*unidades?/i) || // x 3 unidades
    sku.match(/(?:^|[\s._-])com\s*(\d+)\s*unidades?/i) || // com 2 unidades
    sku.match(/(?:^|[\s._-])(\d+)\s*unidades?/i) || // 3 unidades
    sku.match(/(?:^|[\s._-])x\s*(\d+)\b/i) || // x3 (sem "unidades", comum em títulos)
    sku.match(/(?:^|[\s._-])(\d+)\s*x\b/i); // 3x (menos comum)
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n > 1) return n;
  }

  // 3) Regras por "metros": 10m = x2, 15m = x3
  const metros = sku.match(/(\d+)\s*metros?/i);
  if (metros) {
    const mm = parseInt(metros[1], 10);
    if (mm === 10) return 2;
    if (mm === 15) return 3;
  }

  // 4) fallback
  return 1;
}

// Prioritized list of colors to check
export const COLOR_KEYWORDS = [
    'BPD', 'ROSEGOLD', 'VINHO', 'SALMÃO', 'ROSA PINK', 'ROSA CLARO', 'ROSA',
    'CINZA CHUMBO', 'CINZA CLARO', 'CINZA', 'PRETO', 'BRANCO', 'CARAMELO', 'BEGE',
    'AZUL MARINHO', 'AZUL', 'MARROM', 'LILÁS', 'LAVANDA', 'VERDE AGUA CLARO', 'VERDE AGUA', 'VERDE', 'AMARELO', 'VERMELHO', 'GLITTER'
];


/**
 * Classifies a color from a SKU string using a prioritized list of keywords.
 * @param sku The SKU string to classify.
 * @returns A color string, defaulting to "Diversos".
 */
export const classificarCor = (sku: string): string => {
    const normalizedSku = sku.toUpperCase();

    for (const cor of COLOR_KEYWORDS) {
        // Replace space for checks like 'VERDE AGUA' vs 'VERDEAGUA'
        if (normalizedSku.includes(cor.replace(' ', ''))) {
            // Capitalize first letter of each word for display
            return cor.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
        }
    }

    return 'Diversos';
};