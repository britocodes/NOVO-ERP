import React, { useMemo, useState, useEffect } from 'react';
import Header from '../components/Header';
import ActionCard from '../components/ActionCard';
import RecentActivity from '../components/RecentActivity';
import SystemAlerts from '../components/SystemAlerts';
import DashboardSettingsModal from '../components/DashboardSettingsModal';
import StatCardV2, { StatCardViewData } from '../components/StatCardV2';
import AdminNotices from '../components/AdminNotices';
import ProductionSummary from '../components/ProductionSummary';
import PackGroupModal from '../components/PackGroupModal';
import PackGroupDetailModal from '../components/PackGroupDetailModal';
import { ActionCardData, AlertItemData, DashboardFilters, AlertLevel, GeneralSettings, ScanLogItem, ActivityType, ActivityItemData, OrderItem, StockItem, User, Canal, UiSettings, AdminNotice, SkuLink, ProductionSummaryData, DeducedMaterial, ProdutoCombinado, Period, DashboardWidgetConfig, StockPackGroup, ProductionStats } from '../types';
// Added DollarSign to the list of icons imported from lucide-react
import { Package, Scan, BarChart2, ShoppingCart, Archive, AlertTriangle, AlertCircle, ShieldCheck, Printer, CheckCheck, TrendingUp, Users, Factory, Box, Calendar, RefreshCw, Eye, Settings, DollarSign } from 'lucide-react';

interface DashboardPageProps {
    setCurrentPage: (page: string) => void;
    generalSettings: GeneralSettings;
    allOrders: OrderItem[];
    scanHistory: ScanLogItem[];
    stockItems: StockItem[];
    produtosCombinados: ProdutoCombinado[];
    users: User[];
    lowStockCount: number;
    uiSettings: UiSettings;
    onSaveUiSettings: (settings: UiSettings) => void;
    adminNotices: AdminNotice[];
    onSaveNotice: (notice: AdminNotice) => void;
    onDeleteNotice: (id: string) => void;
    currentUser: User;
    skuLinks: SkuLink[];
    onSaveDashboardConfig: (config: DashboardWidgetConfig) => void;
    packGroups: StockPackGroup[];
    onSavePackGroup: (group: Omit<StockPackGroup, 'id'>, id?: string) => Promise<void>;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const getPeriodDates = (period: Period) => {
    const end = new Date();
    const start = new Date();
    switch (period) {
        case 'today':
            break;
        case 'last7days':
            start.setDate(start.getDate() - 6);
            break;
    }
    const getISODate = (d: Date) => d.toISOString().split('T')[0];
    return { startDate: getISODate(start), endDate: getISODate(end) };
};

const getOrderDate = (order: OrderItem, dateSource: 'sale_date' | 'import_date'): Date | null => {
    if (dateSource === 'import_date' && order.created_at) return new Date(order.created_at);
    const dStr = String(order.data || '');
    if (!dStr) return null;
    if (dStr.includes('-')) {
        const [y, m, d] = dStr.split('-');
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    } else if (dStr.includes('/')) {
        const [d, m, y] = dStr.split('/');
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    }
    return null;
}

const DashboardPage: React.FC<DashboardPageProps> = (props) => {
    const { setCurrentPage, generalSettings, allOrders, scanHistory, stockItems, produtosCombinados, users, lowStockCount, uiSettings, onSaveUiSettings, adminNotices, onSaveNotice, onDeleteNotice, currentUser, skuLinks, packGroups, onSavePackGroup } = props;
    
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [viewingPackGroup, setViewingPackGroup] = useState<StockPackGroup | null>(null);
    const [editingPackGroup, setEditingPackGroup] = useState<StockPackGroup | null>(null);
    
    const [filters, setFilters] = useState<DashboardFilters>({ 
        period: 'today', 
        canal: 'ALL',
        startDate: getTodayString(),
        endDate: getTodayString(),
        compare: false,
    });
    
    const [dateSourceMode, setDateSourceMode] = useState<'sale_date' | 'import_date'>(generalSettings.dateSource || 'sale_date');

    useEffect(() => {
        if (filters.period === 'custom') return;
        const { startDate, endDate } = getPeriodDates(filters.period);
        if (filters.startDate !== startDate || filters.endDate !== endDate) {
            setFilters(f => ({ ...f, startDate, endDate }));
        }
    }, [filters.period]);

    const [activeStatCardIndex, setActiveStatCardIndex] = useState(0);

    const productionSummary = useMemo(() => {
        const linkedSkusMap = new Map<string, string>(skuLinks.map(link => [link.importedSku.toUpperCase(), link.masterProductSku.toUpperCase()]));
        const stockItemMap = new Map<string, StockItem>(stockItems.map(item => [item.code.toUpperCase(), item]));
        const { baseColorConfig } = generalSettings;

        const calculateStats = (orders: OrderItem[]): ProductionStats => {
            const totalPedidos = new Set(orders.map(o => o.orderId)).size;
            if (orders.length === 0) return { totalPedidos: 0, totalPacotes: 0, totalUnidades: 0, totalUnidadesBranca: 0, totalUnidadesPreta: 0, totalUnidadesEspecial: 0, totalMiudos: 0, miudos: {} };

            const miudosMap = new Map<string, number>();
            let white = 0, black = 0, special = 0, wallUnits = 0, totalMiudos = 0;
            
            orders.forEach(order => {
                const skuUpper = order.sku.toUpperCase();
                const masterSku = linkedSkusMap.get(skuUpper) || skuUpper;
                const masterProduct = stockItemMap.get(masterSku);
                
                if (masterProduct?.product_type === 'papel_de_parede') {
                    wallUnits += order.qty_final;
                    const baseType = baseColorConfig[masterSku];
                    if (baseType?.type === 'preta') black += order.qty_final;
                    else if (baseType?.type === 'especial') special += order.qty_final;
                    else white += order.qty_final;
                } else if (masterProduct?.product_type === 'miudos') {
                     miudosMap.set(masterProduct.name, (miudosMap.get(masterProduct.name) || 0) + order.qty_final);
                     totalMiudos += order.qty_final;
                }
            });
            
            const miudos: { [category: string]: number } = {};
            miudosMap.forEach((qty, name) => { miudos[name] = qty; });

            return { totalPedidos, totalPacotes: orders.length, totalUnidades: wallUnits, totalUnidadesBranca: white, totalUnidadesPreta: black, totalUnidadesEspecial: special, totalMiudos, miudos };
        };

        const getOrdersInPeriod = (start?: string, end?: string) => {
            if (!start || !end) return [];
            const sDate = new Date(`${start}T00:00:00Z`);
            const eDate = new Date(`${end}T23:59:59Z`);
            return allOrders.filter(o => {
                const d = getOrderDate(o, dateSourceMode);
                return d && d >= sDate && d <= eDate;
            });
        };

        const mainPeriodOrders = getOrdersInPeriod(filters.startDate, filters.endDate);
        const filteredOrders = filters.canal === 'ALL' ? mainPeriodOrders : mainPeriodOrders.filter(o => o.canal === filters.canal);
        
        return { main: { ml: calculateStats(filteredOrders.filter(o => o.canal === 'ML')), shopee: calculateStats(filteredOrders.filter(o => o.canal === 'SHOPEE')), total: calculateStats(filteredOrders) } };
    }, [filters, allOrders, skuLinks, stockItems, generalSettings, dateSourceMode]);

    const materialDeductions = useMemo((): DeducedMaterial[] => {
        if (!filters.startDate || !filters.endDate) return [];
        const start = new Date(`${filters.startDate}T00:00:00Z`);
        const end = new Date(`${filters.endDate}T23:59:59Z`);
        const orders = allOrders.filter(o => {
            const d = getOrderDate(o, dateSourceMode);
            return d && d >= start && d <= end;
        });

        const skuMap = new Map<string, string>(skuLinks.map(l => [l.importedSku.toUpperCase(), l.masterProductSku.toUpperCase()]));
        const requirements = new Map<string, number>();
        const stockMap = new Map<string, StockItem>(stockItems.map(i => [i.code.toUpperCase(), i]));
        const bomMap = new Map<string, ProdutoCombinado>(produtosCombinados.map(b => [b.productSku.toUpperCase(), b]));

        const explode = (code: string, qty: number) => {
            const bom = bomMap.get(code.toUpperCase());
            if (!bom) return;
            bom.items.forEach(bi => {
                const item = stockMap.get(bi.stockItemCode.toUpperCase());
                if (!item) return;
                const needed = qty * Number(bi.qty_per_pack || 0);
                if (item.kind === 'PROCESSADO') {
                    requirements.set(item.code, (requirements.get(item.code) || 0) + needed);
                    explode(item.code, needed);
                } else {
                    requirements.set(item.code, (requirements.get(item.code) || 0) + needed);
                }
            });
        };

        orders.forEach(o => {
            const skuU = o.sku.toUpperCase();
            explode(skuMap.get(skuU) || skuU, o.qty_final);
        });

        return Array.from(requirements.entries()).map(([code, quantity]) => {
            const item = stockMap.get(code.toUpperCase());
            return { name: item?.name || code, quantity, unit: item?.unit || 'un' };
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [filters, allOrders, skuLinks, produtosCombinados, stockItems, dateSourceMode]);

    const primaryActionCards: ActionCardData[] = [
        { title: 'Bipar Pedidos', description: 'Scanner de códigos', icon: <Scan size={24} className="text-blue-600" />, iconBgColor: 'bg-blue-100', page: 'bipagem' },
        { title: 'Importação', description: 'Planilhas de venda', icon: <ShoppingCart size={24} className="text-red-600" />, iconBgColor: 'bg-red-100', page: 'importer' },
        { title: 'Estoque', description: 'Insumos e Receitas', icon: <Archive size={24} className="text-green-600" />, iconBgColor: 'bg-green-100', page: 'estoque' },
        { title: 'Financeiro', description: 'Análise estratégica', icon: <DollarSign size={24} className="text-emerald-600" />, iconBgColor: 'bg-emerald-100', page: 'financeiro' },
    ];

    return (
        <>
            <Header filters={filters} onFilterChange={setFilters} onSettingsClick={() => setIsSettingsModalOpen(true)} generalSettings={generalSettings} />
            
            <div className="flex justify-end -mt-6 mb-4 px-4">
                <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                    <button onClick={() => setDateSourceMode('sale_date')} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${dateSourceMode === 'sale_date' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Calendar size={12}/> Venda (Planilha)
                    </button>
                    <button onClick={() => setDateSourceMode('import_date')} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${dateSourceMode === 'import_date' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <RefreshCw size={12}/> Importação (Sistema)
                    </button>
                </div>
            </div>
            
            <div className="mt-4">
                {currentUser.role !== 'OPERATOR' && <AdminNotices notices={adminNotices} currentUser={currentUser} onSaveNotice={onSaveNotice} onDeleteNotice={onDeleteNotice} />}
                
                <ProductionSummary 
                    olderData={productionSummary.main.total}
                    olderTitle={filters.period === 'today' ? `Hoje (${new Date(`${filters.startDate}T12:00:00`).toLocaleDateString()})` : `Período: ${new Date(`${filters.startDate}T12:00:00`).toLocaleDateString()} a ${new Date(`${filters.endDate}T12:00:00`).toLocaleDateString()}`}
                    productTypeName={generalSettings.productTypeNames.papel_de_parede}
                    miudosTypeName={generalSettings.productTypeNames.miudos}
                />

                {generalSettings.dashboard.showPackGroups && packGroups.length > 0 && (
                    <div className="mt-8 bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tighter flex items-center gap-2"><Box size={20} className="text-blue-500"/> Status de Pacotes Prontos</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {packGroups.map(group => {
                                const currentTotal = stockItems.filter(i => group.item_codes.includes(i.code)).reduce((sum, i) => sum + i.current_qty, 0);
                                const isBelowMin = currentTotal < group.min_pack_qty;
                                return (
                                    <div key={group.id} onClick={() => setViewingPackGroup(group)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-xl group relative overflow-hidden ${isBelowMin ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 hover:border-blue-300'}`}>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-full shadow-md text-blue-600">
                                            <Eye size={14}/>
                                        </div>
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="pr-8">
                                                <p className="font-black text-slate-700 text-xs uppercase truncate">{group.name}</p>
                                                {group.barcode && <p className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase tracking-tighter">Barcode: {group.barcode}</p>}
                                            </div>
                                            {isBelowMin && <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />}
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                            <p className={`text-2xl font-black ${isBelowMin ? 'text-red-600' : 'text-emerald-600'}`}>{currentTotal.toFixed(0)} <span className="text-[10px] text-slate-400">UN</span></p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Mín: {group.min_pack_qty}</p>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div className={`h-full transition-all duration-1000 ${isBelowMin ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (currentTotal / (group.min_pack_qty || 1)) * 100)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {materialDeductions.length > 0 && (
                    <div className="mt-8 bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tighter flex items-center gap-2"><Package size={20} className="text-blue-500"/> Dedução de Materiais Prevista</h2>
                        <div className="overflow-x-auto rounded-xl border">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50"><tr className="text-slate-500 font-bold"><th className="px-4 py-2 text-left">Material</th><th className="px-4 py-2 text-center">Necessidade Total</th></tr></thead>
                                <tbody>{materialDeductions.map(item => (<tr key={item.name} className="border-t"><td className="px-4 py-2 font-bold text-slate-700">{item.name}</td><td className="px-4 py-2 text-center font-black text-blue-600">{item.quantity.toFixed(3)} {item.unit}</td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCardV2 title="Pedidos" icon={<ShoppingCart size={20}/>} views={[{ id: 'total', label: 'Total', value: String(allOrders.filter(o => o.status !== 'ERRO').length), subValue: 'Pedidos ativos', color: 'blue'}]} activeIndex={0} onIndicatorClick={()=>{}} />
                    <StatCardV2 title="Bipados" icon={<CheckCheck size={20}/>} views={[{ id: 'total', label: 'Bipados', value: String(scanHistory.filter(s => s.status === 'OK' || s.synced).length), subValue: 'Sucessos hoje', color: 'blue'}]} activeIndex={0} onIndicatorClick={()=>{}} />
                    <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
                        <p className="text-gray-500 font-bold text-xs uppercase">Estoque Baixo</p>
                        <div className="flex justify-between items-end mt-2"><p className="text-3xl font-black text-red-600">{lowStockCount}</p><div className="p-2 bg-red-100 text-red-600 rounded-lg"><Archive size={20}/></div></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
                        <p className="text-gray-500 font-bold text-xs uppercase">Equipe</p>
                        <div className="flex justify-between items-end mt-2"><p className="text-3xl font-black text-slate-800">{users.length}</p><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users size={20}/></div></div>
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {primaryActionCards.map(action => (
                        <div key={action.title} onClick={() => setCurrentPage(action.page)} className="cursor-pointer">
                            <ActionCard data={action} />
                        </div>
                    ))}
                </div>
            </div>
            
            <DashboardSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} currentSettings={uiSettings} onSave={onSaveUiSettings} setCurrentPage={setCurrentPage} />
            <PackGroupDetailModal 
                isOpen={!!viewingPackGroup} 
                onClose={() => setViewingPackGroup(null)} 
                group={viewingPackGroup} 
                stockItems={stockItems} 
                onEdit={(g) => { setViewingPackGroup(null); setEditingPackGroup(g); }} 
            />
            <PackGroupModal isOpen={!!editingPackGroup} onClose={() => setEditingPackGroup(null)} groupToEdit={editingPackGroup} allProducts={stockItems.filter(i => i.kind === 'PRODUTO')} onSave={onSavePackGroup} />
        </>
    );
};

export default DashboardPage;