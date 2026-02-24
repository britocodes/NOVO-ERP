
import React, { useState, useMemo } from 'react';
import { ProcessedData, OrderItem, StockItem, SkuLink, ProdutoCombinado, GeneralSettings, MaterialItem, ResumidaItem, User } from '../types';
import { FileDown, Database, AlertCircle, ChevronDown, ChevronRight, Package, Box, Info, ArrowDownAZ, ArrowDown, Link as LinkIcon, CheckCircle2, User as UserIcon, Printer } from 'lucide-react';
import { exportPdf, Tab } from '../lib/export';
import { calculateMaterialList } from '../lib/estoque';
import ProductionSummary from './ProductionSummary';

interface ImportResultsProps {
    data: ProcessedData;
    onLaunchSuccess: (launchedOrders: OrderItem[]) => void;
    skuLinks: SkuLink[];
    products: StockItem[];
    onLinkSku: (importedSku: string, masterProductSku: string) => Promise<boolean>;
    onOpenLinkModal: (skus: string[], colorSugerida: string) => void;
    onOpenCreateProductModal: (skuData: { sku: string; colorSugerida: string }) => void;
    produtosCombinados: ProdutoCombinado[];
    stockItems: StockItem[];
    generalSettings: GeneralSettings;
    isHistoryView?: boolean;
    users: User[];
}

