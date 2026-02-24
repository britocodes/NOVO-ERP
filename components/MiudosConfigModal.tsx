// components/MiudosConfigModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { X, Save, Search, Plus, Trash2 } from 'lucide-react';
import { StockItem, GeneralSettings } from '../types';

interface MiudosConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockItems: StockItem[];
    generalSettings: GeneralSettings;
    onSave: (newConfig: NonNullable<GeneralSettings['miudosCategories']>, newCategoryList: string[]) => void;
}

const MiudosConfigModal: React.FC<MiudosConfigModalProps> = ({ isOpen, onClose, stockItems, generalSettings, onSave }) => {
    const [config, setConfig] = useState<NonNullable<GeneralSettings['miudosCategories']>>({});
    const [categoryList, setCategoryList] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            setConfig(generalSettings.miudosCategories || {});
            setCategoryList(generalSettings.miudosCategoryList || []);
        }
    }, [isOpen, generalSettings]);

    const handleConfigChange = (productCode: string, category: string) => {
        setConfig(prev => ({
            ...prev,
            [productCode]: category,
        }));
    };
    
    const handleAddCategory = () => {
        const trimmedCategory = newCategory.trim();
        if (trimmedCategory && !categoryList.includes(trimmedCategory)) {
            setCategoryList(prev => [...prev, trimmedCategory].sort());
            setNewCategory('');
        }
    };

    const handleRemoveCategory = (categoryToRemove: string) => {
        setCategoryList(prev => prev.filter(c => c !== categoryToRemove));
        // Also remove this category from any products that are using it
        const newConfig = { ...config };
        Object.keys(newConfig).forEach(key => {
            if (newConfig[key] === categoryToRemove) {
                newConfig[key] = ''; // or delete newConfig[key];
            }
        });
        setConfig(newConfig);
    };


    const handleSave = () => {
        onSave(config, categoryList);
        onClose();
    };

    const miudosProducts = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return stockItems.filter(item => 
            item.product_type === 'miudos' && 
            (item.name.toLowerCase().includes(searchLower) || item.code.toLowerCase().includes(searchLower))
        );
    }, [stockItems, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Categorizar {generalSettings.productTypeNames.miudos}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">Gerenciar Categorias</h3>
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                            type="text" 
                            value={newCategory} 
                            onChange={e => setNewCategory(e.target.value)} 
                            placeholder="Nova categoria (ex: Espátula)"
                            className="flex-grow p-1 border border-gray-300 rounded-md text-sm"
                        />
                        <button onClick={handleAddCategory} className="flex-shrink-0 px-3 py-1 bg-green-500 text-white rounded-md text-sm font-semibold flex items-center gap-1"><Plus size={14}/> Adicionar</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categoryList.map(cat => (
                            <div key={cat} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                                {cat}
                                <button onClick={() => handleRemoveCategory(cat)} className="text-blue-600 hover:text-blue-800"><Trash2 size={12}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar produto por nome ou SKU..."
                        className="w-full pl-9 pr-3 py-2 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex-grow overflow-y-auto pr-2 border-t border-b py-2">
                    <div className="space-y-3">
                        {miudosProducts.map(product => (
                            <div key={product.id} className="p-3 bg-gray-50 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div className="mb-2 sm:mb-0">
                                    <p className="font-semibold text-gray-800">{product.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{product.code}</p>
                                </div>
                                <div>
                                    <label htmlFor={`category-${product.code}`} className="sr-only">Categoria</label>
                                    <select
                                        id={`category-${product.code}`}
                                        value={config[product.code] || ''}
                                        onChange={e => handleConfigChange(product.code, e.target.value)}
                                        className="p-1 border border-gray-300 rounded-md text-sm bg-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {categoryList.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                         {miudosProducts.length === 0 && (
                            <p className="text-center text-gray-500 py-4">Nenhum produto do tipo "{generalSettings.productTypeNames.miudos}" encontrado.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                        <Save size={16} /> Salvar Categorias
                    </button>
                </div>
            </div>
        </div>
    );
};
export default MiudosConfigModal;