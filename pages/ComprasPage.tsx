import React, { useState, useMemo } from 'react';
import { ShoppingListItem, StockItem } from '../types';
import { ListPlus, Trash2, Share2, Info, Search, PlusCircle, FileDown, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
// FIX: Changed import to correctly import autoTable as a function.
import autoTable from 'jspdf-autotable';

interface ComprasPageProps {
    shoppingList: ShoppingListItem[];
    onClearList: () => void;
    onUpdateItem: (itemCode: string, isPurchased: boolean) => void;
    stockItems: StockItem[];
}

const ComprasPage: React.FC<ComprasPageProps> = ({ shoppingList, onClearList, onUpdateItem, stockItems }) => {

    // --- State for Manual List ---
    const [manualList, setManualList] = useState<ShoppingListItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [selectedInsumo, setSelectedInsumo] = useState<StockItem | null>(null);

    // --- Logic for Planning List ---
    const handleSharePlanning = () => {
        if (shoppingList.length === 0) return;
        let text = `*Lista de Compras - ${new Date().toLocaleDateString('pt-BR')}*\n\n`;
        text += "*PENDENTES:*\n";
        shoppingList.filter(i => !i.is_purchased).forEach(item => {
            text += `- ${item.name}: ${item.quantity.toFixed(2)} ${item.unit}\n`;
        });
        text += "\n*COMPRADOS:*\n";
        shoppingList.filter(i => i.is_purchased).forEach(item => {
            text += `~- ${item.name}: ${item.quantity.toFixed(2)} ${item.unit}~\n`;
        });

        const encodedText = encodeURIComponent(text);
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleClearPlanning = () => {
        if(window.confirm('Tem certeza que deseja limpar a lista de compras do planejamento? Esta ação não pode ser desfeita.')) {
            onClearList();
        }
    };

    const sortedPlanningList = [...shoppingList].sort((a, b) => {
        if (a.is_purchased && !b.is_purchased) return 1;
        if (!a.is_purchased && b.is_purchased) return -1;
        return a.name.localeCompare(b.name);
    });

    // --- Logic for Manual List ---
    const insumos = useMemo(() => stockItems.filter(item => item.kind === 'INSUMO'), [stockItems]);

    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return insumos.filter(insumo => 
            !manualList.some(item => item.id === insumo.code) &&
            (insumo.name.toLowerCase().includes(lowerSearchTerm) || insumo.code.toLowerCase().includes(lowerSearchTerm))
        ).slice(0, 5); // Limit results for performance
    }, [searchTerm, insumos, manualList]);

    const handleSelectInsumo = (insumo: StockItem) => {
        setSelectedInsumo(insumo);
        setSearchTerm('');
    };

    const handleAddToManualList = () => {
        if (selectedInsumo && quantity > 0) {
            setManualList(prev => [...prev, {
                id: selectedInsumo.code,
                name: selectedInsumo.name,
                quantity: quantity,
                unit: selectedInsumo.unit
            }]);
            setSelectedInsumo(null);
            setQuantity(1);
        }
    };

    const handleRemoveFromManualList = (itemCode: string) => {
        setManualList(prev => prev.filter(item => item.id !== itemCode));
    };

    const handleClearManualList = () => {
        if (window.confirm('Tem certeza que deseja limpar a lista manual?')) {
            setManualList([]);
        }
    };

    const generatePdfForManualList = (action: 'download' | 'print') => {
        if (manualList.length === 0) return;
        const doc = new jsPDF();
        doc.text(`Lista de Compras Manual - ${new Date().toLocaleDateString('pt-BR')}`, 14, 15);
        
        autoTable(doc, {
            startY: 20,
            head: [['Item', 'Quantidade', 'Unidade']],
            body: manualList.map(item => [item.name, item.quantity.toString(), item.unit]),
            theme: 'striped',
        });
        
        if (action === 'download') {
            doc.save('lista_compras_manual.pdf');
        } else {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        }
    };
    
    const handleShareManual = () => {
        if (manualList.length === 0) return;
        let text = `*Lista de Compras Manual - ${new Date().toLocaleDateString('pt-BR')}*\n\n`;
        manualList.forEach(item => {
            text += `- ${item.name}: ${item.quantity} ${item.unit}\n`;
        });
        const encodedText = encodeURIComponent(text);
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Compras</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Planning Shopping List */}
                <div className="space-y-4">
                    <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm w-full">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
                                <ListPlus size={20} className="mr-2 text-[var(--color-primary)]" />
                                Lista de Compras do Planejamento
                            </h2>
                            <div className="flex items-center gap-2">
                                <button onClick={handleClearPlanning} disabled={shoppingList.length === 0} className="flex items-center gap-1 text-xs py-1 px-2 bg-gray-500 text-white font-semibold rounded-md hover:bg-gray-600 disabled:opacity-50">
                                    <Trash2 size={14}/> Limpar
                                </button>
                                <button onClick={handleSharePlanning} disabled={shoppingList.length === 0} className="flex items-center gap-1 text-xs py-1 px-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50">
                                    <Share2 size={14}/> WhatsApp
                                </button>
                            </div>
                        </div>
                        {sortedPlanningList.length > 0 ? (
                            <div className="space-y-3 md:hidden">
                                {sortedPlanningList.map(item => (
                                    <div key={item.id} className={`p-3 rounded-lg border ${item.is_purchased ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white'}`}>
                                        <div className="flex items-center justify-between">
                                            <p className={`font-medium ${item.is_purchased ? 'line-through' : ''}`}>{item.name}</p>
                                            <input type="checkbox" checked={!!item.is_purchased} onChange={() => onUpdateItem(item.id, !item.is_purchased)} className="h-5 w-5 rounded"/>
                                        </div>
                                        <p className={`font-bold mt-1 ${item.is_purchased ? 'line-through' : 'text-red-600'}`}>{item.quantity.toFixed(2)} {item.unit}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 px-4 border-2 border-dashed border-[var(--color-border)] rounded-lg">
                                <p className="font-semibold text-[var(--color-text-primary)]">Lista de compras do planejamento está vazia.</p>
                                <p className="text-[var(--color-text-secondary)]">Vá para a tela de <span className="font-bold">Planejamento</span> para gerar uma nova lista.</p>
                            </div>
                        )}
                        <div className="hidden md:block overflow-x-auto rounded-lg border border-[var(--color-border)] max-h-96">
                                 <table className="min-w-full bg-[var(--color-surface)] text-sm">
                                    <thead className="bg-[var(--color-surface-secondary)] sticky top-0">
                                        <tr>
                                            <th className="py-2 px-3 w-12 text-center font-semibold text-[var(--color-text-secondary)]">Comprado</th>
                                            {['Insumo', 'Quantidade a Comprar'].map(h => 
                                                <th key={h} className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {sortedPlanningList.map(item => (
                                            <tr key={item.id} className={item.is_purchased ? 'bg-[var(--color-success-bg)] opacity-60' : 'hover:bg-[var(--color-surface-secondary)]'}>
                                                <td className="py-2 px-3 text-center">
                                                    <input type="checkbox" checked={!!item.is_purchased} onChange={() => onUpdateItem(item.id, !item.is_purchased)} className="h-5 w-5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"/>
                                                </td>
                                                <td className={`py-2 px-3 font-medium ${item.is_purchased ? 'line-through' : ''}`}>{item.name}</td>
                                                <td className={`py-2 px-3 font-bold ${item.is_purchased ? 'line-through' : 'text-red-600'}`}>{item.quantity.toFixed(2)} {item.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                    </div>
                    <div className="p-4 bg-[var(--color-info-bg)] text-[var(--color-info-text)] border border-[var(--color-info-border)] rounded-lg flex items-center gap-3">
                        <Info size={20}/>
                        <p className="text-sm">Esta lista é preenchida automaticamente pela tela de Planejamento com os insumos que possuem déficit.</p>
                    </div>
                </div>

                {/* Manual Shopping List */}
                <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm w-full">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center">
                        <PlusCircle size={20} className="mr-2 text-[var(--color-primary)]" />
                        Criar Lista de Compras Manual
                    </h2>
                    
                    <div className="relative mb-4">
                        <div className="p-3 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg space-y-2">
                             {selectedInsumo ? (
                                <div className="flex items-end gap-2">
                                    <div className="flex-grow">
                                        <label className="text-xs font-medium">Item</label>
                                        <p className="font-semibold p-2 bg-[var(--color-surface)] rounded border border-[var(--color-border)]">{selectedInsumo.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium">Qtd.</label>
                                        <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-24 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md" min="1"/>
                                    </div>
                                    <button onClick={handleAddToManualList} className="px-3 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"><PlusCircle size={16}/></button>
                                </div>
                             ) : (
                                <div>
                                    <label className="text-xs font-medium">Buscar Insumo</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" placeholder="Digite para buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border-[var(--color-border)] bg-[var(--color-surface)] rounded-md"/>
                                    </div>
                                </div>
                             )}
                        </div>
                         {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(insumo => (
                                    <div key={insumo.id} className="p-2 hover:bg-[var(--color-surface-secondary)] cursor-pointer border-b" onClick={() => handleSelectInsumo(insumo)}>
                                        <p className="font-semibold">{insumo.name}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">{insumo.code}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="md:hidden space-y-2">
                        {manualList.map(item => (
                            <div key={item.id} className="p-3 bg-white border rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{item.name}</p>
                                    <p className="font-bold">{item.quantity} {item.unit}</p>
                                </div>
                                <button onClick={() => handleRemoveFromManualList(item.id)} className="p-1 text-red-500"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-lg border border-[var(--color-border)] max-h-80">
                        <table className="min-w-full bg-[var(--color-surface)] text-sm">
                            <thead className="bg-[var(--color-surface-secondary)] sticky top-0">
                                <tr>
                                    {['Insumo', 'Quantidade', 'Ação'].map(h => <th key={h} className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {manualList.length > 0 ? manualList.map(item => (
                                    <tr key={item.id}>
                                        <td className="py-2 px-3 font-medium">{item.name}</td>
                                        <td className="py-2 px-3 font-bold">{item.quantity} {item.unit}</td>
                                        <td className="py-2 px-3"><button onClick={() => handleRemoveFromManualList(item.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={3} className="text-center py-8 text-[var(--color-text-secondary)]">Adicione insumos para criar sua lista.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                       <button onClick={() => generatePdfForManualList('download')} disabled={manualList.length === 0} className="flex items-center gap-1 text-xs py-1 px-2 bg-red-100 text-red-700 font-semibold rounded-md hover:bg-red-200 disabled:opacity-50"><FileDown size={14}/> PDF</button>
                       <button onClick={() => generatePdfForManualList('print')} disabled={manualList.length === 0} className="flex items-center gap-1 text-xs py-1 px-2 bg-blue-100 text-blue-700 font-semibold rounded-md hover:bg-blue-200 disabled:opacity-50"><Printer size={14}/> Imprimir</button>
                       <button onClick={handleShareManual} disabled={manualList.length === 0} className="flex items-center gap-1 text-xs py-1 px-2 bg-green-100 text-green-700 font-semibold rounded-md hover:bg-green-200 disabled:opacity-50"><Share2 size={14}/> WhatsApp</button>
                       <button onClick={handleClearManualList} disabled={manualList.length === 0} className="flex items-center gap-1 text-xs py-1 px-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 disabled:opacity-50 ml-auto"><Trash2 size={14}/> Limpar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComprasPage;
