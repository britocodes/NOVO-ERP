
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Search, Edit } from 'lucide-react';
import { StockItem, ProdutoCombinado } from '../types';

interface BomConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: StockItem;
    insumos: StockItem[]; // List of all available raw materials
    currentBom: ProdutoCombinado | undefined;
    onSave: (productSku: string, items: ProdutoCombinado['items']) => void;
}

const BomConfigModal: React.FC<BomConfigModalProps> = ({ isOpen, onClose, product, insumos, currentBom, onSave }) => {
    const [editedItems, setEditedItems] = useState<ProdutoCombinado['items']>([]);
    
    // State for multi-adding items
    const [addSearch, setAddSearch] = useState('');
    const [itemsToAdd, setItemsToAdd] = useState<Set<string>>(new Set());
    
    // State for editing a substitute
    const [editingSubstitute, setEditingSubstitute] = useState<{ itemCode: string, search: string } | null>(null);
    

    useEffect(() => {
        setEditedItems(currentBom?.items || []);
        setAddSearch('');
        setItemsToAdd(new Set());
        setEditingSubstitute(null);
    }, [currentBom, isOpen]);

    const handleAddItem = (itemToAdd: ProdutoCombinado['items'][0]) => {
        setEditedItems(prev => [...prev, itemToAdd]);
    };

    const handleAddSelectedItems = () => {
        const newItems = Array.from(itemsToAdd).map(code => {
            const insumo = insumos.find(i => i.code === code);
            const isProcessado = insumo?.kind === 'PROCESSADO';
            return { stockItemCode: code, qty_per_pack: 0.1, fromWeighing: isProcessado };
        });
        setEditedItems(prev => [...prev, ...newItems]);
        setItemsToAdd(new Set());
        setAddSearch('');
    };

    const handleRemoveItem = (stockItemCode: string) => {
        setEditedItems(prev => prev.filter(item => item.stockItemCode !== stockItemCode));
    };

    const handleQtyChange = (stockItemCode: string, newQty: number) => {
        if (newQty < 0) return;
        setEditedItems(prev => prev.map(item =>
            item.stockItemCode === stockItemCode ? { ...item, qty_per_pack: newQty } : item
        ));
    };
    
    const handleSubstituteChange = (originalCode: string, substituteCode: string | undefined) => {
        setEditedItems(prev => prev.map(item =>
            item.stockItemCode === originalCode ? { ...item, substituteCode } : item
        ));
        setEditingSubstitute(null);
    };

    const handleSetPrimary = (stockItemCode: string) => {
        setEditedItems(prev => prev.map(item => ({
            ...item,
            fromWeighing: item.stockItemCode === stockItemCode
        })));
    };
    
    const handleSave = () => {
        onSave(product.code, editedItems);
    };
    
    const availableInsumosForAdding = useMemo(() => {
        const lowerSearch = addSearch.toLowerCase();
        return insumos.filter(insumo => 
            !editedItems.some(item => item.stockItemCode === insumo.code) &&
            (insumo.name.toLowerCase().includes(lowerSearch) || insumo.code.toLowerCase().includes(lowerSearch))
        );
    }, [insumos, editedItems, addSearch]);

    const handleToggleItemToAdd = (code: string) => {
        setItemsToAdd(prev => {
            const newSet = new Set(prev);
            if (newSet.has(code)) newSet.delete(code);
            else newSet.add(code);
            return newSet;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Configurar Receita (BOM)</h2>
                        <p className="text-sm text-gray-500">{product.name} ({product.code})</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2">
                    {/* Left Side: Current BOM Items */}
                    <div className="space-y-3">
                        <h3 className="text-md font-semibold text-gray-700">Insumos na Receita</h3>
                        {editedItems.length > 0 ? (
                            editedItems.map(item => {
                                const insumoDetails = insumos.find(i => i.code === item.stockItemCode);
                                const substituteDetails = item.substituteCode ? insumos.find(i => i.code === item.substituteCode) : null;
                                const isEditingThisSub = editingSubstitute?.itemCode === item.stockItemCode;
                                
                                const availableSubstitutes = isEditingThisSub ? insumos.filter(i => 
                                    i.code !== item.stockItemCode &&
                                    i.kind === insumoDetails?.kind &&
                                    (i.name.toLowerCase().includes(editingSubstitute.search.toLowerCase()) || i.code.toLowerCase().includes(editingSubstitute.search.toLowerCase()))
                                ) : [];

                                return (
                                <div key={item.stockItemCode} className="bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0"><p className="font-medium text-gray-800 truncate" title={insumoDetails?.name}>{insumoDetails?.name || item.stockItemCode}</p><p className="text-xs text-gray-500">{item.stockItemCode}</p></div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="0.01" value={item.qty_per_pack} onChange={(e) => handleQtyChange(item.stockItemCode, parseFloat(e.target.value))} className="w-24 text-right border-gray-300 rounded-md"/>
                                            <span className="text-sm text-gray-500 w-8">{insumoDetails?.unit}</span>
                                            <button onClick={() => handleRemoveItem(item.stockItemCode)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t space-y-2">
                                        {product.kind === 'PRODUTO' && (
                                            <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                                                <input type="radio" name={`primary-insumo-radio`} checked={!!item.fromWeighing} onChange={() => handleSetPrimary(item.stockItemCode)} className="h-4 w-4 text-blue-600"/>
                                                <span className="ml-2">Insumo Primário (consumir do estoque pesado)</span>
                                            </label>
                                        )}
                                        <div className="relative">
                                            {isEditingThisSub ? (
                                                <div className="bg-white p-2 border rounded-md">
                                                    <input type="text" value={editingSubstitute.search} onChange={e => setEditingSubstitute(p => p ? {...p, search: e.target.value} : null)} placeholder="Buscar substituto..." autoFocus className="w-full p-1 border rounded mb-1 text-xs"/>
                                                    <div className="max-h-24 overflow-y-auto">
                                                        {availableSubstitutes.map(sub => <div key={sub.id} onClick={()=>handleSubstituteChange(item.stockItemCode, sub.code)} className="p-1 text-xs hover:bg-gray-100 cursor-pointer">{sub.name}</div>)}
                                                    </div>
                                                     <button onClick={()=>handleSubstituteChange(item.stockItemCode, undefined)} className="text-xs text-red-600 mt-1">Remover Substituto</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="text-gray-600">Substituto: <span className="font-semibold">{substituteDetails?.name || 'Nenhum'}</span></div>
                                                    <button onClick={()=>setEditingSubstitute({itemCode: item.stockItemCode, search: ''})} className="text-blue-600 hover:underline flex items-center gap-1"><Edit size={12}/> {substituteDetails ? 'Alterar' : 'Adicionar'}</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )})
                        ) : <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">Nenhum insumo adicionado.</p>}
                    </div>

                    {/* Right Side: Add new items */}
                    <div className="space-y-3">
                        <h3 className="text-md font-semibold text-gray-700">Selecionar Itens para Adicionar</h3>
                         <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                            <input type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Buscar por nome ou código..." className="w-full pl-9 pr-3 py-2 text-sm border-gray-300 rounded-md"/>
                        </div>
                        <div className="border rounded-md max-h-[40vh] overflow-y-auto">
                             {availableInsumosForAdding.map(insumo => (
                                <label key={insumo.id} className="flex items-center p-2 border-b cursor-pointer hover:bg-gray-50">
                                    <input type="checkbox" checked={itemsToAdd.has(insumo.code)} onChange={() => handleToggleItemToAdd(insumo.code)} className="h-4 w-4 text-blue-600 rounded mr-3"/>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800">{insumo.name}</p>
                                        <p className="text-xs text-gray-500">{insumo.code} | Estoque: {insumo.current_qty.toFixed(2)} {insumo.unit}</p>
                                    </div>
                                </label>
                             ))}
                        </div>
                        {itemsToAdd.size > 0 && (
                            <button onClick={handleAddSelectedItems} className="w-full px-3 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 flex items-center justify-center gap-2">
                                <Plus size={16}/> Adicionar {itemsToAdd.size} Itens Selecionados
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Salvar Receita</button>
                </div>
            </div>
        </div>
    );
};

export default BomConfigModal;
