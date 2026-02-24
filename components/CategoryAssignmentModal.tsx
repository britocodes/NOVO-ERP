
import React, { useState, useMemo } from 'react';
import { X, Search, Check, Save, Package, Filter } from 'lucide-react';
import { StockItem } from '../types';

interface CategoryAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryName: string;
    allProducts: StockItem[];
    onSave: (productCodes: string[]) => Promise<void>;
}

const CategoryAssignmentModal: React.FC<CategoryAssignmentModalProps> = ({ isOpen, onClose, categoryName, allProducts, onSave }) => {
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(
        new Set(allProducts.filter(p => p.category === categoryName).map(p => p.code))
    );
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const filtered = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return allProducts.filter(p => 
            p.name.toLowerCase().includes(lower) || 
            p.code.toLowerCase().includes(lower)
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [allProducts, searchTerm]);

    if (!isOpen) return null;

    const toggleProduct = (code: string) => {
        setSelectedCodes(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(Array.from(selectedCodes));
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <Filter className="text-blue-600" />
                            Produtos em: {categoryName}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marque os produtos que pertencem a esta categoria</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20} /></button>
                </div>

                <div className="relative mb-6">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar produto por nome ou SKU..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                <div className="flex-grow overflow-y-auto border-2 border-slate-50 rounded-2xl mb-6">
                    <div className="divide-y divide-slate-50">
                        {filtered.map(product => {
                            const isSelected = selectedCodes.has(product.code);
                            return (
                                <div 
                                    key={product.id} 
                                    onClick={() => toggleProduct(product.code)}
                                    className={`flex items-center justify-between p-4 cursor-pointer transition-all hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100' : 'border-slate-200'}`}>
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div>
                                            <p className={`font-black text-sm uppercase leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{product.name}</p>
                                            <p className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter">{product.code}</p>
                                        </div>
                                    </div>
                                    {product.category && product.category !== categoryName && (
                                        <span className="text-[8px] font-black uppercase px-2 py-1 bg-amber-100 text-amber-600 rounded-md">Atualmente em: {product.category}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-5 border-t border-slate-100">
                    <div className="text-sm">
                        <span className="font-black text-slate-800 uppercase tracking-tighter">{selectedCodes.size}</span>
                        <span className="text-gray-400 font-bold ml-1 uppercase text-[10px]">itens marcados</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-10 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isSaving ? 'Salvando...' : <><Save size={18}/> Salvar Seleção</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryAssignmentModal;
