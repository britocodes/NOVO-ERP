
import React, { useState, ReactNode, useEffect } from 'react';
import { User, UserRole, UserSetor, GeneralSettings, ColumnMapping, ExpeditionRule, ZplSettings, ZplPlatformSettings, StockItem, ToastMessage } from '../types';
import { 
    Users, Plus, Settings2, ChevronRight, User as UserIcon, KeyRound, Trash2, 
    Loader2, Mail, Edit3, FileSpreadsheet, Truck, Printer, Building, Save, 
    UploadCloud, CheckSquare, Square, RefreshCw, Download, AlertTriangle, Terminal, 
    History, Check, ArrowRight, Settings, Box, Layers, Volume2
} from 'lucide-react';
import ConfirmDeleteUserModal from '../components/ConfirmDeleteUserModal';
import ConfirmActionModal from '../components/ConfirmActionModal';
import EditAdminModal from '../components/EditAdminModal';
import { syncDatabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';

interface ConfiguracoesPageProps {
    users: User[];
    setCurrentPage: (page: string) => void;
    onDeleteUser: (userId: string, adminPassword?: string) => Promise<boolean>;
    onAddNewUser: (name: string, setor: UserSetor[], role: UserRole, email?: string, password?: string) => Promise<{ success: boolean; message?: string; }>;
    currentUser: User;
    onUpdateUser: (user: User) => Promise<boolean>;
    generalSettings: GeneralSettings;
    onSaveGeneralSettings: (settings: GeneralSettings) => void;
    onBackupData: () => void;
    onResetDatabase: (adminPassword: string) => Promise<{ success: boolean; message?: string }>;
    onClearScanHistory: (adminPassword: string) => Promise<{ success: boolean; message?: string }>;
    stockItems: StockItem[];
    addToast: (message: string, type: ToastMessage['type']) => void;
}

type ConfigTab = 'usuarios' | 'mapeamento' | 'bipagem' | 'expedicao' | 'etiquetas' | 'sistema';

const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = (props) => {
    const { users, onDeleteUser, onAddNewUser, currentUser, onUpdateUser, generalSettings, onSaveGeneralSettings, onBackupData, onResetDatabase, onClearScanHistory, stockItems } = props;
    
    const [activeTab, setActiveTab] = useState<ConfigTab>('usuarios');
    const [settings, setSettings] = useState<GeneralSettings>(generalSettings);
    const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

    // User management states
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('OPERATOR');
    const [newUserSetores, setNewUserSetores] = useState<UserSetor[]>([]);
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    // Expedition states
    const [newRule, setNewRule] = useState<ExpeditionRule>({ id: '', from: 1, to: 1, stockItemCode: '', quantity: 1, category: 'ALL' });

    useEffect(() => {
        setSettings(generalSettings);
    }, [generalSettings]);

    const handleSave = () => {
        onSaveGeneralSettings(settings);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const isML = file.name.toLowerCase().includes('vendas') || file.name.toLowerCase().includes('mercado');
        const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, range: isML ? 5 : 0 })[0] || [];
        setDetectedHeaders(headers);
    };

    const updateMapping = (canal: 'ml' | 'shopee', field: keyof ColumnMapping, value: any) => {
        setSettings(prev => ({
            ...prev,
            importer: {
                ...prev.importer,
                [canal]: { ...prev.importer[canal], [field]: value }
            }
        }));
    };

    const toggleFeeColumn = (canal: 'ml' | 'shopee', header: string) => {
        setSettings(prev => {
            const currentFees = prev.importer[canal].fees || [];
            const newFees = currentFees.includes(header) 
                ? currentFees.filter(f => f !== header) 
                : [...currentFees, header];
            
            return { 
                ...prev, 
                importer: { 
                    ...prev.importer, 
                    [canal]: { ...prev.importer[canal], fees: newFees } 
                } 
            };
        });
    };

    const handleAddExpeditionRule = () => {
        if (!newRule.stockItemCode) return;
        const ruleToAdd = { ...newRule, id: Date.now().toString() };
        setSettings(prev => ({
            ...prev,
            expeditionRules: {
                ...prev.expeditionRules,
                packagingRules: [...(prev.expeditionRules?.packagingRules || []), ruleToAdd].sort((a,b) => a.from - b.from)
            }
        }));
        setNewRule({ id: '', from: 1, to: 1, stockItemCode: '', quantity: 1, category: 'ALL' });
    };

    const removeExpeditionRule = (id: string) => {
        setSettings(prev => ({
            ...prev,
            expeditionRules: {
                ...prev.expeditionRules,
                packagingRules: (prev.expeditionRules?.packagingRules || []).filter(r => r.id !== id)
            }
        }));
    };

    const Section: React.FC<{title: string, icon: ReactNode, children: ReactNode}> = ({title, icon, children}) => (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-tighter border-b border-slate-50 pb-5">{icon} {title}</h2>
            {children}
        </div>
    );

    const MapRow = ({ label, field, canal }: { label: string, field: keyof ColumnMapping, canal: 'ml' | 'shopee' }) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
            <select 
                value={(settings.importer[canal][field] as string) || ''} 
                onChange={e => updateMapping(canal, field, e.target.value)}
                className="p-3 border rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold border-slate-100"
            >
                <option value="">-- Selecione a Coluna --</option>
                {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                {settings.importer[canal][field] && !detectedHeaders.includes(settings.importer[canal][field] as string) && (
                    <option value={settings.importer[canal][field] as string}>{settings.importer[canal][field] as string} (Salvo)</option>
                )}
            </select>
        </div>
    );

    const FeeSelector = ({ canal }: { canal: 'ml' | 'shopee' }) => (
        <div className="mt-6">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Taxas e Descontos a Abater (Abatimento Financeiro)</label>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-4 border-2 border-slate-50 rounded-3xl bg-slate-50/50">
                {detectedHeaders.length > 0 ? detectedHeaders.map(h => (
                    <button 
                        key={h} 
                        onClick={() => toggleFeeColumn(canal, h)} 
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${settings.importer[canal].fees?.includes(h) ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'}`}
                    >
                        <div className="flex-shrink-0">
                            {settings.importer[canal].fees?.includes(h) ? <CheckSquare size={20}/> : <Square size={20} className="text-slate-200"/>}
                        </div>
                        <span className="text-xs font-black uppercase truncate">{h}</span>
                    </button>
                )) : (
                    <div className="py-10 text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic leading-relaxed">Importe uma planilha acima<br/>para listar os campos de taxa.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const TabBtn = ({ id, label, icon }: { id: ConfigTab, label: string, icon: ReactNode }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === id ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
        >
            {icon} {label}
        </button>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Configurações Gerais</h1>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gestão de Mapeamento, Bipagem, Expedição e Sistema</p>
            </div>

            <div className="flex border-b border-gray-200 overflow-x-auto bg-white rounded-t-3xl border-t border-l border-r">
                <TabBtn id="usuarios" label="Funcionários" icon={<Users size={16}/>} />
                <TabBtn id="mapeamento" label="Planilhas" icon={<FileSpreadsheet size={16}/>} />
                <TabBtn id="bipagem" label="Bipagem" icon={<Layers size={16}/>} />
                <TabBtn id="expedicao" label="Expedição" icon={<Truck size={16}/>} />
                <TabBtn id="etiquetas" label="Etiquetas ZPL" icon={<Printer size={16}/>} />
                <TabBtn id="sistema" label="Sistema" icon={<Settings size={16}/>} />
            </div>

            {activeTab === 'mapeamento' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="lg:col-span-2">
                         <div className="p-10 bg-blue-50 rounded-3xl border-2 border-dashed border-blue-200 text-center mb-4 group hover:bg-blue-100 transition-all">
                            <input type="file" id="sample-upload" className="hidden" onChange={handleFileUpload} />
                            <label htmlFor="sample-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                <UploadCloud size={56} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                <div>
                                    <p className="font-black text-blue-900 uppercase text-lg tracking-tighter">Subir Planilha de Exemplo</p>
                                    <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Para extrair e ticar as colunas de taxas dinamicamente</p>
                                </div>
                            </label>
                        </div>
                    </div>
                    <Section title="Mercado Livre" icon={<FileSpreadsheet className="text-yellow-500" />}>
                        <div className="grid grid-cols-2 gap-5 mb-4">
                            <MapRow label="N.º da Venda" field="orderId" canal="ml" />
                            <MapRow label="SKU do Produto" field="sku" canal="ml" />
                            <MapRow label="Quantidade" field="qty" canal="ml" />
                            <MapRow label="Código de Rastreio" field="tracking" canal="ml" />
                            <MapRow label="Data da Venda" field="date" canal="ml" />
                            <MapRow label="Data de Envio Prev." field="dateShipping" canal="ml" />
                            <MapRow label="Receita Bruta" field="priceGross" canal="ml" />
                            <MapRow label="Nome do Comprador" field="customerName" canal="ml" />
                        </div>
                        <FeeSelector canal="ml" />
                    </Section>
                    <Section title="Shopee" icon={<FileSpreadsheet className="text-orange-500" />}>
                        <div className="grid grid-cols-2 gap-5 mb-4">
                            <MapRow label="N.º do Pedido" field="orderId" canal="shopee" />
                            <MapRow label="Referência SKU" field="sku" canal="shopee" />
                            <MapRow label="Quantidade" field="qty" canal="shopee" />
                            <MapRow label="Código de Rastreio" field="tracking" canal="shopee" />
                            <MapRow label="Data da Venda" field="date" canal="shopee" />
                            <MapRow label="Data de Envio Prev." field="dateShipping" canal="shopee" />
                            <MapRow label="Preço Acordado" field="priceGross" canal="shopee" />
                            <MapRow label="Nome do Comprador" field="customerName" canal="shopee" />
                        </div>
                        <FeeSelector canal="shopee" />
                    </Section>
                </div>
            )}
            
            {activeTab === 'usuarios' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <Section title="Novo Membro" icon={<Plus size={20} className="text-blue-600"/>}>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setIsAddingUser(true);
                                const result = await onAddNewUser(newUserName, newUserSetores, newUserRole, newUserEmail, newUserPassword);
                                if (result.success) {
                                    setNewUserName('');
                                    setNewUserRole('OPERATOR');
                                    setNewUserSetores([]);
                                    setNewUserPassword('');
                                    setNewUserEmail('');
                                }
                                setIsAddingUser(false);
                            }} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Nome Completo</label>
                                    <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold text-sm border-slate-100"/>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Perfil</label>
                                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold text-sm border-slate-100">
                                            <option value="OPERATOR">Operador</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Setores</label>
                                        <div className="max-h-32 overflow-y-auto border rounded-xl p-3 bg-slate-50 space-y-2 border-slate-100">
                                            {generalSettings.setorList.map(s => (
                                                <label key={s} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600 cursor-pointer">
                                                    <input type="checkbox" checked={newUserSetores.includes(s)} onChange={() => setNewUserSetores(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} className="w-4 h-4 rounded-md border-slate-300"/> {s}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {newUserRole === 'ADMIN' && (
                                    <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                        <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email para login" className="w-full p-3 border rounded-xl bg-white font-bold text-sm border-blue-200"/>
                                        <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Senha de acesso" className="w-full p-3 border rounded-xl bg-white font-bold text-sm border-blue-200"/>
                                    </div>
                                )}
                                <button disabled={isAddingUser} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                                    {isAddingUser ? <Loader2 className="animate-spin mx-auto"/> : 'Cadastrar Membro'}
                                </button>
                            </form>
                        </Section>
                    </div>
                    <div className="lg:col-span-2">
                        <Section title="Equipe Operacional" icon={<Users size={20} className="text-slate-600"/>}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {users.map(user => (
                                    <div key={user.id} className="p-5 border rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all flex justify-between items-center group border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm"><UserIcon size={24} className="text-blue-500"/></div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm uppercase tracking-tighter leading-tight">{user.name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{user.role} • {user.setor.join(', ')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {setUserToEdit(user); setIsEditModalOpen(true);}} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit3 size={18}/></button>
                                            <button onClick={() => {setUserToDelete(user); setIsDeleteModalOpen(true);}} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>
                </div>
            )}

            {activeTab === 'bipagem' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Section title="Comportamento do Scanner" icon={<Layers className="text-blue-500"/>}>
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Tempo de Debounce (ms)</label>
                                <input type="number" value={settings.bipagem.debounceTime_ms || 0} onChange={e => setSettings({...settings, bipagem: {...settings.bipagem, debounceTime_ms: Number(e.target.value)}})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-black focus:border-blue-500 outline-none" />
                                <p className="text-[9px] text-gray-400 font-bold mt-2 leading-tight">Ignora leituras repetidas acidentais neste intervalo.</p>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Sufixo de Scanner</label>
                                <input type="text" value={settings.bipagem.scanSuffix || ''} onChange={e => setSettings({...settings, bipagem: {...settings.bipagem, scanSuffix: e.target.value}})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-black focus:border-blue-500 outline-none" placeholder="Ex: BR" />
                                <p className="text-[9px] text-gray-400 font-bold mt-2 leading-tight">Remove este texto do final dos códigos bipados (ex: quebra de linha ou prefixo de loja).</p>
                            </div>
                        </div>
                    </Section>
                    <Section title="Feedback Sonoro" icon={<Volume2 className="text-purple-500"/>}>
                         <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <span className="text-xs font-black text-slate-700 uppercase">Ativar Sons de Sucesso</span>
                                <input type="checkbox" className="w-6 h-6 rounded-lg text-blue-600" checked={true} readOnly />
                            </label>
                            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <span className="text-xs font-black text-slate-700 uppercase">Ativar Sons de Erro</span>
                                <input type="checkbox" className="w-6 h-6 rounded-lg text-blue-600" checked={true} readOnly />
                            </label>
                             <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                <label className="text-[10px] font-black text-purple-800 uppercase tracking-widest block mb-2">Operador Padrão do Scanner</label>
                                <select value={settings.bipagem.defaultOperatorId || ''} onChange={e => setSettings({...settings, bipagem: {...settings.bipagem, defaultOperatorId: e.target.value}})} className="w-full p-3 border-2 border-white rounded-xl text-sm font-black focus:border-purple-500 outline-none">
                                    <option value="">Nenhum (Usar login atual)</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {activeTab === 'expedicao' && (
                <div className="space-y-8">
                    <Section title="Regras Automáticas de Embalagem" icon={<Truck size={24} className="text-blue-600"/>}>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mb-8">
                            <h3 className="text-xs font-black text-slate-500 mb-5 uppercase tracking-widest flex items-center gap-2"><Plus size={16}/> Adicionar Nova Faixa de Baixa</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Para Categoria:</label>
                                    <select value={newRule.category} onChange={e => setNewRule({...newRule, category: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-xs font-black bg-white focus:border-blue-500">
                                        <option value="ALL">Todas Categorias</option>
                                        {settings.productCategoryList?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Qtd. Mín (Un):</label>
                                        <input type="number" value={newRule.from} onChange={e => setNewRule({...newRule, from: Number(e.target.value)})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-xs font-black focus:border-blue-500"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Qtd. Máx (Un):</label>
                                        <input type="number" value={newRule.to} onChange={e => setNewRule({...newRule, to: Number(e.target.value)})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-xs font-black focus:border-blue-500"/>
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Embalagem a Baixar:</label>
                                    <select value={newRule.stockItemCode} onChange={e => setNewRule({...newRule, stockItemCode: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-xs font-black bg-white focus:border-blue-500">
                                        <option value="">Selecione um Insumo...</option>
                                        {stockItems.filter(i => i.kind === 'INSUMO').map(i => <option key={i.id} value={i.code}>{i.name}</option>)}
                                    </select>
                                </div>
                                <button onClick={handleAddExpeditionRule} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-95 transition-all">Ativar Regra</button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100">
                            <h4 className="font-black text-slate-800 text-sm mb-6 uppercase tracking-tighter flex items-center gap-2"><Box size={18} className="text-blue-500"/> Regras Ativas de Expedição</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                                        <tr>
                                            <th className="py-3 px-4 text-left">Categoria do Produto</th>
                                            <th className="py-3 px-4 text-center">De (Unidades)</th>
                                            <th className="py-3 px-4 text-center">Até (Unidades)</th>
                                            <th className="py-3 px-4 text-left">Embalagem Associada</th>
                                            <th className="py-3 px-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {settings.expeditionRules?.packagingRules?.map(r => (
                                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-4">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${r.category === 'ALL' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                                                        {r.category === 'ALL' ? 'Todas' : r.category}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center font-black text-slate-600">{r.from}</td>
                                                <td className="py-4 px-4 text-center font-black text-slate-600">{r.to}</td>
                                                <td className="py-4 px-4 font-bold text-slate-700">{stockItems.find(si => si.code === r.stockItemCode)?.name}</td>
                                                <td className="py-4 px-4 text-right">
                                                    <button onClick={() => removeExpeditionRule(r.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!settings.expeditionRules?.packagingRules || settings.expeditionRules.packagingRules.length === 0) && (
                                            <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-bold italic">Nenhuma regra configurada.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {activeTab === 'etiquetas' && (
                <Section title="Impressão de Etiquetas ZPL" icon={<Printer size={24} className="text-purple-600"/>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-3 mb-5 flex items-center gap-2"><Layers size={16}/> Qualidade e Lotes</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Páginas por Lote</label>
                                        <select value={settings.etiquetas.renderChunkSize} onChange={e => setSettings({...settings, etiquetas: {...settings.etiquetas, renderChunkSize: Number(e.target.value)}})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-black bg-white focus:border-blue-500">
                                            <option value={5}>Econômico (5)</option>
                                            <option value={10}>Padrão (10)</option>
                                            <option value={20}>Rápido (20)</option>
                                        </select>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Atraso API (ms)</label>
                                        <input type="number" value={settings.etiquetas.apiRequestDelay_ms || 0} onChange={e => setSettings({...settings, etiquetas: {...settings.etiquetas, apiRequestDelay_ms: Number(e.target.value)}})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-black focus:border-blue-500"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest border-b border-purple-50 pb-3 mb-5 flex items-center gap-2"><Terminal size={16}/> Labelary API</h3>
                                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">URL de Renderização</label>
                                    <input type="text" value={settings.etiquetas.labelaryApiUrl || ''} onChange={e => setSettings({...settings, etiquetas: {...settings.etiquetas, labelaryApiUrl: e.target.value}})} className="w-full p-3 border-2 border-slate-100 rounded-xl text-xs font-mono bg-white focus:border-blue-500 outline-none"/>
                                    <p className="text-[9px] text-slate-400 font-bold mt-3 leading-relaxed">Placeholders: <span className="text-purple-600">{`{dpmm}`}</span>, <span className="text-purple-600">{`{width}`}</span> e <span className="text-purple-600">{`{height}`}</span>.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>
            )}

            {activeTab === 'sistema' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Section title="Dados Corporativos" icon={<Building size={24} className="text-slate-800"/>}>
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nome da Empresa</label>
                                <input type="text" value={settings.companyName || ''} onChange={e => setSettings({...settings, companyName: e.target.value})} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-white font-black text-2xl tracking-tighter text-slate-800 focus:border-blue-500 outline-none shadow-sm"/>
                            </div>
                             <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ícone Visual</label>
                                <select value={settings.appIcon || 'Factory'} onChange={e => setSettings({...settings, appIcon: e.target.value})} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-white font-black text-slate-700 focus:border-blue-500 outline-none">
                                    <option value="Factory">Fábrica</option>
                                    <option value="Warehouse">Armazém</option>
                                    <option value="Building">Escritório</option>
                                    <option value="Box">Logística</option>
                                </select>
                            </div>
                        </div>
                    </Section>

                    <Section title="Manutenção do Banco" icon={<Terminal size={24} className="text-red-600"/>}>
                         <div className="grid grid-cols-3 gap-4">
                            <button onClick={async () => { await syncDatabase(); alert('Banco sincronizado!'); }} className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl hover:bg-blue-100 transition-all gap-3 group">
                                <RefreshCw className="text-blue-600 group-hover:rotate-180 transition-transform duration-700" size={32}/>
                                <span className="font-black text-[9px] uppercase tracking-widest text-blue-900">Sincronizar</span>
                            </button>
                            <button onClick={onBackupData} className="flex flex-col items-center justify-center p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl hover:bg-emerald-100 transition-all gap-3 group">
                                <Download className="text-emerald-600 group-hover:translate-y-1 transition-transform" size={32}/>
                                <span className="font-black text-[9px] uppercase tracking-widest text-emerald-900">Backup SQL</span>
                            </button>
                            <a href="/api/download-project" download className="flex flex-col items-center justify-center p-6 bg-indigo-50 border-2 border-indigo-100 rounded-3xl hover:bg-indigo-100 transition-all gap-3 group text-center">
                                <Box className="text-indigo-600 group-hover:scale-110 transition-transform" size={32}/>
                                <span className="font-black text-[9px] uppercase tracking-widest text-indigo-900">Baixar Código Fonte</span>
                            </a>
                            <button onClick={() => { if(window.confirm('CUIDADO: Isso apagará TODOS os dados. Deseja prosseguir?')) onResetDatabase(''); }} className="flex flex-col items-center justify-center p-6 bg-red-50 border-2 border-red-100 rounded-3xl hover:bg-red-100 transition-all gap-3 group">
                                <AlertTriangle className="text-red-600 group-hover:scale-110 transition-transform" size={32}/>
                                <span className="font-black text-[9px] uppercase tracking-widest text-red-900">Reset Total</span>
                            </button>
                        </div>
                    </Section>
                </div>
            )}

            <div className="fixed bottom-10 right-10 z-50">
                <button onClick={handleSave} className="bg-blue-600 text-white px-12 py-6 rounded-3xl font-black text-xl shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-4 border-white">
                    <Save size={32}/> SALVAR TUDO
                </button>
            </div>

            {isEditModalOpen && userToEdit && (
                <EditAdminModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} userToEdit={userToEdit} onConfirmUpdate={onUpdateUser} generalSettings={generalSettings} />
            )}
             {isDeleteModalOpen && userToDelete && (
                <ConfirmDeleteUserModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} userToDelete={userToDelete} currentUser={currentUser} onConfirmDelete={(pass) => onDeleteUser(userToDelete.id, pass)} />
            )}
        </div>
    );
};

export default ConfiguracoesPage;
