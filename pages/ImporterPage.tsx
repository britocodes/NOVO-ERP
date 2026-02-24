
import React, { useState, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import ImportResults from '../components/ImportResults';
import LinkSkuModal from '../components/LinkSkuModal';
import CreateProductFromImportModal from '../components/CreateProductFromImportModal';
import DateSelectionModal from '../components/DateSelectionModal';
import { ProcessedData, OrderItem, SkuLink, StockItem, ProdutoCombinado, GeneralSettings, User, ImportHistoryItem, Canal } from '../types';
import { parseExcelFile, extractShippingDates } from '../lib/parser';
import { verifyDatabaseSetup } from '../lib/supabaseClient';
import { Loader2, Zap, History, Settings, X, ChevronLeft, Eye, AlertCircle, Copy, Check, Info, AlertTriangle, Trash2, List, Archive, Calendar, CheckSquare, Square } from 'lucide-react';
import { SETUP_SQL_STRING } from '../lib/sql';
import ConfirmActionModal from '../components/ConfirmActionModal';

interface ImporterPageProps {
    allOrders: OrderItem[];
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    processedData: ProcessedData | null;
    setProcessedData: (data: ProcessedData | null) => void;
    error: string | null;
    setError: (error: string | null) => void;
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;
    onLaunchSuccess: (launchedOrders: OrderItem[]) => void;
    skuLinks: SkuLink[];
    onLinkSku: (importedSku: string, masterProductSku: string) => Promise<boolean>;
    onUnlinkSku: (importedSku: string) => Promise<boolean>;
    products: StockItem[];
    onAddNewItem: (newItem: Omit<StockItem, 'id'>) => Promise<StockItem | null>;
    produtosCombinados: ProdutoCombinado[];
    stockItems: StockItem[];
    generalSettings: GeneralSettings;
    setGeneralSettings: (settings: GeneralSettings | ((prev: GeneralSettings) => GeneralSettings)) => void;
    currentUser: User;
    importHistory: ImportHistoryItem[];
    addImportToHistory: (item: any, processedData: any) => void;
    clearImportHistory: () => void;
    onDeleteHistoryItem: (item: ImportHistoryItem) => void;
    onGetImportHistoryDetails: (id: string) => Promise<ProcessedData | null>;
    onBulkDeleteHistory?: (ids: string[]) => Promise<void>;
    users: User[]; // New Prop
}

export const ImporterPage: React.FC<ImporterPageProps> = (props) => {
    const {
        allOrders, selectedFile, setSelectedFile, processedData, setProcessedData,
        error, setError, isProcessing, setIsProcessing, onLaunchSuccess,
        skuLinks, onLinkSku, onUnlinkSku, products, onAddNewItem,
        produtosCombinados, stockItems, generalSettings,
        currentUser, importHistory, addImportToHistory, clearImportHistory,
        onDeleteHistoryItem, onGetImportHistoryDetails, onBulkDeleteHistory,
        users // Destructure new prop
    } = props;

    const [importOptions, setImportOptions] = useState({ 
        importCpf: false, 
        importName: true, 
        trackingFilter: 'all' as any,
    });
    const [importAsHistory, setImportAsHistory] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<Canal | 'AUTO'>('AUTO');
    
    // Estados para o fluxo de datas
    const [availableShippingDates, setAvailableShippingDates] = useState<{date: string, count: number}[]>([]);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isScanningDates, setIsScanningDates] = useState(false);

    
    const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
    const [linkModalState, setLinkModalState] = useState({ isOpen: false, skus: [] as string[], color: '' });
    const [createModalState, setCreateModalState] = useState<{isOpen: boolean, data: { sku: string; colorSugerida: string } | null}>({isOpen: false, data: null});
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [dbInconsistency, setDbInconsistency] = useState<any>(null);
    const [copiedSql, setCopiedSql] = useState(false);
    
    // History Management
    const [isHistoryManagerOpen, setIsHistoryManagerOpen] = useState(false);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);
    const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);

    useEffect(() => {
        verifyDatabaseSetup().then(res => {
            if (res.setupNeeded) setDbInconsistency(res.details);
        });
    }, []);

    const handleFileSelect = (file: File | null) => {
        setSelectedFile(file);
        setError(null);
        // Reseta estados de datas ao trocar arquivo
        setAvailableShippingDates([]);
    };

    const handleCopySql = () => {
        navigator.clipboard.writeText(SETUP_SQL_STRING);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2000);
    };

    const handleConfirmLink = async (masterSku: string) => {
        for (const sku of linkModalState.skus) {
            await onLinkSku(sku.toUpperCase(), masterSku.toUpperCase());
        }
        setLinkModalState({ isOpen: false, skus: [], color: '' });
        setSelectedSkus(new Set());
    };

    const handleConfirmCreateAndLink = async (newItem: Omit<StockItem, 'id'>) => {
        const product = await onAddNewItem(newItem);
        if (product && createModalState.data) {
            await onLinkSku(createModalState.data.sku.toUpperCase(), product.code.toUpperCase());
        }
        setCreateModalState({ isOpen: false, data: null });
        setSelectedSkus(new Set());
    };

    // 1. Botão "Iniciar Processamento" chama esta função
    const handleStartProcessing = async () => {
        if (!selectedFile) return;
        
        setIsScanningDates(true);
        setError(null);

        try {
            const buffer = await selectedFile.arrayBuffer();
            
            // Tenta extrair datas PRIMEIRO, passando o canal selecionado para forçar a configuração correta
            const dates = extractShippingDates(buffer, generalSettings, selectedChannel);
            
            if (dates.length > 0) {
                // Se encontrar datas, abre o modal e PAUSA o processamento
                setAvailableShippingDates(dates);
                setIsScanningDates(false);
                setIsDateModalOpen(true);
            } else {
                // Se não encontrar (ML ou arquivo sem coluna H configurada), processa direto sem filtro
                executeFullProcessing(buffer, undefined); // undefined = sem filtro de data
                setIsScanningDates(false);
            }
        } catch (e: any) {
            console.error("Erro ao analisar datas:", e);
            // Em caso de erro na pré-análise, tenta processar direto (fallback)
            const buffer = await selectedFile.arrayBuffer();
            executeFullProcessing(buffer, undefined);
            setIsScanningDates(false);
        }
    };

    // 2. Callback do Modal de Datas (Confirmar)
    const handleDateConfirm = async (selectedDates: string[]) => {
        setIsDateModalOpen(false);
        if (!selectedFile) return;
        
        setIsProcessing(true); // Mostra loading principal
        try {
            const buffer = await selectedFile.arrayBuffer();
            executeFullProcessing(buffer, selectedDates);
        } catch(e) {
            setIsProcessing(false);
        }
    };

    // 3. Execução real do processamento (com ou sem datas filtradas)
    const executeFullProcessing = (buffer: ArrayBuffer, allowedDates?: string[]) => {
        if (!selectedFile) return;
        setIsProcessing(true);
        try {
            const data = parseExcelFile(
                buffer, 
                selectedFile.name, 
                allOrders, 
                generalSettings, 
                {
                    ...importOptions,
                    allowedShippingDates: allowedDates
                },
                selectedChannel
            );
            setProcessedData(data);
            setIsViewingHistory(false);
            addImportToHistory({
                fileName: selectedFile.name,
                processedAt: new Date().toISOString(),
                user: currentUser.name,
                itemCount: data.lists.completa.length,
                unlinked_count: data.skusNaoVinculados.length,
                canal: data.canal
            }, data);
        } catch (err: any) { 
            setError(err.message || 'Erro crítico ao ler planilha.'); 
        } finally { setIsProcessing(false); }
    };

    const handleLaunch = () => {
        if (!processedData) return;
        const ordersToLaunch = processedData.lists.completa.map(order => ({
            ...order,
            status: importAsHistory ? 'BIPADO' : 'NORMAL' // Override status if history mode is enabled
        }));
        
        onLaunchSuccess(ordersToLaunch as any);
        setProcessedData(null);
        setImportAsHistory(false); // Reset checkbox
        setSelectedFile(null); // Reset file
    };

    const handleViewHistory = async (item: ImportHistoryItem) => {
        setIsProcessing(true);
        const data = await onGetImportHistoryDetails(item.id);
        if (data) {
            setProcessedData(data);
            setIsViewingHistory(true);
            setSelectedFile(null);
            setIsHistoryManagerOpen(false); // Close manager if open
        } else { alert("Não foi possível recuperar os dados desta importação histórica."); }
        setIsProcessing(false);
    };

    const handleToggleSelectHistory = (id: string) => {
        setSelectedHistoryIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSelectAllHistory = () => {
        if (selectedHistoryIds.size === importHistory.length) {
            setSelectedHistoryIds(new Set());
        } else {
            setSelectedHistoryIds(new Set(importHistory.map(i => i.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!onBulkDeleteHistory) return;
        setIsDeletingBulk(true);
        await onBulkDeleteHistory(Array.from(selectedHistoryIds));
        setIsDeletingBulk(false);
        setIsConfirmBulkDeleteOpen(false);
        setSelectedHistoryIds(new Set());
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
                {dbInconsistency && (
                    <div className="p-5 bg-red-100 border-2 border-red-500 rounded-2xl text-red-900 flex flex-col gap-3 animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="text-red-600" size={32}/>
                            <div>
                                <p className="font-black text-lg">Banco de Dados Incompleto!</p>
                                <p className="text-sm opacity-80 font-medium">Faltam funções RPC para processamento de pedidos. Cole o código SQL no seu Supabase para consertar.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleCopySql} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-all">
                                {copiedSql ? <Check size={18}/> : <Copy size={18}/>}
                                {copiedSql ? 'Copiado!' : 'Copiar Código de Reparo SQL'}
                            </button>
                            <button onClick={() => window.location.reload()} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl font-bold">Já atualizei, Recarregar</button>
                        </div>
                    </div>
                )}

                {isViewingHistory && (
                    <div className="flex items-center justify-between bg-blue-600 text-white p-4 rounded-2xl shadow-lg border-2 border-blue-400">
                        <div className="flex items-center gap-3"><History size={24} /><div><p className="font-black">Visualização de Histórico</p><p className="text-xs opacity-80">Dados da importação realizada em {new Date(processedData?.importId.split('_')[1] ? Number(processedData.importId.split('_')[1]) : 0).toLocaleString()}</p></div></div>
                        <button onClick={() => { setProcessedData(null); setIsViewingHistory(false); }} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-bold text-sm transition-all">Sair do Histórico</button>
                    </div>
                )}

                {!processedData && !isViewingHistory && (
                    <>
                        <div className="relative">
                            <FileUploader 
                                onFileSelect={handleFileSelect} 
                                selectedFile={selectedFile} 
                            />
                            {isScanningDates && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10 animate-in fade-in">
                                    <div className="flex items-center gap-3 font-bold text-blue-600 bg-white p-6 rounded-2xl shadow-2xl border-2 border-blue-100">
                                        <Loader2 className="animate-spin" size={24} /> 
                                        <div>
                                            <p>Analisando datas de envio...</p>
                                            <p className="text-xs text-gray-400 font-medium mt-1">Isso geralmente é rápido.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedFile && (
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 animate-in fade-in zoom-in-95">
                                <div className="flex items-center gap-2 border-b pb-3"><Settings size={20} className="text-blue-600"/><h3 className="font-black text-gray-800 uppercase tracking-tighter">Configuração de Importação</h3></div>

                                {/* Seleção de Canal Manual */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Canal / Layout da Planilha</label>
                                    <select 
                                        value={selectedChannel} 
                                        onChange={e => setSelectedChannel(e.target.value as any)}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="AUTO">Automático (Detectar cabeçalho)</option>
                                        <option value="ML">Mercado Livre (Forçar layout ML)</option>
                                        <option value="SHOPEE">Shopee (Forçar layout Shopee)</option>
                                        <option value="SITE">Site (Forçar layout Site)</option>
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Use "Automático" por padrão. Se houver erro de colunas não encontradas, selecione o canal específico aqui.</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all">
                                        <input type="checkbox" checked={importOptions.importCpf} onChange={e => setImportOptions(p => ({...p, importCpf: e.target.checked}))} className="w-6 h-6 text-blue-600 rounded mt-0.5 shadow-sm"/>
                                        <div className="text-sm">
                                            <p className="font-black text-gray-800">Extrair CPF/CNPJ</p>
                                            <p className="text-xs text-gray-500 font-medium">Habilita conferência de documentos na expedição.</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all">
                                        <input type="checkbox" checked={importOptions.importName} onChange={e => setImportOptions(p => ({...p, importName: e.target.checked}))} className="w-6 h-6 text-blue-600 rounded mt-0.5 shadow-sm"/>
                                        <div className="text-sm">
                                            <p className="font-black text-gray-800">Extrair Nome do Cliente</p>
                                            <p className="text-xs text-gray-500 font-medium">Exibe o nome do comprador no painel de pedidos.</p>
                                        </div>
                                    </label>
                                </div>
                                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex gap-3 items-center">
                                    <Info size={24} className="text-gray-400 flex-shrink-0"/>
                                    <p className="text-xs font-bold text-gray-600">Dica: Se a planilha contiver datas de envio (ex: Shopee), um seletor aparecerá após clicar no botão abaixo.</p>
                                </div>
                                <button onClick={handleStartProcessing} disabled={isProcessing || isScanningDates} className="w-full flex items-center justify-center gap-2 py-5 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 transform active:scale-95">
                                    {isProcessing ? <Loader2 size={24} className="animate-spin"/> : <Zap size={24}/>} 
                                    {isProcessing ? 'Lendo e Analisando...' : 'Iniciar Processamento'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {error && <div className="p-5 bg-red-100 text-red-900 rounded-2xl border-2 border-red-200 flex flex-col gap-2 font-medium shadow-lg animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 font-black text-lg"><X size={24} className="bg-red-500 text-white p-1 rounded-full"/> Erro na Importação</div>
                    <p>{error}</p>
                </div>}

                {processedData && (
                    <>
                        {/* New Toggle for Import Type */}
                        {!isViewingHistory && (
                            <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl mb-4 flex items-center gap-4">
                                <input 
                                    type="checkbox" 
                                    id="import-history-check" 
                                    checked={importAsHistory} 
                                    onChange={(e) => setImportAsHistory(e.target.checked)} 
                                    className="w-6 h-6 text-amber-600 rounded focus:ring-amber-500"
                                />
                                <div>
                                    <label htmlFor="import-history-check" className="font-black text-amber-900 text-sm uppercase cursor-pointer">Importar como Histórico / Financeiro (Já Enviados)</label>
                                    <p className="text-xs text-amber-700 font-medium">Se marcado, os pedidos serão salvos como "BIPADO" e não aparecerão na lista de pendências da produção. Use isso para alimentar dados financeiros antigos.</p>
                                </div>
                            </div>
                        )}

                        <ImportResults 
                            data={processedData}
                            onLaunchSuccess={handleLaunch}
                            skuLinks={skuLinks}
                            products={products}
                            onLinkSku={async (sku, master) => await onLinkSku(sku.toUpperCase(), master.toUpperCase())}
                            onOpenLinkModal={(skus, color) => setLinkModalState({ isOpen: true, skus, color })}
                            onOpenCreateProductModal={(data) => { setCreateModalState({ isOpen: true, data: { sku: data.sku, colorSugerida: data.colorSugerida } }); }}
                            produtosCombinados={produtosCombinados}
                            stockItems={stockItems}
                            generalSettings={generalSettings}
                            isHistoryView={isViewingHistory}
                            users={users} // Pass users down
                        />
                    </>
                )}
            </div>

            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase text-xs tracking-widest"><History size={18} className="text-blue-500"/> Histórico</h3>
                    <button 
                        onClick={() => setIsHistoryManagerOpen(true)}
                        className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                    >
                        <List size={14}/> Gerenciar
                    </button>
                </div>
                <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                    {importHistory.length > 0 ? importHistory.slice(0, 10).map(item => (
                        <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-400 hover:shadow-xl hover:bg-white transition-all group relative">
                            <div onClick={() => handleViewHistory(item)} className="cursor-pointer">
                                <div className="flex justify-between items-start">
                                    <p className="font-black text-gray-800 text-xs truncate w-32">{item.fileName}</p>
                                    <span className={`font-black uppercase px-2 py-0.5 rounded-lg text-[9px] ${item.canal === 'ML' ? 'bg-yellow-400 text-yellow-900' : 'bg-orange-50 text-white'}`}>{item.canal}</span>
                                </div>
                                <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase">{new Date(item.processedAt).toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex gap-1.5" onClick={() => handleViewHistory(item)}>
                                    <span className="bg-white border-2 border-gray-100 text-[10px] px-2 py-0.5 rounded-lg font-black text-gray-600">{item.itemCount} Itens</span>
                                    {item.unlinkedCount > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[10px] font-black">{item.unlinkedCount} N/V</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleViewHistory(item)} className="text-gray-300 hover:text-blue-500 transition-colors"><Eye size={18}/></button>
                                    <button onClick={() => onDeleteHistoryItem(item)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-400 py-10 italic text-sm font-bold">Nenhuma importação.</p>}
                    {importHistory.length > 10 && <p className="text-center text-xs text-gray-400 font-bold mt-4 cursor-pointer hover:text-blue-600" onClick={() => setIsHistoryManagerOpen(true)}>+ {importHistory.length - 10} importações antigas...</p>}
                </div>
            </div>

            {/* History Manager Modal */}
            {isHistoryManagerOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gerenciar Histórico Completo</h2>
                                <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">{importHistory.length} importações registradas</p>
                            </div>
                            <button onClick={() => setIsHistoryManagerOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <tr>
                                        <th className="p-4 w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedHistoryIds.size === importHistory.length && importHistory.length > 0} 
                                                onChange={handleSelectAllHistory}
                                                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                            />
                                        </th>
                                        <th className="p-4 text-left">Data/Hora</th>
                                        <th className="p-4 text-left">Arquivo</th>
                                        <th className="p-4 text-left">Usuário</th>
                                        <th className="p-4 text-center">Itens</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-bold text-slate-600">
                                    {importHistory.map(item => (
                                        <tr key={item.id} className={`${selectedHistoryIds.has(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'} transition-colors`}>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedHistoryIds.has(item.id)}
                                                    onChange={() => handleToggleSelectHistory(item.id)}
                                                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-4">{new Date(item.processedAt).toLocaleString('pt-BR')}</td>
                                            <td className="p-4 flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${item.canal === 'ML' ? 'bg-yellow-400' : 'bg-orange-500'}`}></span>
                                                {item.fileName}
                                            </td>
                                            <td className="p-4">{item.user}</td>
                                            <td className="p-4 text-center">
                                                {item.itemCount}
                                                {item.unlinkedCount > 0 && <span className="ml-2 text-red-500 text-[10px] bg-red-50 px-2 py-0.5 rounded-md">+{item.unlinkedCount} N/V</span>}
                                            </td>
                                            <td className="p-4 text-center flex justify-center gap-2">
                                                <button onClick={() => handleViewHistory(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Eye size={18}/></button>
                                                <button onClick={() => onDeleteHistoryItem(item)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-between items-center">
                            <span className="text-xs font-black text-slate-400 uppercase">{selectedHistoryIds.size} selecionados</span>
                            <div className="flex gap-3">
                                <button onClick={() => setIsHistoryManagerOpen(false)} className="px-6 py-3 rounded-xl bg-white border font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-gray-50">Fechar</button>
                                {selectedHistoryIds.size > 0 && (
                                    <button 
                                        onClick={() => setIsConfirmBulkDeleteOpen(true)} 
                                        className="px-6 py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 flex items-center gap-2"
                                    >
                                        <Trash2 size={16}/> Excluir Selecionados ({selectedHistoryIds.size})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <LinkSkuModal isOpen={linkModalState.isOpen} onClose={() => setLinkModalState({isOpen: false, skus: [], color: ''})} skusToLink={linkModalState.skus} colorSugerida={linkModalState.color} onConfirmLink={handleConfirmLink} products={stockItems.filter(i => i.kind === 'PRODUTO')} onTriggerCreate={() => { setLinkModalState(p => ({ ...p, isOpen: false })); setCreateModalState({isOpen: true, data: { sku: linkModalState.skus[0], colorSugerida: linkModalState.color }}); }} />
            {createModalState.data && <CreateProductFromImportModal isOpen={createModalState.isOpen} onClose={() => setCreateModalState({isOpen: false, data: null})} unlinkedSkuData={createModalState.data ? {skus: [createModalState.data.sku], colorSugerida: createModalState.data.colorSugerida} : null} onConfirm={handleConfirmCreateAndLink} generalSettings={generalSettings} />}
            
            <ConfirmActionModal 
                isOpen={isConfirmBulkDeleteOpen} 
                onClose={() => setIsConfirmBulkDeleteOpen(false)} 
                onConfirm={handleBulkDelete} 
                title={`Excluir ${selectedHistoryIds.size} Importações`} 
                message={<><p>Você tem certeza que deseja excluir <strong>{selectedHistoryIds.size}</strong> importações do histórico?</p><p className="mt-2 text-red-600 font-bold">Isso apagará TODOS os pedidos vinculados a essas importações do banco de dados.</p><p className="text-xs mt-1">Essa ação é irreversível.</p></>} 
                confirmButtonText="Sim, Excluir Tudo" 
                isConfirming={isDeletingBulk} 
            />
            
            <DateSelectionModal 
                isOpen={isDateModalOpen} 
                onClose={() => { setIsDateModalOpen(false); }} 
                availableDates={availableShippingDates} 
                onConfirm={handleDateConfirm}
                fileName={selectedFile?.name || ''}
            />
        </div>
    );
};
