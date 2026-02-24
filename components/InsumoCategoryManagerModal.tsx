
// components/InsumoCategoryManagerModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Edit, ListChecks } from 'lucide-react';
import CategoryAssignmentModal from './CategoryAssignmentModal';
import { StockItem } from '../types';

interface InsumoCategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCategories: string[];
    onSave: (newCategories: string[]) => void;
    allProducts?: StockItem[];
    onAssignProducts?: (category: string, productCodes: string[]) => Promise<void>;
}

const InsumoCategoryManagerModal: React.FC<InsumoCategoryManagerModalProps> = ({ isOpen, onClose, currentCategories, onSave, allProducts, onAssignProducts }) => {
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    
    // State for the item assignment sub-modal
    const [assignmentCategory, setAssignmentCategory] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCategories(currentCategories);
        }
    }, [isOpen, currentCategories]);

    if (!isOpen) return null;

    const handleAdd = () => {
        const trimmed = newCategory.trim();
        if (trimmed && !categories.includes(trimmed)) {
            setCategories([...categories, trimmed].sort());
            setNewCategory('');
        }
    };

    const handleRemove = (categoryToRemove: string) => {
        if(window.confirm(`Tem certeza que deseja remover a categoria "${categoryToRemove}"? Isso não apagará os produtos, apenas removerá o vínculo.`)) {
            setCategories(categories.filter(c => c !== categoryToRemove));
        }
    };
    
    const handleStartEdit = (category: string) => {
        setEditingCategory(category);
        setEditedName(category);
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditedName('');
    };

    const handleSaveEdit = () => {
        const trimmedName = editedName.trim();
        if (!trimmedName || !editingCategory) return;
        if (trimmedName !== editingCategory && categories.includes(trimmedName)) {
            alert('Esta categoria já existe.');
            return;
        }

        setCategories(categories.map(c => c === editingCategory ? trimmedName : c).sort());
        handleCancelEdit();
    };

    const handleSave = () => {
        onSave(categories);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Gerenciar Categorias</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Crie categorias e atribua produtos a elas</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-all"><X size={20} /></button>
                </div>
                
                <div className="space-y-6">
                    <div className="flex gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <input 
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleAdd()}
                            placeholder="Nome da nova categoria..."
                            className="flex-grow p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-all"
                        />
                        <button onClick={handleAdd} className="p-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
                            <Plus size={20}/>
                        </button>
                    </div>

                    <div className="border-2 border-slate-50 rounded-2xl max-h-[40vh] overflow-y-auto p-2 space-y-2 bg-slate-50">
                        {categories.length > 0 ? categories.map(cat => (
                            <div key={cat} className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-xl shadow-sm group">
                                {editingCategory === cat ? (
                                    <>
                                        <input 
                                            type="text"
                                            value={editedName}
                                            onChange={e => setEditedName(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleSaveEdit()}
                                            autoFocus
                                            className="flex-grow p-2 border-2 border-blue-400 rounded-lg text-sm bg-white outline-none font-bold"
                                        />
                                        <div className="flex ml-2">
                                            <button onClick={handleSaveEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"><Save size={18}/></button>
                                            <button onClick={handleCancelEdit} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-all"><X size={18}/></button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{cat}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onAssignProducts && allProducts && (
                                                <button 
                                                    onClick={() => setAssignmentCategory(cat)} 
                                                    title="Atribuir Produtos"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <ListChecks size={18}/>
                                                </button>
                                            )}
                                            <button onClick={() => handleStartEdit(cat)} title="Editar Nome" className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all"><Edit size={18}/></button>
                                            <button onClick={() => handleRemove(cat)} title="Remover" className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )) : (
                            <p className="text-center text-gray-400 p-8 font-bold italic text-sm">Nenhuma categoria cadastrada.</p>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-slate-50">
                    <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
                        <Save size={18}/> Salvar Alterações
                    </button>
                </div>
            </div>

            {assignmentCategory && allProducts && onAssignProducts && (
                <CategoryAssignmentModal 
                    isOpen={!!assignmentCategory}
                    onClose={() => setAssignmentCategory(null)}
                    categoryName={assignmentCategory}
                    allProducts={allProducts}
                    onSave={(productCodes) => onAssignProducts(assignmentCategory, productCodes)}
                />
            )}
        </div>
    );
};

export default InsumoCategoryManagerModal;
