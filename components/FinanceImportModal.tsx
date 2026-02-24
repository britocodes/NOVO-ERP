
import React, { useState } from 'react';
import { X, FileUp, Loader2, CheckCircle2, Settings, AlertTriangle, Layers, Database, Globe, Calendar } from 'lucide-react';
import { GeneralSettings, OrderItem, ProcessedData, Canal } from '../types';
import { parseExcelFile } from '../lib/parser';
import { parseSalesNFeXML, extractXmlsFromZip } from '../lib/xmlParser';

interface FinanceImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    allOrders: OrderItem[];
    generalSettings: GeneralSettings;
    onLaunchOrders: (orders: OrderItem[]) => Promise<void>;
}

type ImportType = 'finance_only' | 'full_import';

const FinanceImportModal: React.FC<FinanceImportModalProps> = ({ isOpen, onClose, allOrders, generalSettings, onLaunchOrders }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importType, setImportType] = useState<ImportType>('finance_only');
    const [resultSummary, setResultSummary] = useState<{ updated: number, created: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<Canal | 'AUTO'>('AUTO');
    
    // Novos estados para filtro de data
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const resetState = () => {
        setFiles([]);
        setIsProcessing(false);
        setResultSummary(null);
        setError(null);
        setImportType('finance_only');
        setSelectedChannel('AUTO');
        setFilterStartDate('');
        setFilterEndDate('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
            setError(null);
        }
    };

    const processFile = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setError(null);

        try {
            let ordersToProcess: OrderItem[] = [];

            // Verifica se é lote de XMLs ou Planilha ou ZIP
            const firstFile = files[0];
            const isXml = firstFile.name.toLowerCase().endsWith('.xml');
            const isZip = firstFile.name.toLowerCase().endsWith('.zip');

            if (isZip) {
                // Processamento de ZIP
                for (const file of files) {
                    const extractedXmls = await extractXmlsFromZip(file);
                    for (const { content, fileName } of extractedXmls) {
                        const ordersFromXml = await parseSalesNFeXML(content, fileName);
                        ordersToProcess.push(...ordersFromXml);
                    }
                }
            } else if (isXml) {
                // Processamento em Lote de XMLs (NFe)
                for (const file of files) {
                    const text = await file.text();
                    const ordersFromXml = await parseSalesNFeXML(text, file.name);
                    ordersToProcess.push(...ordersFromXml);
                }
            } else {
                // Processamento de Planilha (Excel/CSV) - Assume 1 arquivo principal
                const buffer = await firstFile.arrayBuffer();
                
                // Determine canal based on selection or auto
                let canalToUse: Canal | undefined = selectedChannel !== 'AUTO' ? selectedChannel : undefined;
                
                const data: ProcessedData = parseExcelFile(
                    buffer, 
                    firstFile.name, 
                    allOrders, 
                    generalSettings, 
                    { importCpf: false, importName: true },
                    canalToUse
                );
                ordersToProcess = data.lists.completa;
            }

            // --- FILTRO DE DATA ---
            if (filterStartDate || filterEndDate) {
                const start = filterStartDate ? new Date(filterStartDate + "T00:00:00") : null;
                const end = filterEndDate ? new Date(filterEndDate + "T23:59:59") : null;

                ordersToProcess = ordersToProcess.filter(order => {
                    if (!order.data) return false;
                    // order.data está em YYYY-MM-DD string
                    const orderDate = new Date(order.data + "T12:00:00"); 
                    
                    if (start && orderDate < start) return false;
                    if (end && orderDate > end) return false;
                    
                    return true;
                });
            }
            
            if (ordersToProcess.length === 0) {
                throw new Error("Nenhum pedido encontrado no período selecionado.");
            }
            
            // Map para busca rápida de pedidos existentes
            const existingOrdersMap = new Map<string, OrderItem>();
            allOrders.forEach(o => existingOrdersMap.set(`${o.orderId}|${o.sku}`, o));
            
            const finalOrdersPayload: OrderItem[] = [];
            let updatedCount = 0;
            let createdCount = 0;

            ordersToProcess.forEach(newOrder => {
                const key = `${newOrder.orderId}|${newOrder.sku}`;
                const existing = existingOrdersMap.get(key);

                if (existing) {
                    // Pedido já existe: Atualiza APENAS campos financeiros e informativos
                    finalOrdersPayload.push({
                        ...existing,
                        price_gross: newOrder.price_gross > 0 ? newOrder.price_gross : existing.price_gross,
                        platform_fees: newOrder.platform_fees > 0 ? newOrder.platform_fees : existing.platform_fees,
                        shipping_fee: newOrder.shipping_fee > 0 ? newOrder.shipping_fee : existing.shipping_fee,
                        shipping_paid_by_customer: newOrder.shipping_paid_by_customer > 0 ? newOrder.shipping_paid_by_customer : existing.shipping_paid_by_customer,
                        price_net: newOrder.price_net > 0 ? newOrder.price_net : existing.price_net,
                        price_total: newOrder.price_total > 0 ? newOrder.price_total : existing.price_total,
                        data: newOrder.data || existing.data,
                        customer_name: newOrder.customer_name || existing.customer_name,
                        customer_cpf_cnpj: newOrder.customer_cpf_cnpj || existing.customer_cpf_cnpj,
                        // Se o usuário selecionou um canal específico, atualizamos o canal também
                        canal: selectedChannel !== 'AUTO' ? newOrder.canal : existing.canal
                    });
                    updatedCount++;
                } else {
                    // Pedido novo
                    let finalStatus = newOrder.status;

                    if (finalStatus === 'NORMAL') {
                        // Se for finance_only, força status 'BIPADO' para não gerar pendência de produção
                        // XMLs geralmente são vendas já faturadas, então já entram como BIPADO
                        if (importType === 'finance_only' || isXml || isZip) {
                            finalStatus = 'BIPADO';
                        }
                    }

                    finalOrdersPayload.push({
                        ...newOrder,
                        status: finalStatus
                    });
                    createdCount++;
                }
            });

            if (finalOrdersPayload.length > 0) {
                await onLaunchOrders(finalOrdersPayload);
                setResultSummary({ updated: updatedCount, created: createdCount });
            } else {
                setError("Nenhum dado válido encontrado para processar.");
            }

        } catch (err: any) {
            setError(err.message || "Erro ao processar arquivos.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const isExcel = files.length > 0 && !files[0].name.toLowerCase().endsWith('.xml') && !files[0].name.toLowerCase().endsWith('.zip');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                        <FileUp className="text-blue-600" /> Importar Dados Financeiros
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>

                {!resultSummary ? (
                    <div className="space-y-6">
                        {/* File Upload Area */}
                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${files.length > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                            {files.length > 0 ? (
                                <div className="text-center p-4">
                                    <FileUp size={32} className="text-emerald-500 mx-auto mb-2"/>
                                    <p className="font-bold text-emerald-700 text-xs break-all">
                                        {files.length === 1 ? files[0].name : `${files.length} arquivos selecionados`}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 mt-1">Clique para alterar</p>
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <FileUp size={32} className="text-slate-400 mx-auto mb-2"/>
                                    <p className="font-bold text-slate-600 text-xs">Clique para selecionar</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Excel (Vendas), XML (NFe) ou ZIP</p>
                                </div>
                            )}
                            <input type="file" accept=".xlsx, .xls, .csv, .xml, .zip" onChange={handleFileChange} className="hidden" multiple />
                        </label>

                        {/* Channel Selection for Excel */}
                        {isExcel && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Canal da Planilha</label>
                                <select 
                                    value={selectedChannel} 
                                    onChange={(e) => setSelectedChannel(e.target.value as any)}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="AUTO">Automático (Detectar pelo nome)</option>
                                    <option value="ML">Mercado Livre</option>
                                    <option value="SHOPEE">Shopee</option>
                                    <option value="SITE">Site / Outros</option>
                                </select>
                            </div>
                        )}

                        {/* Date Filter (Shopee/Geral) */}
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Calendar size={12} /> Filtrar por Data (Opcional)
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <span className="text-[10px] text-blue-400 font-bold block mb-1">De:</span>
                                    <input 
                                        type="date" 
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        className="w-full p-2 border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] text-blue-400 font-bold block mb-1">Até:</span>
                                    <input 
                                        type="date" 
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        className="w-full p-2 border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            </div>
                            <p className="text-[9px] text-blue-400 mt-1 italic">* Útil para planilhas da Shopee com períodos misturados.</p>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 gap-2">
                            <button 
                                onClick={() => setImportType('finance_only')}
                                className={`flex items-start p-3 rounded-xl border-2 text-left transition-all ${importType === 'finance_only' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <div className={`p-2 rounded-lg mr-3 ${importType === 'finance_only' ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                    <Database size={18}/>
                                </div>
                                <div>
                                    <p className={`font-bold text-xs ${importType === 'finance_only' ? 'text-blue-900' : 'text-slate-700'}`}>Atualizar / Histórico (Site/XML)</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Importa vendas já concluídas para relatórios financeiros sem gerar pendência de produção.</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => setImportType('full_import')}
                                className={`flex items-start p-3 rounded-xl border-2 text-left transition-all ${importType === 'full_import' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <div className={`p-2 rounded-lg mr-3 ${importType === 'full_import' ? 'bg-orange-200 text-orange-700' : 'bg-slate-200 text-slate-500'}`}>
                                    <Layers size={18}/>
                                </div>
                                <div>
                                    <p className={`font-bold text-xs ${importType === 'full_import' ? 'text-orange-900' : 'text-slate-700'}`}>Importação de Produção (Novo Lote)</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Cria novos pedidos como "NORMAL" para entrar na fila de produção.</p>
                                </div>
                            </button>
                        </div>
                        
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center font-bold border border-red-100">
                                <AlertTriangle size={18} className="mr-2 flex-shrink-0"/> {error}
                            </div>
                        )}

                        <button 
                            onClick={processFile} 
                            disabled={files.length === 0 || isProcessing}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-sm tracking-widest hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-100 transition-all flex justify-center items-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={18}/>}
                            {isProcessing ? 'Processando...' : 'Confirmar Importação'}
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={40} className="text-green-600"/>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Importação Concluída!</h3>
                        <p className="text-slate-500 mb-6">Os dados foram sincronizados com sucesso.</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-3xl font-black text-blue-600">{resultSummary.updated}</p>
                                <p className="text-xs font-bold text-blue-400 uppercase">Atualizados (Reconciliados)</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-3xl font-black text-green-600">{resultSummary.created}</p>
                                <p className="text-xs font-bold text-green-400 uppercase">Novos Criados</p>
                            </div>
                        </div>

                        <button onClick={handleClose} className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Fechar</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinanceImportModal;
