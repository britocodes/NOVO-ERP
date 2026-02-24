import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmButtonText?: string;
    isConfirming?: boolean;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText = 'Confirmar',
    isConfirming = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--modal-bg)] rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--modal-text-primary)] flex items-center">
                        <AlertTriangle className="mr-2 text-red-600" />
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-[var(--modal-text-secondary)] hover:text-[var(--modal-text-primary)]">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="text-sm text-[var(--modal-text-secondary)] mb-4 space-y-2">
                    {message}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isConfirming} className="px-4 py-2 bg-[var(--modal-surface-secondary)] text-[var(--modal-text-primary)] rounded-md hover:bg-slate-200 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={isConfirming} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                        {isConfirming ? <Loader2 className="animate-spin h-5 w-5" /> : confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmActionModal;