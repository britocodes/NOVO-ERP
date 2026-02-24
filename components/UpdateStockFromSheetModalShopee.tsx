// components/UpdateStockFromSheetModalShopee.tsx
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { X, FileUp, Loader2, CheckCircle, AlertCircle, Inbox, Link as LinkIcon, PlusCircle, Search, Edit } from 'lucide-react';
import { StockItem } from '../types';

type SheetRow = {
    code: string;
    name: string;
    quantity: number;
    originalRow: any;
};

type LinkedItem = {
    sheetRowIndex: number;
    sheetData: SheetRow;
    stockItemCode: string | null;
    ignored: boolean;
};

type Step = 'upload' | 'linking' | 'confirm' | 'result';

interface UpdateStockFromSheetModalShopeeProps {
    isOpen: boolean;
    onClose: () => void;
    stockItems: StockItem[];
    onBulkInventoryUpdate: (updates: { code: string, quantity: number }[]) => Promise<string>;
}

const UpdateStockFromSheetModalShopee: React.FC<UpdateStockFromSheetModalShopeeProps> = ({ isOpen, onClose, stockItems, onBulkInventoryUpdate }) => {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetData, setSheetData] = useState<SheetRow[]>([]);
    const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    const searchResults = useMemo<StockItem[]>(() => {
        if (!search) return [];
        const searchLower = search.toLowerCase();
        return stockItems.filter((si: StockItem) =>
            si.code.toLowerCase().includes(searchLower) || si.name.toLowerCase().includes(searchLower)
        ).slice(0, 5);
    }, [search, stockItems]);

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
            const codeHeader = header.find(h => h.toLowerCase().includes('código') || h.toLowerCase().includes('sku'));
            const nameHeader = header.find(h => h.toLowerCase().includes('produto') || h.toLowerCase().includes('nome'));
            const qtyHeader = header.find(h => h.toLowerCase().includes('estoque') || h.toLowerCase().includes('quantidade'));

            if (!codeHeader && !nameHeader) throw new Error("A planilha deve conter uma coluna 'Código/SKU' ou 'Produto/Nome'.");
            if (!qtyHeader) throw new Error("A planilha deve conter uma coluna 'Estoque/Quantidade'.");

            const parsedSheetData: SheetRow[] = jsonData
                .filter((r): r is Record<string, any> => typeof r === 'object' && r !== null)
                .map(row => ({
                    code: String(row[codeHeader || ''] || '').trim(),
                    name: String(row[nameHeader || ''] || '').trim(),
                    quantity: parseFloat(String(row[qtyHeader!]) || '0'),
                    originalRow: row,
                })).filter(item => !isNaN(item.quantity) && item.quantity >= 0 && (item.code || item.name));
            
            setSheetData(parsedSheetData);
            
            const stockByCode = new Map<string, StockItem>();
            for (const i of stockItems) {
                stockByCode.set(i.code.toLowerCase(), i);
            }
            
            const stockByName = new Map<string, StockItem>();
            for (const i of stockItems) {
                stockByName.set(i.name.toLowerCase(), i);
            }
            
            const newLinkedItems = parsedSheetData.map((row, index) => {
                let match: StockItem | undefined;
                if (row.code) match = stockByCode.get(row.code.toLowerCase());
                if (!match && row.name) match = stockByName.get(row.name.toLowerCase());

                return {
                    sheetRowIndex: index,
                    sheetData: row,
                    stockItemCode: match?.code || null,
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

    const handleManualLink = (index: number, stockItemCode: string) => {
        setLinkedItems(prev => prev.map((item, i) => i === index ? { ...item, stockItemCode } : item));
        setEditingIndex(null);
        setSearch('');
    };
    
    const handleConfirm = async () => {
        setIsProcessing(true);
        const updates = linkedItems
            .filter(item => !item.ignored && item.stockItemCode)
            .map(item => ({ code: item.stockItemCode!, quantity: item.sheetData.quantity }));
        
        const result = await onBulkInventoryUpdate(updates);
        setResultMessage(result);
        setStep('result');
        setIsProcessing(false);
    };
    
    const unlinkedCount = linkedItems.filter(i => !i.stockItemCode && !i.ignored).length;
    const toUpdateCount = linkedItems.filter(i => i.stockItemCode && !i.ignored).length;
    const ignoredCount = linkedItems.filter(i => i.ignored).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800">Inventário Inicial por Planilha (Shopee)</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>

                {step === 'upload' && (
                     <label htmlFor="sheet-file-upload" className="w-full">
                            <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                {isProcessing ? <Loader2 className="animate-spin h-8 w-8 text-blue-600"/> : <FileUp size={40} className="text-gray-400 mb-2"/>}
                                <p className="font-semibold text-blue-600">{isProcessing ? 'Processando...' : 'Clique para selecionar a planilha'}</p>
                                <input id="sheet-file-upload" type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" disabled={isProcessing}/>
                            </div>
                        </label>
                )}
                
                {step === 'linking' && (
                    <div className="flex-grow overflow-auto">
                        <p className="text-sm mb-4">Revise os vínculos automáticos. Itens não vinculados não serão atualizados. Você pode ignorar linhas desmarcando a caixa de seleção.</p>
                        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 sticky top-0"><tr>{['', 'Planilha: Código/SKU', 'Planilha: Produto', 'Planilha: Estoque Inicial', 'Item Vinculado no Sistema', ''].map(h=><th key={h} className="p-2 text-left font-semibold text-gray-600">{h}</th>)}</tr></thead>
                                <tbody className="divide-y">
                                    {linkedItems.map((item, index) => {
                                        const linkedStockItem = item.stockItemCode ? stockItems.find(si => si.code === item.stockItemCode) : null;
                                        const isEditingThisRow = editingIndex === index;
                                        
                                        return (
                                            <tr key={index} className={item.ignored ? 'bg-gray-200 opacity-50' : 'hover:bg-gray-50'}>
                                                <td className="p-2"><input type="checkbox" checked={!item.ignored} onChange={() => handleToggleIgnore(index)} className="h-4 w-4"/></td>
                                                <td className="p-2 font-mono text-xs">{item.sheetData.code}</td>
                                                <td className="p-2">{item.sheetData.name}</td>
                                                <td className="p-2 font-bold">{item.sheetData.quantity}</td>
                                                <td className="p-2 relative">
                                                    {isEditingThisRow ? (
                                                        <div>
                                                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus className="w-full p-1 border rounded" placeholder="Buscar por código ou nome..."/>
                                                            {search && (
                                                                <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg rounded max-h-40 overflow-y-auto">
                                                                    {searchResults.map(si => <div key={si.id} onClick={() => handleManualLink(index, si.code)} className="p-2 text-xs hover:bg-blue-50 cursor-pointer">{si.name} ({si.code})</div>)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : linkedStockItem ? (
                                                        <div className="flex items-center gap-2 text-green-700 font-semibold"><LinkIcon size={14}/> {linkedStockItem.name}</div>
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
                        <p className="mt-2 text-gray-600">Você está prestes a definir o estoque inicial para <strong className="text-gray-900">{toUpdateCount}</strong> item(ns).</p>
                        <p className="text-gray-600"><strong className="text-gray-900">{ignoredCount}</strong> item(ns) serão ignorados.</p>
                        <p className="mt-4 p-2 bg-yellow-100 text-yellow-800 rounded-md">Esta ação irá <strong>substituir</strong> o saldo atual dos itens selecionados e registrar as diferenças. Deseja continuar?</p>
                    </div>
                )}

                {step === 'result' && (
                    <div className="flex-grow flex flex-col justify-center items-center text-center">
                        <CheckCircle size={48} className="text-green-500 mb-4" />
                        <h3 className="text-lg font-bold">Inventário Atualizado</h3>
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
                                {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mx-auto"/> : 'Confirmar e Atualizar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateStockFromSheetModalShopee;
