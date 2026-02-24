// components/ImportXmlModal.tsx
import React, { useState, useMemo } from 'react';
import { X, FileUp, Loader2, CheckCircle, AlertCircle, Inbox, Link, PlusCircle, Search, Edit } from 'lucide-react';
import { parseNFeXML } from '../lib/xmlParser';
import { StockItem, ParsedNfeItem, StockItemKind, GeneralSettings } from '../types';
import { getMultiplicadorFromSku } from '../lib/sku';

type Action = 'none' | 'link' | 'create';

interface ResolvedNfeItem extends ParsedNfeItem {
    finalQuantity: number;
    action: Action;
    linkTo?: string; // code of the existing stock item
    createName: string; // Add this for editable name
    createKind?: StockItemKind;
    createCategory?: string;
}

interface ImportXmlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmImport: (payload: { itemsToCreate: any[], itemsToUpdate: any[] }) => void;
    existingStockItems: StockItem[];
    generalSettings: GeneralSettings;
}

const ImportXmlModal: React.FC<ImportXmlModalProps> = ({ isOpen, onClose, onConfirmImport, existingStockItems, generalSettings }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [itemsToUpdate, setItemsToUpdate] = useState<ParsedNfeItem[]>([]);
    const [itemsToResolve, setItemsToResolve] = useState<ResolvedNfeItem[]>([]);
    
    const [linkSearchTerms, setLinkSearchTerms] = useState<Record<string, string>>({});

    const existingCodes = useMemo(() => new Set(existingStockItems.map(i => i.code)), [existingStockItems]);

    const resetState = () => {
        setFile(null);
        setIsParsing(false);
        setError(null);
        setItemsToUpdate([]);
        setItemsToResolve([]);
        setLinkSearchTerms({});
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'text/xml' && !selectedFile.name.toLowerCase().endsWith('.xml')) {
            setError('Por favor, selecione um arquivo .xml válido.');
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setIsParsing(true);
        setError(null);

        try {
            const xmlString = await selectedFile.text();
            const parsedItems = await parseNFeXML(xmlString);
            
            const toUpdate: ParsedNfeItem[] = [];
            const toResolve: ResolvedNfeItem[] = [];

            parsedItems.forEach(item => {
                const multiplicador = getMultiplicadorFromSku(item.name);
                const finalQuantity = item.quantity * multiplicador;

                if (existingCodes.has(item.code)) {
                    toUpdate.push({ ...item, quantity: finalQuantity });
                } else {
                    toResolve.push({ ...item, finalQuantity, action: 'none', createName: item.name });
                }
            });

            setItemsToUpdate(toUpdate);
            setItemsToResolve(toResolve);

        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro desconhecido.');
        } finally {
            setIsParsing(false);
        }
    };
    
    const handleActionChange = (itemCode: string, action: Action) => {
        setItemsToResolve(prev => prev.map(item => item.code === itemCode ? { ...item, action } : item));
    };

    const handleLinkToChange = (itemCode: string, linkTo: string) => {
        setItemsToResolve(prev => prev.map(item => item.code === itemCode ? { ...item, linkTo } : item));
    };
    
    const handleCreateDetailChange = (itemCode: string, field: 'createName' | 'createKind' | 'createCategory', value: string) => {
        setItemsToResolve(prev => prev.map(item => item.code === itemCode ? { ...item, [field]: value } : item));
    };


    const handleConfirm = () => {
        const itemsToCreate = itemsToResolve
            .filter(item => item.action === 'create' && item.createKind)
            .map(item => ({
                code: item.code,
                name: item.createName,
                kind: item.createKind!,
                unit: item.unit,
                initial_qty: item.finalQuantity,
                min_qty: 0,
                category: item.createKind === 'INSUMO' ? item.createCategory : undefined,
            }));

        const linkedItems = itemsToResolve
            .filter(item => item.action === 'link' && item.linkTo)
            .map(item => ({
                stockItemCode: item.linkTo!,
                quantityDelta: item.finalQuantity
            }));

        const itemsToUpdatePayload = [
            ...itemsToUpdate.map(item => ({ stockItemCode: item.code, quantityDelta: item.quantity })),
            ...linkedItems
        ];

        onConfirmImport({ itemsToCreate, itemsToUpdate: itemsToUpdatePayload });
        handleClose();
    };

    const handleClose = () => {
        resetState();
        onClose();
    };
    
    const allResolved = itemsToResolve.every(item => item.action !== 'none');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0 flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <FileUp className="mr-2 text-green-600" />
                        Importar Estoque de NFe (XML)
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {!file && (
                         <label htmlFor="xml-file-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <FileUp size={40} className="text-gray-400 mb-2"/>
                            <p className="font-semibold text-blue-600">Clique para selecionar o arquivo XML</p>
                            <p className="text-sm text-gray-500">ou arraste e solte aqui</p>
                            <input id="xml-file-upload" type="file" accept=".xml,text/xml" onChange={handleFileChange} className="hidden"/>
                        </label>
                    )}

                    {isParsing && <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin h-5 w-5 mr-3" /> Processando...</div>}
                    {error && <div className="p-3 bg-red-100 text-red-800 border border-red-300 rounded-md text-sm"><strong>Erro:</strong> {error}</div>}

                    {itemsToResolve.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-yellow-800 mb-2">Itens que precisam de ação ({itemsToResolve.length})</h3>
                            <div className="space-y-3">
                                {itemsToResolve.map(item => (
                                    <div key={item.code} className="bg-yellow-50 p-3 border border-yellow-200 rounded-lg space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold">{item.name}</p>
                                                <p className="text-xs font-mono text-gray-600">{item.code} | Qtd: {item.finalQuantity} {item.unit}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleActionChange(item.code, 'link')} className={`px-2 py-1 text-xs rounded ${item.action === 'link' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Vincular</button>
                                                <button onClick={() => handleActionChange(item.code, 'create')} className={`px-2 py-1 text-xs rounded ${item.action === 'create' ? 'bg-green-600 text-white' : 'bg-white'}`}>Criar Novo</button>
                                            </div>
                                        </div>
                                        {item.action === 'link' && (
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar item existente..."
                                                    value={linkSearchTerms[item.code] || ''}
                                                    onChange={e => setLinkSearchTerms(prev => ({ ...prev, [item.code]: e.target.value }))}
                                                    className="w-full pl-7 p-1 border rounded"
                                                />
                                                 {(linkSearchTerms[item.code] || '').length > 1 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg rounded max-h-40 overflow-y-auto">
                                                        {existingStockItems
                                                            .filter(stock => stock.name.toLowerCase().includes((linkSearchTerms[item.code] || '').toLowerCase()) || stock.code.toLowerCase().includes((linkSearchTerms[item.code] || '').toLowerCase()))
                                                            .map(stock => (
                                                                <div key={stock.id} onClick={() => { handleLinkToChange(item.code, stock.code); setLinkSearchTerms(p => ({...p, [item.code]: stock.name})) }} className="p-2 hover:bg-gray-100 cursor-pointer text-xs">
                                                                    {stock.name} ({stock.code})
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {item.action === 'create' && (
                                            <div className="space-y-2 bg-green-100 p-2 rounded-md">
                                                <div className="relative">
                                                     <label className="text-xs font-medium">Nome do Novo Item</label>
                                                     <input type="text" value={item.createName} onChange={e => handleCreateDetailChange(item.code, 'createName', e.target.value)} className="w-full p-1 border rounded mt-1"/>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <label className="text-sm font-medium">Tipo:</label>
                                                    <select value={item.createKind || ''} onChange={e => handleCreateDetailChange(item.code, 'createKind', e.target.value)} className="p-1 border rounded bg-white">
                                                        <option value="" disabled>Selecione...</option>
                                                        <option value="INSUMO">Insumo</option>
                                                        <option value="PROCESSADO">Processado</option>
                                                        <option value="PRODUTO">Produto</option>
                                                    </select>
                                                    {item.createKind === 'INSUMO' && (
                                                        <>
                                                            <label className="text-sm font-medium ml-2">Categoria:</label>
                                                            <select value={item.createCategory || ''} onChange={e => handleCreateDetailChange(item.code, 'createCategory', e.target.value)} className="p-1 border rounded bg-white">
                                                                <option value="" disabled>Selecione...</option>
                                                                {(generalSettings.insumoCategoryList || []).map(cat => (
                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                ))}
                                                            </select>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {itemsToUpdate.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-green-800 mb-2">Itens com SKU correspondente ({itemsToUpdate.length})</h3>
                            <div className="border rounded-lg max-h-60 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-100 sticky top-0"><tr>{['Código', 'Nome', 'Qtd a Adicionar'].map(h=><th key={h} className="p-2 text-left font-semibold text-gray-600">{h}</th>)}</tr></thead>
                                    <tbody className="divide-y">
                                        {itemsToUpdate.map(item => (
                                            <tr key={item.code} className="bg-green-50">
                                                <td className="p-2 font-mono text-xs">{item.code}</td>
                                                <td className="p-2">{item.name}</td>
                                                <td className="p-2 font-bold text-center">{item.quantity.toFixed(2)} {item.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 mt-6 flex justify-end space-x-3 border-t pt-4">
                    <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!allResolved || isParsing || (!itemsToUpdate.length && !itemsToResolve.length)} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50">
                        Confirmar Importação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportXmlModal;