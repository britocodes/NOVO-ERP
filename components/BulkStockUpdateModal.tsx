
import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, Save, Package, Trash2, ArrowDownCircle, Filter, Factory, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { StockItem } from '../types';

interface BulkStockUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockItems: StockItem[];
    onConfirm: (updates: { code: string; quantity: number; ref: string }[], operationType: 'manual' | 'bom') => Promise<void>;
    preselectedCodes?: string[];
    title?: string;
    activeTab: 'produtos' | 'processados' | 'insumos';
    categories: string[];
}

const BulkStockUpdateModal: React.FC<BulkStockUpdateModalProps> = ({ isOpen, onClose, stockItems, onConfirm, preselectedCodes, title, activeTab, categories }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [operationType, setOperationType] = useState<'manual' | 'bom'>('manual');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [reference, setReference] = useState('');

    // Filtra os itens com base na categoria selecionada
    const itemsToShow = useMemo(() => {
        let items = stockItems.filter(i => {
            if (activeTab === 'insumos') return i.kind === 'INSUMO';
            if (activeTab === 'processados') return i.kind === 'PROCESSADO';
            return i.kind === 'PRODUTO';
        });

        if (selectedCategory !== 'ALL') {
            items = items.filter(i => (i.category || 'Sem Categoria') === selectedCategory);
        }

        // Se houver códigos pré-selecionados (ex: via grupo de pacotes), filtramos apenas eles
        if (preselectedCodes && preselectedCodes.length > 0) {
            items = items.filter(i => preselectedCodes.includes(i.code));
        }

        return items.sort((a, b) => a.name.localeCompare(b.name));
    }, [stockItems, activeTab, selectedCategory, preselectedCodes]);

    useEffect(() => {
        if (isOpen) {
            setQuantities({});
            setReference(operationType === 'bom' ? 'Produção Diária' : 'Entrada de Mercadoria');
            if (preselectedCodes && preselectedCodes.length > 0) {
                setSelectedCategory('ALL');
            }
        }
    }, [isOpen, operationType, preselectedCodes]);

    const updateQty = (code: string, qty: number) => {
        setQuantities(prev => ({ ...prev, [code]: qty }));
    };

    const handleSave = async () => {
        const updates = (Object.entries(quantities) as [string, number][])
            .filter(([_, qty]) => qty > 0)
            .map(([code, qty]) => ({ 
                code, 
                quantity: qty, 
                ref: reference || (operationType === 'bom' ? 'Produção Interna' : 'Ajuste de Saldo') 
            }));
        
        if (updates.length > 0) {
            await onConfirm(updates, operationType);
        }
        onClose();
    };

    if (!isOpen) return null;

    const itemsWithQty = (Object.values(quantities) as number[]).filter(v => v > 0).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <ArrowDownCircle className="text-emerald-600" />
                            {title || 'Atualização de Estoque'}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lançamento em massa para {activeTab}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">1. Escolher Categoria</label>
                            <div className="relative">
                                <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                                <select 
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="w-full pl-10 p-3 border-2 border-slate-100 rounded-xl focus:border-blue-500 bg-white font-black text-sm text-slate-700"
                                >
                                    <option value="ALL">Exibir Todas</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Referência no Histórico</label>
                            <input 
                                type="text" 
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                                placeholder="Ex: Produção Interna, Fornecedor X..."
                                className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-bold bg-white focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl space-y-4">
                        <label className="text-[10px] font-black text-blue-800 uppercase block tracking-widest">2. Como deseja atualizar?</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setOperationType('manual')}
                                className={`flex flex-col items-center justify-center gap-2 p-4 text-[10px] font-black rounded-2xl border-2 transition-all ${operationType === 'manual' ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-100' : 'bg-white text-blue-600 border-blue-100'}`}
                            >
                                <ShieldCheck size={20}/> AJUSTE MANUAL
                            </button>
                            <button 
                                onClick={() => setOperationType('bom')}
                                className={`flex flex-col items-center justify-center gap-2 p-4 text-[10px] font-black rounded-2xl border-2 transition-all ${operationType === 'bom' ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-100' : 'bg-white text-orange-500 border-orange-100'}`}
                            >
                                <Factory size={20}/> PRODUÇÃO (BOM)
                            </button>
                        </div>
                        <p className="text-[9px] font-bold text-blue-600 leading-tight bg-white/50 p-2 rounded-xl border border-blue-100">
                            {operationType === 'manual' 
                                ? "O ajuste manual apenas aumenta o saldo dos itens. Use para inventário." 
                                : "A produção via BOM aumenta o saldo e AUTOMATICAMENTE consome os insumos da receita no histórico."}
                        </p>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto border-2 border-slate-50 rounded-3xl">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-900 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-white uppercase tracking-widest">Item / SKU</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-white uppercase tracking-widest">Saldo Atual</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-white uppercase tracking-widest">Qtd. Entrada</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-white uppercase tracking-widest">UND</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {itemsToShow.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{item.name}</p>
                                        <p className="text-[9px] font-mono font-bold text-slate-400 tracking-tighter">{item.code}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600">
                                            {item.current_qty.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input 
                                            type="number" 
                                            value={quantities[item.code] || ''}
                                            onChange={e => updateQty(item.code, Number(e.target.value))}
                                            placeholder="0"
                                            className={`w-32 p-3 text-center border-2 rounded-2xl font-black text-sm transition-all focus:ring-4 focus:ring-opacity-20 ${quantities[item.code] > 0 ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-100' : 'border-slate-100 bg-slate-50'}`}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-[10px] font-black text-slate-300 uppercase">{item.unit}</span>
                                    </td>
                                </tr>
                            ))}
                            {itemsToShow.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                            <Package size={64} />
                                            <p className="font-black uppercase tracking-tighter text-xl">Nenhum item encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-between items-center pt-5 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-600 border shadow-sm">
                            {itemsWithQty}
                        </div>
                        <div className="text-left">
                            <p className="font-black text-slate-800 uppercase tracking-tighter text-sm">Itens Prontos</p>
                            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Para lançamento em lote</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                        <button 
                            onClick={handleSave}
                            disabled={itemsWithQty === 0}
                            className={`px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${operationType === 'bom' ? 'bg-orange-500 text-white shadow-orange-100 hover:bg-orange-600' : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700'}`}
                        >
                            <CheckCircle2 size={18}/>
                            Finalizar Lançamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkStockUpdateModal;
