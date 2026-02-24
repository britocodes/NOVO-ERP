import React, { useState, useEffect } from 'react';
import { X, Calendar, Upload } from 'lucide-react';
import { User } from '../types';

interface MarkAbsenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onConfirm: (userId: string, date: string, hasDoctorsNote: boolean, file?: File) => void;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const MarkAbsenceModal: React.FC<MarkAbsenceModalProps> = ({ isOpen, onClose, user, onConfirm }) => {
    const [date, setDate] = useState(getTodayString());
    const [hasDoctorsNote, setHasDoctorsNote] = useState(false);
    const [file, setFile] = useState<File | undefined>(undefined);

    useEffect(() => {
        if (isOpen) {
            setDate(getTodayString());
            setHasDoctorsNote(false);
            setFile(undefined);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(user.id, date, hasDoctorsNote, file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setHasDoctorsNote(true); // Automatically check the box if a file is selected
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Calendar className="mr-2 text-red-600" />
                        Lançar Falta
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                    Lançando falta para o funcionário: <strong>{user.name}</strong>
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="absence-date" className="block text-sm font-medium text-gray-700">Data da Falta</label>
                        <input
                            id="absence-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                    </div>
                     <div>
                        <label className="flex items-center select-none cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasDoctorsNote}
                                onChange={(e) => setHasDoctorsNote(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Apresentou atestado médico</span>
                        </label>
                    </div>
                    <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">Anexar Atestado (Opcional)</label>
                        <label className="mt-1 flex justify-center w-full h-24 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-500">
                            <div className="space-y-1 text-center">
                                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <p className="pl-1">{file ? file.name : 'Clique para selecionar o arquivo'}</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF até 10MB</p>
                            </div>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">Confirmar Falta</button>
                </div>
            </div>
        </div>
    );
};

export default MarkAbsenceModal;