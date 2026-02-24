import React, { useState } from 'react';
import { WeighingBatch, User } from '../types';
import { Trash2 } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface WeighingBatchListProps {
    weighingBatches: WeighingBatch[];
    currentUser: User;
    onDeleteBatch: (batchId: string) => Promise<boolean>;
}

const WeighingBatchList: React.FC<WeighingBatchListProps> = ({ weighingBatches, currentUser, onDeleteBatch }) => {
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; item: WeighingBatch | null }>({ isOpen: false, item: null });

    const handleOpenDeleteModal = (batch: WeighingBatch) => {
        setDeleteModalState({ isOpen: true, item: batch });
    };

    const handleConfirmDelete = async () => {
        if (deleteModalState.item) {
            const success = await onDeleteBatch(deleteModalState.item.id);
            if (success) {
                setDeleteModalState({ isOpen: false, item: null });
            }
        }
    };

    return (
        <>
            {/* Mobile View */}
            <div className="md:hidden space-y-3">
                {weighingBatches.length > 0 ? weighingBatches.map(batch => (
                    <div key={batch.id} className="bg-[var(--color-surface-secondary)] p-3 rounded-lg border border-[var(--color-border)]">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="font-bold text-[var(--color-text-primary)]">{batch.stockItemName}</p>
                                <p className="text-sm">Saldo: <span className="font-bold">{(batch.initialQty - batch.usedQty).toFixed(2)} kg</span></p>
                            </div>
                            {currentUser.role === 'SUPER_ADMIN' && (
                                <button onClick={() => handleOpenDeleteModal(batch)} className="p-1 text-red-500"><Trash2 size={16} /></button>
                            )}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] mt-2 pt-2 border-t border-[var(--color-border)]">
                            <p><strong>Pesado:</strong> {batch.initialQty.toFixed(2)} kg | <strong>Usado:</strong> {batch.usedQty.toFixed(2)} kg</p>
                            <p><strong>Operador:</strong> {batch.createdBy}</p>
                            <p><strong>Data:</strong> {batch.createdAt?.toLocaleString('pt-BR') || 'N/A'}</p>
                        </div>
                    </div>
                )) : <p className="text-center py-8">Nenhum lote de pesagem.</p>}
            </div>
            
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            {['Data', 'Item Pesado', 'Qtd. Pesada', 'Qtd. Usada', 'Saldo', 'Operador', 'Tipo', 'Ações'].map(h =>
                                <th key={h} className="py-2 px-3 text-left font-semibold text-gray-600">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {weighingBatches.length > 0 ? weighingBatches.map(batch => {
                            const remaining = batch.initialQty - batch.usedQty;
                            return (
                                <tr key={batch.id} className="hover:bg-gray-50">
                                    <td className="py-2 px-3 text-gray-600">{batch.createdAt && !isNaN(batch.createdAt.getTime()) ? batch.createdAt.toLocaleString('pt-BR') : 'Data inválida'}</td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{batch.stockItemName}</td>
                                    <td className="py-2 px-3 text-center text-gray-700">{batch.initialQty.toFixed(2)}</td>
                                    <td className="py-2 px-3 text-center text-gray-700">{batch.usedQty.toFixed(2)}</td>
                                    <td className={`py-2 px-3 text-center font-bold ${remaining < 0.001 ? 'text-gray-500' : 'text-gray-800'}`}>{remaining.toFixed(2)}</td>
                                    <td className="py-2 px-3 text-gray-700">{batch.createdBy}</td>
                                    <td className="py-2 px-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${batch.weighingType === 'hourly' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200'}`}>{batch.weighingType}</span></td>
                                    <td className="py-2 px-3 text-center">
                                        {currentUser.role === 'SUPER_ADMIN' && (
                                            <button onClick={() => handleOpenDeleteModal(batch)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full" title="Excluir Lote"><Trash2 size={14} /></button>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-gray-500">Nenhum lote de pesagem encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {deleteModalState.isOpen && deleteModalState.item && (
                 <ConfirmDeleteModal
                    isOpen={deleteModalState.isOpen}
                    onClose={() => setDeleteModalState({ isOpen: false, item: null })}
                    onConfirm={handleConfirmDelete}
                    itemName={`${deleteModalState.item.stockItemName} (${deleteModalState.item.initialQty}kg)`}
                    itemType="Lote de Pesagem"
                />
            )}
        </>
    );
};

export default WeighingBatchList;
