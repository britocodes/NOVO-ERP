
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import GlobalHeader from './components/GlobalHeader'; 
import { ImporterPage } from './pages/ImporterPage';
import DashboardPage from './pages/DashboardPage';
import BipagemPage from './pages/BipagemPage';
import EstoquePage from './pages/EstoquePage';
import RelatoriosPage from './pages/RelatoriosPage';
import EtiquetasPage from './pages/EtiquetasPage';
import FinancePage from './pages/FinancePage'; 
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import { ConfiguracoesGeraisPage } from './pages/ConfiguracoesGeraisPage';
import { PesagemPage } from './pages/PesagemPage';
import MoagemPage from './pages/MoagemPage';
import FuncionariosPage from './pages/FuncionariosPage';
import PedidosPage from './pages/PedidosPage';
import LoginPage from './pages/LoginPage';
import BlingPage from './pages/BlingPage';
import { Loader2 } from 'lucide-react';
import DatabaseSetupPage from './pages/DatabaseSetupPage';
import ToastContainer from './components/ToastContainer';
import PlanejamentoPage from './pages/PlanejamentoPage';
import ComprasPage from './pages/ComprasPage';
import PassoAPassoPage from './pages/PassoAPassoPage';
import AjudaPage from './pages/AjudaPage';
import BiDashboardPage from './pages/BiDashboardPage';
import PowerBiTemplatesPage from './pages/PowerBiTemplatesPage';
import ConfirmActionModal from './components/ConfirmActionModal';

import { 
    ProcessedData, StockItem, StockMovement, ProdutoCombinado, 
    WeighingBatch, GrindingBatch, OrderItem, ScanLogItem, User, WeighingType,
    ZplSettings, ExtractedZplData, 
    ActivityType, GeneralSettings, defaultGeneralSettings,
    UserRole,
    UserSetor,
    ReturnItem,
    SkuLink,
    defaultZplSettings,
    ScanResult,
    Canal,
    UiSettings,
    ToastMessage,
    AdminNotice,
    ShoppingListItem,
    ProductionPlan,
    PlanningParameters,
    ImportHistoryItem,
    OrderStatusValue,
    OrderResolutionDetails,
    EtiquetaHistoryItem,
    BiDataItem,
    DashboardWidgetConfig,
    StockPackGroup,
    StockDeductionMode,
    EtiquetasState,
} from './types';
import { dbClient, loginUser, syncDatabase, resetDatabase, verifyDatabaseSetup, fetchAll } from './lib/supabaseClient';
import { exportStateToSql } from './lib/export';
import { SETUP_SQL_STRING } from './lib/sql';
import { resolveScan } from './lib/scanner';
import { playSound } from './lib/sound';
import { initPostHog } from './lib/posthog';
import { processZplStream } from './services/zplService';
import { simpleHash } from './utils/zplUtils';

type AppStatus = 'initializing' | 'needs_setup' | 'ready' | 'error';

const safeNewDate = (dateInput: any): Date => {
    if (!dateInput) return new Date(NaN);
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date(NaN) : d;
}

