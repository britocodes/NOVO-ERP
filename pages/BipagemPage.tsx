
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScanLogItem, ScanResult, User, StockItem, OrderItem, UiSettings, SkuLink, StockDeductionMode } from '../types';
import { playSound } from '../lib/sound';
import { 
    QrCode, X, Check, CheckCheck, History, User as UserIcon, 
    ScanLine, AlertCircle, Trash2, ShieldCheck, 
    RefreshCw, Loader2, ChevronDown, ChevronRight, Undo, 
    Cloud, AlertTriangle, Search, StopCircle, Package, Factory
} from 'lucide-react';
import ConfirmActionModal from '../components/ConfirmActionModal';

interface BipagemPageProps {
    isAutoBipagemActive: boolean;
    allOrders: OrderItem[];
    onNewScan: (code: string, user?: User, deductionMode?: StockDeductionMode) => Promise<ScanResult>;
    onBomDeduction: (sku: string, ref: string) => void;
    scanHistory: ScanLogItem[];
    onCancelBipagem: (scanId: string) => void;
    onBulkCancelBipagem: (scanIds: string[]) => Promise<void>;
    onHardDeleteScanLog: (scanId: string) => void;
    onBulkHardDeleteScanLog: (scanIds: string[]) => Promise<void>;
    products: StockItem[];
    users: User[];
    uiSettings: UiSettings;
    currentUser: User;
    onSyncPending: () => Promise<void>;
    skuLinks: SkuLink[];
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    onAddNewUser: (name: string, setor: any[], role: any, email?: string, password?: string) => Promise<{ success: boolean; message?: string; }>;
    onSaveUser: (user: User) => Promise<boolean>;
    currentPage: string;
}