const ImportResults: React.FC<ImportResultsProps> = (props) => {
    const { 
        data, 
        onLaunchSuccess, 
        skuLinks = [], 
        onOpenLinkModal, 
        onOpenCreateProductModal,
        produtosCombinados = [], 
        stockItems = [], 
        generalSettings, 
        isHistoryView = false,
        users
    } = props;
    
    const [activeTab, setActiveTab] = useState<Tab>('completa');
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [resumidaSortMode, setResumidaSortMode] = useState<'qty' | 'alpha'>('qty');
    
    // Selection State for Resumida List
    const [selectedResumidaKeys, setSelectedResumidaKeys] = useState<Set<string>>(new Set());
    const [selectedOperator, setSelectedOperator] = useState<string>('');

    const skuLinkMap = useMemo<Map<string, string>>(() => {
        const m = new Map<string, string>();
        skuLinks.forEach(l => m.set(l.importedSku.toUpperCase(), l.masterProductSku.toUpperCase()));
        return m;
    }, [skuLinks]);

    const stockMap = useMemo<Map<string, StockItem>>(() => {
        const m = new Map<string, StockItem>();
        stockItems.forEach(i => m.set(i.code.toUpperCase(), i));
        return m;
    }, [stockItems]);

    // Enhanced State Calculation
    const enrichedState = useMemo<{ resumida: ResumidaItem[]; materialList: MaterialItem[]; summary: any; }>(() => {
        const orders = data.lists.completa;
        let white = 0, black = 0, special = 0, miudos = 0, wallpaper = 0;
        
        // Key logic: Group by MasterSKU + Color to allow selecting specific color variants
        const distributionMap = new Map<string, ResumidaItem>();

        orders.forEach(o => {
            const skuUpper = o.sku.toUpperCase();
            const masterCode = skuLinkMap.get(skuUpper) || skuUpper;
            const product = stockMap.get(masterCode);
            
            // Unique key for the row
            const compositeKey = `${masterCode}|${o.color}`; 

            const entry: ResumidaItem = distributionMap.get(compositeKey) || { 
                sku: masterCode, 
                color: o.color, 
                distribution: {}, 
                total_units: 0 
            };
            
            const qty = Number(o.qty_final || 0);
            entry.distribution[qty] = (entry.distribution[qty] || 0) + 1;
            entry.total_units += qty;
            distributionMap.set(compositeKey, entry);

            if (product?.product_type === 'miudos') {
                miudos += qty;
            } else {
                wallpaper += qty;
                const base = masterCode ? generalSettings.baseColorConfig[masterCode]?.type : 'branca';
                if (base === 'preta') black += qty;
                else if (base === 'especial') special += qty;
                else white += qty;
            }
        });

        const materialList: MaterialItem[] = calculateMaterialList(orders, skuLinks, stockItems, produtosCombinados, generalSettings.expeditionRules, generalSettings);

        let resumidaSorted: ResumidaItem[] = Array.from(distributionMap.values());
        if (resumidaSortMode === 'qty') {
            resumidaSorted.sort((a, b) => b.total_units - a.total_units || a.sku.localeCompare(b.sku));
        } else {
            resumidaSorted.sort((a, b) => a.sku.localeCompare(b.sku));
        }

        return {
            resumida: resumidaSorted,
            materialList,
            summary: { ...data.summary, totalUnidadesBranca: white, totalUnidadesPreta: black, totalUnidadesEspecial: special, totalUnidades: wallpaper, totalMiudos: miudos }
        };
    }, [data, skuLinkMap, stockMap, generalSettings, skuLinks, stockItems, produtosCombinados, resumidaSortMode]);

    // Calculate columns dynamically (no limit of 8)
    const allPackSizes = useMemo(() => {
        const sizes = new Set<number>();
        enrichedState.resumida.forEach(item => {
             if (item.distribution) {
                 Object.keys(item.distribution).forEach(s => sizes.add(Number(s)));
             }
        });
        return Array.from(sizes).sort((a, b) => a - b);
    }, [enrichedState.resumida]);

    const toggleOrder = (id: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    
    // Selection Handlers
    const toggleResumidaSelection = (key: string) => {
        setSelectedResumidaKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleSelectAllResumida = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allKeys = enrichedState.resumida.map(item => `${item.sku}|${item.color}`);
            setSelectedResumidaKeys(new Set(allKeys));
        } else {
            setSelectedResumidaKeys(new Set());
        }
    };
    
    const handleExportSelected = () => {
        exportPdf('resumida', data, skuLinks, stockItems, resumidaSortMode, selectedResumidaKeys, selectedOperator);
    };

    const pendingLinks = useMemo(() => {
        const currentLinked = new Set(skuLinks.map(l => l.importedSku.toUpperCase()));
        return data.skusNaoVinculados.filter(s => !currentLinked.has(s.sku.toUpperCase()));
    }, [data.skusNaoVinculados, skuLinks]);

    const uniqueOrderIds = useMemo(() => Array.from(new Set(data.lists.completa.map(o => o.orderId))), [data.lists.completa]);

    return (
        <div className="space-y-6">
            <ProductionSummary data={enrichedState.summary} productTypeName={generalSettings.productTypeNames.papel_de_parede} miudosTypeName={generalSettings.productTypeNames.miudos} />

            {!isHistoryView && (
                <div className="flex justify-end animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => onLaunchSuccess(data.lists.completa)} className="bg-green-600 text-white px-8 py-3 rounded-xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center gap-3">
                        <Database size={20}/> LANÇAR NO BANCO DE DADOS
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                        {(['completa', 'resumida', 'vinculo', 'materiais'] as const).map((tid) => (
                            <button key={tid} onClick={() => setActiveTab(tid)} className={`px-4 py-2 text-sm font-black rounded-xl transition-all ${activeTab === tid ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-200'}`}>
                                {tid === 'completa' ? 'Lista de Pedidos' : tid === 'resumida' ? 'Lista por Produto/Cor' : tid === 'vinculo' ? `Vínculos (${pendingLinks.length})` : 'Materiais'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'completa' && (
                            <button onClick={() => setExpandedOrders(new Set(uniqueOrderIds))} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-2 font-black text-xs">
                                <ChevronDown size={16}/> Expandir Todos
                            </button>
                        )}
                        <button onClick={() => exportPdf(activeTab, data, skuLinks, stockItems, resumidaSortMode)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-black text-xs">
                            <FileDown size={20}/> PDF Completo
                        </button>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    {activeTab === 'resumida' && (
                        <div>
                            {/* Toolbar de Ações da Lista Resumida */}
                            <div className="bg-slate-100 p-3 border-b flex flex-wrap gap-4 items-center justify-between sticky left-0">
                                <div className="flex gap-2">
                                    <button onClick={() => setResumidaSortMode('qty')} className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${resumidaSortMode === 'qty' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                                        <ArrowDown size={14}/> MAIOR QUANTIDADE
                                    </button>
                                    <button onClick={() => setResumidaSortMode('alpha')} className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${resumidaSortMode === 'alpha' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                                        <ArrowDownAZ size={14}/> ORDEM ALFABÉTICA
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <UserIcon size={16} className="text-slate-400"/>
                                        <select 
                                            value={selectedOperator} 
                                            onChange={e => setSelectedOperator(e.target.value)}
                                            className="text-xs font-bold text-slate-700 outline-none bg-transparent"
                                        >
                                            <option value="">-- Vincular Operador (Opcional) --</option>
                                            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200"></div>
                                    <button 
                                        onClick={handleExportSelected}
                                        disabled={selectedResumidaKeys.size === 0}
                                        className="flex items-center gap-2 text-xs font-black bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Printer size={14}/>
                                        Gerar Lista ({selectedResumidaKeys.size > 0 ? selectedResumidaKeys.size : 'Todas'})
                                    </button>
                                </div>
                            </div>
                            
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                                    <tr>
                                        <th className="p-4 w-10 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded cursor-pointer"
                                                onChange={handleSelectAllResumida}
                                                checked={enrichedState.resumida.length > 0 && selectedResumidaKeys.size === enrichedState.resumida.length}
                                            />
                                        </th>
                                        <th className="p-4 text-left">Produto Mestre</th>
                                        <th className="p-4 text-left">Cor</th>
                                        {allPackSizes.map((size: number) => <th key={String(size)} className="p-4 text-center">{size} UN</th>)}
                                        <th className="p-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {enrichedState.resumida.map((item: ResumidaItem) => {
                                        const skuKey = (item.sku as string).toUpperCase();
                                        const product = stockMap.get(skuKey);
                                        const rowKey = `${item.sku}|${item.color}`;
                                        const isSelected = selectedResumidaKeys.has(rowKey);

                                        return (
                                            <tr key={rowKey} onClick={() => toggleResumidaSelection(rowKey)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${!product ? 'bg-red-50' : ''}`}>
                                                <td className="p-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        onChange={() => toggleResumidaSelection(rowKey)}
                                                        className="w-4 h-4 rounded cursor-pointer text-blue-600 focus:ring-blue-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-black text-slate-800 uppercase">{product?.name || 'NÃO VINCULADO'}</p>
                                                    <p className="text-[10px] font-mono text-gray-400">{item.sku}</p>
                                                </td>
                                                <td className="p-4 text-xs font-bold text-gray-600">
                                                    <span className="px-2 py-1 bg-white border rounded-md shadow-sm">{item.color}</span>
                                                </td>
                                                {allPackSizes.map((size: number) => (
                                                    <td key={String(size)} className="p-4 text-center font-bold">
                                                        {item.distribution[size] ? (
                                                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-xs">{item.distribution[size]}</span>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                ))}
                                                <td className="p-4 text-right font-black text-slate-900 text-lg">{item.total_units}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {/* ... other tabs ... */}
                    {activeTab === 'completa' && (
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                                <tr><th className="p-4 w-10"></th><th className="p-4 text-left">Pedido</th><th className="p-4 text-center">Unidades</th><th className="p-4 text-right">Status</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {(uniqueOrderIds as string[]).map(key => {
                                    const group = data.lists.completa.filter(o => o.orderId === key);
                                    const total = group.reduce((s, o) => s + o.qty_final, 0);
                                    const isExpanded = expandedOrders.has(key);
                                    return (
                                        <React.Fragment key={key}>
                                            <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleOrder(key)}>
                                                <td className="p-4 text-center">
                                                    {expandedOrders.has(key) ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                                </td>
                                                <td className="p-4 font-black text-slate-800">{key}</td>
                                                <td className="p-4 text-center font-bold text-blue-600">{total}</td>
                                                <td className="p-4 text-right text-[10px] font-black">{group[0].status}</td>
                                            </tr>
                                            {isExpanded && group.map(subItem => {
                                                const masterCode = skuLinkMap.get(subItem.sku.toUpperCase());
                                                const masterProduct = masterCode ? stockMap.get(masterCode) : null;
                                                return (
                                                    <tr key={subItem.id} className="bg-blue-50/50">
                                                        <td></td>
                                                        <td className="p-3 pl-8">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase w-16">Importado:</span>
                                                                    <span className="font-mono text-xs text-slate-700">{subItem.sku}</span>
                                                                </div>
                                                                {masterProduct ? (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] font-bold text-green-600 uppercase w-16 flex items-center gap-1"><LinkIcon size={10}/> Vinculado:</span>
                                                                        <span className="font-bold text-xs text-green-700 uppercase">{masterProduct.name}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] font-bold text-red-400 uppercase w-16">Status:</span>
                                                                        <span className="text-xs font-bold text-red-500 italic">Não Vinculado</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-slate-600">{subItem.qty_final}</td>
                                                        <td className="p-3 text-right text-xs font-bold text-slate-500">{subItem.color}</td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {activeTab === 'vinculo' && (
                        <table className="min-w-full text-sm">
                            <tbody className="divide-y">
                                {pendingLinks.map(s => (
                                    <tr key={s.sku} className="hover:bg-red-50">
                                        <td className="p-4 font-mono font-bold text-red-600">{s.sku}</td>
                                        <td className="p-4 text-right flex gap-2 justify-end">
                                            <button onClick={() => onOpenLinkModal([s.sku], s.colorSugerida)} className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors">VINCULAR</button>
                                            <button onClick={() => onOpenCreateProductModal({ sku: s.sku, colorSugerida: s.colorSugerida })} className="text-[10px] font-black bg-green-50 text-green-600 px-3 py-1 rounded border border-green-200 hover:bg-green-100 transition-colors">CRIAR</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {activeTab === 'materiais' && (
                        <table className="min-w-full text-sm">
                            <tbody className="divide-y">
                                {enrichedState.materialList.map((m: MaterialItem) => (
                                    <tr key={m.name} className="hover:bg-gray-50">
                                        <td className="p-4 font-black">{m.name}</td>
                                        <td className="p-4 text-right font-black text-blue-600">{m.quantity.toFixed(m.unit === 'kg' ? 3 : 0)} {m.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {!isHistoryView && (
                    <div className="p-6 bg-gray-50 border-t flex justify-end">
                        <button onClick={() => onLaunchSuccess(data.lists.completa)} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                            <Database size={24}/> LANÇAR NO BANCO DE DADOS
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportResults;
