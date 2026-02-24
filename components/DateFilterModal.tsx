// components/DateFilterModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Filter, Check } from 'lucide-react';

interface DateFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    minDate: string;
    maxDate: string;
    onConfirm: (startDate: string, endDate: string) => void;
}

const DateFilterModal: React.FC<DateFilterModalProps> = ({ isOpen, onClose, minDate, maxDate, onConfirm }) => {
    const [startDate, setStartDate] = useState(minDate);
    const [endDate, setEndDate] = useState(maxDate);

    useEffect(() => {
        if (isOpen) {
            setStartDate(minDate);
            setEndDate(maxDate);
        }
    }, [isOpen, minDate, maxDate]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(startDate, endDate);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--modal-bg)] rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--modal-text-primary)] flex items-center">
                        <Filter className="mr-2 text-blue-600" />
                        Filtrar Pedidos por Data
                    </h2>
                    <button onClick={onClose} className="text-[var(--modal-text-secondary)] hover:text-[var(--modal-text-primary)]">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-[var(--modal-text-secondary)] mb-4">
                    Selecione o intervalo de datas dos pedidos que você deseja importar da planilha.
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-[var(--modal-text-secondary)]">Data de Início</label>
                        <input
                            id="start-date"
                            type="date"
                            value={startDate}
                            min={minDate}
                            max={maxDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full border-[var(--modal-border)] bg-[var(--modal-surface-secondary)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        />
                    </div>
                     <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-[var(--modal-text-secondary)]">Data de Fim</label>
                        <input
                            id="end-date"
                            type="date"
                            value={endDate}
                            min={minDate}
                            max={maxDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full border-[var(--modal-border)] bg-[var(--modal-surface-secondary)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 flex items-center gap-2">
                        <Check size={16} />
                        Confirmar e Processar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DateFilterModal;