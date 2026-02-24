// components/AddGrindingModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Factory, User as UserIcon, AlertTriangle } from 'lucide-react';
import { StockItem, User, GeneralSettings } from '../types';

interface AddGrindingModalProps {
    isOpen: boolean;
    onClose: () => void;
    insumos: StockItem[];
    stockItems: StockItem[];
    onConfirm: (data: { sourceCode: string, sourceQty: number, outputCode: string, outputName: string, outputQty: number, mode: 'manual' | 'automatico', userId?: string, userName: string }) => void;
    users: User[];
    currentUser: User;
    generalSettings: GeneralSettings;
}

const AddGrindingModal: React.FC<AddGrindingModalProps> = ({ isOpen, onClose, insumos, stockItems, onConfirm, users, currentUser, generalSettings }) => {
    const [sourceCode, setSourceCode] = useState('');
    const [sourceQty, setSourceQty] = useState(1);
    const [outputCode, setOutputCode] = useState('');
    const [outputName, setOutputName] = useState('');
    const [outputQty, setOutputQty] = useState(1);
    const [mode, setMode] = useState<'manual' | 'automatico'>('manual');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    const filteredInsumos = useMemo(() => {
        if (categoryFilter === 'ALL') {
            return insumos;
        }
        return insumos.filter(i => i.category === categoryFilter);
    }, [insumos, categoryFilter]);

    const outputItemExists = useMemo(() => 
        outputCode.trim() ? stockItems.find(item => item.code.toUpperCase() === outputCode.trim().toUpperCase()) : undefined,
        [outputCode, stockItems]
    );

    useEffect(() => {
        if (isOpen) {
            setCategoryFilter('ALL');
            const initialInsumos = categoryFilter === 'ALL' ? insumos : insumos.filter(i => i.category === categoryFilter);
            setSourceCode(initialInsumos.length > 0 ? initialInsumos[0].code : '');
            setSourceQty(1);
            setOutputCode('');
            setOutputName('');
            setOutputQty(1);
            setMode('manual');
            const isCurrentUserInList = users.some(u => u.id === currentUser.id);
            if (isCurrentUserInList) {
                setSelectedUserId(currentUser.id);
            } else if (users.length > 0) {
                setSelectedUserId(users[0].id);
            } else {
                setSelectedUserId('');
            }
        }
    }, [isOpen, insumos, users, currentUser]);

    useEffect(() => {
        // When filter changes, if the selected item is no longer in the list, select the first available one.
        if (!filteredInsumos.some(i => i.code === sourceCode)) {
            setSourceCode(filteredInsumos.length > 0 ? filteredInsumos[0].code : '');
        }
    }, [filteredInsumos, sourceCode]);
    
     useEffect(() => {
        if (outputItemExists) {
            setOutputName(outputItemExists.name);
        }
    }, [outputItemExists]);

    const handleConfirm = () => {
        if (!isFormValid) return;

        let userName: string;
        let userId: string | undefined;

        if (mode === 'manual') {
            const selectedUser = users.find(u => u.id === selectedUserId);
            if (!selectedUser) return;
            userName = selectedUser.name;
            userId = selectedUser.id;
        } else {
            userName = 'Automático';
            userId = undefined;
        }

        onConfirm({
            sourceCode,
            sourceQty,
            outputCode: outputCode.toUpperCase().trim(),
            outputName,
            outputQty,
            mode,
            userId,
            userName
        });
    };

    const sourceItemDetails = insumos.find(i => i.code === sourceCode);
    const isFormValid = sourceCode && sourceQty > 0 && outputCode.trim() && outputName.trim() && outputQty > 0 && (mode === 'automatico' || (mode === 'manual' && selectedUserId));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Factory className="mr-2 text-blue-600" />
                        Lançar Nova Moagem
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Insumo de Origem</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="category-filter" className="text-sm">Filtrar por Categoria</label>
                                <select id="category-filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm p-2">
                                    <option value="ALL">Todas as Categorias</option>
                                    {generalSettings.insumoCategoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                            <div className="md:col-span-2">
                                <label htmlFor="source-item" className="text-sm">Matéria Prima</label>
                                <select id="source-item" value={sourceCode} onChange={e => setSourceCode(e.target.value)} className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm p-2">
                                    {filteredInsumos.map(i => <option key={i.id} value={i.code}>{i.name} (Estoque: {i.current_qty.toFixed(2)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="source-qty" className="text-sm">Qtd. Usada (kg)</label>
                                <input id="source-qty" type="number" value={sourceQty} onChange={e => setSourceQty(Number(e.target.value))} className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm p-2" />
                            </div>
                        </div>
                        {sourceItemDetails && sourceQty > sourceItemDetails.current_qty && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={14}/>A quantidade usada é maior que o estoque disponível ({sourceItemDetails.current_qty.toFixed(2)} kg).</p>
                        )}
                    </div>
                     <div className="border-t pt-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Insumo de Saída (Moído)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="output-code" className="text-sm">Código/SKU</label>
                                <input id="output-code" type="text" value={outputCode} onChange={e => setOutputCode(e.target.value)} className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm p-2 uppercase" placeholder="EX: F_MICRO_BR"/>
                            </div>
                             <div className="md:col-span-2">
                                <label htmlFor="output-name" className="text-sm">Nome</label>
                                <input id="output-name" type="text" value={outputName} onChange={e => setOutputName(e.target.value)} disabled={!!outputItemExists} className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm p-2 disabled:bg-gray-100" placeholder="EX: Fibra Micronizada Branca"/>
                            </div>
                        </div>
                         {outputItemExists && <p className="text-xs text-blue-600 mt-1">Este código já existe. O estoque será atualizado.</p>}
                        <div>
                            <label htmlFor="output-qty" className="text-sm">Qtd. Produzida (kg)</label>
                            <input id="output-qty" type="number" value={outputQty} onChange={e => setOutputQty(Number(e.target.value))} className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm p-2" />
                        </div>
                    </div>
                     <div className="border-t pt-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Operação</h3>
                        <div className="flex gap-4">
                             <div className="flex-1">
                                <label className="text-sm">Modo</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <button onClick={() => setMode('manual')} className={`px-4 py-2 border text-sm w-full rounded-l-md ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Manual</button>
                                    <button onClick={() => setMode('automatico')} className={`px-4 py-2 border text-sm w-full rounded-r-md -ml-px ${mode === 'automatico' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Automático</button>
                                </div>
                            </div>
                            {mode === 'manual' && (
                                <div className="flex-1">
                                    <label htmlFor="user-select" className="text-sm flex items-center"><UserIcon size={14} className="mr-1"/> Operador</label>
                                    <select id="user-select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="mt-1 block w-full border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm p-2">
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!isFormValid} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">Confirmar Moagem</button>
                </div>
            </div>
        </div>
    );
};

export default AddGrindingModal;