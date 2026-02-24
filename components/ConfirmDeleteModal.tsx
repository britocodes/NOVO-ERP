import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
    itemType: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName, itemType }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <AlertTriangle className="mr-2 text-red-600" />
                        Confirmar Exclusão
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                    Você tem certeza que deseja excluir o {itemType}: <strong>{itemName}</strong>?
                </p>
                <p className="text-sm text-red-700 bg-red-50 p-2 rounded-md border border-red-200">
                    Esta ação não pode ser desfeita.
                </p>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">Confirmar Exclusão</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
