// components/DeviceInUseModal.tsx
import React from 'react';
import { X, ShieldAlert, User as UserIcon } from 'lucide-react';

interface DeviceInUseModalProps {
    isOpen: boolean;
    onClose: () => void;
    userInUse: string | null;
}

const DeviceInUseModal: React.FC<DeviceInUseModalProps> = ({ isOpen, onClose, userInUse }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <ShieldAlert className="mr-2 text-orange-600" />
                        Dispositivo já Vinculado
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="text-sm text-gray-600 mb-4">
                    <p>Este bipador já está vinculado a outro operador no sistema.</p>
                </div>

                {userInUse && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center">
                        <UserIcon className="h-5 w-5 text-orange-700 mr-3" />
                        <div>
                            <p className="font-semibold text-orange-800">Vinculado a: {userInUse}</p>
                            <p className="text-xs text-orange-700">Para usar este bipador, ele deve ser removido do outro operador primeiro.</p>
                        </div>
                    </div>
                )}


                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceInUseModal;