const App: React.FC = () => {
  useEffect(() => {
    initPostHog();

    // OAuth Popup Handler
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && window.opener) {
        console.log("OAuth callback detected in popup. Sending message to opener...");
        window.opener.postMessage({ type: 'BLING_AUTH_CODE', code }, '*');
        window.close();
        return; // Stop execution in popup
    }
  }, []);
  const [appStatus, setAppStatus] = useState<AppStatus>('initializing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [setupDetails, setSetupDetails] = useState<any | null>(null);
  
  const [currentPage, _setCurrentPage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [adminNotices, setAdminNotices] = useState<AdminNotice[]>([]);
  const [isAutoBipagemActive, setIsAutoBipagemActive] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [skuLinks, setSkuLinks] = useState<SkuLink[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [historyItemToDelete, setHistoryItemToDelete] = useState<ImportHistoryItem | null>(null);
  const [isDeleteHistoryModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  const [scanHistory, setScanHistory] = useState<ScanLogItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [produtosCombinados, setProdutosCombinados] = useState<ProdutoCombinado[]>([]);
  const [weighingBatches, setWeighingBatches] = useState<WeighingBatch[]>([]);
  const [grindingBatches, setGrindingBatches] = useState<GrindingBatch[]>([]);
  const [packGroups, setPackGroups] = useState<StockPackGroup[]>([]);

  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  
  const [biData, setBiData] = useState<BiDataItem[]>([]);

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneralSettings);
  const [etiquetasSettings, setEtiquetasSettings] = useState<ZplSettings>(defaultZplSettings);
  const [uiSettings, setUiSettings] = useState<UiSettings>({
    baseTheme: 'light',
    accentColor: 'indigo',
    customAccentColor: '#4f46e5',
    fontSize: 16,
    soundOnSuccess: true,
    soundOnDuplicate: true,
    soundOnError: true,
  });

  const [etiquetasState, setEtiquetasState] = useState<EtiquetasState>({
    zplInput: '',
    includeDanfe: true,
    zplPages: [],
    previews: [],
    extractedData: new Map(),
    printedIndices: new Set(),
    warnings: []
  });
  const [isProcessingLabels, setIsProcessingLabels] = useState(false);
  const [labelProgressMessage, setLabelProgressMessage] = useState('');
  const [labelProcessingProgress, setLabelProcessingProgress] = useState(0);

  const [etiquetasHistory, setEtiquetasHistory] = useState<EtiquetaHistoryItem[]>([]);
  const [zplToSaveOnScan, setZplToSaveOnScan] = useState<Map<string, string>>(new Map());

  const initialized = useRef(false);

  useEffect(() => {
    // 1. Verificar se há um callback de OAuth na URL (Bling)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // Check if we are returning from Bling auth
    if (code) {
        console.log("Detectado retorno de autenticação Bling. Redirecionando para página de configuração...");
        _setCurrentPage('bling');
        // Do not process other logic if we have a code, let BlingPage handle it
    } else {
        // 2. Restaurar a última página acessada
        const savedPage = localStorage.getItem('erp_current_page');
        if (savedPage) {
            _setCurrentPage(savedPage);
        }
    }

    try {
        const savedUser = localStorage.getItem('erp_current_user');
        if (savedUser) {
            const user: User = JSON.parse(savedUser);
            setCurrentUser(user);
        }
    } catch (e) {
        localStorage.removeItem('erp_current_user');
    }
  }, []);

  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const setCurrentPage = (page: string) => {
    localStorage.setItem('erp_current_page', page);
    _setCurrentPage(page);
  };
  
  const lowStockItems = useMemo(() => stockItems.filter(i => {
      const current = Number(i.current_qty);
      const min = Number(i.min_qty);
      return i.kind !== 'PRODUTO' && !isNaN(current) && !isNaN(min) && current <= min;
  }), [stockItems]);

  const lowStockCount = lowStockItems.length;
  const bannerNotice = useMemo(() => adminNotices.find(n => n.type === 'banner'), [adminNotices]);

    const scannedCodeBuffer = useRef('');
    const lastKeyPressTime = useRef(0);
    const debounceTime = generalSettings.bipagem.debounceTime_ms;

    const handleNewScan = useCallback(async (code: string, user?: User, deductionMode: StockDeductionMode = 'STOCK'): Promise<ScanResult> => {
        const actingUser = user || currentUser;
        if (!actingUser) {
            return { status: 'ERROR', message: 'Nenhum usuário logado.', input_code: code, display_key: code, synced_with_list: false };
        }

        const result = await resolveScan(dbClient, code, actingUser, 'WebApp', users, generalSettings.bipagem, zplToSaveOnScan);

        if(result.scan?.id) {
            // Log UI Update
            const { data: newScanLog } = await dbClient.from('scan_logs').select('*').eq('id', result.scan.id).single();
            if (newScanLog) {
                const newHistoryItem: ScanLogItem = {
                    id: newScanLog.id,
                    time: new Date(newScanLog.scanned_at),
                    userId: newScanLog.user_id,
                    user: newScanLog.user_name,
                    device: newScanLog.device,
                    displayKey: newScanLog.display_key,
                    status: newScanLog.status,
                    synced: newScanLog.synced,
                    canal: newScanLog.canal,
                };
                setScanHistory(prev => [newHistoryItem, ...prev]);
            }

            // Stock Logic based on mode
            if (result.status === 'OK' && result.order_key && result.sku_key) {
                await dbClient.from('orders').update({ status: 'BIPADO', canal: result.channel || undefined }).match({ order_id: result.order_key, sku: result.sku_key });
                setAllOrders(prev => prev.map(o => o.orderId === result.order_key && o.sku === result.sku_key ? {...o, status: 'BIPADO', canal: result.channel || o.canal} : o));

                // Find Master SKU
                const linkedSku = skuLinks.find(l => l.importedSku.toUpperCase() === result.sku_key?.toUpperCase());
                const masterSku = linkedSku ? linkedSku.masterProductSku : result.sku_key;

                if (masterSku) {
                    const product = stockItems.find(i => i.code === masterSku);
                    if (product) {
                        // Apply deduction logic
                        if (deductionMode === 'STOCK') {
                            // Simple deduction from shelf stock
                            await dbClient.rpc('adjust_stock_quantity', {
                                item_code: masterSku,
                                quantity_delta: -1,
                                origin_text: 'BIP',
                                ref_text: `Pedido ${result.order_key} (Estoque)`,
                                user_name: actingUser.name
                            });
                        } else if (deductionMode === 'PRODUCTION') {
                            // "Daily Production": Record production (consumes BOM, adds +1) then deduct (-1)
                            // This ensures raw materials are consumed but finished stock count remains net 0 change (made & shipped)
                            // Step 1: Record Production (Consumes Insumos, Adds 1 Product)
                            await dbClient.rpc('record_production_run', {
                                item_code: masterSku,
                                quantity_to_produce: 1,
                                ref_text: `Produção Pedido ${result.order_key}`,
                                user_name: actingUser.name
                            });
                            // Step 2: Deduct Product (Ships 1 Product)
                            await dbClient.rpc('adjust_stock_quantity', {
                                item_code: masterSku,
                                quantity_delta: -1,
                                origin_text: 'BIP',
                                ref_text: `Envio Pedido ${result.order_key}`,
                                user_name: actingUser.name
                            });
                        }
                    }
                }
            }
        }
        return result;
    }, [currentUser, users, generalSettings.bipagem, zplToSaveOnScan, skuLinks, stockItems]);

    const handleStageZplForSaving = (zplMap: Map<string, string>) => {
        setZplToSaveOnScan(prev => new Map([...prev, ...zplMap]));
        addToast(`${zplMap.size} etiquetas preparadas para associação na bipagem.`, 'success');
    };

    const processGlobalScan = useCallback(async (code: string) => {
        if (!currentUser) {
            addToast('Faça login para usar a bipagem.', 'error');
            return;
        }

        const result = await handleNewScan(code);

        if (result.status === 'OK') {
            addToast(`Bipado: ${result.display_key}`, 'success');
            if (uiSettings.soundOnSuccess) playSound('success');
        } else if (result.status === 'DUPLICATE') {
            addToast(`Duplicado: ${result.display_key}`, 'error');
            if (uiSettings.soundOnDuplicate) playSound('duplicate');
        } else {
            addToast(`Erro: ${result.message}`, 'error');
            if (uiSettings.soundOnError) playSound('error');
        }

    }, [currentUser, handleNewScan, uiSettings, addToast]);

    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            if (!isAutoBipagemActive) return;

            const target = event.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }

            const currentTime = Date.now();
            if (currentTime - lastKeyPressTime.current > debounceTime) {
                scannedCodeBuffer.current = '';
            }
            lastKeyPressTime.current = currentTime;

            if (event.key === 'Enter') {
                if (scannedCodeBuffer.current.length > 2) {
                    processGlobalScan(scannedCodeBuffer.current);
                }
                scannedCodeBuffer.current = '';
            } else if (event.key.length === 1) {
                scannedCodeBuffer.current += event.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isAutoBipagemActive, debounceTime, processGlobalScan]);


    const handleSaveUiSettings = async (newSettings: UiSettings) => {
        if (!currentUser) return;
        
        setUiSettings(newSettings);

        const { data, error } = await dbClient
            .from('users')
            .update({ ui_settings: newSettings as any })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) {
            addToast('Erro ao salvar configurações de aparência.', 'error');
            setUiSettings(uiSettings); 
        } else {
            addToast('Configurações salvas com sucesso!', 'success');
            setCurrentUser(prev => prev ? { ...prev, ui_settings: newSettings } : null);
        }
    };

    const handleSaveGeneralSettings = async (settingsUpdater: GeneralSettings | ((prev: GeneralSettings) => GeneralSettings)) => {
        const newSettings = typeof settingsUpdater === 'function'
            ? settingsUpdater(generalSettings)
            : settingsUpdater;
        
        if (!newSettings) {
            addToast('Erro ao salvar: configurações inválidas.', 'error');
            return;
        }

        setGeneralSettings(newSettings);
        
        const { error } = await dbClient
            .from('app_settings')
            .upsert({ key: 'general', value: newSettings as any });

        if (error) {
            addToast('Erro ao salvar configurações gerais.', 'error');
        } else {
            addToast('Configurações gerais salvas com sucesso!', 'success');
        }
    };

    const handleSaveDashboardConfig = (newDashboardConfig: DashboardWidgetConfig) => {
        handleSaveGeneralSettings(prev => ({ ...prev, dashboard: newDashboardConfig }));
    };

    const handleSaveEtiquetasSettings = async (newSettings: ZplSettings) => {
        setEtiquetasSettings(newSettings);
        const { error } = await dbClient
            .from('app_settings')
            .upsert({ key: 'etiquetas', value: newSettings as any });

        if (error) {
            addToast('Erro ao salvar configurações de etiquetas.', 'error');
            setEtiquetasSettings(etiquetasSettings);
        } else {
            addToast('Configurações de etiquetas salvas com sucesso!', 'success');
        }
    };

    const handleSaveNotice = async (notice: AdminNotice) => {
        const { error } = await dbClient.from('admin_notices').insert({
            id: notice.id,
            text: notice.text,
            level: notice.level,
            type: notice.type,
            created_by: notice.createdBy,
            created_at: notice.createdAt,
        });

        if (error) {
            addToast('Erro ao salvar aviso.', 'error');
        } else {
            setAdminNotices(prev => [...prev, notice]);
        }
    };

    const handleDeleteNotice = async (noticeId: string) => {
        const { error } = await dbClient.from('admin_notices').delete().eq('id', noticeId);

        if (error) {
            addToast('Erro ao remover aviso.', 'error');
        } else {
            setAdminNotices(prev => prev.filter(n => n.id !== noticeId));
        }
    };

    // New Function to handle saving pack groups
    const loadPackGroups = useCallback(async () => {
        const { data } = await dbClient.from('stock_pack_groups').select('*');
        if (data) setPackGroups(data);
    }, []);

    const handleSavePackGroup = async (group: Omit<StockPackGroup, 'id'>, id?: string) => {
        if (id) {
            await dbClient.from('stock_pack_groups').update(group).eq('id', id);
        } else {
            await dbClient.from('stock_pack_groups').insert(group);
        }
        await loadPackGroups();
        addToast('Grupo de Pacotes salvo!', 'success');
    };

    const loadData = useCallback(async () => {
        if (!currentUser) return;
        try {
            // Using fetchAll to bypass 1000 row limit for critical tables
            const ordersData = await fetchAll('orders', { orderBy: 'created_at', ascending: false });
            const scanLogsData = await fetchAll('scan_logs', { orderBy: 'created_at', ascending: false });

            const queries = [
                // dbClient.from('orders').select('*').order('created_at', { ascending: false }).limit(100000), // Replaced by fetchAll
                dbClient.from('returns').select('*').order('created_at', { ascending: false }).limit(5000),
                dbClient.from('sku_links').select('*'),
                // dbClient.from('scan_logs').select('*').order('created_at', { ascending: false }).limit(50000), // Replaced by fetchAll
                dbClient.from('users').select('*'),
                dbClient.from('stock_items').select('*').order('name', { ascending: true }),
                dbClient.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(20000),
                dbClient.from('product_boms').select('*'),
                dbClient.from('weighing_batches').select('*').order('created_at', { ascending: false }).limit(5000),
                dbClient.from('grinding_batches').select('*').order('created_at', { ascending: false }).limit(5000),
                dbClient.from('production_plans').select('*').order('created_at', { ascending: false }),
                dbClient.from('shopping_list_items').select('*'),
                dbClient.from('app_settings').select('*'),
                dbClient.from('admin_notices').select('*'),
                dbClient.from('import_history').select('id, file_name, processed_at, user_name, item_count, unlinked_count, canal').order('processed_at', { ascending: false }).limit(5000),
                dbClient.from('production_plan_items').select('*'),
                dbClient.from('etiquetas_historico').select('id, created_at, created_by_name, page_count').order('created_at', { ascending: false }).limit(200),
                dbClient.from('vw_dados_analiticos').select('*'),
                dbClient.from('stock_pack_groups').select('*'),
            ];
            
            const tableNames = ['returns', 'skuLinks', 'users', 'stockItems', 'stockMovements', 'boms', 'weighingBatches', 'grindingBatches', 'productionPlans', 'shoppingList', 'settings', 'notwenes', 'importHistory', 'productionPlanItems', 'etiquetasHistory', 'biData', 'packGroups'];

            const results = await Promise.allSettled(queries);

            const dataMap: { [key: string]: any[] } = {};

            results.forEach((result, index) => {
                const tableName = tableNames[index];
                if (result.status === 'fulfilled') {
                    const { data, error } = result.value;
                    if (!error) {
                        dataMap[tableName] = data;
                    }
                }
            });
            
            // Set data from fetchAll
            setAllOrders(ordersData.map((o: any) => ({ id: o.id, orderId: o.order_id, tracking: o.tracking, sku: o.sku, qty_original: Number(o.qty_original || 0), multiplicador: Number(o.multiplicador || 0), qty_final: Number(o.qty_final || 0), color: o.color, canal: o.canal, data: o.data, created_at: o.created_at, status: o.status, error_reason: o.error_reason, customer_name: o.customer_name, customer_cpf_cnpj: o.customer_cpf_cnpj, resolution_details: o.resolution_details, price_gross: o.price_gross, platform_fees: o.platform_fees, shipping_fee: o.shipping_fee, price_net: o.price_net, data_prevista_envio: o.data_prevista_envio })));
            setScanHistory(scanLogsData.map((s: any) => ({ id: s.id, time: safeNewDate(s.scanned_at), userId: s.user_id, user: s.user_name, device: s.device, displayKey: s.display_key, status: s.status, synced: s.synced, canal: s.canal })));

            if (dataMap.returns) setReturns(dataMap.returns.map((r: any) => ({ id: r.id, tracking: r.tracking, customer_name: r.customer_name, loggedById: r.logged_by_id, loggedBy: r.logged_by_name, loggedAt: safeNewDate(r.logged_at), order_id: r.order_id })));
            if (dataMap.skuLinks) setSkuLinks(dataMap.skuLinks.map((l: any) => ({ importedSku: l.imported_sku, masterProductSku: l.master_product_sku })));
            if (dataMap.users) setUsers(dataMap.users as User[]);
            if (dataMap.stockItems) setStockItems(dataMap.stockItems.map((i: any) => ({ id: i.id, code: i.code, name: i.name, kind: i.kind, unit: i.unit, current_qty: Number(i.current_qty) || 0, min_qty: Number(i.min_qty) || 0, category: i.category || '', color: i.color, barcode: i.barcode, product_type: i.product_type, expedition_items: i.expedition_items || [], substitute_product_code: i.substitute_product_code })));
            if (dataMap.packGroups) setPackGroups(dataMap.packGroups);
            
            if (dataMap.stockMovements) setStockMovements(dataMap.stockMovements.map((m: any) => ({ id: m.id, stockItemCode: m.stock_item_code, stockItemName: m.stock_item_name, origin: m.origin, qty_delta: parseFloat(m.qty_delta) || 0, ref: m.ref, createdAt: safeNewDate(m.created_at), createdBy: m.created_by_name, fromWeighing: m.from_weighing, productSku: m.product_sku })));
            if (dataMap.boms) setProdutosCombinados(dataMap.boms.map((b: any) => ({ productSku: b.product_sku, items: b.items })));
            if (dataMap.weighingBatches) setWeighingBatches(dataMap.weighingBatches.map((wb: any) => ({ id: wb.id, stock_item_code: wb.stock_item_code, stock_item_name: wb.stock_item_name, initialQty: parseFloat(wb.initial_qty) || 0, used_qty: parseFloat(wb.used_qty) || 0, createdAt: safeNewDate(wb.created_at), userId: wb.created_by_id, createdBy: wb.created_by_name, weighingType: wb.weighing_type })));
            
            if (dataMap.grindingBatches) setGrindingBatches(dataMap.grindingBatches.map((gb: any) => ({ 
                id: gb.id, 
                sourceInsumoCode: gb.source_insumo_code, 
                sourceInsumoName: gb.source_insumo_name, 
                sourceQtyUsed: parseFloat(gb.source_qty_used) || 0, 
                outputInsumoCode: gb.output_insumo_code, 
                outputInsumoName: gb.output_insumo_name, 
                outputQtyProduced: parseFloat(gb.output_qty_produced) || 0, 
                createdAt: safeNewDate(gb.created_at), 
                userId: gb.user_id, 
                userName: gb.user_name, 
                mode: gb.mode 
            })));
            
            const planItemsData = dataMap.productionPlanItems;
            const plansData = dataMap.productionPlans;
            if (plansData && planItemsData) {
                const planItemsMap = new Map<string, any[]>();
                planItemsData.forEach((item: any) => {
                    if (!planItemsMap.has(item.plan_id)) planItemsMap.set(item.plan_id, []);
                    planItemsMap.get(item.plan_id)!.push(item);
                });
                setProductionPlans(plansData.map((p: any) => ({ id: p.id, name: p.name, createdAt: p.created_at, createdBy: p.created_by, status: p.status, parameters: p.parameters, items: planItemsMap.get(p.id) || [], planDate: p.plan_date })));
            }

            if (dataMap.shoppingList) setShoppingList(dataMap.shoppingList.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, is_purchased: i.is_purchased })));
            if (dataMap.notices) setAdminNotices(dataMap.notices.map((n: any) => ({ id: n.id, text: n.text, level: n.level, type: n.type, created_by: n.created_at, created_at: n.created_at })));
            if (dataMap.importHistory) setImportHistory(dataMap.importHistory.map((h: any) => ({ id: h.id, fileName: h.file_name, processedAt: h.processed_at, user: h.user_name, itemCount: h.item_count, unlinkedCount: h.unlinked_count, processed_data: h.processed_data, canal: h.canal })));
            if (dataMap.etiquetasHistory) setEtiquetasHistory(dataMap.etiquetasHistory as EtiquetaHistoryItem[]);
            if (dataMap.biData) setBiData(dataMap.biData as BiDataItem[]);

            if (dataMap.settings) {
                const settingsMap = new Map(dataMap.settings.map((s: any) => [s.key, s.value]));
                const general = settingsMap.get('general') as Partial<GeneralSettings> | undefined;
                if (general) {
                    setGeneralSettings(prev => ({
                        ...prev,
                        ...general,
                        bipagem: { ...prev.bipagem, ...(general.bipagem || {}) },
                        etiquetas: { ...prev.etiquetas, ...(general.etiquetas || {}) },
                        estoque: { ...prev.estoque, ...(general.estoque || {}) },
                        dashboard: { ...prev.dashboard, ...(general.dashboard || {}) },
                        expeditionRules: {
                            packagingRules: Array.isArray(general.expeditionRules?.packagingRules) ? general.expeditionRules.packagingRules : [],
                            miudosPackagingRules: Array.isArray(general.expeditionRules?.miudosPackagingRules) ? general.expeditionRules.miudosPackagingRules : []
                        },
                        importer: { ...prev.importer, ...(general.importer || {}) },
                        pedidos: { ...prev.pedidos, ...(general.pedidos || {}) },
                        productCategoryList: Array.isArray(general.productCategoryList) ? general.productCategoryList : prev.productCategoryList,
                        insumoCategoryList: Array.isArray(general.insumoCategoryList) ? general.insumoCategoryList : prev.insumoCategoryList,
                    }));
                }
                const etiquetas = settingsMap.get('etiquetas') as Partial<ZplSettings> | undefined;
                if (etiquetas) {
                    setEtiquetasSettings(prev => ({ ...prev, ...etiquetas }));
                }
            }

            if (currentUser.ui_settings) {
                setUiSettings(s => ({...s, ...(currentUser.ui_settings as object)}));
            }
            
            setAppStatus('ready');
        } catch (e) {
            setAppStatus('error');
        }
    }, [currentUser]);
    
    const handleSaveEtiquetaHistory = useCallback(async (historyItem: Omit<EtiquetaHistoryItem, 'id' | 'created_at'>) => {
        const { data, error } = await dbClient.from('etiquetas_historico').insert(historyItem as any).select().single();
        if (!error) {
            setEtiquetasHistory(prev => [data as EtiquetaHistoryItem, ...prev]);
        }
    }, []);

    const handleGetEtiquetaHistoryDetails = useCallback(async (id: string): Promise<EtiquetaHistoryItem | null> => {
        const { data, error } = await dbClient.from('etiquetas_historico').select('*').eq('id', id).single();
        return error ? null : data as EtiquetaHistoryItem;
    }, []);

    // NEW: Moved ZPL Processing logic to App to support background execution
    const handleProcessZpl = useCallback(async (mode: 'completo' | 'rapido') => {
        setIsProcessingLabels(true);
        setLabelProgressMessage('Iniciando processamento...');
        setLabelProcessingProgress(0);

        const zplToProcess = etiquetasState.zplInput;
        const historyItem = etiquetasHistory.find(h => h.zpl_content === zplToProcess);
        const printedHashes = new Set<string>(historyItem?.page_hashes || []);
        
        // Count errors for summary
        let errorCount = 0;

        if (mode === 'rapido') {
            setEtiquetasState(prev => ({ ...prev, includeDanfe: false }));
        } else {
            setEtiquetasState(prev => ({ ...prev, includeDanfe: true }));
        }

        const processor = processZplStream(zplToProcess, etiquetasSettings, generalSettings, allOrders, mode, printedHashes);

        try {
            for await (const result of processor) {
                switch (result.type) {
                    case 'progress':
                        setLabelProgressMessage(result.message);
                        break;
                    case 'start':
                        if (result.warnings.length > 0) {
                            setEtiquetasState(prev => ({ ...prev, warnings: result.warnings }));
                        }
                        if (result.hasMlWithoutDanfe) {
                            setEtiquetasState(prev => ({ ...prev, includeDanfe: false }));
                        }
                        setEtiquetasState(prev => ({
                            ...prev,
                            zplPages: result.zplPages,
                            extractedData: result.extractedData,
                            previews: new Array(result.zplPages.length).fill('')
                        }));
                        
                        const newPrintedIndices = new Set<number>();
                        if (result.printedStatus) {
                            result.printedStatus.forEach((isPrinted: boolean, index: number) => {
                                if (isPrinted) {
                                    newPrintedIndices.add(index);
                                }
                            });
                        }
                        setEtiquetasState(prev => ({ ...prev, printedIndices: newPrintedIndices }));
                        break;
                    case 'preview':
                        if (result.preview === 'ERROR') {
                            errorCount++;
                        }
                        setEtiquetasState(prev => {
                            const newPreviews = [...prev.previews];
                            newPreviews[result.index] = result.preview;
                            const progress = Math.round(((result.index + 1) / prev.zplPages.length) * 100);
                            setLabelProcessingProgress(progress);
                            return { ...prev, previews: newPreviews };
                        });
                        break;
                    case 'done':
                        setLabelProgressMessage('Concluído');
                        setLabelProcessingProgress(100);
                        break;
                    case 'error':
                        alert(`Ocorreu um erro: ${result.message}`);
                        break;
                }
            }
            
            // Notify completion
            if (errorCount > 0) {
                addToast(`Processamento concluído com ${errorCount} erros de renderização. Verifique as etiquetas.`, 'error');
                if (uiSettings.soundOnError) playSound('error');
            } else {
                addToast('Processamento de etiquetas concluído com sucesso!', 'success');
                if (uiSettings.soundOnSuccess) playSound('success');
            }

        } catch (error) {
            console.error("Erro no processamento ZPL:", error);
            addToast('Erro crítico no processamento de etiquetas.', 'error');
        } finally {
            setIsProcessingLabels(false);
            setLabelProgressMessage('');
            setLabelProcessingProgress(0);
        }
    }, [etiquetasState.zplInput, etiquetasSettings, generalSettings, allOrders, etiquetasHistory, uiSettings, addToast]);

    const handleGetImportHistoryDetails = useCallback(async (id: string): Promise<ProcessedData | null> => {
        const { data, error } = await dbClient.from('import_history').select('processed_data').eq('id', id).single();
        return error ? null : data.processed_data;
    }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { setupNeeded, error, details } = await verifyDatabaseSetup();
        if (error) { setAppStatus('error'); return; }
        if (setupNeeded) { setSetupDetails(details); setAppStatus('needs_setup'); } else { setAppStatus('ready'); }
      } catch (e) { setAppStatus('error'); }
    };
    initializeApp();
  }, []);
  
    useEffect(() => {
        const root = document.documentElement;
        const effectiveTheme = uiSettings.baseTheme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : uiSettings.baseTheme;
        root.classList.remove('theme-light', 'theme-dark');
        root.classList.add(`theme-${effectiveTheme}`);
        root.classList.remove('accent-indigo', 'accent-emerald', 'accent-fuchsia', 'accent-orange', 'accent-slate', 'accent-custom');
        root.classList.add(`accent-${uiSettings.accentColor}`);
    }, [uiSettings.baseTheme, uiSettings.accentColor, uiSettings.customAccentColor]);

  useEffect(() => {
    if (currentUser && !initialized.current) {
        initialized.current = true;
        loadData();
    }
  }, [currentUser, loadData]);

    const handleSaveExpeditionItems = async (productCode: string, items: { stockItemCode: string; qty_per_pack: number }[]) => {
        const { error } = await dbClient.from('stock_items').update({ expedition_items: items as any }).eq('code', productCode);
        if (!error) {
            setStockItems(prev => prev.map(item => item.code === productCode ? { ...item, expedition_items: items } : item));
            addToast('Itens de expedição salvos!', 'success');
        }
    };
    
  const handleSaveProdutoCombinado = useCallback(async (productSku: string, newBomItems: ProdutoCombinado['items']) => {
        const { error } = await dbClient.from('product_boms').upsert({ product_sku: productSku, items: newBomItems as any, updated_at: new Date().toISOString() });
        if (!error) {
            setProdutosCombinados(prev => {
                const existing = prev.find(b => b.productSku === productSku);
                return existing ? prev.map(b => b.productSku === productSku ? { ...b, items: newBomItems } : b) : [...prev, { productSku, items: newBomItems }];
            });
            addToast('Receita (BOM) salva!', 'success');
        }
    }, [addToast]);
    
  const handleAddNewItem = useCallback(async (item: Omit<StockItem, 'id'>): Promise<StockItem | null> => {
        const { data, error } = await dbClient.from('stock_items').insert(item as any).select().single();
        if (!error) {
            const newItem = { ...data, expedition_items: data.expedition_items || [] } as StockItem;
            setStockItems(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
            addToast('Item criado!', 'success');
            return newItem;
        }
        return null;
    }, [addToast]);

    const handleAddNewWeighing = useCallback(async (insumoCode: string, quantity: number, type: WeighingType, userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        const { error } = await dbClient.rpc('record_weighing_and_deduct_stock', { item_code: insumoCode, quantity_to_weigh: quantity, weighing_type_text: type, user_id: user.id, user_name: user.name });
        if (!error) { loadData(); addToast('Pesagem registrada!', 'success'); }
    }, [users, addToast, loadData]);

    const handleAddNewGrinding = useCallback(async (data: { sourceCode: string, sourceQty: number, outputCode: string, outputName: string, outputQty: number, mode: 'manual' | 'automatico', userId?: string, userName: string }) => {
        const { error } = await dbClient.rpc('record_grinding_run', { source_code: data.sourceCode, source_qty: data.sourceQty, output_code: data.outputCode, output_name: data.outputName, output_qty: data.outputQty, op_mode: data.mode, op_user_id: data.userId, op_user_name: data.userName });
        if (!error) { loadData(); addToast('Moagem registrada!', 'success'); }
    }, [addToast, loadData]);

    const handleDeleteGrindingBatch = useCallback(async (batchId: string): Promise<boolean> => {
        const { error } = await dbClient.from('grinding_batches').delete().eq('id', batchId);
        if(!error) { loadData(); addToast('Lote excluído.', 'success'); return true; }
        return false;
    }, [addToast, loadData]);

    const handleDeleteWeighingBatch = useCallback(async (batchId: string): Promise<boolean> => {
        const { error } = await dbClient.from('weighing_batches').delete().eq('id', batchId);
        if (!error) {
            loadData();
            addToast('Lote de pesagem excluído.', 'success');
            return true;
        }
        return false;
    }, [addToast, loadData]);
    
  const handleUpdateUser = useCallback(async (user: User): Promise<boolean> => {
        const { id, ...updateData } = user;
        const { error } = await dbClient.from('users').update(updateData as any).eq('id', id);
        if (!error) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updateData } : u));
            if (currentUser?.id === id) setCurrentUser(prev => prev ? {...prev, ...updateData} : null);
            addToast('Usuário atualizado!', 'success');
            return true;
        }
        return false;
    }, [addToast, currentUser]);

  const handleCancelBipagem = useCallback(async (scanId: string) => {
        if (!currentUser) return;
        const { error } = await dbClient.rpc('cancel_scan_id_and_revert_stock', { scan_id_to_cancel: scanId, user_name: currentUser.name });
        if (!error) { addToast('Bipagem cancelada!', 'success'); loadData(); }
    }, [currentUser, addToast, loadData]);

  const handleBulkCancelBipagem = useCallback(async (scanIds: string[]) => {
        if (!currentUser) return;
        for (const id of scanIds) await dbClient.rpc('cancel_scan_id_and_revert_stock', { scan_id_to_cancel: id, user_name: currentUser.name });
        addToast(`${scanIds.length} bipagens canceladas!`, 'success');
        loadData();
    }, [currentUser, addToast, loadData]);

    const handleHardDeleteScanLog = useCallback(async (scanId: string) => {
        const { error } = await dbClient.from('scan_logs').delete().eq('id', scanId);
        if (!error) { addToast('Registro excluído!', 'success'); loadData(); }
    }, [addToast, loadData]);

    const handleBulkHardDeleteScanLog = useCallback(async (scanIds: string[]) => {
        const { error } = await dbClient.from('scan_logs').delete().in('id', scanIds);
        if (!error) { addToast('Registros excluídos!', 'success'); loadData(); }
    }, [addToast, loadData]);

  const handleAddNewUser = useCallback(async (name: string, setor: UserSetor[], role: UserRole, email?: string, password?: string): Promise<{ success: boolean; message?: string; }> => {
        const payload: any = { name, setor, role, email: email || null };
        if (password) payload.password = password;
        const { error } = await dbClient.from('users').insert(payload);
        if (error) return { success: false, message: 'Falha ao adicionar.' };
        loadData(); addToast('Usuário adicionado.', 'success');
        return { success: true };
    }, [addToast, loadData]);

  const handleSyncPending = useCallback(async () => {
    addToast('Sincronizando...', 'info');
    const { data: pendingScans } = await dbClient.from('scan_logs').select('*').eq('status', 'NOT_FOUND');
    if (!pendingScans || pendingScans.length === 0) return;
    for (const scan of pendingScans) {
        const { data: orderData } = await dbClient.from('orders').select('*').or(`order_id.eq.${scan.display_key},tracking.eq.${scan.display_key}`).limit(1).single();
        if (orderData && orderData.status === 'NORMAL') {
            await dbClient.from('scan_logs').update({ status: 'OK', synced: true, canal: orderData.canal }).eq('id', scan.id);
            await dbClient.from('orders').update({ status: 'BIPADO' }).eq('id', orderData.id);
        }
    }
    loadData(); addToast('Sincronização concluída!', 'success');
  }, [addToast, loadData]);

  const handleLogError = useCallback(async (orderIdentifier: string, reason: string): Promise<boolean> => {
        const { error } = await dbClient.from('orders').update({ status: 'ERRO', error_reason: reason }).or(`order_id.eq.${orderIdentifier},tracking.eq.${orderIdentifier}`);
        if(!error) { loadData(); addToast('Falha registrada.', 'success'); return true; }
        return false;
    }, [addToast, loadData]);

  const handleLogReturn = useCallback(async (tracking: string, customerName: string): Promise<boolean> => {
        if(!currentUser) return false;
        const orderToReturn = allOrders.find(o => o.tracking === tracking);
        if (!orderToReturn) return false;
        const { error } = await dbClient.from('returns').insert({ tracking, customer_name: customerName, logged_by_id: currentUser.id, logged_by_name: currentUser.name, logged_at: new Date().toISOString(), order_id: orderToReturn.id });
        if(!error) { await dbClient.from('orders').update({ status: 'DEVOLVIDO' }).eq('id', orderToReturn.id); loadData(); addToast('Devolução registrada.', 'success'); return true; }
        return false;
    }, [currentUser, allOrders, addToast, loadData]);

  const handleDeleteOrders = useCallback(async (orderIds: string[]) => {
        if (orderIds.length === 0) return;
        const { error } = await dbClient.rpc('delete_orders', { order_ids: orderIds });
        if(!error) { 
            await loadData(); // Force reload to update UI
            addToast(`${orderIds.length} pedidos excluídos.`, 'success'); 
        } else {
            addToast(`Erro ao excluir pedidos: ${error.message}`, 'error');
            // Try to recover if RPC is missing (rare case but good fallback)
            if (error.code === '42883') { // Undefined function
                 addToast('Função de exclusão não encontrada. Sincronize o banco nas configurações.', 'error');
            }
        }
    }, [addToast, loadData]);

  const handleUpdateStatus = useCallback(async (orderIds: string[], newStatus: OrderStatusValue): Promise<boolean> => {
        const { error } = await dbClient.from('orders').update({ status: newStatus }).in('id', orderIds);
        if(!error) { loadData(); addToast('Status atualizado.', 'success'); return true; }
        return false;
    }, [addToast, loadData]);

  const handleRemoveReturn = useCallback(async (returnId: string): Promise<boolean> => {
        const returnItem = returns.find(r => r.id === returnId);
        if (!returnItem) return false;
        const { error } = await dbClient.from('returns').delete().eq('id', returnId);
        if(!error) { await dbClient.from('orders').update({ status: 'NORMAL' }).eq('tracking', returnItem.tracking); loadData(); addToast('Devolução removida.', 'success'); return true; }
        return false;
    }, [returns, addToast, loadData]);

  const handleSolveOrders = useCallback(async (orderIds: string[], resolution: Omit<OrderResolutionDetails, 'resolved_by' | 'resolved_at'>): Promise<boolean> => {
        if(!currentUser) return false;
        const resolution_details = { ...resolution, resolved_by: currentUser.name, resolved_at: new Date().toISOString() };
        const { error } = await dbClient.from('orders').update({ status: 'SOLUCIONADO', resolution_details: resolution_details as any }).in('id', orderIds);
        if(!error) { loadData(); addToast('Solucionado.', 'success'); return true; }
        return false;
    }, [currentUser, addToast, loadData]);

  const handleBackupData = useCallback(async () => {
        const stateToExport = { users, stockItems, stockMovements, boms: produtosCombinados, weighingBatches, allOrders, returns, scanHistory, skuLinks };
        exportStateToSql(stateToExport as any, SETUP_SQL_STRING);
    }, [users, stockItems, stockMovements, produtosCombinados, weighingBatches, allOrders, returns, scanHistory, skuLinks]);

  const handleResetDatabase = useCallback(async (adminPassword: string): Promise<{ success: boolean; message?: string; }> => {
        const loggedInUser = await loginUser(currentUser!.email!, adminPassword);
        if (!loggedInUser || loggedInUser.id !== currentUser!.id) return { success: false, message: 'Senha incorreta.' };
        const { success, message } = await resetDatabase();
        if(success) await loadData();
        return { success, message };
    }, [currentUser, loadData]);

  const handleClearScanHistory = useCallback(async (adminPassword: string): Promise<{ success: boolean; message?: string; }> => {
        if (currentUser?.role !== 'SUPER_ADMIN') return { success: false };
        const loggedInUser = await loginUser(currentUser.email!, adminPassword);
         if (!loggedInUser || loggedInUser.id !== currentUser.id) return { success: false, message: 'Senha incorreta.' };
        const { error } = await dbClient.rpc('clear_scan_history');
        if (!error) { addToast('Histórico limpo.', 'success'); loadData(); return { success: true }; }
        return { success: false };
    }, [currentUser, addToast, loadData]);

  const handleSaveProductionPlan = useCallback(async (plan: Omit<ProductionPlan, 'id' | 'createdAt' | 'createdBy'>): Promise<ProductionPlan | null> => {
        if (!currentUser) return null;
        const { data, error } = await dbClient.from('production_plans').insert({ ...plan, created_by: currentUser.name }).select().single();
        if(!error) {
            const planItemsToInsert = plan.items.map(item => ({...item, plan_id: data.id}));
            await dbClient.from('production_plan_items').insert(planItemsToInsert);
            loadData(); addToast('Plano salvo.', 'success');
            return { ...data, items: planItemsToInsert } as ProductionPlan;
        }
        return null;
    }, [currentUser, addToast, loadData]);

  const handleDeleteProductionPlan = useCallback(async (planId: string): Promise<boolean> => {
        const { error } = await dbClient.from('production_plans').delete().eq('id', planId);
        if(!error) { loadData(); addToast('Plano excluído.', 'success'); return true; }
        return false;
    }, [addToast, loadData]);

  const handleGenerateShoppingList = useCallback(async (list: ShoppingListItem[]) => {
        const itemsToUpsert = list.map(i => ({ stock_item_code: i.id, name: i.name, quantity: i.quantity, unit: i.unit, is_purchased: false }));
        const { error } = await dbClient.from('shopping_list_items').upsert(itemsToUpsert, { onConflict: 'stock_item_code' });
        if(!error) { loadData(); addToast('Lista gerada.', 'success'); }
    }, [addToast, loadData]);

  const handleClearShoppingList = useCallback(async () => {
        await dbClient.from('shopping_list_items').delete().neq('stock_item_code', 'dummy');
        loadData();
    }, [loadData]);

  const handleUpdateShoppingItem = useCallback(async (itemCode: string, isPurchased: boolean) => {
        await dbClient.from('shopping_list_items').update({ is_purchased: isPurchased }).eq('stock_item_code', itemCode);
        setShoppingList(prev => prev.map(i => i.id === itemCode ? {...i, is_purchased: isPurchased} : i));
    }, []);

  const handleSetAttendance = useCallback(async (userId: string, record: any) => {
        const user = users.find(u => u.id === userId);
        if(!user) return;
        const otherRecords = user.attendance.filter(a => a.date !== record.date);
        const newAttendance = [...otherRecords, record].sort((a,b) => b.date.localeCompare(a.date));
        await handleUpdateUser({ ...user, attendance: newAttendance });
    }, [users, handleUpdateUser]);

  const handleUpdateAttendanceDetails = useCallback(async (userId: string, date: string, detail: any, time: any) => {
        const user = users.find(u => u.id === userId);
        if(!user) return;
        const newAttendance = user.attendance.map(a => a.date === date ? { ...a, [detail]: time || undefined } : a);
        await handleUpdateUser({ ...user, attendance: newAttendance });
    }, [users, handleUpdateUser]);

  const handleStockAdjustment = useCallback(async (stockItemCode: string, quantityDelta: number, ref: string): Promise<boolean> => {
        if (!currentUser) return false;
        const { error } = await dbClient.rpc('adjust_stock_quantity', { item_code: stockItemCode, quantity_delta: quantityDelta, origin_text: 'AJUSTE_MANUAL', ref_text: ref, user_name: currentUser.name });
        if(!error) { loadData(); addToast('Ajustado!', 'success'); return true; }
        return false;
    }, [currentUser, addToast, loadData]);

  const handleProductionRun = useCallback(async (itemCode: string, quantity: number, ref: string) => {
        if (!currentUser) return;
        const { error } = await dbClient.rpc('record_production_run', { item_code: itemCode, quantity_to_produce: quantity, ref_text: ref, user_name: currentUser.name });
        if(!error) { loadData(); addToast('Produção registrada.', 'success'); }
    }, [currentUser, addToast, loadData]);

    const handleEditItem = useCallback(async (itemId: string, updates: any): Promise<boolean> => {
        const { error } = await dbClient.from('stock_items').update(updates as any).eq('id', itemId);
        if (!error) { loadData(); addToast('Atualizado.', 'success'); return true; }
        return false;
    }, [addToast, loadData]);

  const handleDeleteItem = useCallback(async (itemId: string): Promise<boolean> => {
        const itemToDelete = stockItems.find(item => item.id === itemId);
        if (itemToDelete && itemToDelete.kind === 'PRODUTO') await dbClient.from('sku_links').delete().eq('master_product_sku', itemToDelete.code);
        const { error } = await dbClient.from('stock_items').delete().eq('id', itemId);
        if(!error) { loadData(); addToast('Excluído.', 'success'); return true; }
        return false;
    }, [addToast, loadData, stockItems]);

  const handleBulkDeleteItems = useCallback(async (itemIds: string[]): Promise<boolean> => {
        const { error } = await dbClient.from('stock_items').delete().in('id', itemIds);
        if(!error) { loadData(); addToast('Itens excluídos.', 'success'); return true; }
        return false;
    }, [addToast, loadData]);

  const handleConfirmImportFromXml = useCallback(async (payload: any) => {
        if (!currentUser) return;
        const newItemsToInsert = payload.itemsToCreate.map((item:any) => ({ ...item, current_qty: item.initial_qty, min_qty: item.min_qty || 0 }));
        if (newItemsToInsert.length > 0) await dbClient.from('stock_items').insert(newItemsToInsert as any);
        for (const item of payload.itemsToUpdate) await dbClient.rpc('adjust_stock_quantity', { item_code: item.stockItemCode, quantity_delta: item.quantityDelta, origin_text: 'IMPORT_XML', ref_text: 'NFe Import', user_name: currentUser.name });
        addToast('XML Importado!', 'success'); loadData();
    }, [currentUser, addToast, loadData]);

  const handleLaunchSuccess = useCallback(async (launchedOrders: OrderItem[]) => {
        const uniqueOrdersMap = new Map();
        launchedOrders.forEach(o => uniqueOrdersMap.set(`${o.orderId}|${o.sku}`, { 
            order_id: o.orderId, 
            tracking: o.tracking, 
            sku: o.sku, 
            qty_original: o.qty_original, 
            multiplicador: o.multiplicador, 
            qty_final: o.qty_final, 
            color: o.color, 
            canal: o.canal, 
            data: o.data, 
            status: o.status, 
            customer_name: o.customer_name, 
            customer_cpf_cnpj: o.customer_cpf_cnpj, 
            price_gross: o.price_gross, 
            platform_fees: o.platform_fees, 
            shipping_fee: o.shipping_fee, 
            price_net: o.price_net,
            data_prevista_envio: o.data_prevista_envio
        }));
        
        // Batching for robustness
        const BATCH_SIZE = 500;
        const uniqueOrders = Array.from(uniqueOrdersMap.values());
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < uniqueOrders.length; i += BATCH_SIZE) {
            const batch = uniqueOrders.slice(i, i + BATCH_SIZE);
            const { error } = await dbClient.from('orders').upsert(batch, { onConflict: 'order_id,sku' });
            if (error) {
                console.error('Batch upload error:', error);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
            }
        }
        
        if (successCount > 0) { 
            await loadData(); 
            addToast(`Sucesso! ${successCount} pedidos salvos.${errorCount > 0 ? ` (${errorCount} falhas)` : ''}`, errorCount > 0 ? 'info' : 'success'); 
            if (uiSettings.soundOnSuccess) playSound('success');
        } else if (errorCount > 0) {
            addToast(`Erro ao salvar no banco. Verifique o console.`, 'error');
            if (uiSettings.soundOnError) playSound('error');
        }
    }, [addToast, loadData, uiSettings]);
    
  const handleLinkSku = useCallback(async (importedSku: string, masterProductSku: string): Promise<boolean> => {
        const { error } = await dbClient.from('sku_links').upsert({ imported_sku: importedSku, master_product_sku: masterProductSku }, { onConflict: 'imported_sku' });
        if (!error) { setSkuLinks(prev => [...prev.filter(l => l.importedSku !== importedSku), { importedSku, masterProductSku }]); addToast('Vinculado!', 'success'); return true; }
        return false;
    }, [addToast]);

  const handleUnlinkSku = useCallback(async (importedSku: string): Promise<boolean> => {
        const { error } = await dbClient.from('sku_links').delete().eq('imported_sku', importedSku);
        if (!error) { setSkuLinks(prev => prev.filter(l => l.importedSku !== importedSku)); addToast('Desvinculado.', 'info'); return true; }
        return false;
    }, [addToast]);

  const handleAddImportToHistory = useCallback(async (item: any, processedData: any) => {
        const { data, error } = await dbClient.from('import_history').insert({ file_name: item.fileName, processed_at: item.processedAt, user_name: item.user, item_count: item.item_count, unlinked_count: item.unlinked_count, canal: item.canal, processed_data: processedData as any }).select().single();
        if(!error) setImportHistory(prev => [{ id: data.id, fileName: data.file_name, processedAt: data.processed_at, user: data.user_name, itemCount: data.item_count, unlinkedCount: data.unlinked_count, processedData: data.processed_data, canal: data.canal }, ...prev]);
    }, []);

  const handleClearImportHistory = useCallback(async () => {
        await dbClient.from('import_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        setImportHistory([]);
    }, []);

    const handleConfirmDeleteHistoryItem = async () => {
        if (!historyItemToDelete) return;
        setIsDeletingHistory(true);
        
        let pData = historyItemToDelete.processedData;
        if (!pData) {
            const { data } = await dbClient.from('import_history').select('processed_data').eq('id', historyItemToDelete.id).single();
            if (data) pData = data.processed_data;
        }

        if (pData) {
            const orderIdentifiers = new Set(pData.lists.completa.map((o: any) => `${o.orderId}|${o.sku}`));
            const dbIdsToDelete = allOrders.filter(o => orderIdentifiers.has(`${o.orderId}|${o.sku}`)).map(o => o.id);
            if (dbIdsToDelete.length > 0) {
                // Using new delete_orders RPC
                await dbClient.rpc('delete_orders', { order_ids: dbIdsToDelete });
            }
        }

        await dbClient.from('import_history').delete().eq('id', historyItemToDelete.id);
        
        setIsDeletingHistory(false);
        setIsDeleteModalOpen(false);
        setHistoryItemToDelete(null);
        loadData();
    };

    const handleBulkDeleteHistoryItems = useCallback(async (ids: string[]) => {
        const { data: historyItems, error: fetchError } = await dbClient
            .from('import_history')
            .select('processed_data')
            .in('id', ids);

        if (fetchError || !historyItems) {
            addToast('Erro ao buscar dados do histórico.', 'error');
            return;
        }

        let allOrderIdentifiers = new Set<string>();
        historyItems.forEach((item: any) => {
            if (item.processed_data && item.processed_data.lists && item.processed_data.lists.completa) {
                item.processed_data.lists.completa.forEach((o: any) => {
                    allOrderIdentifiers.add(`${o.orderId}|${o.sku}`);
                });
            }
        });

        if (allOrderIdentifiers.size > 0) {
            const dbIdsToDelete = allOrders.filter(o => allOrderIdentifiers.has(`${o.orderId}|${o.sku}`)).map(o => o.id);
            if (dbIdsToDelete.length > 0) {
                // Using new delete_orders RPC
                await dbClient.rpc('delete_orders', { order_ids: dbIdsToDelete });
            }
        }

        const { error: deleteError } = await dbClient.from('import_history').delete().in('id', ids);
        
        if (deleteError) {
            addToast('Erro ao excluir histórico.', 'error');
        } else {
            addToast(`Histórico e pedidos vinculados excluídos com sucesso.`, 'success');
            loadData();
        }
    }, [allOrders, loadData, addToast]);

  const handleDeleteUser = useCallback(async (userId: string, adminPassword?: string): Promise<boolean> => {
        if (!currentUser) return false;
        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete || userToDelete.role === 'SUPER_ADMIN') return false;
        if (currentUser.role === 'SUPER_ADMIN' && userToDelete.role === 'ADMIN' && adminPassword) {
            const loggedIn = await loginUser(currentUser.email!, adminPassword);
            if (!loggedIn) return false;
        }
        const { error } = await dbClient.from('users').delete().eq('id', userId);
        if(!error) { loadData(); addToast('Excluído.', 'success'); return true; }
        return false;
    }, [users, currentUser, addToast, loadData]);

  const handleBulkSetInitialStock = useCallback(async (updates: any): Promise<string> => {
    if (!currentUser) return "";
    const { data, error } = await dbClient.rpc('bulk_set_initial_stock', { updates: updates.map((u:any) => ({ item_code: u.code, new_initial_quantity: u.quantity })), user_name: currentUser.name });
    if (!error) { addToast('Inventário ajustado!', 'success'); loadData(); return data as string; }
    return "";
  }, [currentUser, addToast, loadData]);

  const handleLoadZplFromBling = (zpl: string) => {
    setEtiquetasState(prev => ({ ...prev, zplInput: zpl, zplPages: [], previews: [], extractedData: new Map() }));
    setCurrentPage('etiquetas');
  };

  const renderPage = () => {
    switch (currentPage) {
        case 'dashboard': return <DashboardPage setCurrentPage={setCurrentPage} generalSettings={generalSettings} allOrders={allOrders} scanHistory={scanHistory} stockItems={stockItems} produtosCombinados={produtosCombinados} users={users} lowStockCount={lowStockCount} uiSettings={uiSettings} onSaveUiSettings={handleSaveUiSettings} adminNotices={adminNotices} onSaveNotice={handleSaveNotice} onDeleteNotice={handleDeleteNotice} currentUser={currentUser!} skuLinks={skuLinks} onSaveDashboardConfig={handleSaveDashboardConfig} packGroups={packGroups} onSavePackGroup={async (g, id) => { await dbClient.from('stock_pack_groups').upsert(id ? { ...g, id } : g); loadData(); }} />
        case 'importer': return <ImporterPage 
            allOrders={allOrders} 
            selectedFile={selectedFile} 
            setSelectedFile={setSelectedFile} 
            processedData={processedData} 
            setProcessedData={setProcessedData} 
            error={importError} 
            setError={setImportError} 
            isProcessing={isProcessing} 
            setIsProcessing={setIsProcessing} 
            onLaunchSuccess={handleLaunchSuccess} 
            skuLinks={skuLinks} 
            onLinkSku={handleLinkSku} 
            onUnlinkSku={handleUnlinkSku} 
            products={stockItems.filter(i => i.kind === 'PRODUTO')} 
            onAddNewItem={handleAddNewItem} 
            produtosCombinados={produtosCombinados} 
            stockItems={stockItems} 
            generalSettings={generalSettings} 
            setGeneralSettings={handleSaveGeneralSettings} 
            currentUser={currentUser!} 
            importHistory={importHistory} 
            addImportToHistory={handleAddImportToHistory} 
            clearImportHistory={handleClearImportHistory} 
            onDeleteHistoryItem={(item)=> {setHistoryItemToDelete(item); setIsDeleteModalOpen(true);}} 
            onGetImportHistoryDetails={handleGetImportHistoryDetails} 
            onBulkDeleteHistory={handleBulkDeleteHistoryItems} 
            users={users}
        />
        case 'bipagem': return <BipagemPage isAutoBipagemActive={isAutoBipagemActive} allOrders={allOrders} onNewScan={handleNewScan} onBomDeduction={() => {}} scanHistory={scanHistory} onCancelBipagem={handleCancelBipagem} onBulkCancelBipagem={handleBulkCancelBipagem} products={stockItems} users={users} onAddNewUser={handleAddNewUser} onSaveUser={handleUpdateUser} uiSettings={uiSettings} currentUser={currentUser!} onSyncPending={handleSyncPending} skuLinks={skuLinks} addToast={addToast} currentPage={currentPage} onHardDeleteScanLog={handleHardDeleteScanLog} onBulkHardDeleteScanLog={handleBulkHardDeleteScanLog} />
        case 'pedidos': return <PedidosPage allOrders={allOrders} scanHistory={scanHistory} returns={returns} onLogError={handleLogError} onLogReturn={handleLogReturn} currentUser={currentUser!} onDeleteOrders={handleDeleteOrders} onBulkCancelBipagem={handleBulkCancelBipagem} onUpdateStatus={handleUpdateStatus} onRemoveReturn={handleRemoveReturn} onSolveOrders={handleSolveOrders} generalSettings={generalSettings} users={users} skuLinks={skuLinks} stockItems={stockItems} />
        case 'planejamento': return <PlanejamentoPage stockItems={stockItems} allOrders={allOrders} skuLinks={skuLinks} produtosCombinados={produtosCombinados} productionPlans={productionPlans} onSaveProductionPlan={handleSaveProductionPlan} onDeleteProductionPlan={handleDeleteProductionPlan} onGenerateShoppingList={handleGenerateShoppingList} currentUser={currentUser!} planningSettings={generalSettings.estoque} onSavePlanningSettings={(s) => handleSaveGeneralSettings(p => ({...p, estoque: s}))} addToast={addToast} />
        case 'compras': return <ComprasPage shoppingList={shoppingList} onClearList={handleClearShoppingList} onUpdateItem={handleUpdateShoppingItem} stockItems={stockItems} />
        case 'pesagem': return <PesagemPage stockItems={stockItems} weighingBatches={weighingBatches} onAddNewWeighing={handleAddNewWeighing} currentUser={currentUser!} onDeleteBatch={handleDeleteWeighingBatch} users={users} />
        case 'moagem': return <MoagemPage stockItems={stockItems} grindingBatches={grindingBatches} onAddNewGrinding={handleAddNewGrinding} currentUser={currentUser!} onDeleteBatch={handleDeleteGrindingBatch} users={users} generalSettings={generalSettings} />
        case 'estoque': return <EstoquePage stockItems={stockItems} stockMovements={stockMovements} onStockAdjustment={handleStockAdjustment} produtosCombinados={produtosCombinados} onSaveProdutoCombinado={handleSaveProdutoCombinado} onAddNewItem={handleAddNewItem} weighingBatches={weighingBatches} onAddNewWeighing={handleAddNewWeighing} onProductionRun={handleProductionRun} currentUser={currentUser!} onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} onBulkDeleteItems={handleBulkDeleteItems} onDeleteMovement={async()=>false} onDeleteWeighingBatch={handleDeleteWeighingBatch} generalSettings={generalSettings} setGeneralSettings={setGeneralSettings as any} onConfirmImportFromXml={handleConfirmImportFromXml} onSaveExpeditionItems={handleSaveExpeditionItems} users={users} onUpdateInsumoCategory={async()=>{}} onBulkInventoryUpdate={handleBulkSetInitialStock} skuLinks={skuLinks} onLinkSku={handleLinkSku} onUnlinkSku={handleUnlinkSku} />
        case 'funcionarios': return <FuncionariosPage users={users} onSetAttendance={handleSetAttendance} onAddNewUser={handleAddNewUser} onUpdateAttendanceDetails={handleUpdateAttendanceDetails} onUpdateUser={handleUpdateUser} generalSettings={generalSettings} currentUser={currentUser!} onDeleteUser={handleDeleteUser} />
        case 'relatorios': return <RelatoriosPage stockItems={stockItems} stockMovements={stockMovements} orders={allOrders} weighingBatches={weighingBatches} scanHistory={scanHistory} produtosCombinados={produtosCombinados} users={users} returns={returns} generalSettings={generalSettings} grindingBatches={grindingBatches} />
        case 'financeiro': return <FinancePage allOrders={allOrders} stockItems={stockItems} skuLinks={skuLinks} produtosCombinados={produtosCombinados} generalSettings={generalSettings} onDeleteOrders={handleDeleteOrders} onLaunchOrders={handleLaunchSuccess} onNavigateToSettings={() => { _setCurrentPage('configuracoes-gerais'); localStorage.setItem('erp_current_page', 'configuracoes-gerais'); }} />
        case 'etiquetas': return <EtiquetasPage settings={etiquetasSettings} onSettingsSave={handleSaveEtiquetasSettings} generalSettings={generalSettings} uiSettings={uiSettings} onSetUiSettings={setUiSettings as any} stockItems={stockItems} skuLinks={skuLinks} onLinkSku={handleLinkSku} onUnlinkSku={handleUnlinkSku} onAddNewItem={handleAddNewItem} etiquetasState={etiquetasState} setEtiquetasState={setEtiquetasState} currentUser={currentUser!} allOrders={allOrders} etiquetasHistory={etiquetasHistory} onSaveHistory={handleSaveEtiquetaHistory} onGetHistoryDetails={handleGetEtiquetaHistoryDetails} onProcessZpl={handleProcessZpl} isProcessing={isProcessingLabels} progressMessage={labelProgressMessage} />
        case 'bling': return <BlingPage generalSettings={generalSettings} onLaunchSuccess={handleLaunchSuccess} addToast={addToast} setCurrentPage={setCurrentPage} onLoadZpl={handleLoadZplFromBling} onSaveSettings={handleSaveGeneralSettings} />;
        case 'passo-a-passo': return <PassoAPassoPage />
        case 'ajuda': return <AjudaPage />
        case 'powerbi': return <BiDashboardPage biData={biData} users={users}/>
        case 'powerbi-templates': return <PowerBiTemplatesPage setCurrentPage={setCurrentPage} />
        case 'configuracoes': return <ConfiguracoesPage users={users} setCurrentPage={setCurrentPage} onDeleteUser={handleDeleteUser} onAddNewUser={handleAddNewUser} currentUser={currentUser!} onUpdateUser={handleUpdateUser} generalSettings={generalSettings} stockItems={stockItems} onBackupData={handleBackupData} onResetDatabase={handleResetDatabase} onClearScanHistory={handleClearScanHistory} onSaveGeneralSettings={handleSaveGeneralSettings} addToast={addToast} />
        case 'configuracoes-gerais': return <ConfiguracoesGeraisPage setCurrentPage={setCurrentPage} generalSettings={generalSettings} onSaveGeneralSettings={handleSaveGeneralSettings} currentUser={currentUser} onBackupData={handleBackupData} onResetDatabase={handleResetDatabase} addToast={addToast} stockItems={stockItems} onClearScanHistory={handleClearScanHistory} users={users} />
        default: return <DashboardPage setCurrentPage={setCurrentPage} generalSettings={generalSettings} allOrders={allOrders} scanHistory={scanHistory} stockItems={stockItems} produtosCombinados={produtosCombinados} users={users} lowStockCount={lowStockCount} uiSettings={uiSettings} onSaveUiSettings={handleSaveUiSettings} adminNotices={adminNotices} onSaveNotice={handleSaveNotice} onDeleteNotice={handleDeleteNotice} currentUser={currentUser!} skuLinks={skuLinks} onSaveDashboardConfig={handleSaveDashboardConfig} packGroups={packGroups} onSavePackGroup={async (g, id) => { await dbClient.from('stock_pack_groups').upsert(id ? { ...g, id } : g); loadData(); }} />
    }
  };

  if (appStatus === 'initializing') return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (appStatus === 'needs_setup') return <DatabaseSetupPage onRetry={() => window.location.reload()} details={setupDetails} />;
  if (appStatus === 'error') return <div className="p-4 bg-red-100 text-red-800">Erro crítico ao carregar aplicativo.</div>;

  if (!currentUser) return <LoginPage onLogin={async (l, p) => { const user = await loginUser(l, p); if (user) { localStorage.setItem('erp_current_user', JSON.stringify(user)); setCurrentUser(user); return true; } return false; }} />;

  return (
    <div>
        <style>{`:root { --font-size-dynamic: ${uiSettings.fontSize}px; }`}</style>
        <div className="flex h-screen font-sans bg-[var(--color-bg)]">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} lowStockCount={lowStockCount} isCollapsed={isSidebarCollapsed} toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isMobileOpen={isMobileSidebarOpen} setIsMobileSidebarOpen={setIsMobileSidebarOpen} currentUser={currentUser} onLogout={() => { localStorage.removeItem('erp_current_user'); initialized.current = false; setCurrentUser(null) }} generalSettings={generalSettings} />
            <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
                <GlobalHeader 
                    currentPage={currentPage} 
                    onMenuClick={() => setIsMobileSidebarOpen(true)} 
                    lowStockItems={lowStockItems} 
                    setCurrentPage={setCurrentPage} 
                    bannerNotice={bannerNotice} 
                    isAutoBipagemActive={isAutoBipagemActive} 
                    onToggleAutoBipagem={setIsAutoBipagemActive} 
                    currentUser={currentUser} 
                    onDismissNotice={handleDeleteNotice} 
                    isProcessingLabels={isProcessingLabels}
                    labelProgressMessage={labelProgressMessage}
                    labelProcessingProgress={labelProcessingProgress}
                />
                <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-[var(--color-bg)]">
                    {renderPage()}
                </div>
            </main>
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        {isDeleteHistoryModalOpen && <ConfirmActionModal isOpen={isDeleteHistoryModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDeleteHistoryItem} title="Confirmar Exclusão de Importação" message={<p>Tem certeza que deseja excluir esta importação? <strong>Isso também apagará todos os pedidos vinculados a ela que ainda estão no banco de dados.</strong></p>} confirmButtonText="Sim, Excluir Tudo" isConfirming={isDeletingHistory} />}
    </div>
  );
};
export default App;
