
import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Factory, ShieldCheck, AlertCircle } from 'lucide-react';
import { StockItem } from '../types';

interface ManualMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: StockItem[];
    onConfirm: (itemCode: string, movementType: 'entrada' | 'saida', quantity: number, ref: string) => void;
    preselectedItem?: StockItem | null;
}

const ManualMovementModal: React.FC<ManualMovementModalProps> = ({ isOpen, onClose, items, onConfirm, preselectedItem }) => {
    const [selectedItemCode, setSelectedItemCode] = useState('');
    const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('Correção');
    const [isAdjustmentOnly, setIsAdjustmentOnly] = useState(true);

    const selectedItem = items.find(i => i.code === selectedItemCode);
    const isProducible = selectedItem?.kind === 'PRODUTO' || selectedItem?.kind === 'PROCESSADO';

    useEffect(() => {
        if (isOpen) {
            const initialItem = preselectedItem || items.find(i => i.kind === 'INSUMO') || items[0];
            if (initialItem) {
                setSelectedItemCode(initialItem.code);
                 if(initialItem.kind === 'PRODUTO' || initialItem.kind === 'PROCESSADO') {
                    setMovementType('entrada');
                    setReason('Ajuste de Saldo Físico');
                    setIsAdjustmentOnly(true);
                 } else {
                    setMovementType('entrada');
                    setReason('Correção');
                    setIsAdjustmentOnly(true);
                 }
            } else {
                setSelectedItemCode('');
            }
            setQuantity(1);
        }
    }, [isOpen, items, preselectedItem]);
    
    useEffect(() => {
        if(isProducible) {
            // Se for produto, o padrão agora é ajuste manual para permitir correções de "estoque físico"
            if (!reason.includes('Produção')) {
                setIsAdjustmentOnly(true);
            }
        } else {
            setIsAdjustmentOnly(true);
        }
    }, [selectedItemCode, isProducible]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!isFormValid) return;
        // Se NÃO for apenas ajuste, adicionamos o prefixo para que o App.tsx reconheça como produção via BOM
        const finalRef = !isAdjustmentOnly ? `Produção Manual: ${reason}` : reason;
        onConfirm(selectedItemCode, movementType, quantity, finalRef);
    };
    
    const isFormValid = selectedItemCode && quantity > 0 && reason.trim() !== '';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center uppercase tracking-tighter">
                        <PlusCircle className="mr-2 text-blue-600" />
                        Movimentação de Estoque
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="item-select" className="text-[10px] font-black text-gray-400 uppercase">Item Selecionado</label>
                        <select
                            id="item-select"
                            value={selectedItemCode}
                            onChange={(e) => setSelectedItemCode(e.target.value)}
                            disabled={!!preselectedItem}
                            className="mt-1 block w-full border-gray-200 bg-slate-50 rounded-xl shadow-sm p-3 font-bold focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-60"
                        >
                            <option value="" disabled>Selecione um item...</option>
                            <optgroup label="Materiais Processados (Pesados)">
                                {items.filter(i => i.kind === 'PROCESSADO').map(p => (
                                    <option key={p.id} value={p.code}>{p.name} ({p.code})</option>
                                ))}
                            </optgroup>
                            <optgroup label="Insumos">
                                {items.filter(i => i.kind === 'INSUMO').map(insumo => (
                                    <option key={insumo.id} value={insumo.code}>{insumo.name} ({insumo.code})</option>
                                ))}
                            </optgroup>
                             <optgroup label="Produtos Finais">
                                {items.filter(i => i.kind === 'PRODUTO').map(produto => (
                                    <option key={produto.id} value={produto.code}>{produto.name} ({produto.code})</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {isProducible && (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                            <p className="text-[10px] font-black text-blue-800 uppercase">Tipo de Operação</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => { setIsAdjustmentOnly(true); setReason('Ajuste de Saldo Físico'); setMovementType('entrada'); }}
                                    className={`p-2 text-xs font-black rounded-lg border-2 transition-all ${isAdjustmentOnly ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-600 border-blue-100'}`}
                                >
                                    AJUSTE MANUAL
                                </button>
                                <button 
                                    onClick={() => { setIsAdjustmentOnly(false); setReason('Produção Interna'); setMovementType('saida'); }}
                                    className={`p-2 text-xs font-black rounded-lg border-2 transition-all ${!isAdjustmentOnly ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-orange-500 border-orange-100'}`}
                                >
                                    PRODUÇÃO (BOM)
                                </button>
                            </div>
                            <p className="text-[9px] font-bold text-blue-600 leading-tight">
                                {isAdjustmentOnly 
                                    ? "Ajuste manual apenas altera o saldo deste item. Use para correções de inventário físico." 
                                    : "Produção manual dará entrada neste item e BAIXA automática nos insumos da receita."}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase">Direção</label>
                            <div className="mt-1 flex rounded-xl shadow-sm overflow-hidden border">
                                <button
                                    type="button"
                                    onClick={() => setMovementType('entrada')}
                                    className={`flex-1 py-2 text-xs font-black uppercase transition-all ${movementType === 'entrada' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400'}`}
                                >
                                    Entrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType('saida')}
                                    className={`flex-1 py-2 text-xs font-black uppercase transition-all ${movementType === 'saida' ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}
                                >
                                    Saída
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="quantity-input" className="text-[10px] font-black text-gray-400 uppercase">
                                Quantidade {selectedItem ? `(${selectedItem.unit})` : ''}
                            </label>
                            <input
                                id="quantity-input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="mt-1 block w-full border-gray-200 bg-slate-50 rounded-xl p-2 font-bold focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="reason-input" className="text-[10px] font-black text-gray-400 uppercase">Motivo / Referência</label>
                        <input
                            id="reason-input"
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Correção de inventário, sobra de lote..."
                            className="mt-1 block w-full border-gray-200 bg-slate-50 rounded-xl p-3 font-bold focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>

                    {isAdjustmentOnly && (
                        <div className="text-[10px] font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start">
                            <ShieldCheck size={16} className="mr-2 flex-shrink-0" />
                            <span>Esta ação altera o saldo físico diretamente no sistema. Registrado como AJUSTE_MANUAL.</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                    <button 
                        onClick={onClose}
                        type="button"
                        className="px-6 py-2 bg-gray-100 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        type="button"
                        disabled={!isFormValid}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100 transition-all active:scale-95"
                    >
                        Confirmar Lançamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualMovementModal;
