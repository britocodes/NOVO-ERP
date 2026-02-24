import React, { useState, useMemo, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { StockItem, OrderProduct } from '../types';

interface AddProductsToOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    scannedCode: string | null;
    products: StockItem[]; // All sellable products
    onConfirmOrder: (productsToShip: OrderProduct[]) => void;
}

const AddProductsToOrderModal: React.FC<AddProductsToOrderModalProps> = ({ isOpen, onClose, scannedCode, products, onConfirmOrder }) => {
    const [orderItems, setOrderItems] = useState<OrderProduct[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        const searchLower = searchTerm.toLowerCase();
        // Show products that are not already in the order
        return products.filter(p =>
            !orderItems.some(oi => oi.product.id === p.id) &&
            (p.name.toLowerCase().includes(searchLower) || p.code.toLowerCase().includes(searchLower))
        ).slice(0, 10); // Limit results for performance
    }, [searchTerm, products, orderItems]);

    const handleAddProduct = (product: StockItem) => {
        setOrderItems(prev => [...prev, { product, quantity: 1 }]);
        setSearchTerm('');
    };

    const handleUpdateQuantity = (productId: string, delta: number) => {
        setOrderItems(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQuantity = item.quantity + delta;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
            }
            return item;
        }).filter((item): item is OrderProduct => item !== null));
    };
    
    const handleRemoveProduct = (productId: string) => {
         setOrderItems(prev => prev.filter(item => item.product.id !== productId));
    };

    const handleConfirm = () => {
        onConfirmOrder(orderItems);
        setOrderItems([]); // Reset for next time
    };

    const handleClose = () => {
        onClose();
        setOrderItems([]); // Reset for next time
    }
    
    useEffect(() => {
        if (!isOpen) {
            setOrderItems([]);
            setSearchTerm('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Adicionar Produtos ao Pedido (Site)</h2>
                        <p className="text-sm text-gray-500">Código bipado: <span className="font-mono bg-gray-100 px-1 rounded">{scannedCode}</span></p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-y-auto pr-2">
                    {/* Left side: Product selection */}
                    <div className="flex flex-col">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Buscar Produtos</h3>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Digite para buscar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {searchTerm && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                        <div key={p.id} onClick={() => handleAddProduct(p)} className="p-2 hover:bg-blue-50 cursor-pointer">
                                            <p className="font-semibold text-sm">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.code}</p>
                                        </div>
                                    )) : <p className="p-2 text-sm text-gray-500">Nenhum produto encontrado.</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side: Current order */}
                    <div className="flex flex-col">
                        <h3 className="text-md font-semibold text-gray-700 mb-2 flex items-center"><ShoppingCart size={16} className="mr-2"/> Pedido Atual</h3>
                        <div className="flex-grow bg-gray-50 border rounded-lg p-3 space-y-2 overflow-y-auto">
                            {orderItems.length > 0 ? orderItems.map(item => (
                                <div key={item.product.id} className="bg-white p-2 rounded border shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{item.product.name}</p>
                                        <p className="text-xs text-gray-500">{item.product.code}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><Minus size={14}/></button>
                                        <span className="font-bold w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item.product.id, 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><Plus size={14}/></button>
                                        <button onClick={() => handleRemoveProduct(item.product.id)} className="text-red-500 hover:text-red-700 ml-2"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-sm text-gray-500 py-10">
                                    Nenhum produto adicionado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                    <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
                    <button onClick={handleConfirm} disabled={orderItems.length === 0} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">Fechar Pedido e Dar Baixa</button>
                </div>
            </div>
        </div>
    );
};

export default AddProductsToOrderModal;
