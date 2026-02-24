// components/SolutionModal.tsx
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { OrderItem, User } from '../types';

interface SolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: OrderItem[];
    onConfirm: (orderIds: string[], details: any) => Promise<boolean>;
    resolutionTypes: string[];
    currentUser: User;
}

const SolutionModal: React.FC<SolutionModalProps> = ({ isOpen, onClose, orders, onConfirm, resolutionTypes, currentUser }) => {
    const [resolutionType, setResolutionType] = useState('');
    const [notes, setNotes] = useState('');
    const [newTracking, setNewTracking] = useState('');
    const [refunded, setRefunded] = useState(false);
    const [shippingCost, setShippingCost] = useState<number | ''>('');
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setResolutionType(resolutionTypes.length > 0 ? resolutionTypes[0] : '');
            setNotes('');
            setNewTracking('');
            setRefunded(false);
            setShippingCost('');
            setIsConfirming(false);
        }
    }, [isOpen, resolutionTypes]);

    if (!isOpen || orders.length === 0) return null;

    const handleConfirm = async () => {
        if (!resolutionType) return;
        setIsConfirming(true);
        const details = {
            resolution_type: resolutionType,
            notes,
            new_tracking: newTracking || undefined,
            refunded,
            shipping_cost: typeof shippingCost === 'number' ? shippingCost : undefined,
        };
        const orderIds = orders.map(o => o.id);
        const success = await onConfirm(orderIds, details);
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
                        <CheckCircle className="mr-2 text-green-600" />
                        Solucionar Pedido(s)
                    </h2>
                    <button onClick={onClose} className="text-[var(--modal-text-secondary)] hover:text-[var(--modal-text-primary)]"><X size={24} /></button>
                </div>

                <p className="text-sm text-[var(--modal-text-secondary)] mb-4">Registrando solução para <strong>{orders.length}</strong> pedido(s).</p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="resolution-type" className="block text-sm font-medium text-[var(--modal-text-secondary)]">Tipo de Solução</label>
                        <select id="resolution-type" value={resolutionType} onChange={(e) => setResolutionType(e.target.value)} className="mt-1 block w-full p-2 border border-[var(--modal-border)] bg-[var(--modal-bg)] rounded-md">
                            {resolutionTypes.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-[var(--modal-text-secondary)]">Observações</label>
                        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full p-2 border border-[var(--modal-border)] bg-[var(--modal-surface-secondary)] rounded-md" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="new-tracking" className="block text-sm font-medium text-[var(--modal-text-secondary)]">Novo Rastreio (Opcional)</label>
                            <input id="new-tracking" type="text" value={newTracking} onChange={(e) => setNewTracking(e.target.value)} className="mt-1 block w-full p-2 border border-[var(--modal-border)] bg-[var(--modal-surface-secondary)] rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="shipping-cost" className="block text-sm font-medium text-[var(--modal-text-secondary)]">Custo do Frete (R$)</label>
                            <input id="shipping-cost" type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full p-2 border border-[var(--modal-border)] bg-[var(--modal-surface-secondary)] rounded-md" />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center">
                            <input type="checkbox" checked={refunded} onChange={(e) => setRefunded(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <span className="ml-2 text-sm text-[var(--modal-text-secondary)]">Houve reembolso para o cliente</span>
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isConfirming} className="px-4 py-2 bg-[var(--modal-surface-secondary)] text-[var(--modal-text-primary)] rounded-md hover:bg-slate-200">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!resolutionType || isConfirming} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center">
                        {isConfirming ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null}
                        Confirmar Solução
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SolutionModal;