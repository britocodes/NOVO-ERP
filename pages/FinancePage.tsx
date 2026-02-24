
import React, { useMemo, useState } from 'react';
import { OrderItem, Canal, StockItem, ProdutoCombinado, SkuLink, GeneralSettings, MaterialItem, TaxEntry } from '../types';
import { 
    DollarSign, TrendingUp, 
    FileUp, FileDown, Calendar, ArrowRight, Loader2, ShoppingBag, Box, Trash2, Settings, CheckCircle, RefreshCw, ChevronDown, ChevronRight, FileSpreadsheet, AlertCircle, Percent, PieChart, Landmark, Plus, Minus, FileCode, AlertTriangle
} from 'lucide-react';
import { calculateMaterialList } from '../lib/estoque';
import { exportFinanceReport } from '../lib/export';
import ConfirmActionModal from '../components/ConfirmActionModal';
import FinanceImportModal from '../components/FinanceImportModal';

interface FinancePageProps {
    allOrders: OrderItem[];
    stockItems: StockItem[];
    skuLinks: SkuLink[];
    produtosCombinados: ProdutoCombinado[];
    generalSettings: GeneralSettings;
    onDeleteOrders: (orderIds: string[]) => Promise<void>;
    onLaunchOrders: (orders: OrderItem[]) => Promise<void>;
    onNavigateToSettings?: () => void;
}

interface FinanceStatCardProps {
    label: string;
    value: string;
    color: 'blue' | 'red' | 'orange' | 'emerald' | 'slate' | 'purple';
    sub?: string;
    highlight?: boolean;
    breakdown?: { label: string; value: string; colorClass?: string }[];
}

const FinanceStatCard: React.FC<FinanceStatCardProps> = ({ label, value, color, sub, highlight, breakdown }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-100'
    };
    
    const baseClass = `p-5 rounded-2xl border ${colors[color]} flex flex-col justify-between h-full relative overflow-hidden transition-all hover:shadow-md`;
    const highlightClass = highlight ? 'ring-2 ring-emerald-500 shadow-lg' : 'shadow-sm';
    
    return (
        <div className={`${baseClass} ${highlightClass}`}>
            <div className="z-10 relative w-full">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{label}</p>
                <p className="text-2xl font-black tracking-tight">{value}</p>
                
                {breakdown ? (
                    <div className="mt-3 space-y-1 border-t border-black/5 pt-2">
                        {breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-bold opacity-70 uppercase tracking-tight text-[9px]">{item.label}</span>
                                <span className={`font-black ${item.colorClass || ''}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    sub && <p className="text-[10px] font-bold mt-1 opacity-60 uppercase border-t border-black/10 pt-1 inline-block">{sub}</p>
                )}
            </div>
        </div>
    );
};

const FinancePage: React.FC<FinancePageProps> = ({ allOrders, stockItems, skuLinks, produtosCombinados, generalSettings, onDeleteOrders, onLaunchOrders, onNavigateToSettings }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'materials'>('overview');
    
    // Novo: Lista de impostos
    const [taxes, setTaxes] = useState<TaxEntry[]>([
        { id: '1', name: 'Simples Nacional', type: 'percent', value: 6 }
    ]);
    
    const [rankingMetric, setRankingMetric] = useState<'revenue' | 'quantity'>('revenue');
    const [period, setPeriod] = useState<'today' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom' | 'last_upload'>('thisMonth');
    const [canalFilter, setCanalFilter] = useState<Canal | 'ALL'>('ALL');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [considerarInvalidos, setConsiderarInvalidos] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Modal states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false); // Novo modal para apagar tudo
    const [isDeleting, setIsDeleting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [dateSourceMode, setDateSourceMode] = useState<'sale_date' | 'import_date'>(generalSettings.dateSource || 'sale_date');

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const parseOrderDate = (order: OrderItem): Date | null => {
        if (dateSourceMode === 'import_date' && order.created_at) return new Date(order.created_at);
        const dateStr = String(order.data || '');
        if (!dateStr) return null;
        const dateOnly = dateStr.split(' ')[0];
        if (dateOnly.includes('-')) {
            const [y, m, d] = dateOnly.split('-');
            return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        }
        if (dateOnly.includes('/')) {
            const [d, m, y] = dateOnly.split('/');
            return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        }
        return null;
    };

    const { stats, canalComparison, taxTotal, finalNetProfit, filteredOrders, taxBreakdown } = useMemo(() => {
        const now = new Date();
        let startLimit: Date | null = null;
        let endLimit: Date | null = null;

        if (period === 'today') {
            startLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (period === 'last7days') {
            startLimit = new Date(); startLimit.setDate(now.getDate() - 7); startLimit.setHours(0,0,0,0);
        } else if (period === 'thisMonth') {
            startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        } else if (period === 'lastMonth') {
            startLimit = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
            endLimit = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        } else if (period === 'custom' && customDates.start && customDates.end) {
            startLimit = new Date(customDates.start + "T00:00:00");
            endLimit = new Date(customDates.end + "T23:59:59");
        }

        const filtered = allOrders.filter(order => {
            if (canalFilter !== 'ALL' && order.canal !== canalFilter) return false;
            if (!considerarInvalidos && (order.status === 'ERRO' || order.status === 'DEVOLVIDO')) return false;
            const d = parseOrderDate(order);
            if (!d) return false;
            if (startLimit && d < startLimit) return false;
            if (endLimit && d > endLimit) return false;
            return true;
        });

        const base = { gross: 0, fees: 0, shipping: 0, net: 0, units: 0, ranking: [] as any[] };
        const comparison = { ml: 0, shopee: 0, site: 0 };
        const skuMap = new Map<string, { revenue: number, qty: number, name: string }>();

        const groups = new Map<string, OrderItem[]>();
        filtered.forEach(o => {
            const key = o.orderId || o.tracking;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(o);
        });

        groups.forEach((group) => {
            const first = group[0];
            const isRep = generalSettings.isRepeatedValue;
            
            const gGross = isRep ? Number(first.price_total || 0) : group.reduce((s, i) => s + (i.price_total || 0), 0);
            const gFees = isRep ? Number(first.platform_fees || 0) : group.reduce((s, i) => s + (i.platform_fees || 0), 0);
            const gShip = isRep ? Number(first.shipping_fee || 0) : group.reduce((s, i) => s + (i.shipping_fee || 0), 0);
            const gCustomerShip = isRep ? Number(first.shipping_paid_by_customer || 0) : group.reduce((s, i) => s + (i.shipping_paid_by_customer || 0), 0);

            base.gross += gGross;
            base.fees += gFees;
            base.shipping += gShip;
            base.net += (gGross - gFees - gShip - gCustomerShip);
            
            if (first.canal === 'ML') comparison.ml += gGross;
            else if (first.canal === 'SHOPEE') comparison.shopee += gGross;
            else comparison.site += gGross;

            group.forEach(o => {
                base.units += o.qty_final;
                const entry = skuMap.get(o.sku) || { revenue: 0, qty: 0, name: o.sku };
                entry.revenue += o.price_gross;
                entry.qty += o.qty_final;
                skuMap.set(o.sku, entry);
            });
        });

        // Cálculo Detalhado de Impostos
        let totalTaxCalculated = 0;
        const breakdown = taxes.map(t => {
            const amt = t.type === 'percent' ? (base.gross * t.value) / 100 : t.value;
            totalTaxCalculated += amt;
            return { ...t, calculatedAmount: amt };
        });

        const finalNetProfit = base.net - totalTaxCalculated;

        base.ranking = Array.from(skuMap.entries()).map(([code, d]) => ({ code, ...d }))
            .sort((a,b) => rankingMetric === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty);

        return { stats: base, canalComparison: comparison, taxTotal: totalTaxCalculated, finalNetProfit, filteredOrders: filtered, taxBreakdown: breakdown };
    }, [allOrders, period, canalFilter, customDates, considerarInvalidos, dateSourceMode, rankingMetric, generalSettings.isRepeatedValue, taxes]);

    const handleAddTax = () => {
        setTaxes([...taxes, { id: Date.now().toString(), name: 'Novo Imposto', type: 'percent', value: 0 }]);
    };

    const handleRemoveTax = (id: string) => {
        setTaxes(taxes.filter(t => t.id !== id));
    };

    const handleUpdateTax = (id: string, field: keyof TaxEntry, value: any) => {
        setTaxes(taxes.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const materialList = calculateMaterialList(filteredOrders, skuLinks, stockItems, produtosCombinados, generalSettings.expeditionRules, generalSettings);
            const periodLabel = period === 'custom' ? `${customDates.start} a ${customDates.end}` : period;
            
            await exportFinanceReport({
                period: periodLabel,
                canal: canalFilter,
                stats,
                materialList,
                orders: filteredOrders,
                taxes: taxBreakdown // Passamos os impostos detalhados
            });
        } catch (e) {
            console.error("Erro ao exportar:", e);
        } finally {
            setIsExporting(false);
        }
    };

    // Limpar APENAS o que está filtrado
    const handleClearFilteredData = async () => {
        setIsDeleting(true);
        const idsToDelete = filteredOrders.map(o => o.id);
        if (idsToDelete.length > 0) {
            await onDeleteOrders(idsToDelete);
        }
        setIsDeleting(false);
        setIsDeleteModalOpen(false);
    };

    // Limpar TODO o banco de pedidos (Financeiro Completo)
    const handleClearAllData = async () => {
        setIsDeleting(true);
        // Pega todos os IDs de pedidos carregados no app
        const allIds = allOrders.map(o => o.id);
        if (allIds.length > 0) {
            await onDeleteOrders(allIds);
        }
        setIsDeleting(false);
        setIsDeleteAllModalOpen(false);
    };

    const hasRevenueIssue = filteredOrders.length > 0 && stats.gross === 0;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                        <DollarSign size={40} className="text-emerald-600 bg-emerald-100 p-2 rounded-2xl shadow-sm" />
                        Financeiro Estratégico
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <FileCode size={16} /> Importar XML (NFe)
                    </button>
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                        <FileUp size={16} /> Importar Planilha
                    </button>
                    <button onClick={handleExport} disabled={isExporting} className="bg-red-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50">
                         {isExporting ? <Loader2 className="animate-spin" size={16}/> : <FileDown size={16} />} Exportar PDF
                    </button>
                </div>
            </div>

            {hasRevenueIssue && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm animate-pulse">
                    <div className="flex items-center">
                        <AlertTriangle className="text-amber-600 mr-3" size={24} />
                        <div>
                            <h3 className="text-lg font-bold text-amber-800">Atenção: Faturamento Zerado</h3>
                            <p className="text-sm text-amber-700">
                                Existem {filteredOrders.length} pedidos neste período, mas o valor total é R$ 0,00. 
                                <br/>Isso indica que as colunas financeiras (Valor Total, Preço) não foram mapeadas corretamente na importação.
                            </p>
                            <button 
                                onClick={onNavigateToSettings}
                                className="mt-2 text-sm font-black text-amber-800 underline hover:text-amber-900"
                            >
                                Ir para Configurações Gerais corrigir o mapeamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Painel de Filtros e Impostos */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                            <Settings size={14} className="text-blue-500"/> Configuração de Impostos (Fiscal)
                        </h3>
                        <p className="text-[10px] text-gray-400">Adicione aqui os impostos que serão deduzidos do faturamento bruto para o cálculo de lucro líquido.</p>
                        <div className="space-y-3">
                            {taxes.map(tax => (
                                <div key={tax.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 relative group">
                                    <button onClick={() => handleRemoveTax(tax.id)} className="absolute -top-2 -right-2 bg-white border shadow-sm p-1 rounded-full text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Minus size={12}/>
                                    </button>
                                    <input 
                                        type="text" 
                                        value={tax.name} 
                                        onChange={e => handleUpdateTax(tax.id, 'name', e.target.value)}
                                        className="w-full bg-transparent border-b border-slate-200 font-bold text-xs outline-none focus:border-blue-500"
                                        placeholder="Nome do Imposto"
                                    />
                                    <div className="flex gap-2">
                                        <select 
                                            value={tax.type} 
                                            onChange={e => handleUpdateTax(tax.id, 'type', e.target.value)}
                                            className="bg-white border rounded-lg text-[10px] font-black p-1"
                                        >
                                            <option value="percent">%</option>
                                            <option value="fixed">R$</option>
                                        </select>
                                        <input 
                                            type="number" 
                                            value={tax.value} 
                                            onChange={e => handleUpdateTax(tax.id, 'value', Number(e.target.value))}
                                            className="flex-1 bg-white border rounded-lg p-1 text-xs font-black text-right outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddTax} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase hover:bg-slate-50 hover:border-blue-200 transition-all flex items-center justify-center gap-2">
                                <Plus size={14}/> Adicionar Imposto
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                            <PieChart size={14} className="text-blue-500"/> Filtros de Visão
                        </h3>
                        <div className="space-y-3">
                            <select value={period} onChange={e => setPeriod(e.target.value as any)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="thisMonth">Mês Atual</option>
                                <option value="lastMonth">Mês Passado</option>
                                <option value="last7days">Últimos 7 Dias</option>
                                <option value="today">Hoje</option>
                                <option value="custom">Período Customizado</option>
                            </select>
                            <select value={canalFilter} onChange={e => setCanalFilter(e.target.value as any)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="ALL">Todos os Canais</option>
                                <option value="ML">Mercado Livre</option>
                                <option value="SHOPEE">Shopee</option>
                                <option value="SITE">Site / Outros</option>
                            </select>
                        </div>
                    </div>

                    {/* Botões de Limpeza */}
                    <div className="space-y-3">
                        <button 
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14}/> Limpar Filtro Atual
                        </button>
                        <button 
                            onClick={() => setIsDeleteAllModalOpen(true)}
                            className="w-full py-3 bg-red-100 text-red-700 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-red-200 transition-all flex items-center justify-center gap-2 border border-red-200"
                        >
                            <AlertTriangle size={14}/> Zerar Tudo (Reset)
                        </button>
                    </div>
                </div>

                {/* Dashboard Financeiro Principal */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FinanceStatCard label="Faturamento Bruto (Pedidos)" value={fmt(stats.gross)} color="blue" sub={`${stats.units} unidades vendidas`} />
                        <FinanceStatCard 
                            label="Deduções Marketplace" 
                            value={fmt(stats.fees + stats.shipping)} 
                            color="orange" 
                            breakdown={[
                                { label: 'Comissões', value: fmt(stats.fees) },
                                { label: 'Fretes Empresa', value: fmt(stats.shipping) }
                            ]}
                        />
                        <FinanceStatCard 
                            label="Impostos (Cálculo Fiscal)" 
                            value={fmt(taxTotal)} 
                            color="purple" 
                            breakdown={taxBreakdown.map(t => ({ label: t.name, value: fmt(t.calculatedAmount) }))}
                        />
                        <FinanceStatCard 
                            label="Líquido Final" 
                            value={fmt(finalNetProfit)} 
                            color="emerald" 
                            highlight 
                            sub="Resultado após taxas e impostos"
                        />
                    </div>

                    {canalFilter === 'ALL' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-5 bg-yellow-50 border border-yellow-100 rounded-3xl flex justify-between items-center">
                                <div><p className="text-[9px] font-black text-yellow-600 uppercase mb-1">Mercado Livre</p><p className="text-xl font-black text-yellow-800">{fmt(canalComparison.ml)}</p></div>
                                <Landmark size={24} className="text-yellow-200"/>
                            </div>
                            <div className="p-5 bg-orange-50 border border-orange-100 rounded-3xl flex justify-between items-center">
                                <div><p className="text-[9px] font-black text-orange-600 uppercase mb-1">Shopee</p><p className="text-xl font-black text-orange-800">{fmt(canalComparison.shopee)}</p></div>
                                <Landmark size={24} className="text-orange-200"/>
                            </div>
                            <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl flex justify-between items-center">
                                <div><p className="text-[9px] font-black text-blue-600 uppercase mb-1">Site / Outros</p><p className="text-xl font-black text-blue-800">{fmt(canalComparison.site)}</p></div>
                                <Landmark size={24} className="text-blue-200"/>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-600"/> Performance de Vendas por SKU
                            </h3>
                            <div className="flex bg-slate-200 p-1 rounded-xl">
                                <button onClick={() => setRankingMetric('revenue')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${rankingMetric === 'revenue' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Por Receita</button>
                                <button onClick={() => setRankingMetric('quantity')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${rankingMetric === 'quantity' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Por Qtd</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Pos</th>
                                        <th className="px-6 py-4 text-left">Produto Mestre</th>
                                        <th className="px-6 py-4 text-center">Unidades</th>
                                        <th className="px-6 py-4 text-right">Bruto Acordado</th>
                                        <th className="px-6 py-4 text-right">% de Peso</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                                    {stats.ranking.slice(0, 30).map((item, idx) => (
                                        <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-xs text-slate-400">#{idx+1}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-slate-800 uppercase leading-tight">{item.name}</p>
                                                <p className="text-[9px] font-mono text-slate-400">{item.code}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">{item.qty}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-800">{fmt(item.revenue)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                                    {((item.revenue / (stats.gross || 1)) * 100).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <FinanceImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                allOrders={allOrders}
                generalSettings={generalSettings}
                onLaunchOrders={onLaunchOrders}
            />
            
            <ConfirmActionModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={handleClearFilteredData} 
                title="Limpar Histórico Filtrado" 
                message={<p>Deseja excluir permanentemente os pedidos filtrados deste período? Esta ação é irreversível.</p>}
                confirmButtonText="Confirmar Exclusão"
                isConfirming={isDeleting}
            />

            <ConfirmActionModal 
                isOpen={isDeleteAllModalOpen} 
                onClose={() => setIsDeleteAllModalOpen(false)} 
                onConfirm={handleClearAllData} 
                title="Zerar Todo o Financeiro" 
                message={<><p><strong>ATENÇÃO:</strong> Você está prestes a apagar <strong>TODOS OS PEDIDOS ({allOrders.length})</strong> do banco de dados.</p><p className="mt-2 text-sm">Isso limpará completamente o histórico financeiro, relatórios de vendas e vínculos de bipagem de todos os pedidos.</p><p className="mt-2 text-red-600 font-bold uppercase">Esta ação é irreversível.</p></>}
                confirmButtonText="Sim, Zerar Tudo"
                isConfirming={isDeleting}
            />
        </div>
    );
};

export default FinancePage;
