
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Search, Plus, Trash2, Package, Scan, ArrowRight, RefreshCw, Loader2 as LucideLoader2 } from 'lucide-react';
import { StockItem, StockPackGroup } from '../types';
import { dbClient } from '../lib/supabaseClient';

// Helper for Loader icon - using explicit name to avoid conflicts if Lucide updates
const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
    <RefreshCw className={`${className} animate-spin`} size={size} />
);

interface PackGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupToEdit: StockPackGroup | null;
    allProducts: StockItem[];
    onSave: (group: Omit<StockPackGroup, 'id'>, id?: string) => Promise<void>;
}

const PackGroupModal: React.FC<PackGroupModalProps> = ({ isOpen, onClose, groupToEdit, allProducts, onSave }) => {
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [minQty, setMinQty] = useState(0);
    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
    const [itemBarcodes, setItemBarcodes] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(groupToEdit?.name || '');
            setBarcode(groupToEdit?.barcode || '');
            setMinQty(groupToEdit?.min_pack_qty || 0);
            
            const initialCodes = groupToEdit?.item_codes || [];
            setSelectedCodes(initialCodes);
            
            // Mapear barcodes atuais dos produtos selecionados
            const initialBarcodes: Record<string, string> = {};
            initialCodes.forEach(code => {
                const product = allProducts.find(p => p.code === code);
                if (product) initialBarcodes[code] = product.barcode || '';
            });
            setItemBarcodes(initialBarcodes);
            setSearchTerm('');
            setIsSaving(false);
        }
    }, [isOpen, groupToEdit, allProducts]);

    const filteredProducts = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return allProducts.filter(p => 
            !selectedCodes.includes(p.code) && 
            (p.name.toLowerCase().includes(lower) || p.code.toLowerCase().includes(lower))
        ).slice(0, 10);
    }, [allProducts, searchTerm, selectedCodes]);

    const toggleCode = (code: string) => {
        if (selectedCodes.includes(code)) {
            setSelectedCodes(prev => prev.filter(c => c !== code));
            setItemBarcodes(prev => {
                const next = { ...prev };
                delete next[code];
                return next;
            });
        } else {
            setSelectedCodes(prev => [...prev, code]);
            const product = allProducts.find(p => p.code === code);
            setItemBarcodes(prev => ({ ...prev, [code]: product?.barcode || '' }));
        }
    };

    const handleItemBarcodeChange = (code: string, newBarcode: string) => {
        setItemBarcodes(prev => ({ ...prev, [code]: newBarcode.toUpperCase() }));
    };

    const handleSave = async () => {
        if (!name.trim() || selectedCodes.length === 0) return;
        
        setIsSaving(true);

        try {
            // 1. Atualizar Barcodes dos Produtos Individuais que foram alterados
            for (const code of selectedCodes) {
                const product = allProducts.find(p => p.code === code);
                const newBarcodeValue = itemBarcodes[code]?.trim();
                
                if (product && product.barcode !== newBarcodeValue) {
                    await dbClient
                        .from('stock_items')
                        .update({ barcode: newBarcodeValue || null })
                        .eq('id', product.id);
                }
            }

            // 2. Salvar o Grupo de Pacotes
            await onSave({
                name: name.trim(),
                barcode: barcode.trim(),
                min_pack_qty: minQty,
                item_codes: selectedCodes
            }, groupToEdit?.id);

            onClose();
        } catch (error) {
            console.error("Erro ao salvar pacote e barcodes:", error);
            alert("Erro ao salvar alterações.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                            <Package className="text-blue-600" />
                            {groupToEdit ? 'Editar Configuração de Pacote' : 'Novo Grupo de Pacotes'}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Defina os itens e seus respectivos códigos de barras</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={24} /></button>
                </div>

                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Cabeçalho do Grupo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome do Grupo (Identificação no Dashboard)</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                placeholder="ex: 5kg Papel Branco Premium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código de Barras do PACOTE (EAN/GTIN)</label>
                            <div className="relative">
                                <input 
                                    ref={barcodeInputRef}
                                    type="text" 
                                    value={barcode} 
                                    onChange={e => setBarcode(e.target.value.toUpperCase())}
                                    className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl font-mono font-bold focus:border-blue-500 outline-none"
                                    placeholder="Escanear etiqueta do fardo..."
                                />
                                <Scan size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meta Mínima de Estoque (Pacotes)</label>
                            <input 
                                type="number" 
                                value={minQty} 
                                onChange={e => setMinQty(Number(e.target.value))}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Lista de Itens com Barcode Individual */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Itens Integrantes do Pacote ({selectedCodes.length})</label>
                        <div className="space-y-2 mb-6">
                            {selectedCodes.map((code: string) => {
                                const prod = allProducts.find(p => p.code === code);
                                return (
                                    <div key={code} className="bg-white border-2 border-slate-100 p-3 rounded-2xl flex items-center gap-4 group hover:border-blue-200 transition-all">
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-slate-700 uppercase truncate">{prod?.name || code}</p>
                                            <p className="text-[9px] font-mono text-slate-400">{code}</p>
                                        </div>
                                        <div className="flex-1 max-w-[200px]">
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    value={itemBarcodes[code] || ''}
                                                    onChange={e => handleItemBarcodeChange(code, e.target.value)}
                                                    placeholder="Barcode SKU..."
                                                    className="w-full pl-8 py-1.5 text-[10px] font-mono font-bold border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                                <Scan size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300"/>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleCode(code)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                );
                            })}
                            {selectedCodes.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed rounded-3xl border-slate-100">
                                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Nenhum item selecionado</p>
                                </div>
                            )}
                        </div>

                        {/* Busca de Produtos */}
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar novos produtos para incluir no pacote..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        {searchTerm && (
                            <div className="mt-2 border rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-top-2">
                                {filteredProducts.map(p => (
                                    <button 
                                        key={p.id} 
                                        onClick={() => toggleCode(p.code)}
                                        className="w-full p-4 text-left hover:bg-blue-50 flex justify-between items-center group bg-white border-b last:border-b-0"
                                    >
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase">{p.name}</p>
                                            <p className="text-[9px] font-mono text-slate-400 uppercase">{p.code}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase">
                                            Adicionar <Plus size={14} />
                                        </div>
                                    </button>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <div className="p-4 text-center bg-white text-xs text-slate-400 font-bold uppercase italic">Nenhum produto disponível</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-slate-50">
                    <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!name.trim() || selectedCodes.length === 0 || isSaving}
                        className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PackGroupModal;
