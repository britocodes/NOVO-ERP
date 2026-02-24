// components/InfoModal.tsx
import React from 'react';
import { X, Info } from 'lucide-react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Info className="mr-2 text-blue-600" />
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="text-sm text-gray-600 mb-4 space-y-2">
                    {message}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;
