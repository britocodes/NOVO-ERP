
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StockItem, OrderItem, SkuLink, ProdutoCombinado, ProductionPlan, PlanningParameters, ProductionPlanItem, RequiredInsumo, ShoppingListItem, User, ToastMessage, PlanningTargetMode } from '../types';
import { Plus } from 'lucide-react';
import { BarChart2, Calendar, Shield, TrendingUp, CheckCircle, ListTodo, Clipboard, Factory, Package, AlertTriangle, Info, Save, Settings, Loader2, FileDown, History, HelpCircle, ChevronDown, ChevronUp, Trash2, Send, Zap, DollarSign, PieChart, Target } from 'lucide-react';
import { exportProductionPlanToPdf } from '../lib/export';
import ConfirmActionModal from '../components/ConfirmActionModal';
import InfoModal from '../components/InfoModal';

interface PlanejamentoPageProps {
    stockItems: StockItem[];
    allOrders: OrderItem[];
    skuLinks: SkuLink[];
    produtosCombinados: ProdutoCombinado[];
    productionPlans: ProductionPlan[];
    onSaveProductionPlan: (plan: Omit<ProductionPlan, 'id' | 'createdAt' | 'createdBy'>) => Promise<ProductionPlan | null>;
    onDeleteProductionPlan: (planId: string) => Promise<boolean>;
    onGenerateShoppingList: (list: ShoppingListItem[]) => void;
    currentUser: User;
    planningSettings: PlanningParameters;
    onSavePlanningSettings: (settings: PlanningParameters) => void;
    addToast: (message: string, type: ToastMessage['type']) => void;
}

