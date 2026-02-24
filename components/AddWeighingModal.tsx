import React, { useState, useEffect, useMemo } from 'react';
import { X, Weight, User as UserIcon, AlertTriangle } from 'lucide-react';
import { StockItem, WeighingType, User } from '../types';

interface AddWeighingModalProps {
    isOpen: boolean;
    onClose: () => void;
    insumos: StockItem[];
    stockItems: StockItem[];
    onConfirm: (insumoCode: string, quantity: number, type: WeighingType, userId: string) => void;
    users: User[];
    currentUser: User;
}

const AddWeighingModal: React.FC<AddWeighingModalProps> = ({ isOpen, onClose, insumos, stockItems, onConfirm, users, currentUser }) => {
    const [selectedItemCode, setSelectedItemCode] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [weighingType, setWeighingType] = useState<WeighingType>('daily');
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedItemCode(insumos.length > 0 ? insumos[0].code : '');
            setQuantity(1);
            setWeighingType('daily');
            const isCurrentUserPesagem = users.some(u => u.id === currentUser.id);
            if (isCurrentUserPesagem) {
                setSelectedUserId(currentUser.id);
            } else if (users.length > 0) {
                setSelectedUserId(users[0].id);
            } else {
                setSelectedUserId('');
            }
        }
    }, [isOpen, insumos, users, currentUser]);

    const handleConfirm = () => {
        if (selectedItemCode && quantity > 0 && selectedUserId) {
            onConfirm(selectedItemCode, quantity, weighingType, selectedUserId);
        }
    };

    const itemDetails = useMemo(() => insumos.find(i => i.code === selectedItemCode), [insumos, selectedItemCode]);
    
    const substituteItemDetails = useMemo(() => {
        if (!itemDetails || !itemDetails.substitute_product_code) return null;
        return stockItems.find(i => i.code === itemDetails.substitute_product_code);
    }, [itemDetails, stockItems]);

    const combinedStock = (itemDetails?.current_qty || 0) + (substituteItemDetails?.current_qty || 0);

    const isFormValid = !!itemDetails && quantity > 0 && !!selectedUserId && quantity <= combinedStock;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Weight className="mr-2 text-blue-600" />
                        Lançar Nova Pesagem
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="user-select" className="text-sm font-medium text-gray-700 flex items-center">
                            <UserIcon size={14} className="mr-2" /> Funcionário
                        </label>
                        <select
                            id="user-select"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            {users.length === 0 && <option value="" disabled>Nenhum funcionário no setor Pesagem</option>}
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="item-select" className="text-sm font-medium text-gray-700">Material Processado a ser Pesado</label>
                        <select
                            id="item-select"
                            value={selectedItemCode}
                            onChange={(e) => setSelectedItemCode(e.target.value)}
                            className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            {insumos.length === 0 && <option value="" disabled>Nenhum material processado disponível</option>}
                            {insumos.map(i => (
                                <option key={i.id} value={i.code}>{i.name} ({i.code})</option>
                            ))}
                        </select>
                         {itemDetails && (
                            <div className="text-xs text-gray-500 mt-1 space-y-1">
                                <p>Estoque atual: {itemDetails.current_qty.toFixed(2)} {itemDetails.unit}</p>
                                {substituteItemDetails && <p>Estoque do substituto ({substituteItemDetails.name}): {substituteItemDetails.current_qty.toFixed(2)} {substituteItemDetails.unit}</p>}
                                <p className="font-bold">Estoque total disponível: {combinedStock.toFixed(2)} {itemDetails.unit}</p>
                            </div>
                         )}
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">Tipo de Lançamento</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <button
                                onClick={() => setWeighingType('daily')}
                                className={`px-4 py-2 border border-gray-300 text-sm font-medium rounded-l-md w-full ${weighingType === 'daily' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Diário
                            </button>
                            <button
                                onClick={() => setWeighingType('hourly')}
                                className={`-ml-px px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md w-full ${weighingType === 'hourly' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Por Hora (Substitui)
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Lançamentos 'Por Hora' substituem qualquer outro do mesmo item na última hora.</p>
                    </div>
                    <div>
                        <label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantidade Pesada {itemDetails ? `(${itemDetails.unit})` : ''}</label>
                        <input
                            id="quantity"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                         {quantity > combinedStock && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={14}/>Atenção: A quantidade pesada é maior que o estoque total disponível.</p>
                         )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!isFormValid} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default AddWeighingModal;