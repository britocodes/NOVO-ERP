
import React from 'react';
import { ProductionStats } from '../types';

interface ProductionSummaryProps {
    data?: ProductionStats; // Usado na Importação
    olderData?: ProductionStats; // Usado no Dashboard
    newerData?: ProductionStats | null; // Usado no Dashboard
    olderTitle?: string;
    newerTitle?: string;
    productTypeName: string;
    miudosTypeName: string;
}

// Added React.FC type to SummaryCard for consistency and better type safety
const SummaryCard: React.FC<{ label: string, value: number | string, colorClass: string, diff?: number }> = ({ label, value, colorClass, diff }) => (
    <div className={`flex-1 p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center text-center min-w-[150px] ${colorClass}`}>
        <p className="text-[10px] font-black uppercase tracking-wider opacity-80 mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
            <p className="text-3xl font-black">{value}</p>
            {diff !== undefined && diff !== 0 && (
                <span className={`text-[10px] font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diff > 0 ? '↑' : '↓'}{Math.abs(diff)}
                </span>
            )}
        </div>
    </div>
);

// Added React.FC type to MiudoCard to fix the error where 'key' prop was not recognized on a plain function component during list rendering
const MiudoCard: React.FC<{ label: string, value: number, unit: string }> = ({ label, value, unit }) => (
    <div className="bg-[#e6fcf5] border border-[#b3f5e1] p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
        <p className="text-[9px] font-black text-[#099268] uppercase mb-1 truncate w-full" title={label}>{label}</p>
        <p className="text-xl font-black text-[#087f5b]">{Number(value).toFixed(unit === 'kg' ? 3 : 0)} <span className="text-sm font-bold">{unit}</span></p>
    </div>
);

const ProductionSummary: React.FC<ProductionSummaryProps> = ({ 
    data, 
    olderData, 
    newerData, 
    olderTitle = "Resumo da Produção", 
    newerTitle,
    productTypeName, 
    miudosTypeName 
}) => {
    // Normaliza os dados: Se vier 'data' (Importação), tratamos como 'olderData'
    const displayData = olderData || data;

    if (!displayData) return null;

    const miudoEntries = (Object.entries(displayData.miudos || {}) as [string, number][]).sort((a, b) => a[0].localeCompare(b[0]));

    return (
        <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Seção 1: Resumo da Produção Principal */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-tighter">
                    {olderTitle}
                </h3>
                <div className="flex flex-wrap gap-4">
                    <SummaryCard 
                        label="Total de Pedidos" 
                        value={displayData.totalPedidos} 
                        colorClass="bg-[#edf2ff] border-[#dbe4ff] text-[#364fc7]" 
                        diff={newerData ? newerData.totalPedidos - displayData.totalPedidos : undefined}
                    />
                    <SummaryCard 
                        label={`Unidades (${productTypeName})`} 
                        value={displayData.totalUnidades} 
                        colorClass="bg-[#e7f5ff] border-[#d0ebff] text-[#1971c2]" 
                        diff={newerData ? newerData.totalUnidades - displayData.totalUnidades : undefined}
                    />
                    <SummaryCard 
                        label="Unidades Base Branca" 
                        value={displayData.totalUnidadesBranca} 
                        colorClass="bg-[#f1f3f5] border-[#e9ecef] text-[#495057]" 
                        diff={newerData ? newerData.totalUnidadesBranca - displayData.totalUnidadesBranca : undefined}
                    />
                    <SummaryCard 
                        label="Unidades Base Preta" 
                        value={displayData.totalUnidadesPreta} 
                        colorClass="bg-[#343a40] border-[#212529] text-white" 
                        diff={newerData ? newerData.totalUnidadesPreta - displayData.totalUnidadesPreta : undefined}
                    />
                    <SummaryCard 
                        label="Unidades Bases Especiais" 
                        value={displayData.totalUnidadesEspecial} 
                        colorClass="bg-[#fff9db] border-[#fff3bf] text-[#f08c00]" 
                        diff={newerData ? newerData.totalUnidadesEspecial - displayData.totalUnidadesEspecial : undefined}
                    />
                </div>
            </div>

            {/* Comparação Secundária (Apenas se houver newerData no Dashboard) */}
            {newerData && newerTitle && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 border-dashed opacity-80">
                     <h3 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-tighter">
                        {newerTitle}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                         <div className="text-xs font-bold text-slate-600">Pedidos: {newerData.totalPedidos}</div>
                         <div className="text-xs font-bold text-slate-600">Unidades: {newerData.totalUnidades}</div>
                         <div className="text-xs font-bold text-slate-600">Branca: {newerData.totalUnidadesBranca}</div>
                         <div className="text-xs font-bold text-slate-600">Preta: {newerData.totalUnidadesPreta}</div>
                    </div>
                </div>
            )}

            {/* Seção 2: Resumo de Miúdos (Ciano) */}
            {miudoEntries.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-tighter">Resumo de {miudosTypeName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {miudoEntries.map(([name, qty]) => (
                            <MiudoCard 
                                key={name} 
                                label={name} 
                                value={qty} 
                                unit={name.toLowerCase().includes('embalagem') || name.toLowerCase().includes('saco') ? 'un' : 'kg'} 
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionSummary;
