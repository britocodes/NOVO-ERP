// components/GrindingBatchList.tsx
import React, { useState } from 'react';
import { GrindingBatch, User } from '../types';
import { Trash2, ArrowRight } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface GrindingBatchListProps {
    grindingBatches: GrindingBatch[];
    currentUser: User;
    onDeleteBatch: (batchId: string) => Promise<boolean>;
}

const GrindingBatchList: React.FC<GrindingBatchListProps> = ({ grindingBatches, currentUser, onDeleteBatch }) => {
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; item: GrindingBatch | null }>({ isOpen: false, item: null });

    const handleOpenDeleteModal = (batch: GrindingBatch) => {
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
                {grindingBatches.length > 0 ? grindingBatches.map(batch => (
                    <div key={batch.id} className="bg-[var(--color-surface-secondary)] p-3 rounded-lg border border-[var(--color-border)]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-[var(--color-text-primary)]">{batch.outputInsumoName}</p>
                                <p className="text-sm text-green-600 font-bold">+{batch.outputQtyProduced.toFixed(2)} kg</p>
                            </div>
                            {currentUser.role === 'SUPER_ADMIN' && (
                                <button onClick={() => handleOpenDeleteModal(batch)} className="p-1 text-red-500"><Trash2 size={16} /></button>
                            )}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] mt-2 pt-2 border-t border-[var(--color-border)]">
                            <p><strong>Origem:</strong> {batch.sourceInsumoName} <span className="text-red-600">(-{batch.sourceQtyUsed.toFixed(2)} kg)</span></p>
                            <p><strong>Operador:</strong> {batch.userName} ({batch.mode})</p>
                            <p><strong>Data:</strong> {batch.createdAt?.toLocaleString('pt-BR') || 'N/A'}</p>
                        </div>
                    </div>
                )) : <p className="text-center py-8">Nenhum lote de moagem.</p>}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            {['Data', 'Insumo de Origem', 'Qtd. Usada', 'Insumo de Saída', 'Qtd. Produzida', 'Operador/Modo', 'Ações'].map(h =>
                                <th key={h} className="py-2 px-3 text-left font-semibold text-gray-600">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {grindingBatches.length > 0 ? grindingBatches.map(batch => {
                            return (
                                <tr key={batch.id} className="hover:bg-gray-50">
                                    <td className="py-2 px-3 text-gray-600">{batch.createdAt && !isNaN(batch.createdAt.getTime()) ? batch.createdAt.toLocaleString('pt-BR') : 'Data inválida'}</td>
                                    <td className="py-2 px-3 text-gray-800">{batch.sourceInsumoName}</td>
                                    <td className="py-2 px-3 text-center text-red-600 font-semibold">-{batch.sourceQtyUsed.toFixed(2)}</td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{batch.outputInsumoName}</td>
                                    <td className="py-2 px-3 text-center text-green-600 font-bold">+{batch.outputQtyProduced.toFixed(2)}</td>
                                    <td className="py-2 px-3 text-gray-700">{batch.userName}</td>
                                    <td className="py-2 px-3 text-center">
                                        {currentUser.role === 'SUPER_ADMIN' && (
                                            <button onClick={() => handleOpenDeleteModal(batch)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full" title="Excluir Lote de Moagem (Não reverte estoque)"><Trash2 size={14} /></button>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-500">Nenhum lote de moagem encontrado.</td>
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
                    itemName={`${deleteModalState.item.outputInsumoName} (${deleteModalState.item.outputQtyProduced}kg)`}
                    itemType="Lote de Moagem"
                />
            )}
        </>
    );
};

export default GrindingBatchList;
