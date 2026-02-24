
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GeneralSettings, OrderItem, BlingInvoice, BlingProduct, BlingSettings } from '../types';
import { fetchBlingOrders, fetchBlingInvoices, fetchEtiquetaZplForPedido, fetchBlingProducts, executeBlingTokenExchange } from '../lib/blingApi';
import { Cloud, Zap, Link as LinkIcon, Settings, Loader2, CheckCircle, Info, FileText, ShoppingCart, Download, Printer, Lock, Package, Search, Save, Eye, EyeOff, X, AlertTriangle, RefreshCw, ToggleLeft, ToggleRight, FileOutput, ExternalLink, Filter, HelpCircle, ChevronDown, ChevronRight, Copy } from 'lucide-react';

interface BlingPageProps {
    generalSettings: GeneralSettings;
    onSaveSettings: (settings: GeneralSettings | ((prev: GeneralSettings) => GeneralSettings)) => void;
    onLaunchSuccess: (orders: OrderItem[]) => Promise<void>; // Updated to Promise for await support
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    setCurrentPage: (page: string) => void;
    onLoadZpl: (zpl: string) => void;
}

type EnrichedBlingOrder = OrderItem & { invoice?: BlingInvoice };

const getToday = () => new Date().toISOString().split('T')[0];
const getSevenDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default window for auto-sync and manual fetch
    return d.toISOString().split('T')[0];
};

type Tab = 'sincronizacao' | 'pedidos_notas' | 'produtos';

const BlingConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentSettings: BlingSettings | undefined;
    onSave: (newBlingSettings: BlingSettings) => void;
}> = ({ isOpen, onClose, currentSettings, onSave }) => {
    const [authTab, setAuthTab] = useState<'token_manual' | 'oauth'>('oauth');
    
    // Auth Data
    const [apiKey, setApiKey] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [refreshToken, setRefreshToken] = useState('');
    
    // OAuth Flow
    const [authCode, setAuthCode] = useState('');
    const [isExchangingToken, setIsExchangingToken] = useState(false);
    
    const [showSecrets, setShowSecrets] = useState(false);
    const [autoSync, setAutoSync] = useState(false);
    const [scope, setScope] = useState({
        importarProdutos: true,
        importarPedidos: true,
        importarNotasFiscais: true,
        gerarEtiquetas: true,
    });

    // Pega a URL base atual do navegador (ex: https://erpecomflow.netlify.app ou http://localhost:5173)
    const currentOrigin = window.location.origin.replace(/\/$/, "");

    useEffect(() => {
        if (isOpen) {
            setApiKey(currentSettings?.apiKey || '');
            setClientId(currentSettings?.clientId || '');
            setClientSecret(currentSettings?.clientSecret || '');
            setRefreshToken(currentSettings?.refreshToken || '');
            setAutoSync(currentSettings?.autoSync || false);
            if (currentSettings?.scope) {
                setScope(currentSettings.scope);
            }
        }
    }, [isOpen, currentSettings]);

    const handleGenerateToken = async () => {
        if (!clientId || !clientSecret || !authCode) {
            alert('Preencha Client ID, Client Secret e o Código de Autorização.');
            return;
        }
        
        setIsExchangingToken(true);
        try {
            // A redirect_uri deve ser EXATAMENTE igual à cadastrada
            const redirectUri = currentOrigin; 
            const data = await executeBlingTokenExchange(authCode, clientId, clientSecret, redirectUri);
            
            if (data.access_token) {
                setApiKey(data.access_token);
                setRefreshToken(data.refresh_token);
                
                // Salva tudo imediatamente
                onSave({
                    apiKey: data.access_token,
                    refreshToken: data.refresh_token,
                    clientId,
                    clientSecret,
                    autoSync,
                    scope,
                    expiresIn: data.expires_in,
                    createdAt: Date.now()
                });
                
                setAuthTab('token_manual'); 
                alert('Token gerado e salvo com sucesso!');
            } else {
                alert('Falha na resposta do Bling: ' + JSON.stringify(data));
            }
        } catch (e: any) {
            alert('Erro ao gerar token: ' + e.message);
        } finally {
            setIsExchangingToken(false);
        }
    };

    const handleOpenAuthorizeUrl = () => {
        if (!clientId) {
            alert('Insira o Client ID primeiro.');
            return;
        }
        if (!clientSecret) {
            alert('Insira o Client Secret para que possamos salvar suas credenciais para a troca do token.');
            return;
        }

        localStorage.setItem('bling_oauth_config', JSON.stringify({ clientId, clientSecret }));

        const state = Math.random().toString(36).substring(7);
        // Ensure no trailing slash for the redirect URI construction
        const redirectUri = currentOrigin; 
        
        const url = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        
        // Open in Popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
            url, 
            'BlingAuth', 
            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
        );
        
        // Add toast instruction
        // We can't easily access addToast here as it's passed to BlingPage, not BlingConfigModal directly.
        // But we can use alert or just let the user see the popup.
    };

    // Listen for popup message
    useEffect(() => {
        const exchangeCodeForToken = async (code: string) => {
            if (!clientId || !clientSecret) return;
            
            setIsExchangingToken(true);
            try {
                const redirectUri = currentOrigin; 
                const data = await executeBlingTokenExchange(code, clientId, clientSecret, redirectUri);
                
                if (data.access_token) {
                    setApiKey(data.access_token);
                    setRefreshToken(data.refresh_token);
                    
                    onSave({
                        apiKey: data.access_token,
                        refreshToken: data.refresh_token,
                        clientId,
                        clientSecret,
                        autoSync,
                        scope,
                        expiresIn: data.expires_in,
                        createdAt: Date.now()
                    });
                    
                    setAuthTab('token_manual'); 
                    alert('Token gerado e salvo com sucesso!');
                    onClose(); // Close modal on success
                } else {
                    alert('Falha na resposta do Bling: ' + JSON.stringify(data));
                }
            } catch (e: any) {
                alert('Erro ao gerar token: ' + e.message);
            } finally {
                setIsExchangingToken(false);
            }
        };

        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'BLING_AUTH_CODE' && event.data.code) {
                console.log("Received auth code from popup:", event.data.code);
                setAuthCode(event.data.code);
                exchangeCodeForToken(event.data.code);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [clientId, clientSecret, currentOrigin, autoSync, scope, onSave, onClose]); // Added missing dependencies

    if (!isOpen) return null;

    const handleSaveManual = () => {
        // Ao salvar manualmente, preservamos outros campos se não editados
        onSave({ 
            apiKey, 
            clientId, 
            clientSecret, 
            refreshToken, 
            autoSync, 
            scope,
            // Preserva timestamp se já existia, ou cria novo
            createdAt: currentSettings?.createdAt || Date.now(),
            expiresIn: currentSettings?.expiresIn
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                        <Settings className="text-blue-600" /> Configuração Bling v3
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
                    <button 
                        onClick={() => setAuthTab('oauth')}
                        className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${authTab === 'oauth' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Gerar Novo Token (OAuth)
                    </button>
                    <button 
                        onClick={() => setAuthTab('token_manual')}
                        className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${authTab === 'token_manual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Visualizar Credenciais
                    </button>
                </div>

                <div className="space-y-6">
                    {authTab === 'oauth' && (
                         <div className="space-y-4 border border-blue-100 bg-blue-50/50 p-5 rounded-xl">
                            <h3 className="font-black text-blue-800 text-sm uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw size={16}/> Passo a Passo para Autenticação
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Client ID</label>
                                    <input 
                                        type="text" 
                                        value={clientId} 
                                        onChange={e => setClientId(e.target.value)} 
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                                        placeholder="Ex: a1b2c3d4..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Client Secret</label>
                                    <div className="relative">
                                        <input 
                                            type={showSecrets ? "text" : "password"} 
                                            value={clientSecret} 
                                            onChange={e => setClientSecret(e.target.value)} 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                                            placeholder="Ex: secret_123..."
                                        />
                                        <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showSecrets ? <EyeOff size={14}/> : <Eye size={14}/>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 bg-white p-4 rounded-xl border border-blue-100">
                                <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                                    <div className="flex flex-col gap-2 w-full">
                                        <p className="text-xs text-slate-600 leading-tight">
                                            No painel do Bling, configure a <strong>URL de Callback</strong>.
                                            <br/>
                                            <span className="text-[10px] text-slate-400">Cadastre a URL que você está usando no momento. Se for compartilhar o app, cadastre também a versão "Publica".</span>
                                        </p>
                                        
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">URL Atual (Teste/Dev):</p>
                                            <code className="block bg-white p-1 rounded border border-slate-200 text-blue-600 break-all select-all text-[10px]">{currentOrigin}</code>
                                        </div>

                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">URL Pública (Para Compartilhar):</p>
                                            <code className="block bg-white p-1 rounded border border-slate-200 text-purple-600 break-all select-all text-[10px]">
                                                {currentOrigin.includes('ais-dev-') ? currentOrigin.replace('ais-dev-', 'ais-pre-') : currentOrigin}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 mt-2">
                                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                                    <div className="flex flex-col items-start gap-1">
                                        <button onClick={handleOpenAuthorizeUrl} className="text-xs font-bold text-white bg-blue-500 px-3 py-1.5 rounded hover:bg-blue-600 transition-colors shadow-sm">
                                            Clique aqui para Autorizar o App
                                        </button>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Uma janela popup abrirá para você fazer login no Bling.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 mt-1">
                                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                                    <p className="text-xs text-slate-600 leading-tight">Após autorizar na janela popup, ela fechará automaticamente e o token será gerado aqui.</p>
                                </div>
                            </div>

                            {/* Manual Code Input Backup */}
                            <div className="pt-2 border-t border-blue-100">
                                <details>
                                    <summary className="text-[10px] font-bold text-slate-400 cursor-pointer hover:text-blue-600">Inserir código manualmente (se o redirect automático falhar)</summary>
                                    <div className="mt-2 flex gap-2">
                                        <input 
                                            type="text" 
                                            value={authCode} 
                                            onChange={e => setAuthCode(e.target.value)} 
                                            className="flex-grow p-2 border border-slate-200 rounded-lg text-sm font-mono"
                                            placeholder="Cole o código (code=...) aqui"
                                        />
                                        <button 
                                            onClick={handleGenerateToken} 
                                            disabled={isExchangingToken || !authCode}
                                            className="px-3 py-2 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-lg hover:bg-slate-300"
                                        >
                                            Gerar
                                        </button>
                                    </div>
                                </details>
                            </div>
                         </div>
                    )}

                    {authTab === 'token_manual' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Access Token</label>
                                <input 
                                    type="password" 
                                    value={apiKey} 
                                    onChange={e => setApiKey(e.target.value)} 
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Refresh Token</label>
                                <input 
                                    type="password" 
                                    value={refreshToken} 
                                    onChange={e => setRefreshToken(e.target.value)} 
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="text-[10px] text-slate-400 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p><strong>Nota:</strong> O sistema usará o Access Token fixo acima. Se ele expirar, você precisará gerar um novo na aba "Gerar Novo Token".</p>
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                         <div>
                            <h3 className="text-xs font-black text-purple-800 uppercase tracking-widest mb-1">Sincronização Automática (Polling)</h3>
                            <p className="text-[10px] text-purple-600">Simula Webhook: Baixa novos pedidos a cada 60s.</p>
                         </div>
                         <button onClick={() => setAutoSync(!autoSync)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${autoSync ? 'bg-purple-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3">Escopo da Integração</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-blue-100/50 rounded-lg transition-colors">
                                <input type="checkbox" checked={scope.importarPedidos} onChange={e => setScope({...scope, importarPedidos: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                <span className="text-sm font-bold text-slate-700">Importar Pedidos de Venda</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-blue-100/50 rounded-lg transition-colors">
                                <input type="checkbox" checked={scope.importarNotas} onChange={e => setScope({...scope, importarNotas: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                <span className="text-sm font-bold text-slate-700">Consultar Notas Fiscais (NFe)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-blue-100/50 rounded-lg transition-colors">
                                <input type="checkbox" checked={scope.gerarEtiquetas} onChange={e => setScope({...scope, gerarEtiquetas: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                <span className="text-sm font-bold text-slate-700">Gerar Etiquetas ZPL (Logística)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-blue-100/50 rounded-lg transition-colors">
                                <input type="checkbox" checked={scope.importarProdutos} onChange={e => setScope({...scope, importarProdutos: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                <span className="text-sm font-bold text-slate-700">Visualizar Catálogo de Produtos</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={handleSaveManual} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
                        <Save size={18}/> Salvar Conexão
                    </button>
                </div>
            </div>
        </div>
    );
};

const BlingPage: React.FC<BlingPageProps> = ({ generalSettings, onSaveSettings, onLaunchSuccess, addToast, setCurrentPage, onLoadZpl }) => {
    const integrations = generalSettings.integrations;
    const settings = integrations?.bling;
    
    // Derived state for better readability
    const isConnected = !!settings?.apiKey && settings.apiKey.length > 0;
    const canImportPedidos = settings?.scope?.importarPedidos ?? true;
    const canImportNotas = settings?.scope?.importarNotasFiscais ?? true;
    const canGerarEtiquetas = settings?.scope?.gerarEtiquetas ?? true;
    const canViewProducts = settings?.scope?.importarProdutos ?? true;

    const getDefaultTab = (): Tab => {
        if (canImportPedidos) return 'sincronizacao';
        if (canImportNotas) return 'pedidos_notas';
        if (canViewProducts) return 'produtos';
        return 'sincronizacao';
    };

    const [activeTab, setActiveTab] = useState<Tab>(getDefaultTab());
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAutoSyncing, setIsAutoSyncing] = useState(false);
    const [generatingZplId, setGeneratingZplId] = useState<string | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isHandlingCallback, setIsHandlingCallback] = useState(false);

    // Filters State
    const [filters, setFilters] = useState({
        startDate: getSevenDaysAgo(),
        endDate: getToday(),
        status: 'EM ABERTO' as 'EM ABERTO' | 'EM ANDAMENTO' | 'ATENDIDO' | 'TODOS',
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterNfeStatus, setFilterNfeStatus] = useState<'TODOS' | 'EMITIDA' | 'PENDENTE' | 'SEM_NOTA'>('TODOS');
    const [enrichedOrders, setEnrichedOrders] = useState<EnrichedBlingOrder[]>([]);
    const [products, setProducts] = useState<BlingProduct[]>([]);
    const [productSearch, setProductSearch] = useState('');

    /**
     * Função Central de Verificação de Token
     * Retorna o token fixo configurado, sem renovação automática.
     */
    const getValidToken = async (): Promise<string | null> => {
        return settings?.apiKey || null;
    };

    // --- OAUTH CALLBACK HANDLER ---
    useEffect(() => {
        const checkCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && state) {
                const storedConfig = localStorage.getItem('bling_oauth_config');
                if (!storedConfig) return;
                
                const { clientId, clientSecret } = JSON.parse(storedConfig);
                setIsHandlingCallback(true);
                addToast('Processando autenticação do Bling...', 'info');

                try {
                    // Importante: Passar a redirect_uri correta
                    const currentOrigin = window.location.origin.replace(/\/$/, "");
                    const redirectUri = currentOrigin;

                    const data = await executeBlingTokenExchange(code, clientId, clientSecret, redirectUri);
                    
                    if (data.access_token) {
                        const newSettings: BlingSettings = {
                            apiKey: data.access_token,
                            refreshToken: data.refresh_token,
                            expiresIn: data.expires_in,
                            createdAt: Date.now(),
                            clientId: clientId,
                            clientSecret: clientSecret,
                            autoSync: false,
                            scope: {
                                importarProdutos: true,
                                importarPedidos: true,
                                importarNotasFiscais: true,
                                gerarEtiquetas: true
                            }
                        };
                        
                        onSaveSettings(prev => ({
                            ...prev,
                            integrations: {
                                ...prev.integrations,
                                bling: newSettings
                            }
                        }));

                        addToast('Integração Bling conectada com sucesso!', 'success');
                        window.history.replaceState({}, document.title, window.location.pathname);
                        localStorage.removeItem('bling_oauth_config');
                    } else {
                        addToast(`Falha na troca de token: ${data.error || 'Erro desconhecido'}`, 'error');
                    }
                } catch (e: any) {
                    addToast(`Erro de conexão: ${e.message}`, 'error');
                } finally {
                    setIsHandlingCallback(false);
                }
            }
        };

        checkCallback();
    }, []);

    // --- AUTO SYNC LOGIC (POLLING) ---
    useEffect(() => {
        let interval: any;

        if (settings?.autoSync && settings?.apiKey) {
            const runAutoSync = async () => {
                if (isAutoSyncing) return;
                setIsAutoSyncing(true);
                try {
                    const token = await getValidToken();
                    if (!token) return; // Token invalido, aborta

                    // Sync Orders
                    const autoFilters = { startDate: getSevenDaysAgo(), endDate: getToday(), status: 'TODOS' as const };
                    const orders = await fetchBlingOrders(token, autoFilters);
                    
                    if (orders.length > 0) {
                        await onLaunchSuccess(orders);
                    }

                    // Refresh Invoice Data (Metadata only) if tab is open
                    if (activeTab === 'pedidos_notas') {
                        const invoices = await fetchBlingInvoices(token, { ...autoFilters, status: 'EMITIDAS' });
                        const invoiceMap = new Map<string, BlingInvoice>(invoices.map(inv => [inv.idPedidoVenda!, inv]));
                        
                        setEnrichedOrders(prev => {
                             // Mescla com dados existentes se possível
                             return orders.map(order => ({
                                ...order,
                                invoice: invoiceMap.get(order.blingId || order.orderId),
                            }));
                        });
                    }

                } catch (e) {
                    console.error("Auto Sync Error:", e);
                } finally {
                    setIsAutoSyncing(false);
                }
            };

            runAutoSync();
            interval = setInterval(runAutoSync, 60 * 1000); // 60 seconds
        }

        return () => clearInterval(interval);
    }, [settings?.autoSync, activeTab]); // Remove apiKey from dependency to rely on getValidToken

    const handleSaveConfig = (newBlingSettings: BlingSettings) => {
        onSaveSettings(prev => ({
            ...prev,
            integrations: {
                ...prev.integrations,
                bling: newBlingSettings
            }
        }));
        addToast('Configurações do Bling atualizadas com sucesso!', 'success');
    };

    const toggleAutoSync = () => {
        if (!settings) return;
        handleSaveConfig({
            ...settings,
            autoSync: !settings.autoSync
        });
    };

    const handleSyncForProduction = async () => {
        setIsSyncing(true);
        try {
            const token = await getValidToken();
            if (!token) throw new Error("Token inválido.");

            const orders = await fetchBlingOrders(token, filters);
            if (orders.length > 0) {
                await onLaunchSuccess(orders);
                addToast(`${orders.length} pedido(s) foram importados/atualizados para a produção!`, 'success');
            } else {
                addToast('Nenhum pedido de venda encontrado no Bling para os filtros selecionados.', 'info');
            }
        } catch (error: any) { 
            if (error.message === "TOKEN_EXPIRED") {
                 addToast("Sessão expirada. Tente recarregar a página ou gerar novo token.", "error");
            } else {
                 addToast(`Erro na sincronização: ${error.message}`, 'error'); 
            }
        } 
        finally { setIsSyncing(false); }
    };

    const handleFetchOrdersAndInvoices = async () => {
        setIsSyncing(true);
        setEnrichedOrders([]);
        try {
            const token = await getValidToken();
            if (!token) throw new Error("Token inválido.");

            const [ordersResult, invoicesResult] = await Promise.all([
                fetchBlingOrders(token, filters),
                fetchBlingInvoices(token, { ...filters, status: 'EMITIDAS' }) 
            ]);
            
            const invoiceMap = new Map<string, BlingInvoice>(invoicesResult.map(inv => [inv.idPedidoVenda!, inv]));
            
            const enriched = ordersResult.map(order => ({
                ...order,
                invoice: invoiceMap.get(order.blingId || order.orderId),
            }));
            
            setEnrichedOrders(enriched);
            if(enriched.length === 0) addToast('Nenhum pedido encontrado para os filtros.', 'info');

        } catch (error: any) { addToast(`Erro ao buscar dados: ${error.message}`, 'error'); } 
        finally { setIsSyncing(false); }
    };
    
    const handleFetchProducts = async () => {
        setIsSyncing(true);
        setProducts([]);
        try {
            const token = await getValidToken();
            if (!token) throw new Error("Token inválido.");

            const productsResult = await fetchBlingProducts(token);
            setProducts(productsResult);
             if(productsResult.length === 0) addToast('Nenhum produto encontrado.', 'info');
        } catch (error: any) { addToast(`Erro ao buscar produtos: ${error.message}`, 'error'); } 
        finally { setIsSyncing(false); }
    };

    const handleGenerateZpl = async (invoice: BlingInvoice) => {
        if (!invoice.idPedidoVenda) return addToast('Nota fiscal sem pedido de venda associado.', 'error');
        setGeneratingZplId(invoice.id);
        try {
            const token = await getValidToken();
            if (!token) throw new Error("Token inválido.");

            const zpl = await fetchEtiquetaZplForPedido(token, invoice.idPedidoVenda);
            if(zpl) onLoadZpl(zpl);
        } catch (error: any) { addToast(`Erro ao gerar ZPL: ${error.message}`, 'error'); } 
        finally { setGeneratingZplId(null); }
    };
    
    // ... Memorized filters and render logic (same as before) ...
    const filteredProducts = useMemo(() => {
        if (!productSearch) return products;
        const search = productSearch.toLowerCase();
        return products.filter(p => p.descricao.toLowerCase().includes(search) || p.codigo.toLowerCase().includes(search));
    }, [products, productSearch]);

    const filteredEnrichedOrders = useMemo(() => {
        return enrichedOrders.filter(order => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || (
                (order.orderId && order.orderId.toLowerCase().includes(searchLower)) ||
                (order.blingId && order.blingId.toLowerCase().includes(searchLower)) ||
                (order.customer_name && order.customer_name.toLowerCase().includes(searchLower))
            );
            
            let matchesNfe = true;
            if (filterNfeStatus !== 'TODOS') {
                 const status = order.invoice?.situacao?.toLowerCase() || '';
                 if (filterNfeStatus === 'EMITIDA') matchesNfe = status === 'emitida' || status === 'autorizada';
                 else if (filterNfeStatus === 'PENDENTE') matchesNfe = order.invoice && status !== 'emitida' && status !== 'autorizada';
                 else if (filterNfeStatus === 'SEM_NOTA') matchesNfe = !order.invoice;
            }

            return matchesSearch && matchesNfe;
        });
    }, [enrichedOrders, searchTerm, filterNfeStatus]);

    if (isHandlingCallback) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 size={48} className="animate-spin text-blue-600" />
                <h2 className="text-xl font-black text-slate-700">Autenticando com o Bling...</h2>
                <p className="text-slate-500">Por favor, aguarde enquanto configuramos o acesso.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                        <Cloud size={40} className="text-blue-600 bg-blue-100 p-2 rounded-2xl shadow-sm" />
                        Painel Bling
                    </h1>
                    <div className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest ${isConnected ? 'text-green-700 bg-green-100 border-green-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                        {isConnected ? <><CheckCircle size={12} /> Conectado</> : <><Settings size={12} /> Não Configurado</>}
                    </div>
                    {isAutoSyncing && (
                         <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full border border-purple-200 uppercase tracking-widest animate-pulse">
                            <RefreshCw size={12} className="animate-spin" /> Sincronizando...
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                     <button
                        onClick={toggleAutoSync}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settings?.autoSync ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                        title={settings?.autoSync ? "Desativar Sincronização Automática" : "Ativar Sincronização Automática"}
                    >
                        {settings?.autoSync ? <ToggleRight size={24} className="text-purple-600"/> : <ToggleLeft size={24} />}
                        {settings?.autoSync ? 'Auto Sync ON' : 'Auto Sync OFF'}
                    </button>
                    <button 
                        onClick={() => setIsConfigModalOpen(true)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-2 group"
                        title="Configurações do Bling"
                    >
                        <Settings size={20} className="group-hover:rotate-45 transition-transform" />
                        <span className="text-xs font-black uppercase hidden sm:inline">Configurar</span>
                    </button>
                </div>
            </div>

            {/* Banner Desconectado */}
            {!isConnected && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Info size={24}/></div>
                        <div>
                            <p className="font-bold text-blue-900 text-sm uppercase tracking-tight">Integração não configurada</p>
                            <p className="text-xs text-blue-700 font-medium">Para sincronizar pedidos, notas e produtos, você precisa configurar o acesso OAuth.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsConfigModalOpen(true)} className="px-6 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">Configurar Agora</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b overflow-x-auto">
                {canImportPedidos && <button onClick={() => setActiveTab('sincronizacao')} className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'sincronizacao' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}><Download size={16}/> Sincronização</button>}
                {(canImportPedidos || canImportNotas) && <button onClick={() => setActiveTab('pedidos_notas')} className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'pedidos_notas' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}><FileText size={16}/> Pedidos & Notas</button>}
                {canViewProducts && <button onClick={() => setActiveTab('produtos')} className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'produtos' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}><Package size={16}/> Catálogo</button>}
            </div>

            {/* Content: Sincronização */}
            {activeTab === 'sincronizacao' && (
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-start mb-6">
                         <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2"><Download className="text-blue-500"/> Importar Pedidos para Produção</h2>
                         {settings?.autoSync && <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 flex items-center gap-2"><RefreshCw size={10} className="animate-spin"/> Modo Automático Ativo</div>}
                    </div>
                   
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Data de Início</label><input type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-sm outline-none focus:border-blue-500"/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Data de Fim</label><input type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-sm outline-none focus:border-blue-500"/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Status no Bling</label><select value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value as any}))} className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-sm outline-none focus:border-blue-500"><option value="EM ABERTO">Em Aberto</option><option value="EM ANDAMENTO">Em Andamento</option><option value="ATENDIDO">Atendido</option><option value="TODOS">Todos</option></select></div>
                    </div>
                    <button onClick={handleSyncForProduction} disabled={isSyncing} className="w-full mt-8 flex items-center justify-center gap-3 py-5 bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 active:scale-95">{isSyncing ? <Loader2 className="animate-spin" /> : <Download />} {isSyncing ? 'Sincronizando...' : 'Buscar Manualmente'}</button>
                </div>
            )}
            
            {/* Content: Pedidos & Notas */}
            {activeTab === 'pedidos_notas' && (
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2"><FileText className="text-orange-500"/> Consulta de Pedidos e Notas</h2>
                        {settings?.autoSync && <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 flex items-center gap-2"><RefreshCw size={10} className="animate-spin"/> Atualização em Tempo Real</div>}
                     </div>
                    
                    {/* Filtros de Consulta API */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Cloud size={12}/> Filtros de Busca (API Bling)</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Data de Início</label><input type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-bold text-sm outline-none focus:border-blue-500"/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Data de Fim</label><input type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-bold text-sm outline-none focus:border-blue-500"/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Status do Pedido</label><select value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value as any}))} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-bold text-sm outline-none focus:border-blue-500"><option value="EM ABERTO">Em Aberto</option><option value="EM ANDAMENTO">Em Andamento</option><option value="ATENDIDO">Atendido</option><option value="TODOS">Todos</option></select></div>
                        </div>
                        <button onClick={handleFetchOrdersAndInvoices} disabled={isSyncing} className="w-full mt-4 flex items-center justify-center gap-3 py-3 bg-orange-500 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-100 active:scale-95">{isSyncing ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>} {isSyncing ? 'Buscando...' : 'Consultar Manualmente'}</button>
                    </div>

                    {/* Filtros Locais */}
                    {enrichedOrders.length > 0 && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                             <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    placeholder="Buscar por Nome do Cliente ou Número do Pedido..." 
                                    className="w-full pl-12 p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-sm outline-none focus:border-blue-500"
                                />
                             </div>
                             <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                <div className="pl-3 pr-2"><Filter size={18} className="text-slate-400"/></div>
                                <select 
                                    value={filterNfeStatus} 
                                    onChange={e => setFilterNfeStatus(e.target.value as any)}
                                    className="flex-grow p-2 bg-transparent font-bold text-sm text-slate-700 outline-none"
                                >
                                    <option value="TODOS">Todas as Situações de Nota</option>
                                    <option value="EMITIDA">Emitida / Autorizada</option>
                                    <option value="PENDENTE">Pendente / Em Digitação</option>
                                    <option value="SEM_NOTA">Sem Nota Gerada</option>
                                </select>
                             </div>
                        </div>
                    )}
                    
                    {enrichedOrders.length > 0 && (
                        <div className="mt-8 overflow-hidden border border-slate-100 rounded-2xl">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-900 text-white"><tr>{['Pedido Loja', 'Pedido Bling', 'Cliente', 'Data', 'Valor', 'Status NF', 'Ações'].map(h=><th key={h} className="p-4 text-left text-[10px] font-black uppercase tracking-widest">{h}</th>)}</tr></thead>
                                    <tbody className="divide-y divide-slate-100">{filteredEnrichedOrders.map(order => (<tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-black text-slate-700">{order.orderId}</td>
                                        <td className="p-4 font-mono text-xs text-gray-500">{order.blingId || '-'}</td>
                                        <td className="p-4 font-bold text-slate-600">{order.customer_name}</td>
                                        <td className="p-4 text-slate-500">{order.data}</td>
                                        <td className="p-4 font-black text-emerald-600">{order.price_total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${order.invoice ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{order.invoice?.situacao || 'Não Gerada'}</span></td>
                                        <td className="p-4 flex items-center gap-2">
                                            {order.invoice?.linkDanfe && (
                                                <a href={order.invoice.linkDanfe} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-100 border border-orange-100 transition-all" title="Visualizar DANFE">
                                                    <FileText size={14}/> DANFE
                                                </a>
                                            )}
                                            {canGerarEtiquetas && (
                                                <button onClick={() => handleGenerateZpl(order.invoice!)} disabled={generatingZplId === order.invoice?.id || !order.invoice} title={!order.invoice ? "Gere a NF primeiro" : "Gerar Etiqueta ZPL"} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                                    {generatingZplId === order.invoice?.id ? <Loader2 className="animate-spin" size={14}/> : <Printer size={14}/>} ZPL
                                                </button>
                                            )}
                                        </td>
                                    </tr>))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content: Catálogo */}
            {activeTab === 'produtos' && (
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tighter flex items-center gap-2"><Package className="text-purple-500"/> Catálogo de Produtos</h2>
                    <div className="flex gap-4 items-center mb-6">
                        <div className="relative flex-grow"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Filtrar por nome ou SKU..." className="w-full pl-12 p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-blue-500"/></div>
                        <button onClick={handleFetchProducts} disabled={isSyncing} className="flex-shrink-0 flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-purple-700 disabled:opacity-50 transition-all shadow-xl shadow-purple-100 active:scale-95">{isSyncing ? <Loader2 className="animate-spin" /> : <Zap />} {isSyncing ? 'Buscando...' : 'Atualizar Lista'}</button>
                    </div>
                    {products.length > 0 && (
                        <div className="overflow-hidden border border-slate-100 rounded-2xl">
                            <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-900 text-white sticky top-0"><tr>{['SKU', 'Descrição', 'Estoque', 'Preço'].map(h=><th key={h} className="p-4 text-left text-[10px] font-black uppercase tracking-widest">{h}</th>)}</tr></thead>
                                    <tbody className="divide-y divide-slate-100">{filteredProducts.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-black text-slate-700 font-mono">{p.codigo}</td><td className="p-4 font-bold text-slate-600">{p.descricao}</td><td className="p-4 font-black text-center text-blue-600">{p.estoqueAtual}</td><td className="p-4 font-black text-emerald-600">{p.preco.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                                    </tr>))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <BlingConfigModal 
                isOpen={isConfigModalOpen} 
                onClose={() => setIsConfigModalOpen(false)} 
                currentSettings={integrations?.bling} 
                onSave={handleSaveConfig} 
            />
        </div>
    );
};

export default BlingPage;
