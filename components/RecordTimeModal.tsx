import React, { useState, useEffect } from 'react';
import { X, Clock, Timer } from 'lucide-react';
import { User } from '../types';

interface RecordTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    type: 'leftEarly' | 'overtime';
    onConfirm: (userId: string, type: 'leftEarly' | 'overtime', time: string) => void;
}

const RecordTimeModal: React.FC<RecordTimeModalProps> = ({ isOpen, onClose, user, type, onConfirm }) => {
    const [time, setTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setTime(`${hours}:${minutes}`);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (time) {
            onConfirm(user.id, type, time);
        }
    };

    const title = type === 'leftEarly' ? 'Registrar Saída Antecipada' : 'Registrar Hora Extra';
    const icon = type === 'leftEarly' ? <Clock className="mr-2 text-orange-600" /> : <Timer className="mr-2 text-purple-600" />;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        {icon}
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Registrando para: <strong>{user.name}</strong>
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="event-time" className="block text-sm font-medium text-gray-700">Horário</label>
                        <input
                            id="event-time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default RecordTimeModal;