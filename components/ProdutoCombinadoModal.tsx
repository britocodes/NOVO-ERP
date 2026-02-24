

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { StockItem, ProdutoCombinado } from '../types';

interface ProdutoCombinadoModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: StockItem;
    insumos: StockItem[]; // List of all available raw materials
    currentBom: ProdutoCombinado | undefined;
    onSave: (productSku: string, items: ProdutoCombinado['items']) => void;
}

const ProdutoCombinadoModal: React.FC<ProdutoCombinadoModalProps> = ({ isOpen, onClose, product, insumos, currentBom, onSave }) => {
    const [editedItems, setEditedItems] = useState<ProdutoCombinado['items']>([]);
    
    // State for adding a new item
    const [insumoSearch, setInsumoSearch] = useState('');
    const [selectedInsumo, setSelectedInsumo] = useState<StockItem | null>(null);
    const [newInsumoQty, setNewInsumoQty] = useState<number>(0.1);

    useEffect(() => {
        setEditedItems(currentBom?.items || []);
        setInsumoSearch('');
        setSelectedInsumo(null);
        setNewInsumoQty(0.1);
    }, [currentBom, isOpen]);

    const handleAddItem = () => {
        if (!selectedInsumo || newInsumoQty <= 0) return;
        
        const isProcessado = selectedInsumo.kind === 'PROCESSADO';
        
        setEditedItems(prev => [...prev, { 
            stockItemCode: selectedInsumo.code, 
            qty_per_pack: newInsumoQty, 
            fromWeighing: isProcessado 
        }]);

        setSelectedInsumo(null);
        setNewInsumoQty(0.1);
        setInsumoSearch('');
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

    const handleSetPrimary = (stockItemCode: string) => {
        setEditedItems(prev => prev.map(item => ({
            ...item,
            fromWeighing: item.stockItemCode === stockItemCode
        })));
    };
    
    const handleSave = () => {
        onSave(product.code, editedItems);
    };
    
    const availableInsumos = useMemo(() => insumos.filter(insumo => 
        !editedItems.some(item => item.stockItemCode === insumo.code)
    ), [insumos, editedItems]);

    const filteredAvailableInsumos = useMemo(() => {
        if (!insumoSearch) return [];
        return availableInsumos.filter(insumo =>
            insumo.name.toLowerCase().includes(insumoSearch.toLowerCase()) ||
            insumo.code.toLowerCase().includes(insumoSearch.toLowerCase())
        );
    }, [insumoSearch, availableInsumos]);

    const handleSelectInsumo = (insumo: StockItem) => {
        setSelectedInsumo(insumo);
        setInsumoSearch(''); 
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Configurar Produto Combinado (Receita)</h2>
                        <p className="text-sm text-gray-500">{product.name} ({product.code})</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">Insumos na Receita</h3>
                    {editedItems.length > 0 ? (
                        <div className="space-y-3">
                            {editedItems.map(item => {
                                const insumoDetails = insumos.find(i => i.code === item.stockItemCode);
                                return (
                                <div key={item.stockItemCode} className="bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{insumoDetails?.name || item.stockItemCode}</p>
                                            <p className="text-xs text-gray-500">{item.stockItemCode}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="0.01" value={item.qty_per_pack} onChange={(e) => handleQtyChange(item.stockItemCode, parseFloat(e.target.value))} className="w-24 text-right border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
                                            <span className="text-sm text-gray-500 w-8">{insumoDetails?.unit}</span>
                                            <button onClick={() => handleRemoveItem(item.stockItemCode)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        {product.kind === 'PRODUTO' && (
                                            <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`primary-insumo-radio`}
                                                    checked={!!item.fromWeighing}
                                                    onChange={() => handleSetPrimary(item.stockItemCode)}
                                                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="ml-2">Insumo Primário (consumir do estoque pesado)</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">Nenhum insumo adicionado.</p>}

                    <div className="mt-6 pt-4 border-t">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Adicionar Novo Insumo</h3>
                        {!selectedInsumo ? (
                             <div className="relative">
                                <label htmlFor="insumo-search" className="text-xs font-medium text-gray-600">Buscar Insumo</label>
                                <input id="insumo-search" type="text" value={insumoSearch} onChange={e => setInsumoSearch(e.target.value)} placeholder="Digite para buscar por nome ou código..." className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
                                {insumoSearch && (
                                    <div className="absolute z-10 w-full border bg-white rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                        {filteredAvailableInsumos.length > 0 ? filteredAvailableInsumos.map(insumo => (
                                            <div key={insumo.id} onClick={() => handleSelectInsumo(insumo)} className="p-2 hover:bg-blue-50 cursor-pointer border-b">
                                                <p className="font-semibold text-sm text-gray-800">{insumo.name}</p>
                                                <p className="text-xs text-gray-500">{insumo.code} - <span className="font-bold text-blue-600">Estoque: {insumo.current_qty.toFixed(2)} {insumo.unit}</span></p>
                                            </div>
                                        )) : <p className="p-2 text-sm text-gray-500">Nenhum insumo encontrado.</p>}
                                    </div>
                                )}
                            </div>
                        ) : (
                             <div className="flex items-end flex-wrap gap-2 p-2 bg-blue-50 rounded-lg">
                                <div className="flex-grow">
                                    <label className="text-xs font-medium text-gray-600">Insumo Selecionado</label>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="font-semibold text-gray-800">{selectedInsumo.name}</p>
                                        <button onClick={() => setSelectedInsumo(null)} className="text-xs text-red-600 hover:underline">Alterar</button>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <label htmlFor="insumo-qty" className="text-xs font-medium text-gray-600">Quantidade ({selectedInsumo.unit})</label>
                                    <input id="insumo-qty" type="number" step="0.01" min="0.01" value={newInsumoQty} onChange={e => setNewInsumoQty(parseFloat(e.target.value))} className="block w-24 mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
                                </div>
                                <button onClick={handleAddItem} disabled={newInsumoQty <= 0} className="px-3 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"><Plus size={16} className="mr-1"/> Adicionar</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">Salvar Receita</button>
                </div>
            </div>
        </div>
    );
};

export default ProdutoCombinadoModal;
