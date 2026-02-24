// components/ConfirmClearHistoryModal.tsx
import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';

interface ConfirmClearHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmClear: (adminPassword: string) => Promise<{ success: boolean; message?: string }>;
}

const ConfirmClearHistoryModal: React.FC<ConfirmClearHistoryModalProps> = ({ isOpen, onClose, onConfirmClear }) => {
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setConfirmText('');
            setError('');
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setError('');
        if (confirmText !== 'LIMPAR HISTÓRICO') {
            setError('Você deve digitar "LIMPAR HISTÓRICO" para confirmar.');
            return;
        }
        
        setIsProcessing(true);
        const result = await onConfirmClear(password);
        setIsProcessing(false);
        
        if (!result.success) {
            setError(result.message || 'Ocorreu um erro desconhecido.');
        }
    };
    
    const canConfirm = password && confirmText === 'LIMPAR HISTÓRICO' && !isProcessing;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <ShieldAlert className="mr-2 text-orange-600" />
                        Limpar Histórico de Bipagens
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isProcessing}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800 space-y-2 mb-4">
                    <p>Você está prestes a apagar <strong>TODO</strong> o histórico de bipagens. O status de todos os pedidos "BIPADO" será revertido para "NORMAL".</p>
                    <p className="font-bold">Esta ação é IRREVERSÍVEL.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="confirm-text-clear" className="block text-sm font-medium text-gray-700">Para confirmar, digite <strong>LIMPAR HISTÓRICO</strong> no campo abaixo.</label>
                        <input id="confirm-text-clear" type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                    <div>
                        <label htmlFor="admin-password-clear" className="block text-sm font-medium text-gray-700">Sua Senha de Super Administrador</label>
                        <div className="mt-1 relative">
                            <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input id="admin-password-clear" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500" />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} disabled={!canConfirm} className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                        {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirmar e Limpar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmClearHistoryModal;