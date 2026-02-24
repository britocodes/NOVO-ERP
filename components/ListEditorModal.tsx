// components/ListEditorModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';

interface ListEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: string[];
    onSave: (newItems: string[]) => void;
}

const ListEditorModal: React.FC<ListEditorModalProps> = ({ isOpen, onClose, title, items, onSave }) => {
    const [editedItems, setEditedItems] = useState<string[]>([]);
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        if (isOpen) {
            setEditedItems(items);
        }
    }, [isOpen, items]);

    if (!isOpen) return null;

    const handleAdd = () => {
        const trimmed = newItem.trim();
        if (trimmed && !editedItems.includes(trimmed)) {
            setEditedItems([...editedItems, trimmed]);
            setNewItem('');
        }
    };

    const handleRemove = (itemToRemove: string) => {
        setEditedItems(editedItems.filter(item => item !== itemToRemove));
    };
    
    const handleSave = () => {
        onSave(editedItems);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={newItem}
                            onChange={e => setNewItem(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleAdd()}
                            placeholder="Novo item..."
                            className="flex-grow p-2 border border-gray-300 rounded-md"
                        />
                        <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold flex items-center gap-2">
                            <Plus size={16}/> Adicionar
                        </button>
                    </div>

                    <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-2 bg-gray-50">
                        {editedItems.length > 0 ? editedItems.map((item, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-2 border rounded-md">
                                <span className="font-medium text-gray-700">{item}</span>
                                <button onClick={() => handleRemove(item)} className="p-1 text-red-500 hover:text-red-700">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 p-4">Nenhum item na lista.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 flex items-center gap-2">
                        <Save size={16}/> Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ListEditorModal;