
import React, { useMemo, useState, useEffect } from 'react';
import Header from '../components/Header';
import ActionCard from '../components/ActionCard';
import RecentActivity from '../components/RecentActivity';
import SystemAlerts from '../components/SystemAlerts';
import DashboardSettingsModal from '../components/DashboardSettingsModal';
import StatCardV2, { StatCardViewData } from '../components/StatCardV2';
import AdminNotices from '../components/AdminNotices';
import ProductionSummary from '../components/ProductionSummary';
import { ActionCardData, AlertItemData, DashboardFilters, AlertLevel, GeneralSettings, ScanLogItem, ActivityType, ActivityItemData, OrderItem, StockItem, User, Canal, UiSettings, AdminNotice, SkuLink, ProductionSummaryData, DeducedMaterial, ProdutoCombinado, Period, DashboardWidgetConfig, ProductionStats } from '../types';
import { Package, Scan, BarChart2, ShoppingCart, Archive, AlertTriangle, AlertCircle, ShieldCheck, Printer, CheckCheck, TrendingUp, Users, Factory } from 'lucide-react';

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

const DashboardPage: React.FC<DashboardPageProps> = (props) => {
    const { setCurrentPage, generalSettings, allOrders, scanHistory, stockItems, produtosCombinados, users, lowStockCount, uiSettings, onSaveUiSettings, adminNotices, onSaveNotice, onDeleteNotice, currentUser, skuLinks } = props;
    
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
    const [filters, setFilters] = useState<DashboardFilters>({ 
        period: 'today', 
        canal: 'ALL',
        startDate: getTodayString(),
        endDate: getTodayString(),
        compare: false,
    });
    
    useEffect(() => {
        if (filters.period === 'custom') {
            return;
        }
        const { startDate, endDate } = getPeriodDates(filters.period);
        if (filters.startDate !== startDate || filters.endDate !== endDate) {
            setFilters(f => ({ ...f, startDate, endDate }));
        }
    }, [filters.period]);

    const [activeStatCardIndex, setActiveStatCardIndex] = useState(0);

    const productionSummary = useMemo(() => {
        const linkedSkusMap = new Map<string, string>(skuLinks.map(link => [link.importedSku, link.masterProductSku]));
        const stockItemMap = new Map<string, StockItem>(stockItems.map(item => [item.code, item]));
        const { baseColorConfig } = generalSettings;

        // FIX: Updated calculateStats to return all required properties of ProductionStats (totalPacotes, totalMiudos)
        const calculateStats = (orders: OrderItem[]): ProductionStats => {
            if (orders.length === 0) {
                return { totalPedidos: 0, totalPacotes: 0, totalUnidades: 0, totalUnidadesBranca: 0, totalUnidadesPreta: 0, totalUnidadesEspecial: 0, totalMiudos: 0, miudos: {} };
            }

            const miudosMap = new Map<string, number>();
            let totalUnidadesBranca = 0;
            let totalUnidadesPreta = 0;
            let totalUnidadesEspecial = 0;
            let totalPapelDeParedeUnidades = 0;
            let totalMiudosCount = 0;
            
            orders.forEach(order => {
                const masterSku = linkedSkusMap.get(order.sku);
                const masterProduct = masterSku ? stockItemMap.get(masterSku) : undefined;
                
                if (masterProduct?.product_type === 'papel_de_parede') {
                    totalPapelDeParedeUnidades += order.qty_final;
                    const baseType = masterSku ? baseColorConfig[masterSku] : undefined;
                    if (baseType?.type === 'preta') totalUnidadesPreta += order.qty_final;
                    else if (baseType?.type === 'especial') totalUnidadesEspecial += order.qty_final;
                    else totalUnidadesBranca += order.qty_final;
                } else if (masterProduct?.product_type === 'miudos') {
                     const productName = masterProduct.name;
                     miudosMap.set(productName, (miudosMap.get(productName) || 0) + order.qty_final);
                     totalMiudosCount += order.qty_final;
                }
            });
            
            const miudos: { [category: string]: number } = {};
            miudosMap.forEach((quantity, name) => {
                miudos[name] = quantity;
            });

            return {
                totalPedidos: new Set(orders.map(o => o.orderId)).size,
                totalPacotes: orders.length,
                totalUnidades: totalPapelDeParedeUnidades,
                totalUnidadesBranca,
                totalUnidadesPreta,
                totalUnidadesEspecial,
                totalMiudos: totalMiudosCount,
                miudos,
            };
        };

        const getOrdersInPeriod = (start?: string, end?: string) => {
            if (!start || !end) return [];
            const startDate = new Date(`${start}T00:00:00Z`);
            const endDate = new Date(`${end}T23:59:59Z`);
            return allOrders.filter(o => {
                const orderDateStr = String(o.data || '').split('/').reverse().join('-');
                if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateStr)) return false;
                const orderDate = new Date(orderDateStr + "T12:00:00");
                if (isNaN(orderDate.getTime())) return false;
                return orderDate >= startDate && orderDate <= endDate;
            });
        };

        const mainPeriodOrders = getOrdersInPeriod(filters.startDate, filters.endDate);
        const ordersForTotalCalculation = filters.canal === 'ALL'
            ? mainPeriodOrders
            : mainPeriodOrders.filter(o => o.canal === filters.canal);

        const mainMl = ordersForTotalCalculation.filter(o => o.canal === 'ML');
        const mainShopee = ordersForTotalCalculation.filter(o => o.canal === 'SHOPEE');
        
        const mainResult: ProductionSummaryData = {
            ml: calculateStats(mainMl),
            shopee: calculateStats(mainShopee),
            total: calculateStats(ordersForTotalCalculation)
        };
        
        let compareResult: ProductionSummaryData | null = null;
        if (filters.compare && filters.compareStartDate && filters.compareEndDate) {
            const comparePeriodOrders = getOrdersInPeriod(filters.compareStartDate, filters.compareEndDate);
            const compareOrdersForTotal = filters.canal === 'ALL'
                ? comparePeriodOrders
                : comparePeriodOrders.filter(o => o.canal === filters.canal);
            
            const compareMl = compareOrdersForTotal.filter(o => o.canal === 'ML');
            const compareShopee = compareOrdersForTotal.filter(o => o.canal === 'SHOPEE');
            compareResult = {
                ml: calculateStats(compareMl),
                shopee: calculateStats(compareShopee),
                total: calculateStats(compareOrdersForTotal)
            };
        }
        
        return { main: mainResult, compare: compareResult };

    }, [filters, allOrders, skuLinks, stockItems, generalSettings]);
    
    const materialDeductions = useMemo((): DeducedMaterial[] => {
        if (!filters.startDate || !filters.endDate) return [];
        
        const startDate = new Date(`${filters.startDate}T00:00:00Z`);
        const endDate = new Date(`${filters.endDate}T23:59:59Z`);
        
        const ordersInPeriod = allOrders.filter(o => {
            const orderDateStr = String(o.data || '').split('/').reverse().join('-');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateStr)) return false;
            const orderDate = new Date(orderDateStr + "T12:00:00");
            if (isNaN(orderDate.getTime())) return false;
            return orderDate >= startDate && orderDate <= endDate;
        });

        const linkedSkusMap = new Map<string, string>(skuLinks.map(link => [link.importedSku, link.masterProductSku]));
        const totalRequirements = new Map<string, number>();
        const stockMap = new Map<string, StockItem>(stockItems.map(i => [i.code, i]));
        const bomMap = new Map<string, ProdutoCombinado>(produtosCombinados.map(b => [b.productSku, b]));

        const explodeBom = (productCode: string, quantity: number) => {
            const bom = bomMap.get(productCode);
            if (!bom) return;
            
            for (const bomItem of (bom.items as ProdutoCombinado['items'])) {
                const insumo = stockMap.get(bomItem.stockItemCode);
                if (!insumo) continue;
                
                const needed = quantity * Number(bomItem.qty_per_pack || 0);
                
                if (insumo.kind === 'PROCESSADO') {
                    totalRequirements.set(insumo.code, (totalRequirements.get(insumo.code) || 0) + needed);
                    explodeBom(insumo.code, needed);
                } else { 
                    totalRequirements.set(insumo.code, (totalRequirements.get(insumo.code) || 0) + needed);
                }
            }
        };

        ordersInPeriod.forEach(order => {
            const masterSku = linkedSkusMap.get(order.sku);
            if (masterSku) {
                explodeBom(masterSku, order.qty_final);
            }
        });

        return Array.from(totalRequirements.entries())
            .map(([code, quantity]) => {
                const item = stockMap.get(code);
                return {
                    name: item?.name || code,
                    quantity,
                    unit: item?.unit || 'un',
                };
            })
            .sort((a,b) => a.name.localeCompare(b.name));

    }, [filters, allOrders, skuLinks, produtosCombinados, stockItems]);

    const dashboardData = useMemo(() => {
        let start: Date;
        const end = new Date();
        end.setHours(23, 59, 59, 999);
    
        switch (filters.period) {
            case 'today':
                start = new Date();
                start.setHours(0, 0, 0, 0);
                break;
            case 'last7days':
                start = new Date();
                start.setDate(start.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                break;
            case 'custom':
                start = filters.startDate ? new Date(`${filters.startDate}T00:00:00Z`) : new Date(0);
                if (filters.endDate) {
                    const customEnd = new Date(`${filters.endDate}T23:59:59Z`);
                    end.setTime(customEnd.getTime());
                }
                break;
        }
    
        const periodOrders = allOrders.filter(o => {
            const orderDateStr = String(o.data || '').split('/').reverse().join('-');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateStr)) return false;
            const orderDate = new Date(orderDateStr + "T12:00:00Z");
            if (isNaN(orderDate.getTime())) return false;
            return orderDate >= start && orderDate <= end;
        });

        const filteredPeriodOrders = filters.canal === 'ALL'
            ? periodOrders
            : periodOrders.filter(o => o.canal === filters.canal);
    
        const filteredScans = scanHistory.filter(s => {
            const scanDate = s.time;
            if (!scanDate || isNaN(scanDate.getTime())) return false;
            return scanDate >= start && scanDate <= end;
        });
    
        const getScansForCanal = (canal: Canal | 'ALL') => {
            if (canal === 'ALL') return filteredScans;
            return filteredScans.filter(s => s.canal === canal);
        };
    
        const calculateScanStatsForCanal = (canal: Canal | 'ALL') => {
            const scans = getScansForCanal(canal);
            const okScans = scans.filter(s => s.status === 'OK' || s.status === 'ADJUSTED' || s.synced);
            const duplicate = scans.filter(s => s.status === 'DUPLICATE').length;
            const notFound = scans.filter(s => s.status === 'NOT_FOUND').length;
            return { ok: okScans.length, duplicate, notFound };
        };
    
        const calculateDelayedCountForCanal = (canal: Canal | 'ALL') => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const ordersForCanal = canal === 'ALL' ? allOrders : allOrders.filter(o => o.canal === canal);
    
            return ordersForCanal.filter(o => {
                const orderDateStr = String(o.data || '').split('/').reverse().join('-');
                if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateStr)) return false;
                const orderDate = new Date(orderDateStr + "T12:00:00Z");
                if (isNaN(orderDate.getTime())) return false;
                orderDate.setHours(0, 0, 0, 0);
                return o.status === 'NORMAL' && orderDate < today;
            }).length;
        };
    
        const scansInPeriod = getScansForCanal(filters.canal);
    
        const recentActivity: ActivityItemData[] = scansInPeriod.slice(0, 5).map(s => ({ 
            id: s.id, 
            type: ActivityType.OrderScanned, 
            title: `Pedido ${s.displayKey} bipado`, 
            description: `por ${s.user}`, 
            time: s.time && !isNaN(s.time.getTime()) ? s.time.toLocaleTimeString('pt-BR') : 'Hora inválida'
        }));
    
        return {
            stats: {
                total: calculateScanStatsForCanal('ALL'),
                ml: calculateScanStatsForCanal('ML'),
                shopee: calculateScanStatsForCanal('SHOPEE'),
            },
            delayed: {
                total: calculateDelayedCountForCanal('ALL'),
                ml: calculateDelayedCountForCanal('ML'),
                shopee: calculateDelayedCountForCanal('SHOPEE'),
            },
            orders: {
                total: filteredPeriodOrders.length,
                ml: filteredPeriodOrders.filter(o => o.canal === 'ML').length,
                shopee: filteredPeriodOrders.filter(o => o.canal === 'SHOPEE').length,
            },
            itensEmEstoque: { total: stockItems.length, belowMin: lowStockCount },
            funcionariosAtivos: { total: users.length },
            atividadesRecentes: recentActivity,
            alertasSistema: { 
                abaixoMinimo: lowStockCount, 
                duplicados: scansInPeriod.filter(s => s.status === 'DUPLICATE').length 
            }
        };
    }, [filters, scanHistory, stockItems, users, lowStockCount, allOrders]);


    const primaryActionCards: ActionCardData[] = [
        { title: 'Bipar Pedidos', description: 'Scanner de códigos de barras/QR', icon: <Scan size={24} className="text-blue-600" />, iconBgColor: 'bg-blue-100', page: 'bipagem' },
        { title: 'ML/Shopee', description: 'Importar planilhas de venda', icon: <ShoppingCart size={24} className="text-red-600" />, iconBgColor: 'bg-red-100', page: 'importer' },
        { title: 'Gestão de Estoque', description: 'Produtos, Receitas e importações', icon: <Archive size={24} className="text-green-600" />, iconBgColor: 'bg-green-100', page: 'estoque' },
        { title: 'Relatórios', description: 'Análises e exportações', icon: <BarChart2 size={24} className="text-yellow-600" />, iconBgColor: 'bg-yellow-100', page: 'relatorios' },
    ];
    
    const toolsActionCards: ActionCardData[] = [
        { title: 'Gerador de Etiquetas ZPL', description: 'Converter ZPL para PDF', icon: <Printer size={24} className="text-purple-600" />, iconBgColor: 'bg-purple-100', page: 'etiquetas' }
    ];

    const cardDataViews = useMemo(() => {
        const { stats, orders, delayed } = dashboardData;
        
        const allPedidosViews: StatCardViewData[] = [
            { id: 'total', label: 'Total', value: orders.total.toString(), subValue: 'Pedidos importados no período', color: 'blue'},
            { id: 'ml', label: 'ML', value: orders.ml.toString(), subValue: 'Pedidos do Mercado Livre', color: 'yellow'},
            { id: 'shopee', label: 'Shopee', value: orders.shopee.toString(), subValue: 'Pedidos da Shopee', color: 'orange'},
        ];

        const allBipadosViews: StatCardViewData[] = [
             { id: 'total', label: 'Total Bipados', value: stats.total.ok.toString(), subValue: 'Pedidos escaneados com sucesso', color: 'blue'},
             { id: 'ml', label: 'ML Bipados', value: stats.ml.ok.toString(), subValue: 'Pedidos do Mercado Livre', color: 'yellow'},
             { id: 'shopee', label: 'Shopee Bipados', value: stats.shopee.ok.toString(), subValue: 'Pedidos da Shopee', color: 'orange'},
        ];
        
        const allAtrasosViews: StatCardViewData[] = [
             { id: 'total', label: 'Atrasados Total', value: delayed.total.toString(), subValue: 'Pedidos não bipados', color: 'blue'},
             { id: 'ml', label: 'Atrasados ML', value: delayed.ml.toString(), subValue: 'Pedidos do Mercado Livre', color: 'yellow'},
             { id: 'shopee', label: 'Atrasados Shopee', value: delayed.shopee.toString(), subValue: 'Pedidos da Shopee', color: 'orange'},
        ];

        if (filters.canal === 'ALL') {
            return { pedidosViews: allPedidosViews, bipadosViews: allBipadosViews, atrasosViews: allAtrasosViews };
        }
        
        const canalLower = filters.canal.toLowerCase();
        return {
            pedidosViews: allPedidosViews.filter(v => v.id === canalLower),
            bipadosViews: allBipadosViews.filter(v => v.id === canalLower),
            atrasosViews: allAtrasosViews.filter(v => v.id === canalLower),
        };

    }, [dashboardData, filters.canal]);

    useEffect(() => {
        const numViews = cardDataViews.pedidosViews.length;
        if (numViews > 1) {
            const timer = setInterval(() => {
                setActiveStatCardIndex(prevIndex => (prevIndex + 1) % numViews);
            }, 10000);
            return () => clearInterval(timer);
        }
    }, [cardDataViews.pedidosViews.length]);

    const alertItems = useMemo((): AlertItemData[] => {
        const alerts: AlertItemData[] = [];
        if (dashboardData.alertasSistema.abaixoMinimo > 0) {
            alerts.push({
                id: '1', level: AlertLevel.Warning, title: `${dashboardData.alertasSistema.abaixoMinimo} itens abaixo do estoque mínimo`,
                description: 'Revisar necessidades de compra na tela de Estoque.', icon: <AlertTriangle size={20} />
            });
        }
         if (dashboardData.alertasSistema.duplicados > 0) {
            alerts.push({
                id: '2', level: AlertLevel.Danger, title: `${dashboardData.alertasSistema.duplicados} pedidos duplicados no período`,
                description: 'Verificar bipagens recentes para evitar envios duplicados.', icon: <AlertCircle size={20} />
            });
        }
        alerts.push({ 
            id: '3', level: AlertLevel.Info, title: 'Sistema Operacional', 
            description: 'Todos os serviços estão funcionando normalmente.', icon: <ShieldCheck size={20} /> 
        });
        return alerts;
    }, [dashboardData]);
    
    const showAdminNotices = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    const { olderData, newerData, olderTitle, newerTitle } = useMemo(() => {
        const { main, compare } = productionSummary;
        
        const formatDate = (dateStr: string | undefined): string => {
            if (!dateStr) return '';
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        };

        const formatTitle = (period: Period, start?: string, end?: string): string => {
            if (!start || !end) return "Resumo da Produção";
            const formattedStart = formatDate(start);
            const formattedEnd = formatDate(end);
            
            if (period === 'today') {
                return `Resumo de Hoje (${formattedStart})`;
            }
            if (formattedStart === formattedEnd) {
                return `Resumo do Dia: ${formattedStart}`;
            }
            return `Resumo do Período: ${formattedStart} a ${formattedEnd}`;
        };
        
        if (filters.compare && compare && filters.startDate && filters.compareStartDate && filters.endDate && filters.compareEndDate) {
            const mainStartDate = new Date(filters.startDate + 'T00:00:00');
            const compareStartDate = new Date(filters.compareStartDate + 'T00:00:00');
            
            if (mainStartDate < compareStartDate) {
                return {
                    olderData: main,
                    newerData: compare,
                    olderTitle: formatTitle(filters.period, filters.startDate, filters.endDate),
                    newerTitle: `Comparação: ${formatDate(filters.compareStartDate)} a ${formatDate(filters.compareEndDate)}`,
                };
            } else {
                return {
                    olderData: compare,
                    newerData: main,
                    olderTitle: `Comparação: ${formatDate(filters.compareStartDate)} a ${formatDate(filters.compareEndDate)}`,
                    newerTitle: formatTitle(filters.period, filters.startDate, filters.endDate),
                };
            }
        }
        
        return { olderData: main, newerData: null, olderTitle: formatTitle(filters.period, filters.startDate, filters.endDate), newerTitle: null };

    }, [productionSummary, filters]);

    return (
        <>
            <Header filters={filters} onFilterChange={setFilters} onSettingsClick={() => setIsSettingsModalOpen(true)} generalSettings={generalSettings} />
            <div className="mt-8">
                {showAdminNotices && <AdminNotices notices={adminNotices} currentUser={currentUser} onSaveNotice={onSaveNotice} onDeleteNotice={onDeleteNotice} />}

                <ProductionSummary 
                    olderData={olderData}
                    newerData={newerData}
                    olderTitle={olderTitle}
                    newerTitle={newerTitle}
                    productTypeName={generalSettings.productTypeNames.papel_de_parede}
                    miudosTypeName={generalSettings.productTypeNames.miudos}
                />
                
                {materialDeductions.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Dedução de Materiais Prevista</h2>
                    <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
                      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] max-h-60">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[var(--color-surface-secondary)] sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Material</th>
                                    <th className="px-4 py-2 text-center font-semibold">Quantidade Prevista</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materialDeductions.map(item => (
                                    <tr key={item.name} className="border-b border-[var(--color-border)] last:border-b-0">
                                        <td className="px-4 py-2 font-medium flex items-center">
                                            <Package size={14} className="mr-2 text-gray-500"/> {item.name}
                                        </td>
                                        <td className="px-4 py-2 text-center font-mono font-bold">
                                            {item.quantity.toFixed(3)} {item.unit}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Stat Cards */}
                {generalSettings.dashboard.showStatCards && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                        <StatCardV2 
                            title="Pedidos" 
                            icon={<ShoppingCart size={20}/>} 
                            views={cardDataViews.pedidosViews}
                            activeIndex={activeStatCardIndex}
                            onIndicatorClick={setActiveStatCardIndex}
                        />
                        <StatCardV2 
                            title="Bipados" 
                            icon={<CheckCheck size={20}/>} 
                            views={cardDataViews.bipadosViews}
                            activeIndex={activeStatCardIndex}
                            onIndicatorClick={setActiveStatCardIndex}
                        />
                        <StatCardV2 
                            title="Atrasos" 
                            icon={<AlertTriangle size={20}/>} 
                            views={cardDataViews.atrasosViews}
                            activeIndex={activeStatCardIndex}
                            onIndicatorClick={setActiveStatCardIndex}
                        />
                        <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] flex-1 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                               <p className="text-[var(--color-text-secondary)] font-medium">Funcionários Ativos</p>
                               <div className="p-2 bg-[var(--color-primary-light)] text-[var(--color-primary-dark-text)] rounded-lg"><Users size={20}/></div>
                            </div>
                            <div className="mt-2">
                               <p className="text-3xl font-bold text-[var(--color-text-primary)]">{dashboardData.funcionariosAtivos.total}</p>
                               <p className="text-sm text-[var(--color-text-secondary)] mt-1">Usuários cadastrados no sistema</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Primary Action Cards */}
                {generalSettings.dashboard.showActionCards && (
                    <>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-8 mb-4">Ações Principais</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                            {primaryActionCards.map(action => (
                                <div key={action.title} onClick={() => setCurrentPage(action.page)}>
                                    <ActionCard data={action} />
                                </div>
                            ))}
                        </div>
                        
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-8 mb-4">Ferramentas e Configurações</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {toolsActionCards.map(action => (
                                <div key={action.title} onClick={() => setCurrentPage(action.page)}>
                                    <ActionCard data={action} />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Activity and Alerts */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {generalSettings.dashboard.showRecentActivity && <RecentActivity activities={dashboardData.atividadesRecentes ?? []} />}
                    {generalSettings.dashboard.showSystemAlerts && <SystemAlerts alerts={alertItems} />}
                </div>
            </div>
            <DashboardSettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                currentSettings={uiSettings}
                onSave={onSaveUiSettings}
                setCurrentPage={setCurrentPage}
            />
        </>
    );
};

export default DashboardPage;
