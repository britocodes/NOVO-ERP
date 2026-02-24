// components/NameDeviceModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Laptop2 } from 'lucide-react';

interface NameDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
    deviceInfo: {
        productName?: string;
        manufacturerName?: string;
        serialNumber?: string;
    };
}

const NameDeviceModal: React.FC<NameDeviceModalProps> = ({ isOpen, onClose, onConfirm, deviceInfo }) => {
    const [name, setName] = useState(deviceInfo.productName || 'Dispositivo USB');

    useEffect(() => {
        if (isOpen) {
            setName(deviceInfo.productName || 'Dispositivo USB');
        }
    }, [isOpen, deviceInfo]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Laptop2 className="mr-2 text-blue-600" />
                        Nomear Dispositivo
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 border rounded-lg space-y-1">
                    <p><strong>Produto:</strong> {deviceInfo.productName || 'N/A'}</p>
                    <p><strong>Fabricante:</strong> {deviceInfo.manufacturerName || 'N/A'}</p>
                    <p><strong>Número de Série:</strong> {deviceInfo.serialNumber || <span className="text-gray-400">N/A</span>}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="device-name" className="block text-sm font-medium text-gray-700">Dê um nome amigável para este dispositivo (ex: Bipador Mesa 1)</label>
                        <input
                            id="device-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!name.trim()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">
                        <Save size={16} className="mr-2"/>
                        Salvar e Vincular
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NameDeviceModal;