const StepHeader: React.FC<{ number: number, title: string, isComplete: boolean }> = ({ number, title, isComplete }) => (
    <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold ${isComplete ? 'bg-green-600 text-white' : 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'}`}>
            {isComplete ? <CheckCircle size={20} /> : number}
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
    </div>
);

const PlanejamentoPage: React.FC<PlanejamentoPageProps> = ({ stockItems, allOrders, skuLinks, produtosCombinados, productionPlans, onSaveProductionPlan, onDeleteProductionPlan, onGenerateShoppingList, currentUser, planningSettings, onSavePlanningSettings, addToast }) => {
    const [mode, setMode] = useState<'automatico' | 'manual'>('automatico');
    const [manualParams, setManualParams] = useState<PlanningParameters>(planningSettings);
    const [autoParams, setAutoParams] = useState<PlanningParameters>(planningSettings);
    const [productionPlan, setProductionPlan] = useState<ProductionPlanItem[]>([]);
    const [requiredInsumos, setRequiredInsumos] = useState<RequiredInsumo[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [planName, setPlanName] = useState(`Plano de ${new Date().toLocaleDateString('pt-br', { month: 'long', year: 'numeric' })}`);
    const [activePlan, setActivePlan] = useState<ProductionPlan | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [infoModalContent, setInfoModalContent] = useState({ title: '', message: '' });
    const [planSaved, setPlanSaved] = useState(false);
    
    const [analysisPeriod, setAnalysisPeriod] = useState<{ start: string | null, end: string | null }>({ start: null, end: null });
    const [scenarioAnalysis, setScenarioAnalysis] = useState<{
        historyTotalRevenue: number;
        historyTotalUnits: number;
        planTotalRevenue: number;
        planTotalUnits: number;
    } | null>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const [newSpikeDay, setNewSpikeDay] = useState({ date: '', name: '', channel: 'Geral' as 'Geral' | 'ML' | 'SHOPEE' });

    const toISODate = (date: Date) => date.toISOString().split('T')[0];

    useEffect(() => {
        setAutoParams(planningSettings);
        setManualParams(planningSettings);
    }, [planningSettings]);
    
    const fmtMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const handleCalculate = useCallback(() => {
        if (allOrders.length === 0) {
             addToast('Não há dados de pedidos para analisar.', 'error');
            return;
        }

        setPlanSaved(false);
        setIsCalculating(true);
        setActivePlan(null);

        setTimeout(() => {
            const paramsToUse = mode === 'automatico' ? autoParams : manualParams;
            if (mode === 'manual') {
                onSavePlanningSettings(manualParams);
            }

            const { analysisPeriodValue, analysisPeriodUnit, forecastPeriodDays, safetyStockDays, targetMode, targetValue } = paramsToUse;
            const effectiveTargetMode = targetMode || 'growth_percentage';
            const effectiveTargetValue = targetValue || 0;

            const today = new Date();
            let startDate = new Date();
            if (analysisPeriodUnit === 'months') {
                startDate.setMonth(startDate.getMonth() - analysisPeriodValue);
            } else {
                startDate.setDate(startDate.getDate() - analysisPeriodValue);
            }
             if (isNaN(startDate.getTime())) {
                addToast('Data de análise inválida. Verifique os parâmetros.', 'error');
                setIsCalculating(false);
                return;
            }
            
            setAnalysisPeriod({ start: toISODate(startDate), end: toISODate(today) });

            const salesHistory = allOrders.filter(o => {
                const orderDateStr = String(o.data || '').split('/').reverse().join('-');
                if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateStr)) return false;
                const orderDate = new Date(orderDateStr + "T12:00:00Z");
                if (isNaN(orderDate.getTime())) return false;
                return orderDate >= startDate && orderDate <= today;
            });

            // 1. Calculate Historical Performance per Product
            const linkedSkusMap = new Map<string, string>(skuLinks.map(l => [l.importedSku.toUpperCase(), l.masterProductSku.toUpperCase()]));
            const productStats = new Map<string, { totalUnits: number, totalRevenue: number }>();
            
            salesHistory.forEach(order => {
                const masterSku = linkedSkusMap.get(order.sku.toUpperCase()) || order.sku.toUpperCase();
                if (masterSku) {
                    const stats = productStats.get(masterSku) || { totalUnits: 0, totalRevenue: 0 };
                    stats.totalUnits += order.qty_final;
                    stats.totalRevenue += order.price_gross; 
                    productStats.set(masterSku, stats);
                }
            });

            const salesDaysCount = new Set(salesHistory.map(o => o.data)).size || 1;
            const historyTotalRevenue = Array.from(productStats.values()).reduce((sum, s) => sum + s.totalRevenue, 0);
            const historyTotalUnits = Array.from(productStats.values()).reduce((sum, s) => sum + s.totalUnits, 0);

            // 2. Determine Forecast Strategy based on Target Mode
            const newProductionPlan: ProductionPlanItem[] = [];
            let planTotalRevenue = 0;
            let planTotalUnits = 0;

            // Use case insensitive matching for product codes
            stockItems.filter(i => i.kind === 'PRODUTO').forEach(product => {
                const productCodeUpper = product.code.toUpperCase();
                const stats = productStats.get(productCodeUpper) || { totalUnits: 0, totalRevenue: 0 };
                const avgDailySales = stats.totalUnits / salesDaysCount;
                const avgPrice = stats.totalUnits > 0 ? stats.totalRevenue / stats.totalUnits : 0;
                
                let forecastedDemand = 0;

                if (effectiveTargetMode === 'revenue_target' && historyTotalRevenue > 0) {
                    const revenueShare = stats.totalRevenue / historyTotalRevenue;
                    const targetRevenueForProduct = effectiveTargetValue * revenueShare;
                    forecastedDemand = avgPrice > 0 ? targetRevenueForProduct / avgPrice : 0;

                } else if (effectiveTargetMode === 'unit_target' && historyTotalUnits > 0) {
                    const unitShare = stats.totalUnits / historyTotalUnits;
                    forecastedDemand = effectiveTargetValue * unitShare;

                } else {
                    const multiplier = mode === 'automatico' 
                        ? 1 
                        : 1 + (paramsToUse.promotionMultiplier / 100);
                        
                    const growthFactor = effectiveTargetMode === 'growth_percentage' ? (1 + (effectiveTargetValue / 100)) : multiplier;
                    
                    const finalForecastDays = forecastPeriodDays + safetyStockDays;
                    forecastedDemand = avgDailySales * finalForecastDays * growthFactor;
                }

                const substitute = product.substitute_product_code ? stockItems.find(s => s.code === product.substitute_product_code) : undefined;
                const substituteStock = substitute ? substitute.current_qty : 0;
                
                const requiredProduction = Math.ceil(Math.max(0, forecastedDemand - (product.current_qty + substituteStock)));
                
                // Metrics for Plan
                const projectedRevenue = requiredProduction * avgPrice;
                planTotalRevenue += projectedRevenue;
                planTotalUnits += requiredProduction;

                let reason = '';
                if (requiredProduction > 0) {
                    if (product.current_qty <= 0 && substituteStock <=0) reason = 'Sem estoque principal ou substituto';
                    else if (product.current_qty <= 0 && substituteStock > 0) reason = 'Usando estoque substituto';
                    else reason = 'Estoque baixo';
                }
                
                newProductionPlan.push({ 
                    product, 
                    avgDailySales, 
                    forecastedDemand, 
                    requiredProduction, 
                    reason, 
                    substitute,
                    avgPrice,
                    projectedRevenue 
                });
            });

            setProductionPlan(newProductionPlan.sort((a,b) => b.requiredProduction - a.requiredProduction));
            setScenarioAnalysis({
                historyTotalRevenue,
                historyTotalUnits,
                planTotalRevenue,
                planTotalUnits
            });

            // 3. Explode BOM for Materials (Case Insensitive Robustness)
            const insumosMap = new Map<string, number>();
            const bomMap = new Map<string, ProdutoCombinado>();
            produtosCombinados.forEach(p => bomMap.set(p.productSku.toUpperCase(), p));
            
            const stockMap = new Map<string, StockItem>();
            stockItems.forEach(i => stockMap.set(i.code.toUpperCase(), i));
            
            const explodeBom = (productCode: string, quantity: number) => {
                const bom = bomMap.get(productCode.toUpperCase());
                if (!bom || !Array.isArray(bom.items)) return;
                for (const item of bom.items) {
                    const insumo = stockMap.get(item.stockItemCode.toUpperCase());
                    if (!insumo) continue;
                    const needed = quantity * item.qty_per_pack;
                    if(insumo.kind === 'PROCESSADO') explodeBom(insumo.code, needed);
                    // Use UPPERCASE key for aggregation to avoid duplicates with mixed casing
                    const key = insumo.code.toUpperCase();
                    if (insumo.kind === 'INSUMO' || insumo.kind === 'PROCESSADO') {
                        insumosMap.set(key, (insumosMap.get(key) || 0) + needed);
                    }
                }
            };
            newProductionPlan.forEach(planItem => { if (planItem.requiredProduction > 0) explodeBom(planItem.product.code, planItem.requiredProduction); });

            const newRequiredInsumos: RequiredInsumo[] = [];
            insumosMap.forEach((requiredQty, insumoCodeUpper) => {
                const insumo = stockMap.get(insumoCodeUpper);
                if (insumo) {
                    const deficit = requiredQty - insumo.current_qty;
                    const purchaseBy = new Date();
                    purchaseBy.setDate(purchaseBy.getDate() - (paramsToUse.defaultLeadTimeDays || 14));
                    newRequiredInsumos.push({ insumo, requiredQty, currentStock: insumo.current_qty, deficit, leadTime: paramsToUse.defaultLeadTimeDays || 14, purchaseBy });
                }
            });
            setRequiredInsumos(newRequiredInsumos.sort((a,b) => b.deficit - a.deficit));
            setIsCalculating(false);
        }, 500);
    }, [allOrders, skuLinks, stockItems, produtosCombinados, mode, autoParams, manualParams, addToast, onSavePlanningSettings]);
    
    // ... (rest of the component handlers remain the same)
    const handleAutoParamChange = (field: keyof PlanningParameters, value: any) => {
        setAutoParams(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSaveAutoParams = () => {
        onSavePlanningSettings(autoParams);
        setIsSettingsOpen(false);
    };
    
    const handleManualParamChange = (field: keyof PlanningParameters, value: any) => {
        setManualParams(prev => ({ ...prev, [field]: value }));
    };
    
    const handleAddSpikeDay = () => {
        if(newSpikeDay.date && newSpikeDay.name) {
            const updatedSpikeDays = [...(autoParams.historicalSpikeDays || []), newSpikeDay].sort((a,b) => b.date.localeCompare(a.date));
            handleAutoParamChange('historicalSpikeDays', updatedSpikeDays);
            setNewSpikeDay({ date: '', name: '', channel: 'Geral' });
        }
    };
    
    const handleRemoveSpikeDay = (date: string, name: string) => {
        const updatedSpikeDays = (autoParams.historicalSpikeDays || []).filter(d => d.date !== date || d.name !== name);
        handleAutoParamChange('historicalSpikeDays', updatedSpikeDays);
    };

    const handleNewPlan = () => {
        setProductionPlan([]);
        setRequiredInsumos([]);
        setActivePlan(null);
        setPlanSaved(false);
        setScenarioAnalysis(null);
        setPlanName(`Plano de ${new Date().toLocaleDateString('pt-br', { month: 'long', year: 'numeric' })}`);
    };

    const handleUpdateProduction = (productCode: string, newRequired: number) => {
        const value = Math.max(0, newRequired);
        setProductionPlan(prev => {
            const next = prev.map(item => item.product.code === productCode ? {...item, requiredProduction: value, projectedRevenue: value * (item.avgPrice || 0)} : item);
            
            // Recalculate Scenario Analysis
            const newTotalRevenue = next.reduce((sum, item) => sum + (item.projectedRevenue || 0), 0);
            const newTotalUnits = next.reduce((sum, item) => sum + item.requiredProduction, 0);
            
            if (scenarioAnalysis) {
                setScenarioAnalysis({
                    ...scenarioAnalysis,
                    planTotalRevenue: newTotalRevenue,
                    planTotalUnits: newTotalUnits
                });
            }
            return next;
        });
    };

    const handleUpdatePrice = (productCode: string, newPrice: number) => {
        const value = Math.max(0, newPrice);
        setProductionPlan(prev => {
            const next = prev.map(item => {
                if (item.product.code === productCode) {
                    return {
                        ...item,
                        avgPrice: value,
                        projectedRevenue: item.requiredProduction * value
                    };
                }
                return item;
            });

            // Recalculate Scenario Analysis
            const newTotalRevenue = next.reduce((sum, item) => sum + (item.projectedRevenue || 0), 0);
            const newTotalUnits = next.reduce((sum, item) => sum + item.requiredProduction, 0);

            if (scenarioAnalysis) {
                setScenarioAnalysis({
                    ...scenarioAnalysis,
                    planTotalRevenue: newTotalRevenue,
                    planTotalUnits: newTotalUnits
                });
            }
            return next;
        });
    };

    const handleSavePlan = async () => {
        setIsActionLoading(true);
        const paramsToSave = mode === 'automatico' ? planningSettings : manualParams;
        const planToSave = {
            name: planName, status: 'Draft' as const, parameters: paramsToSave,
            items: productionPlan.filter(i => i.requiredProduction > 0).map(i => ({ product_sku: i.product.code, product_name: i.product.name, current_stock: i.product.current_qty, avg_daily_consumption: i.avgDailySales, forecasted_demand: i.forecastedDemand, required_production: i.requiredProduction })),
            planDate: new Date().toISOString().split('T')[0]
        };
        const savedPlan = await onSaveProductionPlan(planToSave);
        if(savedPlan) { setActivePlan(savedPlan); setPlanSaved(true); }
        setIsActionLoading(false);
        return savedPlan;
    };

    const handleGenerateList = () => {
        setIsActionLoading(true);
        const shoppingListItems: ShoppingListItem[] = requiredInsumos.filter(i => i.deficit > 0).map(i => ({ id: i.insumo.code, name: i.insumo.name, quantity: i.deficit, unit: i.insumo.unit }));
        
        if (shoppingListItems.length > 0) {
            onGenerateShoppingList(shoppingListItems);
        } else {
             addToast('Nenhum insumo com déficit para gerar lista.', 'info');
        }
        
        setIsActionLoading(false);
    };

    const handleSaveAndGenerate = async () => {
        const savedPlan = await handleSavePlan();
        if (savedPlan) {
            handleGenerateList();
        }
    };

    const handleLoadPlan = (plan: ProductionPlan) => {
        setActivePlan(plan);
        setMode('manual'); // Loading a historic plan puts it in manual mode for editing
        setManualParams(plan.parameters);
        
        const loadedPlanItems: ProductionPlanItem[] = plan.items
            .map((item): ProductionPlanItem | null => {
                const product = stockItems.find(p => p.code === item.product_sku);
                if (!product) return null;
                const substitute = product.substitute_product_code ? stockItems.find(s => s.code === product.substitute_product_code) : undefined;
                return { product, avgDailySales: item.avg_daily_consumption, forecastedDemand: item.forecasted_demand, requiredProduction: item.required_production, reason: '', substitute };
            })
            .filter((item): item is ProductionPlanItem => item !== null);
        
        setProductionPlan(loadedPlanItems);
    
        // Case insensitive reconstruction
        const insumosMap = new Map<string, number>();
        const bomMap = new Map<string, ProdutoCombinado>();
        produtosCombinados.forEach(p => bomMap.set(p.productSku.toUpperCase(), p));
        
        const stockMap = new Map<string, StockItem>();
        stockItems.forEach(i => stockMap.set(i.code.toUpperCase(), i));
    
        const explodeBom = (productCode: string, quantity: number) => {
            const bom = bomMap.get(productCode.toUpperCase());
            if (!bom || !Array.isArray(bom.items)) return;
            for (const item of bom.items) {
                const insumo = stockMap.get(item.stockItemCode.toUpperCase());
                if (!insumo) continue;
                const needed = quantity * item.qty_per_pack;
                if (insumo.kind === 'PROCESSADO') explodeBom(insumo.code, needed);
                const key = insumo.code.toUpperCase();
                if (insumo.kind === 'INSUMO' || insumo.kind === 'PROCESSADO') {
                    insumosMap.set(key, (insumosMap.get(key) || 0) + needed);
                }
            }
        };
        loadedPlanItems.forEach(planItem => { if (planItem.requiredProduction > 0) explodeBom(planItem.product.code, planItem.requiredProduction); });
    
        const newRequiredInsumos: RequiredInsumo[] = [];
        insumosMap.forEach((requiredQty, insumoCodeUpper) => {
            const insumo = stockMap.get(insumoCodeUpper);
            if (insumo) {
                const deficit = requiredQty - insumo.current_qty;
                const purchaseBy = new Date();
                purchaseBy.setDate(purchaseBy.getDate() - (plan.parameters.defaultLeadTimeDays || 14));
                newRequiredInsumos.push({ insumo, requiredQty, currentStock: insumo.current_qty, deficit, leadTime: plan.parameters.defaultLeadTimeDays || 14, purchaseBy });
            }
        });
        setRequiredInsumos(newRequiredInsumos.sort((a,b) => b.deficit - a.deficit));
        setPlanSaved(true);
    };

    const handleDeletePlan = async () => {
        if (activePlan) {
            setIsActionLoading(true);
            const success = await onDeleteProductionPlan(activePlan.id);
            if(success) handleNewPlan();
            setIsActionLoading(false);
            setIsDeleteModalOpen(false);
        }
    };

    const SimulationMetric: React.FC<{ label: string, current: number, history: number, isCurrency?: boolean }> = ({ label, current, history, isCurrency }) => {
        const diff = current - history;
        const percent = history > 0 ? (diff / history) * 100 : 0;
        const isPositive = diff >= 0;
        const format = (v: number) => isCurrency ? fmtMoney(v) : v.toFixed(0);

        return (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
                <p className="text-xl font-black text-slate-800 mt-1">{format(current)}</p>
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-gray-500">Hist: {format(history)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? '+' : ''}{percent.toFixed(1)}%
                    </span>
                </div>
            </div>
        );
    };
    
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Planejamento e Simulação</h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">Defina metas financeiras ou de volume e gere planos de produção baseados no histórico.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleNewPlan} className="flex items-center text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus size={16} className="mr-2"/> Novo Plano
                    </button>
                </div>
            </div>

            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                <StepHeader number={1} title="Definir Metas e Parâmetros" isComplete={productionPlan.length > 0} />
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-4 mb-4">
                        <label className="font-semibold text-[var(--color-text-primary)]">Modo:</label>
                        <div className="flex items-center p-1 bg-[var(--color-surface-secondary)] rounded-lg">
                            <button onClick={() => setMode('automatico')} className={`px-3 py-1 text-sm rounded-md ${mode === 'automatico' ? 'bg-[var(--color-surface)] shadow-sm font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>Automático (Simples)</button>
                            <button onClick={() => setMode('manual')} className={`px-3 py-1 text-sm rounded-md ${mode === 'manual' ? 'bg-[var(--color-surface)] shadow-sm font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>Manual (Avançado)</button>
                        </div>
                    </div>
                    
                    {mode === 'manual' && (
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg">
                            <div className="space-y-4">
                                <h4 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2"><History size={16}/> Base Histórica de Análise</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Período Passado</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input type="number" value={manualParams.analysisPeriodValue} onChange={e => handleManualParamChange('analysisPeriodValue', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm font-bold"/>
                                            <select value={manualParams.analysisPeriodUnit} onChange={e => handleManualParamChange('analysisPeriodUnit', e.target.value)} className="p-2 border rounded-md text-sm bg-white">
                                                <option value="days">dias</option>
                                                <option value="months">meses</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Dias de Projeção</label>
                                        <input type="number" value={manualParams.forecastPeriodDays} onChange={e => handleManualParamChange('forecastPeriodDays', Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md text-sm font-bold"/>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-l pl-6 border-slate-200">
                                <h4 className="font-bold text-indigo-600 flex items-center gap-2"><Target size={16}/> Definição de Meta (Target)</h4>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tipo de Meta</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleManualParamChange('targetMode', 'growth_percentage')}
                                            className={`flex-1 p-2 text-xs font-bold rounded border ${manualParams.targetMode === 'growth_percentage' || !manualParams.targetMode ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500'}`}
                                        >
                                            <TrendingUp size={14} className="mx-auto mb-1"/> Crescimento %
                                        </button>
                                        <button 
                                            onClick={() => handleManualParamChange('targetMode', 'revenue_target')}
                                            className={`flex-1 p-2 text-xs font-bold rounded border ${manualParams.targetMode === 'revenue_target' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500'}`}
                                        >
                                            <DollarSign size={14} className="mx-auto mb-1"/> Faturamento R$
                                        </button>
                                        <button 
                                            onClick={() => handleManualParamChange('targetMode', 'unit_target')}
                                            className={`flex-1 p-2 text-xs font-bold rounded border ${manualParams.targetMode === 'unit_target' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500'}`}
                                        >
                                            <Package size={14} className="mx-auto mb-1"/> Volume Un.
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Valor da Meta</label>
                                    <input 
                                        type="number" 
                                        value={manualParams.targetValue || 0} 
                                        onChange={e => handleManualParamChange('targetValue', Number(e.target.value))} 
                                        className="w-full mt-1 p-3 border-2 border-indigo-100 rounded-lg text-lg font-black text-indigo-900 focus:border-indigo-500 outline-none"
                                        placeholder={manualParams.targetMode === 'revenue_target' ? 'R$ 100.000,00' : manualParams.targetMode === 'unit_target' ? '5000 un' : '10%'}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {manualParams.targetMode === 'revenue_target' ? 'O sistema calculará as unidades necessárias baseadas no preço médio histórico.' : 
                                         manualParams.targetMode === 'unit_target' ? 'O sistema distribuirá o volume total conforme a participação de cada produto.' : 
                                         'Porcentagem de crescimento sobre a média histórica.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                <StepHeader number={2} title="Analisar Cenário e Plano de Produção" isComplete={productionPlan.length > 0} />
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                        <button onClick={handleCalculate} disabled={isCalculating} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95">
                            {isCalculating ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16}/>} Simular Cenário
                        </button>
                        <div className="text-sm text-right">
                            {analysisPeriod.start && analysisPeriod.end && <p className="text-[var(--color-text-secondary)]">Base Histórica: <strong className="text-[var(--color-text-primary)]">{new Date(analysisPeriod.start + 'T12:00:00Z').toLocaleDateString()}</strong> até <strong className="text-[var(--color-text-primary)]">{new Date(analysisPeriod.end + 'T12:00:00Z').toLocaleDateString()}</strong>.</p>}
                        </div>
                    </div>

                    {scenarioAnalysis && (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-4">
                            <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2"><PieChart size={16}/> Resultado da Simulação</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <SimulationMetric label="Faturamento Projetado" current={scenarioAnalysis.planTotalRevenue} history={scenarioAnalysis.historyTotalRevenue} isCurrency />
                                <SimulationMetric label="Volume Projetado (Un)" current={scenarioAnalysis.planTotalUnits} history={scenarioAnalysis.historyTotalUnits} />
                            </div>
                        </div>
                    )}

                    {isCalculating ? <div className="text-center p-8"><Loader2 size={32} className="animate-spin text-[var(--color-primary)] mx-auto"/></div> :
                        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] max-h-96">
                            <table className="min-w-full bg-[var(--color-surface)] text-sm">
                                <thead className="bg-[var(--color-surface-secondary)] sticky top-0">
                                    <tr>
                                        {['Produto', 'Preço Unitário', 'Venda Média/dia', 'Demanda Calc.', 'Produção Necessária', 'Faturamento Est.', 'Motivo'].map(h=><th key={h} className="py-3 px-3 text-left font-semibold text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {productionPlan.length > 0 ? productionPlan.map(item => (
                                        <tr key={item.product.id} className={item.requiredProduction > 0 ? 'bg-indigo-50/50' : ''}>
                                            <td className="py-3 px-3 font-bold text-slate-700">
                                                {item.product.name}
                                                {item.substitute && <span className="text-[10px] block text-blue-600 font-normal">(Substituto: {item.substitute.name})</span>}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        min="0"
                                                        value={item.avgPrice || 0} 
                                                        onChange={e => handleUpdatePrice(item.product.code, parseFloat(e.target.value))} 
                                                        className="w-24 pl-6 p-2 text-right border border-slate-200 rounded-lg text-slate-700 focus:border-indigo-500 outline-none text-sm font-medium" 
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-slate-500">{item.avgDailySales.toFixed(1)}</td>
                                            <td className="py-3 px-3 text-slate-500">{Math.ceil(item.forecastedDemand)}</td>
                                            <td className="py-3 px-3"><input type="number" value={item.requiredProduction} onChange={e => handleUpdateProduction(item.product.code, Number(e.target.value))} className="w-24 p-2 text-center font-black border-2 border-indigo-100 rounded-lg text-indigo-700 focus:border-indigo-500 outline-none" /></td>
                                            <td className="py-3 px-3 font-bold text-emerald-600">{fmtMoney(item.projectedRevenue || 0)}</td>
                                            <td className="py-3 px-3 text-xs text-slate-400 font-medium">{item.reason}</td>
                                        </tr>
                                    )) : <tr><td colSpan={7} className="text-center p-8 text-[var(--color-text-secondary)]">Simule um cenário para gerar o plano.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    }
                </div>
            </div>

            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                 <StepHeader number={3} title="Gerar Lista de Compras" isComplete={planSaved} />
                 <div className="mt-4 pt-4 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                         <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2"><Package size={18}/> Insumos Necessários</h3>
                         <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] max-h-96">
                            <table className="min-w-full bg-[var(--color-surface)] text-sm">
                                <thead className="bg-[var(--color-surface-secondary)] sticky top-0"><tr>{['Insumo', 'Necessidade', 'Estoque', 'Déficit'].map(h=><th key={h} className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                     {requiredInsumos.length > 0 ? requiredInsumos.map(item => (
                                        <tr key={item.insumo.id} className={item.deficit > 0 ? 'bg-[var(--color-danger-bg)]' : ''}>
                                            <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.insumo.name}</td>
                                            <td className="py-2 px-3 text-center text-[var(--color-text-primary)]">{item.requiredQty.toFixed(2)}</td>
                                            <td className="py-2 px-3 text-center text-[var(--color-text-primary)]">{item.currentStock.toFixed(2)}</td>
                                            <td className={`py-2 px-3 text-center font-bold ${item.deficit > 0 ? 'text-[var(--color-danger-text)]' : 'text-[var(--color-success-text)]'}`}>{item.deficit.toFixed(2)}</td>
                                        </tr>
                                    )) : <tr><td colSpan={4} className="text-center p-8 text-[var(--color-text-secondary)]">Ajuste o plano para calcular os insumos.</td></tr>}
                                </tbody>
                            </table>
                         </div>
                     </div>
                     <div className="space-y-4">
                         <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2"><ListTodo size={18}/> Ações e Histórico</h3>
                         <div className="p-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg space-y-3">
                             <div><label className="text-sm font-medium text-[var(--color-text-secondary)]">Nome do Plano</label><input type="text" value={planName} onChange={e => setPlanName(e.target.value)} className="w-full mt-1 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-[var(--color-text-primary)]" /></div>
                             <div className="flex gap-2">
                                <button onClick={handleSavePlan} disabled={isActionLoading || productionPlan.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50">
                                    {isActionLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} {planSaved ? 'Salvar Alterações' : 'Salvar Plano'}
                                </button>
                                <button onClick={() => exportProductionPlanToPdf(productionPlan, manualParams)} disabled={productionPlan.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50">
                                    <FileDown size={16}/> Exportar PDF
                                </button>
                             </div>
                             <button onClick={handleSaveAndGenerate} disabled={isActionLoading || requiredInsumos.filter(i => i.deficit > 0).length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50">
                                {isActionLoading ? <Loader2 size={16} className="animate-spin"/> : <Clipboard size={16}/>} Salvar e Gerar Lista de Compras
                            </button>
                         </div>
                         <div className="p-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg">
                             <h4 className="font-medium text-[var(--color-text-primary)] flex items-center gap-2 mb-2"><History size={16}/> Planos Salvos</h4>
                             <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                 {productionPlans.map(plan => (
                                     <div key={plan.id} className={`flex justify-between items-center p-2 rounded-md ${activePlan?.id === plan.id ? 'bg-[var(--color-primary-bg-subtle)] border border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}>
                                         <div>
                                            <p className="font-semibold text-sm text-[var(--color-text-primary)]">{plan.name}</p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">Criado por {plan.createdBy} em {new Date(plan.createdAt).toLocaleDateString()}</p>
                                        </div>
                                         <div className="flex gap-1">
                                            <button onClick={() => handleLoadPlan(plan)} className="p-1 text-[var(--color-primary-text-subtle)] hover:bg-[var(--color-surface-tertiary)] rounded-full"><Send size={14}/></button>
                                            <button onClick={() => { setActivePlan(plan); setIsDeleteModalOpen(true); }} className="p-1 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={14}/></button>
                                        </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                 </div>
            </div>
            {isDeleteModalOpen && activePlan && <ConfirmActionModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeletePlan} title="Excluir Plano" message={<p>Tem certeza que deseja excluir o plano <strong className="text-[var(--modal-text-primary)]">{activePlan.name}</strong>?</p>} confirmButtonText="Excluir" isConfirming={isActionLoading} />}
            <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title={infoModalContent.title} message={<pre className="text-sm whitespace-pre-wrap">{infoModalContent.message}</pre>} />
        </div>
    );
};

export default PlanejamentoPage;
