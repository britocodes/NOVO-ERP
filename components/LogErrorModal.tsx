// components/LogErrorModal.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { OrderItem } from '../types';

interface LogErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderItem | null;
    onConfirm: (orderIdentifier: string, reason: string) => Promise<boolean>;
    errorReasons: string[];
}

const LogErrorModal: React.FC<LogErrorModalProps> = ({ isOpen, onClose, order, onConfirm, errorReasons }) => {
    const [reason, setReason] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setReason(errorReasons.length > 0 ? errorReasons[0] : '');
            setIsConfirming(false);
        }
    }, [isOpen, errorReasons]);

    if (!isOpen || !order) return null;

    const handleConfirm = async () => {
        if (!reason) return;
        setIsConfirming(true);
        const success = await onConfirm(order.orderId || order.tracking, reason);
        if (success) {
            onClose();
        }
        setIsConfirming(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--modal-bg)] rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--modal-text-primary)] flex items-center">
                        <AlertTriangle className="mr-2 text-red-600" />
                        Lançar Erro no Pedido
                    </h2>
                    <button onClick={onClose} className="text-[var(--modal-text-secondary)] hover:text-[var(--modal-text-primary)]">
                        <X size={24} />
                    </button>
                </div>

                <div className="text-sm text-[var(--modal-text-secondary)] mb-4 bg-[var(--modal-surface-secondary)] p-3 border border-[var(--modal-border)] rounded-md">
                    <p><strong>Pedido:</strong> {order.orderId}</p>
                    <p><strong>Rastreio:</strong> {order.tracking}</p>
                    <p><strong>SKU:</strong> {order.sku}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="error-reason" className="block text-sm font-medium text-[var(--modal-text-secondary)]">Selecione o motivo do erro</label>
                        <select
                            id="error-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-1 block w-full border-[var(--modal-border)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-[var(--modal-bg)]"
                        >
                            {errorReasons.length === 0 && <option value="" disabled>Nenhum motivo cadastrado</option>}
                            {errorReasons.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isConfirming} className="px-4 py-2 bg-[var(--modal-surface-secondary)] text-[var(--modal-text-primary)] rounded-md hover:bg-slate-200 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!reason || isConfirming}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                    >
                        {isConfirming ? <Loader2 className="animate-spin h-5 w-5" /> : (
                            <>
                                <Send size={16} className="mr-2" />
                                Confirmar Erro
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogErrorModal;