
import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Scan } from 'lucide-react';
import { StockItem, StockItemKind, GeneralSettings } from '../types';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemType: StockItemKind;
    onConfirm: (item: Omit<StockItem, 'id'>, configureBom: boolean) => void;
    prefillData?: Partial<StockItem>;
    generalSettings: GeneralSettings;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, itemType, onConfirm, prefillData, generalSettings }) => {
    const initialState = {
        code: '',
        name: '',
        unit: 'un' as 'kg' | 'un' | 'm' | 'L',
        current_qty: 0,
        min_qty: 0,
        category: '',
        color: '',
        barcode: '',
    };

    const [newItem, setNewItem] = useState(initialState);
    const [configureBom, setConfigureBom] = useState(false);
    const isProduct = itemType === 'PRODUTO';
    const isProcessado = itemType === 'PROCESSADO';

    useEffect(() => {
        if (isOpen) {
            let stateToSet = { ...initialState };
            if (prefillData) {
                stateToSet = { ...stateToSet, ...prefillData };
            }
            if (itemType === 'PRODUTO') {
                stateToSet = { ...stateToSet, current_qty: 0, min_qty: 0, unit: 'un' };
            }
            if (itemType === 'PROCESSADO') {
                stateToSet = { ...stateToSet, unit: 'kg' };
            }
            if (itemType === 'INSUMO' && generalSettings.insumoCategoryList.length > 0) {
                stateToSet.category = generalSettings.insumoCategoryList[0];
            }
            setNewItem(stateToSet);
            setConfigureBom(false);
        }
    }, [isOpen, itemType, prefillData, generalSettings]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (newItem.code.trim() && newItem.name.trim()) {
            onConfirm(
                {
                    ...newItem,
                    kind: itemType,
                    color: isProduct ? newItem.color : undefined,
                    barcode: newItem.barcode || undefined
                },
                configureBom
            );
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (isProduct && (name === 'current_qty' || name === 'min_qty')) {
            return; // Do not update for products
        }
        const isNumberField = name === 'current_qty' || name === 'min_qty';
        setNewItem(prev => ({
            ...prev,
            [name]: isNumberField ? Number(value) : value,
        }));
    };
    
    const isFormValid = newItem.code.trim() !== '' && newItem.name.trim() !== '' && !isNaN(newItem.min_qty) && newItem.min_qty >= 0;
    const getTitle = () => {
        switch(itemType) {
            case 'INSUMO': return 'Cadastrar Novo Insumo';
            case 'PROCESSADO': return 'Cadastrar Novo Material Processado';
            case 'PRODUTO': return `Cadastrar Novo ${generalSettings.productTypeNames.papel_de_parede}`;
        }
    }
    const title = getTitle();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--modal-bg)] text-[var(--modal-text-primary)] rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <PlusCircle className="mr-2 text-blue-600" />
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-[var(--modal-text-secondary)] hover:text-[var(--modal-text-primary)]">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="code" className="text-sm font-medium text-[var(--modal-text-secondary)]">Código / SKU</label>
                            <input
                                id="code"
                                name="code"
                                type="text"
                                value={newItem.code}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-[var(--modal-surface-secondary)]"
                                placeholder={itemType === 'INSUMO' ? 'ex: COLA_BASE_KG' : 'ex: PPL-BRC-PREM'}
                            />
                        </div>
                        <div>
                            <label htmlFor="name" className="text-sm font-medium text-[var(--modal-text-secondary)]">Nome do Item</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={newItem.name}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-[var(--modal-surface-secondary)]"
                                placeholder={itemType === 'INSUMO' ? 'ex: Cola Base Adesiva' : 'ex: Papel de Parede Branco Premium'}
                            />
                        </div>
                    </div>
                     {isProduct && (
                        <div>
                            <label htmlFor="color" className="text-sm font-medium text-[var(--modal-text-secondary)]">Cor Principal</label>
                            <input
                                id="color"
                                name="color"
                                type="text"
                                value={newItem.color}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-[var(--modal-surface-secondary)]"
                                placeholder="ex: BRANCO"
                            />
                        </div>
                    )}
                    {itemType === 'INSUMO' && (
                        <div>
                             <label htmlFor="category" className="text-sm font-medium text-[var(--modal-text-secondary)]">Categoria</label>
                            <select
                                id="category"
                                name="category"
                                value={newItem.category}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-[var(--modal-bg)]"
                            >
                                {generalSettings.insumoCategoryList.length === 0 ? (
                                    <option value="" disabled>Nenhuma categoria criada</option>
                                ) : (
                                    <>
                                        <option value="" disabled>Selecione uma categoria...</option>
                                        {generalSettings.insumoCategoryList.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="unit" className="text-sm font-medium text-[var(--modal-text-secondary)]">Unidade</label>
                            <select
                                id="unit"
                                name="unit"
                                value={newItem.unit}
                                onChange={handleInputChange}
                                disabled={isProduct || isProcessado}
                                className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-[var(--modal-bg)] disabled:bg-gray-100"
                            >
                                <option value="un">un</option>
                                <option value="kg">kg</option>
                                <option value="m">m</option>
                                <option value="L">L</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="current_qty" className="text-sm font-medium text-[var(--modal-text-secondary)]">Saldo Inicial (Opcional)</label>
                                <input
                                    id="current_qty"
                                    name="current_qty"
                                    type="number"
                                    value={newItem.current_qty}
                                    onChange={handleInputChange}
                                    disabled={isProduct}
                                    className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 bg-[var(--modal-surface-secondary)]"
                                    placeholder="Padrão 0"
                                />
                            </div>
                            <div>
                                <label htmlFor="min_qty" className="text-sm font-medium text-[var(--modal-text-secondary)]">Estoque Mínimo</label>
                                <input
                                    id="min_qty"
                                    name="min_qty"
                                    type="number"
                                    min="0"
                                    value={newItem.min_qty}
                                    onChange={handleInputChange}
                                    disabled={isProduct}
                                    required
                                    className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 bg-[var(--modal-surface-secondary)]"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Barcode Field */}
                    <div>
                        <label htmlFor="barcode" className="text-sm font-medium text-[var(--modal-text-secondary)]">Código de Barras (EAN/GTIN)</label>
                        <div className="relative mt-1">
                            <Scan size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="barcode"
                                name="barcode"
                                type="text"
                                value={newItem.barcode}
                                onChange={(e) => setNewItem(prev => ({...prev, barcode: e.target.value.toUpperCase()}))}
                                className="block w-full pl-9 p-2 border border-[var(--modal-border)] bg-[var(--modal-surface-secondary)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                placeholder="Escaneie ou digite..."
                            />
                        </div>
                    </div>

                     {(isProduct || isProcessado) && (
                        <div>
                            <label className="flex items-center select-none cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={configureBom}
                                    onChange={(e) => setConfigureBom(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-[var(--modal-text-secondary)]">Configurar Produto Combinado (Receita) após salvar</span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!isFormValid}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        Salvar Item
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddItemModal;