const BipagemPage: React.FC<BipagemPageProps> = (props) => {
    const { 
        onNewScan, scanHistory, onBulkCancelBipagem, 
        onHardDeleteScanLog, onBulkHardDeleteScanLog, users, 
        uiSettings, currentUser, onSyncPending, addToast 
    } = props;
    
    const [manualInput, setManualInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [deductionMode, setDeductionMode] = useState<StockDeductionMode>('STOCK');
    
    // Feedback Overlays
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    
    // Selection and Modals
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const overlayTimeout = useRef<any>(null);

    // Filtered Scans
    const recentScans = useMemo(() => scanHistory.slice(0, 50), [scanHistory]);

    // Listener para capturar bipagem mesmo sem foco no input
    useEffect(() => {
        const handlePageKeyDown = (e: KeyboardEvent) => {
            // Se o usuário estiver segurando Ctrl/Alt/Meta, provavelmente é um atalho de navegador, ignorar.
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            // Se o foco já estiver no input principal, deixa o comportamento padrão
            if (document.activeElement === inputRef.current) return;

            // Se o foco estiver em OUTRO input (ex: modal de senha, formulário), não interfere
            if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLSelectElement) {
                return;
            }

            // Se o usuário começar a digitar (ou bipar), foca no input
            // Verifica se é uma tecla imprimível (comprimento 1) ou Enter
            if (e.key.length === 1 || e.key === 'Enter') {
                inputRef.current?.focus();
                
                // Se for um caractere, adiciona manualmente ao estado porque o 'focus' pode acontecer depois do evento de tecla
                if (e.key.length === 1) {
                    setManualInput(prev => prev + e.key.toUpperCase());
                    e.preventDefault(); // Previne digitar duas vezes
                }
            }
        };

        window.addEventListener('keydown', handlePageKeyDown);
        return () => window.removeEventListener('keydown', handlePageKeyDown);
    }, []);

    // Garante foco ao montar
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleProcessScan = async (code: string) => {
        if (!code.trim() || isProcessing) return;
        
        setIsProcessing(true);
        const result = await onNewScan(code, undefined, deductionMode);
        setIsProcessing(false);
        setManualInput('');

        // Clear existing timeouts
        if (overlayTimeout.current) clearTimeout(overlayTimeout.current);

        setScanResult(result);

        if (result.status === 'OK') {
            if (uiSettings.soundOnSuccess) playSound('success');
            overlayTimeout.current = setTimeout(() => setScanResult(null), 2500); // 2.5s Green
        } else if (result.status === 'DUPLICATE') {
            if (uiSettings.soundOnDuplicate) playSound('duplicate');
            overlayTimeout.current = setTimeout(() => setScanResult(null), 4000); // 4s Orange
        } else {
            // NOT_FOUND or ERROR
            if (uiSettings.soundOnError) playSound('error');
            overlayTimeout.current = setTimeout(() => setScanResult(null), 4000); // 4s Red
        }
        
        // Garante o foco de volta após processar
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleProcessScan(manualInput);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        await onSyncPending();
        setIsSyncing(false);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkCancel = async () => {
        setIsActionLoading(true);
        await onBulkCancelBipagem(Array.from(selectedIds));
        setSelectedIds(new Set());
        setIsActionLoading(false);
        setIsCancelModalOpen(false);
    };

    const handleBulkDelete = async () => {
        setIsActionLoading(true);
        await onBulkHardDeleteScanLog(Array.from(selectedIds));
        setSelectedIds(new Set());
        setIsActionLoading(false);
        setIsHardDeleteModalOpen(false);
    };

    // Close overlay manually
    const closeOverlay = () => {
        if (overlayTimeout.current) clearTimeout(overlayTimeout.current);
        setScanResult(null);
        // Pequeno delay para garantir que o DOM atualizou antes de focar
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    return (
        <div className="space-y-6 relative min-h-full">
            {/* Full Screen Feedback Overlays */}
            {scanResult && (
                <div 
                    className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-200 ${
                        scanResult.status === 'OK' ? 'bg-emerald-600' : 
                        scanResult.status === 'DUPLICATE' ? 'bg-amber-500' : 
                        'bg-red-600'
                    }`}
                    onClick={closeOverlay}
                >
                    <div className="bg-white/10 backdrop-blur-sm p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 max-w-2xl w-full border-4 border-white/30 text-white text-center">
                        
                        {/* Icon */}
                        <div className="p-6 bg-white rounded-full shadow-lg">
                            {scanResult.status === 'OK' && <CheckCheck size={80} className="text-emerald-600" />}
                            {scanResult.status === 'DUPLICATE' && <AlertTriangle size={80} className="text-amber-500" />}
                            {(scanResult.status === 'NOT_FOUND' || scanResult.status === 'ERROR') && <StopCircle size={80} className="text-red-600" />}
                        </div>

                        {/* Status Text */}
                        <div>
                            <h2 className="text-6xl font-black uppercase tracking-tighter drop-shadow-md">
                                {scanResult.status === 'OK' && 'SUCESSO!'}
                                {scanResult.status === 'DUPLICATE' && 'DUPLICADO!'}
                                {scanResult.status === 'NOT_FOUND' && 'NÃO ENCONTRADO'}
                                {scanResult.status === 'ERROR' && 'ERRO'}
                            </h2>
                            <p className="text-2xl font-bold mt-2 opacity-90">{scanResult.message}</p>
                        </div>

                        {/* Details Box */}
                        <div className="bg-black/20 p-6 rounded-2xl w-full">
                            <div className="flex justify-between items-end border-b border-white/20 pb-2 mb-2">
                                <span className="text-sm font-bold uppercase opacity-70">Código Lido</span>
                                <span className="text-3xl font-mono font-black">{scanResult.input_code}</span>
                            </div>
                            
                            {scanResult.first_scan && (
                                <div className="text-left bg-black/20 p-3 rounded-lg mt-4">
                                    <p className="text-xs font-bold uppercase text-amber-200 mb-1">Primeira bipagem:</p>
                                    <p className="text-sm">Por: <strong>{scanResult.first_scan.by}</strong></p>
                                    <p className="text-sm">Em: <strong>{scanResult.first_scan.at}</strong></p>
                                </div>
                            )}

                            {scanResult.user && (
                                <div className="mt-4 flex justify-between items-center text-xs font-bold uppercase opacity-60">
                                    <span>Operador: {scanResult.user.name}</span>
                                    <span>{scanResult.channel || 'Geral'}</span>
                                </div>
                            )}
                        </div>

                        <button onClick={closeOverlay} className="bg-white text-black px-10 py-4 rounded-full font-black text-lg uppercase hover:scale-105 transition-transform shadow-xl">
                            Continuar Bipando (Enter)
                        </button>
                    </div>
                </div>
            )}

            {/* Header & Main Input */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-inner">
                            <ScanLine size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Central de Bipagem</h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-8">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 mr-1">ATIVO</span> 
                            Pode bipar diretamente sem clicar na caixa
                        </p>
                        
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-full max-w-md">
                            <button 
                                onClick={() => setDeductionMode('STOCK')} 
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase transition-all ${deductionMode === 'STOCK' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Package size={16}/> Estoque Pronta Entrega
                            </button>
                            <button 
                                onClick={() => setDeductionMode('PRODUCTION')} 
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase transition-all ${deductionMode === 'PRODUCTION' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Factory size={16}/> Produção Diária
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="w-full max-w-md relative">
                            <input 
                                ref={inputRef}
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                                placeholder="Escaneie ou digite o código..."
                                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl text-center focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-slate-300 shadow-sm"
                                autoFocus
                            />
                            {isProcessing && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="animate-spin text-blue-500" />
                                </div>
                            )}
                        </form>
                        
                        <div className="mt-8 flex gap-4 flex-wrap justify-center">
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-black uppercase">
                                <ShieldCheck size={14}/> Scanner Online
                            </div>
                            <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-xs font-black uppercase hover:bg-blue-100 transition-all disabled:opacity-50">
                                {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} Sincronizar Pendentes
                            </button>
                        </div>
                    </div>

                    {/* Scan Log Table */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                    <History size={18} className="text-blue-500" />
                                    Bipagens Recentes
                                </h3>
                            </div>
                            {selectedIds.size > 0 && (
                                <div className="flex gap-2 animate-in slide-in-from-right-4">
                                    <button onClick={() => setIsCancelModalOpen(true)} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-200">
                                        Reverter ({selectedIds.size})
                                    </button>
                                    <button onClick={() => setIsHardDeleteModalOpen(true)} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200">
                                        Excluir ({selectedIds.size})
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4 text-center w-12">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds(new Set(recentScans.map(s => s.id)));
                                                    else setSelectedIds(new Set());
                                                }}
                                                checked={recentScans.length > 0 && selectedIds.size === recentScans.length}
                                                className="rounded-md border-white/20 bg-white/10"
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-left">Horário</th>
                                        <th className="px-6 py-4 text-left">Pedido / Chave</th>
                                        <th className="px-6 py-4 text-left">Canal</th>
                                        <th className="px-6 py-4 text-left">Operador</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                                    {recentScans.map(scan => (
                                        <tr key={scan.id} className={`${selectedIds.has(scan.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'} transition-colors cursor-pointer`} onClick={() => handleToggleSelect(scan.id)}>
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.has(scan.id)}
                                                    onChange={() => handleToggleSelect(scan.id)}
                                                    className="rounded-md border-gray-300 text-blue-600"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                                                {scan.time ? scan.time.toLocaleTimeString('pt-BR') : '---'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs uppercase text-slate-800">
                                                {scan.displayKey}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${scan.canal === 'ML' ? 'bg-yellow-100 text-yellow-700' : scan.canal === 'SHOPEE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {scan.canal || 'OUTRO'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {scan.user}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${scan.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : scan.status === 'DUPLICATE' ? 'bg-amber-100 text-amber-700' : scan.status === 'NOT_FOUND' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {scan.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentScans.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-bold italic">Nenhum bip registrado recentemente.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                        <h3 className="font-black text-slate-800 uppercase tracking-tighter mb-4 flex items-center gap-2">
                            <UserIcon size={18} className="text-blue-500" />
                            Sessão Atual
                        </h3>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operador Logado</p>
                            <p className="font-black text-slate-700 text-lg uppercase">{currentUser.name}</p>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                <span>Bipagens Hoje</span>
                                <span className="text-slate-800">{scanHistory.length}</span>
                             </div>
                             <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                <span>Sucesso</span>
                                <span className="text-emerald-600">{scanHistory.filter(s => s.status === 'OK' || s.synced).length}</span>
                             </div>
                             <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                <span>Duplicados</span>
                                <span className="text-orange-600">{scanHistory.filter(s => s.status === 'DUPLICATE').length}</span>
                             </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-100 text-white">
                        <h3 className="font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                            <AlertCircle size={18} />
                            Dicas de Operação
                        </h3>
                        <ul className="text-xs font-bold space-y-4 opacity-90 uppercase tracking-wide leading-relaxed">
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">1</span>
                                Escolha o <strong>Modo de Baixa</strong> correto antes de bipar.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">2</span>
                                Use o scanner USB ou a câmera para ler os códigos.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">3</span>
                                A tela mudará de cor para indicar o resultado (Verde, Laranja, Vermelho).
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmActionModal 
                isOpen={isCancelModalOpen} 
                onClose={() => setIsCancelModalOpen(false)} 
                onConfirm={handleBulkCancel} 
                title="Reverter Bipagens" 
                message={<><p>Deseja reverter <strong>{selectedIds.size}</strong> bipagem(ns)?</p><p className="text-xs opacity-70">Isso retornará os pedidos para "NORMAL" e devolverá os insumos ao estoque.</p></>}
                confirmButtonText="Sim, Reverter"
                isConfirming={isActionLoading}
            />

            <ConfirmActionModal 
                isOpen={isHardDeleteModalOpen} 
                onClose={() => setIsHardDeleteModalOpen(false)} 
                onConfirm={handleBulkDelete} 
                title="Excluir Registros" 
                message={<><p>Deseja excluir permanentemente <strong>{selectedIds.size}</strong> registro(s) de log?</p><p className="text-red-500 font-bold uppercase text-[10px] mt-2">Atenção: Isso NÃO reverte o estoque nem o status do pedido!</p></>}
                confirmButtonText="Sim, Excluir"
                isConfirming={isActionLoading}
            />
        </div>
    );
};

export default BipagemPage;
