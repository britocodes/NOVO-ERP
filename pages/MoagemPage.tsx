import React, { useState, useMemo } from 'react';
import { StockItem, GrindingBatch, User, GeneralSettings } from '../types';
import { Recycle, PlusCircle, User as UserIcon } from 'lucide-react';
import AddGrindingModal from '../components/AddGrindingModal';
import GrindingBatchList from '../components/GrindingBatchList';

interface MoagemPageProps {
    stockItems: StockItem[];
    grindingBatches: GrindingBatch[];
    onAddNewGrinding: (data: { sourceCode: string, sourceQty: number, outputCode: string, outputName: string, outputQty: number, mode: 'manual' | 'automatico', userId?: string, userName: string }) => void;
    currentUser: User;
    onDeleteBatch: (batchId: string) => Promise<boolean>;
    users: User[];
    generalSettings: GeneralSettings;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const MoagemPage: React.FC<MoagemPageProps> = ({ stockItems, grindingBatches, onAddNewGrinding, currentUser, onDeleteBatch, users, generalSettings }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filterDate, setFilterDate] = useState(getTodayString());

    const grindableItems = useMemo(() => stockItems.filter(item => item.kind === 'INSUMO'), [stockItems]);
    const moagemUsers = useMemo(() => users.filter(user => Array.isArray(user.setor) && user.setor.includes('MOAGEM')), [users]);

    const handleConfirmNewGrinding = (data: { sourceCode: string, sourceQty: number, outputCode: string, outputName: string, outputQty: number, mode: 'manual' | 'automatico', userId?: string, userName: string }) => {
        onAddNewGrinding(data);
        setIsAddModalOpen(false);
    };
    
    const filteredBatches = useMemo(() => {
        return grindingBatches.filter(batch => {
            if (!batch.createdAt || isNaN(batch.createdAt.getTime())) return false;
            const batchDateStr = batch.createdAt.toISOString().split('T')[0];
            return batchDateStr === filterDate;
        });
    }, [grindingBatches, filterDate]);

    const summary = useMemo(() => {
        if (filteredBatches.length === 0) {
            return { totalProduced: 0, byUser: [] };
        }
        const totalProduced = filteredBatches.reduce((sum, batch) => sum + batch.outputQtyProduced, 0);
        const byUserMap = new Map<string, { name: string, total: number }>();

        filteredBatches.forEach(batch => {
            const userId = batch.userId || 'Automático';
            const userName = batch.userName;
            const userStats = byUserMap.get(userId) || { name: userName, total: 0 };
            userStats.total += batch.outputQtyProduced;
            byUserMap.set(userId, userStats);
        });
        
        const byUser = Array.from(byUserMap.values()).sort((a,b) => b.total - a.total);
        return { totalProduced, byUser };
    }, [filteredBatches]);

    return (
        <div>
            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Moagem</h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">Gerencie os lotes de materiais moídos.</p>
                </div>
                 <div className="flex items-center gap-4">
                     <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="p-2 border border-[var(--color-border)] rounded-md text-sm shadow-sm bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                    />
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <PlusCircle size={16} className="mr-2"/>
                        Lançar Nova Moagem
                    </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm w-full">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center">
                        <Recycle size={20} className="mr-2 text-[var(--color-primary)]" />
                        Lotes de Moagem Lançados no Dia
                    </h2>
                    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                        <GrindingBatchList
                            grindingBatches={filteredBatches}
                            currentUser={currentUser}
                            onDeleteBatch={onDeleteBatch}
                        />
                    </div>
                </div>
                <div className="lg:col-span-1 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm w-full">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
                        Resumo de {new Date(filterDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </h2>
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-center mb-6">
                        <p className="font-medium">Total Produzido no Dia</p>
                        <p className="text-4xl font-bold">{summary.totalProduced.toFixed(2)} <span className="text-2xl font-normal">kg</span></p>
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--color-text-primary)] mb-3 flex items-center">
                            <UserIcon size={16} className="mr-2" /> Ranking de Moagem
                        </h3>
                         <div className="space-y-4">
                            {summary.byUser.length > 0 ? summary.byUser.map((user, index) => {
                                const percentage = summary.totalProduced > 0 ? (user.total / summary.totalProduced) * 100 : 0;
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
                            }) : <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">Nenhuma moagem registrada para este dia.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <AddGrindingModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                insumos={grindableItems}
                stockItems={stockItems}
                onConfirm={handleConfirmNewGrinding} 
                users={moagemUsers}
                currentUser={currentUser}
                generalSettings={generalSettings}
            />
        </div>
    );
};

export default MoagemPage;