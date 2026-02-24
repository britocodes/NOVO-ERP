
import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckSquare, Square, Check, ArrowRight } from 'lucide-react';

interface DateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableDates: { date: string; count: number }[];
    onConfirm: (selectedDates: string[]) => void;
    fileName: string;
}

const DateSelectionModal: React.FC<DateSelectionModalProps> = ({ isOpen, onClose, availableDates, onConfirm, fileName }) => {
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

    // Seleciona todas as datas por padrão ao abrir
    useEffect(() => {
        if (isOpen && availableDates.length > 0) {
            // Opcional: Se quiser que venha tudo marcado, descomente a linha abaixo. 
            // Se quiser que o usuário escolha, deixe vazio.
            // setSelectedDates(new Set(availableDates.map(d => d.date)));
            setSelectedDates(new Set()); 
        }
    }, [isOpen, availableDates]);

    const toggleDate = (date: string) => {
        setSelectedDates(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedDates.size === availableDates.length) {
            setSelectedDates(new Set());
        } else {
            setSelectedDates(new Set(availableDates.map(d => d.date)));
        }
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedDates));
    };

    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const totalOrdersSelected = availableDates
        .filter(d => selectedDates.has(d.date))
        .reduce((acc, curr) => acc + curr.count, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <Calendar className="text-blue-600" />
                            Datas de Envio
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-xs">{fileName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex items-center justify-between mb-2 px-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Selecione os dias para importar:</span>
                    <button onClick={toggleAll} className="text-[10px] font-black text-blue-600 uppercase hover:underline">
                        {selectedDates.size === availableDates.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {availableDates.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-sm font-bold text-gray-500">Nenhuma data encontrada.</p>
                            <p className="text-xs text-gray-400 mt-1">Verifique se a coluna "Data de Envio" está mapeada corretamente nas configurações.</p>
                        </div>
                    ) : (
                        availableDates.map(({ date, count }) => (
                            <div 
                                key={date} 
                                onClick={() => toggleDate(date)}
                                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    selectedDates.has(date) 
                                    ? 'bg-blue-50 border-blue-500 shadow-sm' 
                                    : 'bg-white border-slate-100 hover:border-blue-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedDates.has(date) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                        {selectedDates.has(date) && <Check size={14} className="text-white" />}
                                    </div>
                                    <span className={`font-bold text-sm ${selectedDates.has(date) ? 'text-blue-900' : 'text-slate-600'}`}>
                                        {formatDate(date)}
                                    </span>
                                </div>
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${selectedDates.has(date) ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                                    {count} pedidos
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase">Total Selecionado:</span>
                        <span className="text-lg font-black text-blue-600">{totalOrdersSelected} <span className="text-xs text-slate-400">pedidos</span></span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirm}
                            className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Confirmar Seleção <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateSelectionModal;
