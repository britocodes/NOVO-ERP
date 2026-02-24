import React, { useState, useMemo } from 'react';
import { StockItem, WeighingBatch, WeighingType, User } from '../types';
import { Weight, PlusCircle, User as UserIcon } from 'lucide-react';
import AddWeighingModal from '../components/AddWeighingModal';
import WeighingBatchList from '../components/WeighingBatchList';

interface PesagemPageProps {
    stockItems: StockItem[];
    weighingBatches: WeighingBatch[];
    onAddNewWeighing: (insumoCode: string, quantity: number, type: WeighingType, userId: string) => void;
    currentUser: User;
    onDeleteBatch: (batchId: string) => Promise<boolean>;
    users: User[];
}

const getTodayString = () => new Date().toISOString().split('T')[0];

export const PesagemPage: React.FC<PesagemPageProps> = ({ stockItems, weighingBatches, onAddNewWeighing, currentUser, onDeleteBatch, users }) => {
    const [isAddWeighingModalOpen, setIsAddWeighingModalOpen] = useState(false);
    const [filterDate, setFilterDate] = useState(getTodayString());

    const weighableItems = useMemo(() => stockItems.filter(item => item.kind === 'PROCESSADO'), [stockItems]);
    const pesagemUsers = useMemo(() => users.filter(user => Array.isArray(user.setor) && user.setor.includes('PESAGEM')), [users]);

    const handleConfirmNewWeighing = (insumoCode: string, quantity: number, type: WeighingType, userId: string) => {
        onAddNewWeighing(insumoCode, quantity, type, userId);
        setIsAddWeighingModalOpen(false);
    };
    
    const filteredBatches = useMemo(() => {
        return weighingBatches.filter(batch => {
            if (!batch.createdAt || isNaN(batch.createdAt.getTime())) return false;
            const batchDateStr = batch.createdAt.toISOString().split('T')[0];
            return batchDateStr === filterDate;
        });
    }, [weighingBatches, filterDate]);

    const summary = useMemo(() => {
        if (filteredBatches.length === 0) {
            return { total: 0, byUser: [] };
        }
        const total = filteredBatches.reduce((sum, batch) => sum + batch.initialQty, 0);
        const byUserMap = new Map<string, { name: string, total: number }>();

        filteredBatches.forEach(batch => {
            const userStats = byUserMap.get(batch.userId) || { name: batch.createdBy, total: 0 };
            userStats.total += batch.initialQty;
            byUserMap.set(batch.userId, userStats);
        });
        
        const byUser = Array.from(byUserMap.values()).sort((a,b) => b.total - a.total);
        return { total, byUser };
    }, [filteredBatches]);

    return (
        <div>
            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Pesagem</h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">Gerencie os lotes de materiais pesados para a produção do dia.</p>
                </div>
                 <div className="flex items-center gap-4">
                     <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="p-2 border border-[var(--color-border)] rounded-md text-sm shadow-sm bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                    />
                    <button 
                        onClick={() => setIsAddWeighingModalOpen(true)}
                        className="flex items-center text-sm font-semibold bg-[var(--color-primary)] text-[var(--color-primary-text)] px-4 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm"
                    >
                        <PlusCircle size={16} className="mr-2"/>
                        Lançar Nova Pesagem
                    </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm w-full">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center">
                        <Weight size={20} className="mr-2 text-[var(--color-primary)]" />
                        Lotes de Pesagem Lançados no Dia
                    </h2>
                    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                        <WeighingBatchList
                            weighingBatches={filteredBatches}
                            currentUser={currentUser}
                            onDeleteBatch={onDeleteBatch}
                        />
                    </div>
                </div>
                <div className="lg:col-span-1 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm w-full">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
                        Resumo de {new Date(filterDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </h2>
                    <div className="bg-[var(--color-info-bg)] border border-[var(--color-info-border)] text-[var(--color-info-text)] p-4 rounded-lg text-center mb-6">
                        <p className="font-medium">Total Pesado no Dia</p>
                        <p className="text-4xl font-bold">{summary.total.toFixed(2)} <span className="text-2xl font-normal">kg</span></p>
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--color-text-primary)] mb-3 flex items-center">
                            <UserIcon size={16} className="mr-2" /> Ranking de Pesagem
                        </h3>
                         <div className="space-y-4">
                            {summary.byUser.length > 0 ? summary.byUser.map((user, index) => {
                                const percentage = summary.total > 0 ? (user.total / summary.total) * 100 : 0;
                                return (
                                    <div key={user.name}>
                                        <div className="flex justify-between items-baseline text-sm">
                                            <span className="font-semibold text-[var(--color-text-primary)]">{index + 1}. {user.name}</span>
                                            <span className="font-bold text-[var(--color-text-secondary)]">{user.total.toFixed(2)} kg</span>
                                        </div>
                                        <div className="w-full bg-[var(--color-surface-tertiary)] rounded-full h-2.5 mt-1">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">Nenhuma pesagem registrada para este dia.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <AddWeighingModal 
                isOpen={isAddWeighingModalOpen} 
                onClose={() => setIsAddWeighingModalOpen(false)} 
                insumos={weighableItems} 
                stockItems={stockItems}
                onConfirm={handleConfirmNewWeighing} 
                users={pesagemUsers} 
                currentUser={currentUser}
            />
        </div>
    );
};

export default PesagemPage;