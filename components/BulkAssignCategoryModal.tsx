
import React, { useState } from 'react';
import { X, Layers, Save, CheckCircle2 } from 'lucide-react';

interface BulkAssignCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (category: string) => Promise<void>;
    categories: string[];
    selectedCount: number;
}

const BulkAssignCategoryModal: React.FC<BulkAssignCategoryModalProps> = ({ isOpen, onClose, onConfirm, categories, selectedCount }) => {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!selectedCategory) return;
        setIsSaving(true);
        await onConfirm(selectedCategory);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <Layers className="text-blue-600" />
                            Atribuir Categoria
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alterando {selectedCount} itens selecionados</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <label className="text-[10px] font-black text-blue-800 uppercase block mb-2 tracking-widest">Selecione a Nova Categoria</label>
                        <select 
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full p-3 border-2 border-white rounded-xl focus:border-blue-500 bg-white font-black text-sm text-slate-700 outline-none shadow-sm"
                        >
                            <option value="">-- Escolher Categoria --</option>
                            <option value="Sem Categoria">Remover Categoria (Limpar)</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!selectedCategory || isSaving}
                        className="flex-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {isSaving ? 'Salvando...' : <><CheckCircle2 size={18}/> Aplicar Categoria</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkAssignCategoryModal;
