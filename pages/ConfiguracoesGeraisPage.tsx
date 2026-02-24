
import React, { useState, ReactNode, useMemo } from 'react';
import { GeneralSettings, User, ToastMessage, StockItem, ExpeditionRule, UserRole, UserSetor, ColumnMapping } from '../types';
import { ArrowLeft, Database, Save, AlertTriangle, RefreshCw, Truck, Download, Plus, Trash2, Settings2, FileSpreadsheet, DollarSign, Package, Users, UserPlus, Mail, KeyRound, Loader2, Edit3, UploadCloud, CheckSquare, Square, QrCode, Building, Terminal, History, Calendar, Filter, Info, Globe, Link as LinkIcon, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { syncDatabase } from '../lib/supabaseClient';
import ConfirmDbResetModal from '../components/ConfirmDbResetModal';
import ConfirmClearHistoryModal from '../components/ConfirmClearHistoryModal';

interface ConfiguracoesGeraisPageProps {
    setCurrentPage: (page: string) => void;
    generalSettings: GeneralSettings;
    onSaveGeneralSettings: (settings: GeneralSettings) => void;
    currentUser: User | null;
    onBackupData: () => void;
    onResetDatabase: (adminPassword: string) => Promise<{ success: boolean; message?: string }>;
    onClearScanHistory: (adminPassword: string) => Promise<{ success: boolean; message?: string }>;
    addToast: (message: string, type: ToastMessage['type']) => void;
    stockItems: StockItem[];
    users: User[];
}

type ConfigTab = 'mapeamento' | 'manutencao';

export const ConfiguracoesGeraisPage: React.FC<ConfiguracoesGeraisPageProps> = (props) => {
    const { setCurrentPage, generalSettings, onSaveGeneralSettings, addToast, stockItems, users, onBackupData, onResetDatabase, onClearScanHistory } = props;
    
    const [activeTab, setActiveTab] = useState<ConfigTab>('mapeamento');
    const [settings, setSettings] = useState<GeneralSettings>(generalSettings);
    const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
    const [sampleData, setSampleData] = useState<any[]>([]);
    
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            
            const isML = file.name.toLowerCase().includes('vendas') || file.name.toLowerCase().includes('mercado');
            const startRow = isML ? 5 : 0;

            const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, range: startRow })[0] || [];
            setDetectedHeaders(headers);

            const data = XLSX.utils.sheet_to_json(sheet, { range: startRow });
            setSampleData(data.slice(0, 1000));

            addToast(`${headers.length} colunas detectadas. Configure os filtros abaixo.`, 'info');
        } catch (error) {
            addToast('Erro ao ler planilha.', 'error');
        }
    };

    const updateMapping = (canal: 'ml' | 'shopee' | 'site', field: keyof ColumnMapping, value: any) => {
        setSettings(prev => ({...prev, importer: {...prev.importer, [canal]: { ...prev.importer[canal], [field]: value }}}));
    };

    const toggleStatusValue = (canal: 'ml' | 'shopee' | 'site', value: string) => {
        setSettings(prev => {
            const currentValues = prev.importer[canal].acceptedStatusValues || [];
            const valueTrimmed = value.trim();
            const newValues = currentValues.includes(valueTrimmed) ? currentValues.filter(v => v !== valueTrimmed) : [...currentValues, valueTrimmed];
            return {...prev, importer: {...prev.importer, [canal]: { ...prev.importer[canal], acceptedStatusValues: newValues }}};
        });
    };

    const toggleFeeColumn = (canal: 'ml' | 'shopee' | 'site', header: string) => {
        setSettings(prev => {
            const currentFees = prev.importer[canal].fees || [];
            const newFees = currentFees.includes(header) ? currentFees.filter(f => f !== header) : [...currentFees, header];
            return { ...prev, importer: { ...prev.importer, [canal]: { ...prev.importer[canal], fees: newFees }}};
        });
    };

    const Section: React.FC<{title: string, icon: ReactNode, children: ReactNode, className?: string}> = ({title, icon, children, className}) => (
        <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm ${className}`}>
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-tighter">{icon} {title}</h2>
            {children}
        </div>
    );
    
    const TabButton: React.FC<{tabId: ConfigTab, label: string, icon: ReactNode}> = ({ tabId, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tabId ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
            {icon} {label}
        </button>
    );

    const MapRow = ({ label, field, canal }: { label: string, field: keyof ColumnMapping, canal: 'ml' | 'shopee' | 'site' }) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase">{label}</label>
            <select value={settings.importer[canal][field] as string} onChange={e => updateMapping(canal, field, e.target.value)} className="p-2 border rounded-xl text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 font-bold">
                <option value="">-- Selecione --</option>
                {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                {settings.importer[canal][field] && !detectedHeaders.includes(settings.importer[canal][field] as string) && (<option value={settings.importer[canal][field] as string}>{settings.importer[canal][field] as string} (Salvo)</option>)}
            </select>
        </div>
    );

    const FeeSelector = ({ canal }: { canal: 'ml' | 'shopee' | 'site' }) => (
        <div className="mt-4">
            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Taxas e Descontos a Abater (Múltiplos)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border rounded-2xl bg-slate-50 border-slate-100">
                {detectedHeaders.length > 0 ? detectedHeaders.map(h => (<button key={h} onClick={() => toggleFeeColumn(canal, h)} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${settings.importer[canal].fees?.includes(h) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}><div className="flex-shrink-0">{settings.importer[canal].fees?.includes(h) ? <CheckSquare size={18}/> : <Square size={18} className="text-slate-300"/>}</div><span className="text-[11px] font-bold uppercase truncate">{h}</span></button>)) : (<div className="col-span-full py-6 text-center"><p className="text-xs text-slate-400 font-medium uppercase italic">Suba uma planilha de exemplo para listar as colunas de taxas.</p></div>)}
            </div>
        </div>
    );

    const StatusFilterSettings = ({ canal }: { canal: 'ml' | 'shopee' | 'site' }) => {
        const statusCol = settings.importer[canal].statusColumn;
        const savedValues = settings.importer[canal].acceptedStatusValues || [];
        const uniqueValuesInFile = useMemo(() => { if (!statusCol || sampleData.length === 0) return []; const values = new Set<string>(); sampleData.forEach(row => { const val = row[statusCol]; if (val) values.add(String(val).trim()); }); return Array.from(values).sort(); }, [statusCol, sampleData]);
        const allDisplayValues = Array.from(new Set([...savedValues, ...uniqueValuesInFile])).sort();
        return (<div className="mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100"><h4 className="text-xs font-black text-purple-800 uppercase mb-3 flex items-center gap-2"><Filter size={14}/> Filtro de Validação de Venda</h4><div className="space-y-4"><MapRow label="Coluna de Status na Planilha" field="statusColumn" canal={canal} />{statusCol ? (<div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Selecione os Status Válidos (Venda Concluída)</label>{allDisplayValues.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-white p-2 rounded-xl border border-purple-100">{allDisplayValues.map(val => (<button key={val} onClick={() => toggleStatusValue(canal, val)} className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${savedValues.includes(val) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'}`}>{savedValues.includes(val) ? <CheckSquare size={16}/> : <Square size={16}/>}<span className="text-xs font-bold truncate">{val}</span></button>))}</div>) : (<div className="p-4 bg-white rounded-xl border border-dashed border-gray-300 text-center"><p className="text-xs text-gray-400 italic">Nenhum valor encontrado nesta coluna na planilha de exemplo. <br/>Suba uma planilha acima para carregar as opções.</p></div>)}<p className="text-[9px] text-purple-600 mt-2 font-medium flex items-center gap-1"><Info size={12}/> Apenas linhas com os status marcados serão contabilizadas no financeiro. O restante será considerado cancelado ou devolvido.</p></div>) : (<p className="text-xs text-gray-400 italic">Selecione a coluna de status acima para configurar os valores.</p>)}</div></div>);
    };

    return (
        <div className="max-w-6xl mx-auto pb-32">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setCurrentPage('configuracoes')} className="p-3 bg-white border rounded-2xl shadow-sm hover:bg-gray-50"><ArrowLeft size={24}/></button>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Painel de Administração Global</h1>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-t-2xl shadow-sm">
                <div className="flex border-b">
                    <TabButton tabId="mapeamento" label="Mapeamento de Planilhas" icon={<FileSpreadsheet size={16}/>} />
                    <TabButton tabId="manutencao" label="Manutenção do Sistema" icon={<Terminal size={16}/>} />
                </div>
            </div>

            <div className="py-8">
                {activeTab === 'mapeamento' && (
                     <Section title="Mapeamento de Planilhas" icon={<FileSpreadsheet className="text-emerald-500" />}>
                        <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-dashed border-emerald-200 text-center mb-6 group hover:bg-emerald-100 transition-all">
                            <input type="file" id="sample-upload" className="hidden" onChange={handleFileUpload} />
                            <label htmlFor="sample-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <UploadCloud size={24} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                                <div>
                                    <p className="font-bold text-emerald-900 text-sm">Subir Planilha de Exemplo</p>
                                    <p className="text-xs text-emerald-600">Para extrair e ticar as colunas de taxas dinamicamente</p>
                                </div>
                            </label>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50/50 rounded-2xl border">
                                <h3 className="font-bold text-gray-700 mb-4">Mercado Livre</h3>
                                <div className="space-y-4"><MapRow label="N.º da Venda" field="orderId" canal="ml" /><MapRow label="SKU" field="sku" canal="ml" /><MapRow label="Quantidade" field="qty" canal="ml" /><MapRow label="Rastreio" field="tracking" canal="ml" /><MapRow label="Data Venda" field="date" canal="ml" /><MapRow label="Receita Bruta" field="priceGross" canal="ml" /><MapRow label="Comprador" field="customerName" canal="ml" /></div>
                                <FeeSelector canal="ml" />
                                <StatusFilterSettings canal="ml" />
                            </div>
                            <div className="p-4 bg-gray-50/50 rounded-2xl border">
                                <h3 className="font-bold text-gray-700 mb-4">Shopee</h3>
                                <div className="space-y-4"><MapRow label="N.º do Pedido" field="orderId" canal="shopee" /><MapRow label="Referência SKU" field="sku" canal="shopee" /><MapRow label="Quantidade" field="qty" canal="shopee" /><MapRow label="Rastreio" field="tracking" canal="shopee" /><MapRow label="Data Venda" field="date" canal="shopee" /><MapRow label="Preço Acordado" field="priceGross" canal="shopee" /><MapRow label="Comprador" field="customerName" canal="shopee" /></div>
                                <FeeSelector canal="shopee" />
                                <StatusFilterSettings canal="shopee" />
                            </div>
                        </div>
                    </Section>
                )}

                {activeTab === 'manutencao' && (
                    <Section title="Manutenção do Banco de Dados" icon={<Terminal className="text-slate-800" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button onClick={async () => { await syncDatabase(); addToast('Banco de dados sincronizado!', 'success'); }} className="flex flex-col items-center p-4 bg-blue-50 border rounded-xl hover:bg-blue-100"><RefreshCw size={20} className="mb-2 text-blue-600" /><span className="text-xs font-bold text-blue-800">Sincronizar Estrutura</span></button>
                            <button onClick={onBackupData} className="flex flex-col items-center p-4 bg-green-50 border rounded-xl hover:bg-green-100"><Download size={20} className="mb-2 text-green-600" /><span className="text-xs font-bold text-green-800">Backup dos Dados</span></button>
                            <button onClick={() => setIsClearHistoryModalOpen(true)} className="flex flex-col items-center p-4 bg-orange-50 border rounded-xl hover:bg-orange-100"><History size={20} className="mb-2 text-orange-600" /><span className="text-xs font-bold text-orange-800">Limpar Bipagens</span></button>
                            <button onClick={() => setIsResetModalOpen(true)} className="sm:col-span-3 flex items-center justify-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100"><AlertTriangle size={20} className="text-red-600" /><span className="text-sm font-bold text-red-800">Resetar Banco de Dados (Apagar TUDO)</span></button>
                        </div>
                    </Section>
                )}
            </div>

            <div className="fixed bottom-8 right-8 z-50">
                <button onClick={() => onSaveGeneralSettings(settings)} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                    <Save size={28}/> SALVAR TUDO
                </button>
            </div>

            <ConfirmDbResetModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirmReset={onResetDatabase} />
            <ConfirmClearHistoryModal isOpen={isClearHistoryModalOpen} onClose={() => setIsClearHistoryModalOpen(false)} onConfirmClear={onClearScanHistory} />
        </div>
    );
};
