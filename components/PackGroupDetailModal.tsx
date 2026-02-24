
import React, { useMemo } from 'react';
import { X, Box, AlertTriangle, CheckCircle2, ArrowRight, Settings } from 'lucide-react';
import { StockItem, StockPackGroup } from '../types';

interface PackGroupDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: StockPackGroup | null;
    stockItems: StockItem[];
    onEdit: (group: StockPackGroup) => void;
}

const PackGroupDetailModal: React.FC<PackGroupDetailModalProps> = ({ isOpen, onClose, group, stockItems, onEdit }) => {
    if (!isOpen || !group) return null;

    const items = useMemo(() => {
        return group.item_codes.map(code => {
            const item = stockItems.find(i => i.code === code);
            const currentStock = item?.current_qty || 0;
            // A disponibilidade é baseada na meta do pacote ou no mínimo individual
            const target = group.min_pack_qty || item?.min_qty || 1;
            const percentage = Math.min(100, (currentStock / target) * 100);
            
            return {
                code,
                name: item?.name || 'Item não encontrado',
                currentStock,
                percentage,
                isLow: currentStock < target
            };
        }).sort((a, b) => a.percentage - b.percentage); // Itens críticos primeiro
    }, [group, stockItems]);

    const groupTotal = items.reduce((sum, i) => sum + i.currentStock, 0);
    const overallPercentage = Math.min(100, (groupTotal / (group.min_pack_qty || 1)) * 100);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b flex justify-between items-start bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <Box className="text-blue-600" />
                            {group.name}
                        </h2>
                        <div className="flex gap-2 mt-1">
                            {group.barcode && <span className="text-[10px] font-mono font-bold bg-white border px-2 py-0.5 rounded text-slate-500 uppercase">{group.barcode}</span>}
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detalhes de Disponibilidade</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full border shadow-sm hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Resumo Geral */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Estoque Total</p>
                            <p className="text-3xl font-black text-blue-700">{groupTotal.toFixed(0)} <span className="text-xs">UN</span></p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Meta de Estoque</p>
                            <p className="text-3xl font-black text-slate-700">{group.min_pack_qty} <span className="text-xs">UN</span></p>
                        </div>
                    </div>

                    {/* Barra de Progresso Geral */}
                    <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                            <span className="text-slate-400">Capacidade de Produção</span>
                            <span className={overallPercentage < 100 ? 'text-orange-500' : 'text-emerald-500'}>{overallPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border">
                            <div className={`h-full transition-all duration-1000 ${overallPercentage < 50 ? 'bg-red-500' : overallPercentage < 100 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${overallPercentage}%` }} />
                        </div>
                    </div>

                    {/* Lista de Itens Individuais */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b pb-2">Composição do Pacote ({items.length} Itens)</p>
                        <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {items.map(item => (
                                <div key={item.code} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between group hover:border-blue-200 transition-all">
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-700 uppercase truncate">{item.name}</p>
                                        <p className="text-[9px] font-mono text-slate-400">{item.code}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <div>
                                            <p className={`text-sm font-black ${item.isLow ? 'text-red-500' : 'text-slate-700'}`}>{item.currentStock.toFixed(0)} <span className="text-[9px]">UN</span></p>
                                            <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div className={`h-full ${item.percentage < 50 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${item.percentage}%` }} />
                                            </div>
                                        </div>
                                        {item.isLow ? <AlertTriangle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
                    <button 
                        onClick={() => onEdit(group)}
                        className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                    >
                        <Settings size={16}/> Configurar Itens
                    </button>
                    <button 
                        onClick={onClose}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PackGroupDetailModal;
