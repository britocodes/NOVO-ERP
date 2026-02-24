
// components/UpdatePacksFromSheetModal.tsx
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { X, FileUp, Loader2, CheckCircle, AlertCircle, Inbox, Link as LinkIcon, PlusCircle, Search, Edit, Package } from 'lucide-react';
import { StockPackGroup } from '../types';

type SheetRow = {
    barcode: string;
    name: string;
    quantity: number;
    originalRow: any;
};

type LinkedItem = {
    sheetRowIndex: number;
    sheetData: SheetRow;
    packGroupId: string | null;
    ignored: boolean;
};

type Step = 'upload' | 'linking' | 'confirm' | 'result';

interface UpdatePacksFromSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    packGroups: StockPackGroup[];
    onBulkInventoryUpdate: (updates: { code: string, quantity: number }[]) => Promise<string>;
}

const UpdatePacksFromSheetModal: React.FC<UpdatePacksFromSheetModalProps> = ({ isOpen, onClose, packGroups, onBulkInventoryUpdate }) => {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetData, setSheetData] = useState<SheetRow[]>([]);
    const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    const searchResults = useMemo<StockPackGroup[]>(() => {
        if (!search) return [];
        const searchLower = search.toLowerCase();
        return packGroups.filter((pg: StockPackGroup) =>
            pg.name.toLowerCase().includes(searchLower) || (pg.barcode && pg.barcode.toLowerCase().includes(searchLower))
        ).slice(0, 5); 
    }, [search, packGroups]);

    const resetState = () => {
        setStep('upload');
        setFile(null);
        setIsProcessing(false);
        setError(null);
        setSheetData([]);
        setLinkedItems([]);
        setResultMessage(null);
        setEditingIndex(null);
        setSearch('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        resetState();
        setFile(selectedFile);
        setIsProcessing(true);
        
        try {
            const fileBuffer = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(fileBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                throw new Error("A planilha está vazia ou em um formato não reconhecido.");
            }
            
            const firstRow = jsonData[0] || {};
            const header = Object.keys(firstRow);
            const barcodeHeader = header.find(h => h.toLowerCase().includes('código') || h.toLowerCase().includes('barcode') || h.toLowerCase().includes('sku'));
            const nameHeader = header.find(h => h.toLowerCase().includes('produto') || h.toLowerCase().includes('nome') || h.toLowerCase().includes('pacote'));
            const qtyHeader = header.find(h => h.toLowerCase().includes('estoque') || h.toLowerCase().includes('quantidade') || h.toLowerCase().includes('contagem'));

            if (!qtyHeader) throw new Error("A planilha deve conter uma coluna 'Estoque/Quantidade/Contagem'.");

            const parsedSheetData: SheetRow[] = jsonData
                .filter((r): r is Record<string, any> => typeof r === 'object' && r !== null)
                .map(row => ({
                    barcode: String(row[barcodeHeader || ''] || '').trim().toUpperCase(),
                    name: String(row[nameHeader || ''] || '').trim(),
                    quantity: parseFloat(String(row[qtyHeader!]) || '0'),
                    originalRow: row,
                })).filter(item => !isNaN(item.quantity) && item.quantity > 0 && (item.barcode || item.name));
            
            setSheetData(parsedSheetData);
            
            const packByBarcode = new Map<string, StockPackGroup>();
            packGroups.forEach(pg => {
                if (pg.barcode) packByBarcode.set(pg.barcode.toUpperCase(), pg);
            });
            
            const packByName = new Map<string, StockPackGroup>();
            packGroups.forEach(pg => {
                packByName.set(pg.name.toLowerCase(), pg);
            });
            
            const newLinkedItems = parsedSheetData.map((row, index) => {
                let match: StockPackGroup | undefined;
                if (row.barcode) match = packByBarcode.get(row.barcode);
                if (!match && row.name) match = packByName.get(row.name.toLowerCase());

                return {
                    sheetRowIndex: index,
                    sheetData: row,
                    packGroupId: match?.id || null,
                    ignored: false,
                };
            });
            setLinkedItems(newLinkedItems);
            setStep('linking');

        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro desconhecido.');
            setStep('upload');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleToggleIgnore = (index: number) => {
        setLinkedItems(prev => prev.map((item, i) => i === index ? { ...item, ignored: !item.ignored } : item));
    };

    const handleManualLink = (index: number, packGroupId: string) => {
        setLinkedItems(prev => prev.map((item, i) => i === index ? { ...item, packGroupId } : item));
        setEditingIndex(null);
        setSearch('');
    };
    
    const handleConfirm = async () => {
        setIsProcessing(true);
        
        // Calculate total items to update based on packs
        const itemUpdatesMap = new Map<string, number>();

        linkedItems.forEach(item => {
            if (item.ignored || !item.packGroupId) return;
            
            const packGroup = packGroups.find(pg => pg.id === item.packGroupId);
            if (!packGroup) return;

            // For each item in the pack, add (quantity of packs * 1) to the item update
            // Assuming 1 unit of each item per pack based on current architecture
            packGroup.item_codes.forEach(code => {
                const currentQty = itemUpdatesMap.get(code) || 0;
                itemUpdatesMap.set(code, currentQty + item.sheetData.quantity);
            });
        });

        const updates = Array.from(itemUpdatesMap.entries()).map(([code, quantity]) => ({ code, quantity }));
        
        if (updates.length === 0) {
            setResultMessage("Nenhum item para atualizar.");
        } else {
            const result = await onBulkInventoryUpdate(updates);
            setResultMessage(result + ` (Baseado na contagem de pacotes)`);
        }
        
        setStep('result');
        setIsProcessing(false);
    };
    
    const unlinkedCount = linkedItems.filter(i => !i.packGroupId && !i.ignored).length;
    const toUpdateCount = linkedItems.filter(i => i.packGroupId && !i.ignored).length;
    const ignoredCount = linkedItems.filter(i => i.ignored).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Package className="mr-2 text-blue-600" />
                        Entrada de Pacotes via Planilha
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>

                {step === 'upload' && (
                     <label htmlFor="pack-sheet-upload" className="w-full">
                            <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                {isProcessing ? <Loader2 className="animate-spin h-8 w-8 text-blue-600"/> : <FileUp size={40} className="text-gray-400 mb-2"/>}
                                <p className="font-semibold text-blue-600">{isProcessing ? 'Processando...' : 'Clique para selecionar a planilha'}</p>
                                <p className="text-xs text-gray-400 mt-2">Colunas esperadas: Código/Barcode, Nome (opcional), Quantidade</p>
                                <input id="pack-sheet-upload" type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" disabled={isProcessing}/>
                            </div>
                        </label>
                )}
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                
                {step === 'linking' && (
                    <div className="flex-grow overflow-auto">
                        <p className="text-sm mb-4 bg-blue-50 p-2 rounded text-blue-800 border border-blue-100">
                            <strong>Atenção:</strong> Esta ferramenta dará entrada nos itens individuais que compõem cada pacote.
                            Por exemplo, se um pacote contém "Item A" e "Item B", e você adicionar 10 pacotes, serão adicionados 10 "Item A" e 10 "Item B" ao estoque.
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 sticky top-0"><tr>{['', 'Código/Barcode', 'Nome (Planilha)', 'Qtd Pacotes', 'Pacote Vinculado', ''].map(h=><th key={h} className="p-2 text-left font-semibold text-gray-600">{h}</th>)}</tr></thead>
                                <tbody className="divide-y">
                                    {linkedItems.map((item, index) => {
                                        const linkedGroup = item.packGroupId ? packGroups.find(pg => pg.id === item.packGroupId) : null;
                                        const isEditingThisRow = editingIndex === index;
                                        
                                        return (
                                            <tr key={index} className={item.ignored ? 'bg-gray-200 opacity-50' : 'hover:bg-gray-50'}>
                                                <td className="p-2"><input type="checkbox" checked={!item.ignored} onChange={() => handleToggleIgnore(index)} className="h-4 w-4"/></td>
                                                <td className="p-2 font-mono text-xs">{item.sheetData.barcode}</td>
                                                <td className="p-2">{item.sheetData.name}</td>
                                                <td className="p-2 font-bold">{item.sheetData.quantity}</td>
                                                <td className="p-2 relative">
                                                    {isEditingThisRow ? (
                                                        <div>
                                                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus className="w-full p-1 border rounded" placeholder="Buscar pacote..."/>
                                                            {search && (
                                                                <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg rounded max-h-40 overflow-y-auto">
                                                                    {searchResults.map(pg => <div key={pg.id} onClick={() => handleManualLink(index, pg.id)} className="p-2 text-xs hover:bg-blue-50 cursor-pointer">{pg.name}</div>)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : linkedGroup ? (
                                                        <div className="flex items-center gap-2 text-green-700 font-semibold"><LinkIcon size={14}/> {linkedGroup.name}</div>
                                                    ) : (
                                                        <span className="text-red-600 font-semibold">Não vinculado</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {isEditingThisRow ? (
                                                        <button onClick={() => setEditingIndex(null)} className="px-2 py-1 text-xs bg-gray-200 rounded">Cancelar</button>
                                                    ) : (
                                                        <button onClick={() => { setEditingIndex(index); setSearch(''); }} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Edit size={12}/> Alterar</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                 {step === 'confirm' && (
                    <div className="flex-grow flex flex-col justify-center items-center text-center">
                        <CheckCircle size={48} className="text-green-500 mb-4" />
                        <h3 className="text-lg font-bold">Resumo da Operação</h3>
                        <p className="mt-2 text-gray-600">Você está prestes a dar entrada nos itens de <strong className="text-gray-900">{toUpdateCount}</strong> tipos de pacotes.</p>
                        <p className="text-gray-600"><strong className="text-gray-900">{ignoredCount}</strong> linhas ignoradas.</p>
                        <p className="mt-4 p-2 bg-yellow-100 text-yellow-800 rounded-md">Esta ação irá <strong>SOMAR</strong> ao saldo atual dos itens.</p>
                    </div>
                )}

                {step === 'result' && (
                    <div className="flex-grow flex flex-col justify-center items-center text-center">
                        <CheckCircle size={48} className="text-green-500 mb-4" />
                        <h3 className="text-lg font-bold">Estoque Atualizado</h3>
                        <p className="mt-2 text-gray-600 bg-gray-100 p-3 rounded-md">{resultMessage}</p>
                    </div>
                )}

                <div className="flex-shrink-0 mt-6 flex justify-between items-center border-t pt-4">
                    <span>{file?.name || ''}</span>
                    <div className="flex space-x-3">
                        <button onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded-md">
                            {step === 'result' ? 'Fechar' : 'Cancelar'}
                        </button>
                        {step === 'linking' && (
                             <button onClick={() => setStep('confirm')} disabled={toUpdateCount === 0} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md disabled:opacity-50">
                                Revisar e Confirmar ({toUpdateCount})
                            </button>
                        )}
                         {step === 'confirm' && (
                             <button onClick={handleConfirm} disabled={isProcessing} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md disabled:opacity-50 min-w-[120px]">
                                {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mx-auto"/> : 'Confirmar Entrada'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatePacksFromSheetModal;
