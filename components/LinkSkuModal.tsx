
// components/LinkSkuModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { X, Link as LinkIcon, Search, PlusCircle } from 'lucide-react';
import { StockItem } from '../types';

interface LinkSkuModalProps {
    isOpen: boolean;
    onClose: () => void;
    skusToLink: string[];
    colorSugerida: string;
    onConfirmLink: (masterSku: string) => void;
    products: StockItem[]; // The list of master products
    onTriggerCreate: () => void; // New prop to trigger the parent's create modal
}

const LinkSkuModal: React.FC<LinkSkuModalProps> = ({ isOpen, onClose, skusToLink, colorSugerida, onConfirmLink, products, onTriggerCreate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMasterSku, setSelectedMasterSku] = useState<string>('');
    
    useEffect(() => {
        if (isOpen) {
            setSelectedMasterSku('');
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) {
            return products;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowerSearchTerm) || 
            p.code.toLowerCase().includes(lowerSearchTerm)
        );
    }, [searchTerm, products]);

    if (!isOpen || skusToLink.length === 0) return null;

    const handleConfirm = () => {
        if (selectedMasterSku) {
            onConfirmLink(selectedMasterSku);
        }
    };
    
    const skuDisplay = skusToLink.length > 1 ? `${skusToLink.length} SKUs selecionados` : skusToLink[0];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg m-4 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <LinkIcon className="mr-2 text-blue-600" />
                        Vincular SKU ao Catálogo
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div>
                        <label className="text-sm font-medium text-gray-500">SKU(s) Importado(s)</label>
                        <p className="text-md font-semibold text-gray-900 bg-gray-100 p-2 rounded truncate">{skuDisplay}</p>
                    </div>
                    
                    <>
                        <div>
                            <label htmlFor="master-sku-search" className="text-sm font-medium text-gray-700">Buscar Produto de Venda (SKU Mestre)</label>
                            <div className="relative mt-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    id="master-sku-search"
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nome ou código..."
                                    className="w-full pl-9 pr-3 py-2 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="border rounded-md h-60 overflow-y-auto">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => setSelectedMasterSku(product.code)}
                                    className={`p-2 border-l-4 cursor-pointer ${selectedMasterSku === product.code ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-gray-100'}`}
                                >
                                    <p className="font-semibold text-gray-800">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.code}</p>
                                </div>
                            ))}
                            {filteredProducts.length === 0 && searchTerm && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    <p>Nenhum produto encontrado.</p>
                                </div>
                            )}
                             <div className="p-2 sticky bottom-0 bg-white border-t">
                                <button onClick={onTriggerCreate} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors">
                                    <PlusCircle size={16} />
                                    Criar novo produto para vincular
                                </button>
                            </div>
                        </div>
                    </>
                </div>

                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                     <>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
                        <button onClick={handleConfirm} disabled={!selectedMasterSku} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Confirmar Vínculo</button>
                    </>
                </div>
            </div>
        </div>
    );
};

export default LinkSkuModal;
