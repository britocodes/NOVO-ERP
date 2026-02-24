
// lib/estoque.ts
import { StockItem, ProdutoCombinado, OrderItem, SkuLink, MaterialItem, ExpeditionSettings, GeneralSettings } from '../types';

export const calculateMaterialList = (
    orders: OrderItem[],
    skuLinks: SkuLink[],
    stockItems: StockItem[],
    produtosCombinados: ProdutoCombinado[],
    expeditionRules: ExpeditionSettings,
    generalSettings: GeneralSettings
): MaterialItem[] => {
    const materialQuantities = new Map<string, number>();
    const stockMap = new Map<string, StockItem>(stockItems.map(i => [i.code, i]));
    const bomMap = new Map<string, ProdutoCombinado>(produtosCombinados.map(b => [b.productSku, b]));
    const skuLinkMap = new Map<string, string>(skuLinks.map(l => [l.importedSku, l.masterProductSku]));

    const addMaterial = (code: string, qty: number) => {
        if (!code) return;
        materialQuantities.set(code, (materialQuantities.get(code) || 0) + qty);
    };

    // Agrupar pedidos por ID Único para aplicar regras de embalagem por pacote/cliente
    const ordersByPackage = new Map<string, OrderItem[]>();
    orders.forEach(o => {
        const key = o.orderId || o.tracking;
        if (!ordersByPackage.has(key)) ordersByPackage.set(key, []);
        ordersByPackage.get(key)!.push(o);
    });

    ordersByPackage.forEach(group => {
        const containsWallpaper = group.some(o => {
            const master = skuLinkMap.get(o.sku);
            return stockMap.get(master || o.sku)?.product_type === 'papel_de_parede';
        });

        // 1. Regras de Embalagem (Global)
        if (containsWallpaper) {
            const totalUnits = group.reduce((s, o) => s + o.qty_final, 0);
            const rule = expeditionRules.packagingRules.find(r => totalUnits >= r.from && totalUnits <= r.to);
            if (rule) addMaterial(rule.stockItemCode, rule.quantity);
        } else {
            const totalMiudos = group.reduce((s, o) => s + o.qty_final, 0);
            const rule = expeditionRules.miudosPackagingRules.find(r => totalMiudos >= r.from && totalMiudos <= r.to);
            if (rule) addMaterial(rule.stockItemCode, rule.quantity);
        }

        // 2. Explodir Itens (BOM + Itens de Expedição Específicos do Produto)
        group.forEach(order => {
            const masterSku = skuLinkMap.get(order.sku) || order.sku;
            const masterProduct = stockMap.get(masterSku);

            if (masterProduct) {
                // Adiciona itens de expedição (ex: Cola, Desempenadeira) configurados NO PRODUTO
                (masterProduct.expedition_items || []).forEach(exp => {
                    addMaterial(exp.stockItemCode, exp.qty_per_pack * order.qty_final);
                });

                // Explodir Receita (BOM) recursivamente
                const explode = (sku: string, qty: number) => {
                    const bom = bomMap.get(sku);
                    if (!bom) return;
                    bom.items.forEach(item => {
                        const needed = item.qty_per_pack * qty;
                        const sub = stockMap.get(item.stockItemCode);
                        if (sub?.kind === 'PROCESSADO') explode(sub.code, needed);
                        addMaterial(item.stockItemCode, needed);
                    });
                };
                explode(masterSku, order.qty_final);
            }
        });
    });

    return Array.from(materialQuantities.entries()).map(([code, quantity]) => {
        const item = stockMap.get(code);
        return { name: item?.name || code, quantity, unit: item?.unit || 'un' };
    }).sort((a,b) => a.name.localeCompare(b.name));
};
