import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, KeyRound } from 'lucide-react';
import { StockItem, User } from '../types';

interface ConfirmStockEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: StockItem;
    currentUser: User;
    onConfirm: (itemCode: string, newQuantity: number, adminPassword: string) => boolean;
}

const ConfirmStockEditModal: React.FC<ConfirmStockEditModalProps> = ({ isOpen, onClose, item, currentUser, onConfirm }) => {
    const [newQuantity, setNewQuantity] = useState(item.current_qty);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewQuantity(item.current_qty);
            setPassword('');
            setError('');
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setError('');
        if (newQuantity < 0) {
            setError('O estoque não pode ser negativo.');
            return;
        }
        const success = onConfirm(item.code, newQuantity, password);
        if (!success) {
            setError('Senha incorreta. A alteração não foi autorizada.');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <ShieldCheck className="mr-2 text-blue-600" />
                        Ajuste de Estoque Manual
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                    Alterando o saldo do insumo: <strong>{item.name}</strong>.
                </p>
                 <p className="text-sm text-gray-600 mb-4">
                    Para confirmar a alteração, digite a nova quantidade e a sua senha de administrador.
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="new-quantity" className="block text-sm font-medium text-gray-700">Nova Quantidade ({item.unit})</label>
                        <input
                            id="new-quantity"
                            type="number"
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(Number(e.target.value))}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                     <div>
                        <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">Sua Senha ({currentUser.name})</label>
                        <div className="mt-1 relative">
                             <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                id="admin-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!password || newQuantity < 0} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">Confirmar Ajuste</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmStockEditModal;