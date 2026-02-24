
import React, { useState, useEffect } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { StockItem, GeneralSettings } from '../types';

interface AjusteEstoqueModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: StockItem;
    suggestedQty: number;
    weeklyConsumption: number;
    onConfirm: (itemCode: string, quantity: number) => void;
    generalSettings: GeneralSettings;
}

const AjusteEstoqueModal: React.FC<AjusteEstoqueModalProps> = ({ isOpen, onClose, item, suggestedQty, weeklyConsumption, onConfirm, generalSettings }) => {
    const [quantity, setQuantity] = useState(suggestedQty);

    useEffect(() => {
        setQuantity(suggestedQty);
    }, [suggestedQty, isOpen]);
    
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!isNaN(quantity) && quantity > 0) {
            onConfirm(item.code, quantity);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <PlusCircle className="mr-2 text-blue-600" />
                        Ajustar Estoque (Entrada)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-500">Insumo</label>
                        <p className="text-md font-semibold text-gray-900 bg-gray-100 p-2 rounded">{item.name} ({item.code})</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm space-y-2">
                        <h4 className="font-semibold text-blue-800">Detalhes da Sugestão</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Consumo nos últimos {generalSettings.estoque.stockProjectionDays} dias:</span>
                            <span className="font-bold text-gray-800">{weeklyConsumption.toFixed(2)} {item.unit}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Estoque Mínimo de Segurança:</span>
                            <span className="font-bold text-gray-800">{item.min_qty.toFixed(2)} {item.unit}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Estoque Atual:</span>
                            <span className="font-bold text-red-600">{item.current_qty.toFixed(2)} {item.unit}</span>
                        </div>
                         <p className="text-xs text-center text-gray-500 pt-2 border-t mt-2">
                            Fórmula: (Consumo × {generalSettings.estoque.purchaseSuggestionMultiplier}) + Mínimo - Atual
                        </p>
                    </div>

                     <div>
                        <label htmlFor="quantity-input" className="text-sm font-medium text-gray-700">
                           Quantidade a Adicionar ({item.unit})
                        </label>
                        <input
                            id="quantity-input"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        />
                         <p className="text-xs text-gray-500 mt-1">Valor sugerido para cobrir {generalSettings.estoque.purchaseSuggestionMultiplier * generalSettings.estoque.stockProjectionDays} dias de consumo mais o estoque de segurança.</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isNaN(quantity) || quantity <= 0}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Entrada
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AjusteEstoqueModal;