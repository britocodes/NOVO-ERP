import React, { useState, useMemo, useEffect } from 'react';
import { X, Save, Search } from 'lucide-react';
import { StockItem, GeneralSettings, ProductBaseConfig } from '../types';

type BaseType = 'branca' | 'preta' | 'especial';

interface BaseColorConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: StockItem[]; // All 'PRODUTO' kind items
    currentConfig: NonNullable<GeneralSettings['baseColorConfig']>;
    onSave: (newConfig: NonNullable<GeneralSettings['baseColorConfig']>) => void;
}

const BaseColorConfigModal: React.FC<BaseColorConfigModalProps> = ({ isOpen, onClose, products, currentConfig, onSave }) => {
    const [config, setConfig] = useState(currentConfig);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            setConfig(currentConfig);
        }
    }, [isOpen, currentConfig]);

    const handleConfigChange = (productCode: string, base: BaseType) => {
        setConfig(prev => {
            const newConfig = { ...prev };
            const existingProductConfig = newConfig[productCode] || { type: 'branca' };
            existingProductConfig.type = base;
            if (base !== 'especial') {
                delete existingProductConfig.specialBaseSku;
            }
            newConfig[productCode] = existingProductConfig;
            return newConfig;
        });
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    const filteredProducts = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.code.toLowerCase().includes(searchLower)
        );
    }, [products, searchTerm]);

    if (!isOpen) return null;

    const RadioOption: React.FC<{ value: BaseType, label: string, productCode: string }> = ({ value, label, productCode }) => {
        const currentSelection = config[productCode]?.type || 'branca';
        return (
            <label className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="radio"
                    name={`base-config-${productCode}`}
                    value={value}
                    checked={currentSelection === value}
                    onChange={() => handleConfigChange(productCode, value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm">{label}</span>
            </label>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Configurar Cores de Base dos Produtos</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
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
                        {filteredProducts.map(product => (
                            <div key={product.id} className="p-3 bg-gray-50 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div className="mb-2 sm:mb-0">
                                    <p className="font-semibold text-gray-800">{product.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{product.code}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <RadioOption value="branca" label="Branca" productCode={product.code} />
                                    <RadioOption value="preta" label="Preta" productCode={product.code} />
                                    <RadioOption value="especial" label="Especial" productCode={product.code} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                        <Save size={16} /> Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};
export default BaseColorConfigModal;