import React, { useState, useMemo, useEffect } from 'react';
import { StockItem, StockMovement, OrderItem, ReportFilters, ReportPeriod, BipStatus, Canal, WeighingBatch, ScanLogItem, User, ProdutoCombinado, StockItemKind, AttendanceRecord, ReturnItem, OrderStatusValue, GeneralSettings, GrindingBatch } from '../types';
import { BarChart3, Package, FileDown, Search, Calendar, ChevronDown, ShoppingCart, TrendingUp, AlertTriangle, Factory, Box, Weight, QrCode, Bug, Laptop2, Users, FileWarning, Undo, ChevronRight, Recycle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


// --- Helper Functions & Data ---
const getReportTitle = (reportId: string) => {
    const titles: Record<string, string> = {
        'estoque/posicao': 'Posição Atual de Estoque',
        'estoque/movimentos': 'Movimentações de Estoque',
        'estoque/alertas': 'Alertas de Estoque',
        'pedidos/importados': 'Pedidos Importados',
        'pedidos/atrasados': 'Pedidos Atrasados',
        'pedidos/com-erro': 'Pedidos com Erro',
        'pedidos/devolucoes': 'Devoluções Registradas',
        'producao/por-cor': 'Produção por Cor',
        'producao/por-sku': 'Produção por SKU',
        'pesagem/totais': 'Totais de Pesagem por Operador',
        'moagem/lotes': 'Lotes de Moagem',
        'moagem/producao-operador': 'Produção de Moagem por Operador',
        'bipagem/por-operador': 'Bipagem por Operador',
        'bipagem/por-dispositivo': 'Bipagem por Dispositivo',
        'bipagem/timeline': 'Timeline de Bipagens',
        'erros/bom-faltante': 'Erros: Produtos com Produto Combinado Faltante',
        'erros/bip-sem-pedido': 'Erros: Bipagem sem Pedido na Lista',
        'funcionarios/ponto-diario': 'Relatório de Ponto Diário',
        'funcionarios/faltas': 'Relatório de Faltas e Atestados',
        'funcionarios/pesagem': 'Relatório de Pesagem por Funcionário',
    };
    return titles[reportId] || 'Relatório';
};

const getISODate = (date: Date) => date.toISOString().split('T')[0];

const getPeriodDates = (period: ReportPeriod) => {
    const end = new Date();
    const start = new Date();
    switch (period) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            break;
        case 'last7days':
            start.setDate(start.getDate() - 6);
            break;
        case 'thisMonth':
            start.setDate(1);
            break;
    }
    return { startDate: getISODate(start), endDate: getISODate(end) };
};

// --- Report Table Components ---

const ReportTable: React.FC<{headers: string[], children: React.ReactNode}> = ({ headers, children }) => (
     <table className="min-w-full bg-[var(--color-surface)] text-sm">
        <thead className="bg-[var(--color-surface-secondary)]">
            <tr>
                {headers.map(h =>
                    <th key={h} className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>
                )}
            </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
            {children}
        </tbody>
    </table>
);

const NoData: React.FC<{ isCard?: boolean }> = ({ isCard = false }) => {
    if (isCard) {
        return <div className="text-center p-8 text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] rounded-lg">Nenhum registro.</div>;
    }
    return (
        <tr>
            <td colSpan={12} className="text-center p-8 text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)]">
                Nenhum registro encontrado para os filtros selecionados.
            </td>
        </tr>
    );
};


const PosicaoEstoqueReport: React.FC<{ items: StockItem[] }> = ({ items }) => (
    <>
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
            {items.length > 0 ? items.map(item => {
                const isBelowMin = item.current_qty < item.min_qty && item.kind !== 'PRODUTO';
                return (
                    <div key={item.id} className={`p-3 rounded-lg border ${isBelowMin ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold">{item.name}</p>
                                <p className="text-xs font-mono text-gray-500">{item.code}</p>
                            </div>
                            {item.kind !== 'PRODUTO' && (isBelowMin ?
                                <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded-full">ABAIXO</span> :
                                <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">OK</span>
                            )}
                        </div>
                        <div className="text-sm mt-2 pt-2 border-t">
                            <p>Saldo: <span className={`font-bold ${isBelowMin ? 'text-red-600' : ''}`}>{item.current_qty.toFixed(2)}</span> / Mínimo: {item.min_qty.toFixed(2)} {item.unit}</p>
                        </div>
                    </div>
                );
            }) : <NoData isCard />}
        </div>
        {/* Desktop View */}
        <div className="hidden md:block">
            <ReportTable headers={['Código', 'Nome do Item', 'Tipo', 'Saldo Atual', 'Estoque Mínimo', 'Status']}>
                {items.length > 0 ? items.map(item => {
                    const isBelowMin = item.current_qty < item.min_qty;
                    return (
                        <tr key={item.id} className={`${isBelowMin && item.kind !== 'PRODUTO' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                            <td className="py-2 px-3 font-mono text-[var(--color-text-secondary)]">{item.code}</td>
                            <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.name}</td>
                            <td className="py-2 px-3 text-[var(--color-text-secondary)]">{item.kind}</td>
                            <td className={`py-2 px-3 font-bold text-center ${isBelowMin && item.kind !== 'PRODUTO' ? 'text-red-600' : 'text-[var(--color-text-primary)]'}`}>{item.current_qty.toFixed(2)} {item.unit}</td>
                            <td className="py-2 px-3 text-center text-[var(--color-text-secondary)]">{item.min_qty.toFixed(2)} {item.unit}</td>
                            <td className="py-2 px-3 text-center">
                                {item.kind !== 'PRODUTO' && (isBelowMin ?
                                    <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded-full">ABAIXO</span> :
                                    <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">OK</span>
                                )}
                            </td>
                        </tr>
                    );
                }) : <NoData />}
            </ReportTable>
        </div>
    </>
);

const MovimentacoesReport: React.FC<{ movements: StockMovement[] }> = ({ movements }) => (
    <ReportTable headers={['Data/Hora', 'Item', 'Origem', 'Ref.', 'Quantidade', 'Operador']}>
        {movements.length > 0 ? movements.map(mov => (
            <tr key={mov.id}>
                <td className="py-2 px-3 text-[var(--color-text-secondary)]">{mov.createdAt && !isNaN(mov.createdAt.getTime()) ? mov.createdAt.toLocaleString('pt-BR') : 'Data inválida'}</td>
                <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{mov.stockItemName}</td>
                <td className="py-2 px-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{mov.origin}</span></td>
                <td className="py-2 px-3 font-mono text-[var(--color-text-secondary)] text-xs">{mov.ref}</td>
                <td className={`py-2 px-3 font-bold text-center ${mov.qty_delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {mov.qty_delta > 0 ? '+' : ''}{mov.qty_delta.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-[var(--color-text-primary)]">{mov.createdBy}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const PedidosReport: React.FC<{ orders: { isGroup: boolean; items: OrderItem[]; bipadoPor?: string }[], generalSettings: GeneralSettings }> = ({ orders, generalSettings }) => {
    const [expandedGroups, setExpandedGroups] = useState(new Set<string>());
    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    };

    const headers = ['Data', 'Canal', 'Pedido', 'SKU', 'Qtd', 'Cor', 'Status Geral', 'Bipado Por'];
    if (generalSettings.pedidos.displayCustomerIdentifier) {
        headers.splice(3, 0, 'CPF/CNPJ'); // Insert CPF/CNPJ column
    }

    return (
    <ReportTable headers={headers}>
        {orders.length > 0 ? orders.map((group, index) => {
            const first = group.items[0];
            const isExpanded = expandedGroups.has(first.orderId);
            if(group.isGroup) {
                return (<React.Fragment key={`${first.orderId}-${index}`}>
                    <tr className="bg-[var(--color-surface-secondary)]">
                        <td className="py-2 px-3">{first.data}</td>
                        <td className="py-2 px-3">{first.canal}</td>
                        <td className="py-2 px-3 font-mono">{first.orderId}</td>
                        {generalSettings.pedidos.displayCustomerIdentifier && <td className="py-2 px-3 font-mono text-xs">{first.customer_cpf_cnpj || '-'}</td>}
                        <td className="py-2 px-3">
                            <button onClick={() => toggleGroup(first.orderId)} className="flex items-center text-blue-600">
                                {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Múltiplos ({group.items.length})
                            </button>
                        </td>
                        <td className="py-2 px-3 text-center font-bold">{group.items.reduce((sum, i) => sum + i.qty_final, 0)}</td>
                        <td className="py-2 px-3">Diversas</td>
                        <td className="py-2 px-3 font-semibold">{first.status}</td>
                        <td className="py-2 px-3">{group.bipadoPor || '-'}</td>
                    </tr>
                    {isExpanded && group.items.map(order => (
                        <tr key={order.id} className="bg-[var(--color-surface-tertiary)]">
                            <td colSpan={3 + (generalSettings.pedidos.displayCustomerIdentifier ? 1 : 0)}></td>
                            <td className="py-1 px-3 pl-8">{order.sku}</td>
                            <td className="py-1 px-3 text-center font-bold">{order.qty_final}</td>
                            <td className="py-1 px-3" colSpan={3}>{order.color}</td>
                        </tr>
                    ))}
                </React.Fragment>);
            } else {
                 return (<tr key={first.id}>
                    <td className="py-2 px-3">{first.data}</td>
                    <td className="py-2 px-3">{first.canal}</td>
                    <td className="py-2 px-3 font-mono">{first.orderId}</td>
                    {generalSettings.pedidos.displayCustomerIdentifier && <td className="py-2 px-3 font-mono text-xs">{first.customer_cpf_cnpj || '-'}</td>}
                    <td className="py-2 px-3">{first.sku}</td>
                    <td className="py-2 px-3 text-center font-bold">{first.qty_final}</td>
                    <td className="py-2 px-3">{first.color}</td>
                    <td className="py-2 px-3 font-semibold">{first.status}</td>
                    <td className="py-2 px-3">{group.bipadoPor || '-'}</td>
                </tr>)
            }
        }) : <NoData />}
    </ReportTable>
)};


const DevolucoesReport: React.FC<{ returns: ReturnItem[] }> = ({ returns }) => (
     <ReportTable headers={['Data', 'Rastreio', 'Nome do Cliente', 'Registrado por']}>
        {returns.length > 0 ? returns.map(item => (
            <tr key={item.id}>
                <td className="py-2 px-3">{item.loggedAt && !isNaN(item.loggedAt.getTime()) ? item.loggedAt.toLocaleString('pt-BR') : 'Data inválida'}</td>
                <td className="py-2 px-3 font-mono">{item.tracking}</td>
                <td className="py-2 px-3">{item.customerName}</td>
                <td className="py-2 px-3">{item.loggedBy}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);


const BipagemAgregadaReport: React.FC<{ data: { id: string, name: string, total: number, ok: number, duplicate: number, not_found: number }[], title: string }> = ({ data, title }) => (
    <ReportTable headers={[title, 'Total Bipagens', 'Sucesso', 'Duplicados', 'Não Encontrados']}>
        {data.length > 0 ? data.map(item => (
            <tr key={item.id}>
                <td className="py-2 px-3 font-medium">{item.name}</td>
                <td className="py-2 px-3 text-center font-bold">{item.total}</td>
                <td className="py-2 px-3 text-center text-green-600">{item.ok}</td>
                <td className="py-2 px-3 text-center text-red-600">{item.duplicate}</td>
                <td className="py-2 px-3 text-center text-yellow-600">{item.not_found}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const BipagemTimelineReport: React.FC<{ scans: ScanLogItem[] }> = ({ scans }) => (
     <ReportTable headers={['Horário', 'Operador', 'Dispositivo', 'Item Bipado', 'Status']}>
        {scans.length > 0 ? scans.map(item => (
            <tr key={item.id}>
                 <td className="py-2 px-3">{item.time && !isNaN(item.time.getTime()) ? item.time.toLocaleString('pt-BR') : 'Data inválida'}</td>
                 <td className="py-2 px-3">{item.user}</td>
                 <td className="py-2 px-3">{item.device}</td>
                 <td className="py-2 px-3 font-mono text-xs">{item.displayKey}</td>
                 <td className="py-2 px-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800`}>{item.status}</span></td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const TotaisPesagemReport: React.FC<{ data: { userId: string, userName: string, itemCode: string, itemName: string, total: number, count: number }[] }> = ({ data }) => (
    <ReportTable headers={['Operador', 'Insumo Processado', 'Total Pesado (kg)', 'Nº de Lotes']}>
        {data.length > 0 ? data.map(item => (
            <tr key={`${item.userId}-${item.itemCode}`}>
                <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.userName}</td>
                <td className="py-2 px-3 text-[var(--color-text-secondary)]">{item.itemName} ({item.itemCode})</td>
                <td className="py-2 px-3 text-center font-bold">{item.total.toFixed(3)}</td>
                <td className="py-2 px-3 text-center">{item.count}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const LotesDeMoagemReport: React.FC<{ batches: GrindingBatch[] }> = ({ batches }) => (
    <ReportTable headers={['Data', 'Origem', 'Qtd. Usada', 'Saída', 'Qtd. Produzida', 'Operador', 'Modo']}>
        {batches.length > 0 ? batches.map(batch => (
            <tr key={batch.id}>
                <td className="py-2 px-3">{batch.createdAt && !isNaN(batch.createdAt.getTime()) ? batch.createdAt.toLocaleString('pt-BR') : 'Data inválida'}</td>
                <td className="py-2 px-3">{batch.sourceInsumoName}</td>
                <td className="py-2 px-3 text-center text-red-600 font-semibold">-{batch.sourceQtyUsed.toFixed(2)}</td>
                <td className="py-2 px-3">{batch.outputInsumoName}</td>
                <td className="py-2 px-3 text-center text-green-600 font-bold">+{batch.outputQtyProduced.toFixed(2)}</td>
                <td className="py-2 px-3">{batch.userName}</td>
                <td className="py-2 px-3">{batch.mode}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const ProducaoMoagemOperadorReport: React.FC<{ data: { userId: string, userName: string, totalProduzido: number }[] }> = ({ data }) => (
    <ReportTable headers={['Operador', 'Total Produzido (kg)']}>
        {data.length > 0 ? data.map(item => (
            <tr key={item.userId}>
                <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.userName}</td>
                <td className="py-2 px-3 font-bold text-center">{item.totalProduzido.toFixed(3)}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const FaltasAtestadosReport: React.FC<{ data: { user: User, record: AttendanceRecord }[] }> = ({ data }) => {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Data inválida';
        const d = new Date(dateStr + 'T12:00:00');
        return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : 'Data inválida';
    };

    return (
        <ReportTable headers={['Data', 'Funcionário', 'Setor', 'Com Atestado']}>
            {data.length > 0 ? data.map(item => (
                <tr key={`${item.user.id}-${item.record.date}`}>
                    <td className="py-2 px-3">{formatDate(item.record.date)}</td>
                    <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.user.name}</td>
                    <td className="py-2 px-3">{item.user.setor.join(', ')}</td>
                    <td className={`py-2 px-3 font-semibold ${item.record.hasDoctorsNote ? 'text-green-600' : 'text-[var(--color-text-secondary)]'}`}>
                        {item.record.hasDoctorsNote ? 'Sim' : 'Não'}
                    </td>
                </tr>
            )) : <NoData />}
        </ReportTable>
    );
};

const PontoDiarioReport: React.FC<{ data: { user: User, record: AttendanceRecord }[] }> = ({ data }) => {
    const headers = ['Data', 'Funcionário', 'Status', 'Observações'];
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Data inválida';
        const d = new Date(dateStr + 'T12:00:00');
        return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : 'Data inválida';
    };

    return (
        <ReportTable headers={headers}>
            {data.length > 0 ? data.map(item => {
                const observations = [];
                if (item.record.status === 'PRESENT') {
                    if (item.record.leftEarly) observations.push(`Saiu Cedo (${item.record.leftEarly})`);
                    if (item.record.overtime) observations.push(`Hora Extra (${item.record.overtime})`);
                }
                if (item.record.hasDoctorsNote) observations.push('Com Atestado');
                
                return (
                    <tr key={`${item.user.id}-${item.record.date}`}>
                        <td className="py-2 px-3">{formatDate(item.record.date)}</td>
                        <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.user.name}</td>
                        <td className={`py-2 px-3 font-semibold ${item.record.status === 'PRESENT' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.record.status === 'PRESENT' ? 'Presente' : 'Falta'}
                        </td>
                        <td className="py-2 px-3 text-[var(--color-text-secondary)]">{observations.join(', ') || '-'}</td>
                    </tr>
                );
            }) : <NoData />}
        </ReportTable>
    );
};

const PesagemPorFuncionarioReport: React.FC<{ data: { userId: string, userName: string, totalPesado: number }[] }> = ({ data }) => (
    <ReportTable headers={['Funcionário', 'Total Pesado (kg)']}>
        {data.length > 0 ? data.map(item => (
            <tr key={item.userId}>
                <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.userName}</td>
                <td className="py-2 px-3 font-bold text-center">{item.totalPesado.toFixed(3)}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const ErrosProdutoCombinadoFaltanteReport: React.FC<{ items: StockItem[] }> = ({ items }) => (
    <ReportTable headers={['Código (SKU)', 'Nome do Produto']}>
        {items.length > 0 ? items.map(item => (
            <tr key={item.id}>
                <td className="py-2 px-3 font-mono text-red-700">{item.code}</td>
                <td className="py-2 px-3 font-medium text-[var(--color-text-primary)]">{item.name}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);

const ErrosBipSemPedidoReport: React.FC<{ scans: ScanLogItem[] }> = ({ scans }) => (
    <ReportTable headers={['Horário', 'Operador', 'Dispositivo', 'Código Bipado']}>
        {scans.length > 0 ? scans.map(item => (
            <tr key={item.id}>
                <td className="py-2 px-3">{item.time && !isNaN(item.time.getTime()) ? item.time.toLocaleString('pt-BR') : 'Data inválida'}</td>
                <td className="py-2 px-3">{item.user}</td>
                <td className="py-2 px-3">{item.device}</td>
                <td className="py-2 px-3 font-mono text-red-700">{item.displayKey}</td>
            </tr>
        )) : <NoData />}
    </ReportTable>
);


// --- Main Page Component ---
interface RelatoriosPageProps {
    stockItems: StockItem[];
    stockMovements: StockMovement[];
    orders: OrderItem[];
    weighingBatches: WeighingBatch[];
    scanHistory: ScanLogItem[];
    produtosCombinados: ProdutoCombinado[];
    users: User[];
    returns: ReturnItem[];
    generalSettings: GeneralSettings;
    grindingBatches: GrindingBatch[];
}

const reportCategories = [
    { id: 'estoque', name: 'Estoque', icon: <Package size={18} />, reports: [
        { id: 'estoque/posicao', name: 'Posição Atual' },
        { id: 'estoque/movimentos', name: 'Movimentações' },
        { id: 'estoque/alertas', name: 'Alertas de Estoque' },
    ]},
    { id: 'pedidos', name: 'Pedidos', icon: <ShoppingCart size={18} />, reports: [
        { id: 'pedidos/importados', name: 'Pedidos Importados' },
        { id: 'pedidos/atrasados', name: 'Pedidos Atrasados' },
        { id: 'pedidos/com-erro', name: 'Pedidos com Erro' },
        { id: 'pedidos/devolucoes', name: 'Devoluções' },
    ]},
    { id: 'producao', name: 'Produção', icon: <Factory size={18} />, reports: [
        { id: 'producao/por-cor', name: 'Produção por Cor' },
        { id: 'producao/por-sku', name: 'Produção por SKU' },
    ]},
    { id: 'pesagem', name: 'Pesagem', icon: <Weight size={18} />, reports: [
        { id: 'pesagem/totais', name: 'Totais de Pesagem' },
    ]},
    { id: 'moagem', name: 'Moagem', icon: <Recycle size={18} />, reports: [
        { id: 'moagem/lotes', name: 'Lotes de Moagem' },
        { id: 'moagem/producao-operador', name: 'Produção por Operador' },
    ]},
    { id: 'bipagem', name: 'Bipagem', icon: <QrCode size={18} />, reports: [
        { id: 'bipagem/por-operador', name: 'Por Operador' },
        { id: 'bipagem/por-dispositivo', name: 'Por Dispositivo' },
        { id: 'bipagem/timeline', name: 'Timeline de Bipagens' },
    ]},
    { id: 'funcionarios', name: 'Funcionários', icon: <Users size={18}/>, reports: [
        { id: 'funcionarios/ponto-diario', name: 'Ponto Diário' },
        { id: 'funcionarios/faltas', name: 'Faltas e Atestados' },
        { id: 'funcionarios/pesagem', name: 'Pesagem por Funcionário'},
    ]},
    { id: 'erros', name: 'Diagnóstico de Erros', icon: <Bug size={18} />, reports: [
        { id: 'erros/bom-faltante', name: 'Produtos sem BOM' },
        { id: 'erros/bip-sem-pedido', name: 'Bipagens sem Pedido' },
    ]},
];

const RelatoriosPage: React.FC<RelatoriosPageProps> = (props) => {
    const { stockItems, stockMovements, orders, weighingBatches, scanHistory, produtosCombinados, users, returns, generalSettings, grindingBatches } = props;
    const [activeReport, setActiveReport] = useState('estoque/posicao');
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        estoque: true, pedidos: true, producao: true, pesagem: true, bipagem: true, erros: true, funcionarios: true, moagem: true,
    });
    const [filters, setFilters] = useState<ReportFilters>({
        period: 'last7days', search: '', canal: 'ALL', status: 'ALL', insumoCode: '', operatorId: 'ALL',
        stockKindFilter: 'ALL', orderStatusFilter: 'ALL',
        ...getPeriodDates('last7days')
    });

    const handleFilterChange = (field: keyof ReportFilters, value: any) => {
        const newFilters = { ...filters, [field]: value };
        if (field === 'period' && value !== 'custom') {
            const { startDate, endDate } = getPeriodDates(value as ReportPeriod);
            newFilters.startDate = startDate;
            newFilters.endDate = endDate;
        }
        setFilters(newFilters);
    };

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => ({...prev, [category]: !prev[category]}));
    };

    const relevantOperators = useMemo(() => {
        const reportCategory = activeReport.split('/')[0];
        let sector: string | null = null;
        if (reportCategory === 'pesagem' || activeReport === 'funcionarios/pesagem') sector = 'PESAGEM';
        if (reportCategory === 'bipagem') sector = 'EMBALAGEM';
        if (reportCategory === 'moagem') sector = 'MOAGEM';
        
        if (sector) {
            return users.filter(u => Array.isArray(u.setor) && u.setor.includes(sector));
        }
        return null;
    }, [activeReport, users]);

    const filteredData = useMemo(() => {
        const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : new Date(0);
        const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : new Date();
        const dateFilter = (dateInput: string | Date | undefined) => {
            if (!dateInput) return false;
            // Handle date strings like "YYYY-MM-DD" from attendance records
            const date = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) 
                ? new Date(dateInput + 'T12:00:00Z') 
                : new Date(dateInput);
            if (isNaN(date.getTime())) return false;
            return date >= start && date <= end;
        };
        const searchLower = filters.search.toLowerCase();
        const operatorFilter = (item: { userId?: string }) => filters.operatorId === 'ALL' || item.userId === filters.operatorId;


        const data: { [key: string]: any } = {};

        // --- ESTOQUE ---
        data['estoque/posicao'] = stockItems.filter(i => 
            (filters.stockKindFilter === 'ALL' || i.kind === filters.stockKindFilter) &&
            (i.name.toLowerCase().includes(searchLower) || i.code.toLowerCase().includes(searchLower))
        );
        data['estoque/movimentos'] = stockMovements
            .filter(m => dateFilter(m.createdAt))
            .filter(m => !filters.insumoCode || m.stockItemCode === filters.insumoCode);
        data['estoque/alertas'] = stockItems.filter(i => i.kind !== 'PRODUTO' && i.current_qty < i.min_qty);
        
        // --- PEDIDOS ---
        const scanMap = new Map<string, string>();
        scanHistory.forEach(s => {
            if ((s.status === 'OK' || s.synced) && !scanMap.has(s.displayKey)) {
                scanMap.set(s.displayKey, s.user);
            }
        });

        const allPedidos = orders.filter(o => {
            const orderDateStr = String(o.data || '').split('/').reverse().join('-');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateStr)) return false;
            return dateFilter(orderDateStr) &&
                (filters.canal === 'ALL' || o.canal === filters.canal) &&
                (filters.orderStatusFilter === 'ALL' || o.status === filters.orderStatusFilter);
        });
        
        const groupedOrders = new Map<string, OrderItem[]>();
        allPedidos.forEach(order => {
            const key = order.orderId || order.tracking;
            if(key) {
                if (!groupedOrders.has(key)) groupedOrders.set(key, []);
                groupedOrders.get(key)!.push(order);
            }
        });
        
        data['pedidos/importados'] = Array.from(groupedOrders.values()).map(items => ({
            isGroup: items.length > 1,
            items,
            bipadoPor: scanMap.get(items[0].orderId) || scanMap.get(items[0].tracking),
        }));
        
        data['pedidos/atrasados'] = data['pedidos/importados'].filter((group: any) => {
            const today = new Date(); today.setHours(0,0,0,0);
            const orderDateStr = String(group.items[0].data || '').split('/').reverse().join('-');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateStr)) return false;
            const orderDate = new Date(orderDateStr + "T12:00:00Z"); 
            if (isNaN(orderDate.getTime())) return false;
            orderDate.setHours(0,0,0,0);
            return group.items[0].status === 'NORMAL' && orderDate < today;
        });

        data['pedidos/com-erro'] = data['pedidos/importados'].filter((group: any) => group.items[0].status === 'ERRO');
        data['pedidos/devolucoes'] = returns.filter(r => dateFilter(r.loggedAt));

        // --- BIPAGEM ---
        const scansNoPeriodo = scanHistory.filter(s => dateFilter(s.time) && operatorFilter(s));
        data['bipagem/timeline'] = scansNoPeriodo;
        data['erros/bip-sem-pedido'] = scansNoPeriodo.filter(s => s.status === 'NOT_FOUND');
        
        const operatorStats = new Map<string, { id: string, name: string, total: number, ok: number, duplicate: number, not_found: number }>();
        scansNoPeriodo.forEach(s => {
            if (!operatorStats.has(s.userId)) operatorStats.set(s.userId, { id: s.userId, name: s.user, total: 0, ok: 0, duplicate: 0, not_found: 0 });
            const stats = operatorStats.get(s.userId)!;
            stats.total++;
            if (s.status === 'OK' || s.synced) stats.ok++;
            else if (s.status === 'DUPLICATE') stats.duplicate++;
            else if (s.status === 'NOT_FOUND') stats.not_found++;
        });
        data['bipagem/por-operador'] = Array.from(operatorStats.values());

        // --- PESAGEM ---
        const weighingBatchesNoPeriodo = weighingBatches.filter(b => dateFilter(b.createdAt) && operatorFilter(b));
        const totaisPesagemMap = new Map<string, { userId: string, userName: string, itemCode: string, itemName: string, total: number, count: number }>();
        weighingBatchesNoPeriodo.forEach(batch => {
            const key = `${batch.userId}-${batch.stockItemCode}`;
            const stats = totaisPesagemMap.get(key) || { 
                userId: batch.userId, 
                userName: batch.createdBy, 
                itemCode: batch.stockItemCode,
                itemName: batch.stockItemName,
                total: 0, 
                count: 0 
            };
            stats.total += batch.initialQty;
            stats.count++;
            totaisPesagemMap.set(key, stats);
        });
        data['pesagem/totais'] = Array.from(totaisPesagemMap.values());

        // --- MOAGEM ---
        const grindingBatchesNoPeriodo = grindingBatches.filter(b => dateFilter(b.createdAt) && operatorFilter(b));
        data['moagem/lotes'] = grindingBatchesNoPeriodo;

        const producaoMoagemPorOperador = new Map<string, { userId: string, userName: string, totalProduzido: number }>();
        grindingBatchesNoPeriodo.forEach(batch => {
            const userId = batch.userId || 'automatico';
            const userName = batch.userName;
            const stats = producaoMoagemPorOperador.get(userId) || { userId, userName, totalProduzido: 0 };
            stats.totalProduzido += batch.outputQtyProduced;
            producaoMoagemPorOperador.set(userId, stats);
        });
        data['moagem/producao-operador'] = Array.from(producaoMoagemPorOperador.values());
        
        // --- FUNCIONARIOS ---
        const attendanceInPeriod = users.flatMap(u => u.attendance.filter(a => dateFilter(a.date)).map(record => ({user: u, record})));
        data['funcionarios/ponto-diario'] = attendanceInPeriod;
        data['funcionarios/faltas'] = attendanceInPeriod.filter(item => item.record.status === 'ABSENT');

        const pesagemPorFuncionario = new Map<string, { userId: string, userName: string, totalPesado: number }>();
        weighingBatchesNoPeriodo.forEach(batch => {
            const userStats = pesagemPorFuncionario.get(batch.userId) || { userId: batch.userId, userName: batch.createdBy, totalPesado: 0 };
            userStats.totalPesado += batch.initialQty;
            pesagemPorFuncionario.set(batch.userId, userStats);
        });
        data['funcionarios/pesagem'] = Array.from(pesagemPorFuncionario.values());

        // --- ERROS ---
        data['erros/bom-faltante'] = stockItems.filter(i => i.kind === 'PRODUTO' && !produtosCombinados.some(b => b.productSku === i.code));

        return data;
    }, [filters, stockItems, stockMovements, orders, scanHistory, returns, users, weighingBatches, produtosCombinados, grindingBatches]);
    
    const getReportDataForExport = (reportId: string) => {
        const title = getReportTitle(reportId);
        let headers: string[] = [];
        let body: (string | number)[][] = [];
        const data = filteredData[reportId];

        switch (reportId) {
            case 'estoque/posicao':
                headers = ['Código', 'Nome', 'Tipo', 'Saldo', 'Mínimo', 'Unid.', 'Status'];
                body = (data as StockItem[]).map(i => [i.code, i.name, i.kind, i.current_qty, i.min_qty, i.unit, i.current_qty < i.min_qty && i.kind !== 'PRODUTO' ? 'ABAIXO' : 'OK']);
                break;
            case 'pedidos/importados':
            case 'pedidos/atrasados':
            case 'pedidos/com-erro':
                headers = ['Data', 'Canal', 'Pedido', 'SKU', 'Qtd', 'Cor', 'Status', 'Bipado Por'];
                body = (data as { isGroup: boolean; items: OrderItem[]; bipadoPor?: string }[]).flatMap(group => {
                    const first = group.items[0];
                    if (group.isGroup) {
                        return [
                            [first.data, first.canal, first.orderId, `Múltiplos (${group.items.length})`, group.items.reduce((s, i) => s + i.qty_final, 0), 'Diversas', first.status, group.bipadoPor || ''],
                            ...group.items.map(i => ['', '', '', `  - ${i.sku}`, i.qty_final, i.color, '', ''])
                        ];
                    }
                    return [[first.data, first.canal, first.orderId, first.sku, first.qty_final, first.color, first.status, group.bipadoPor || '']];
                });
                break;
            case 'moagem/lotes':
                headers = ['Data', 'Origem', 'Qtd. Usada', 'Saída', 'Qtd. Produzida', 'Operador', 'Modo'];
                body = (data as GrindingBatch[]).map(b => [b.createdAt && !isNaN(b.createdAt.getTime()) ? b.createdAt.toLocaleString('pt-BR') : '', b.sourceInsumoName, -b.sourceQtyUsed, b.outputInsumoName, b.outputQtyProduced, b.userName, b.mode]);
                break;
            case 'moagem/producao-operador':
                headers = ['Operador', 'Total Produzido (kg)'];
                body = (data as { userName: string, totalProduzido: number }[]).map(d => [d.userName, d.totalProduzido]);
                break;
            case 'pesagem/totais':
                headers = ['Operador', 'Insumo', 'Total Pesado (kg)', 'Nº de Lotes'];
                body = (data as { userName: string, itemName: string, total: number, count: number }[]).map(d => [d.userName, d.itemName, d.total.toFixed(3), d.count]);
                break;
            // Add other cases here as needed...
            default:
                return { title: 'Não Implementado', headers: [], body: [] };
        }
        return { title, headers, body };
    };

    const handleExport = () => {
        const { title, headers, body } = getReportDataForExport(activeReport);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
        XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
        XLSX.writeFile(wb, `${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const renderReportContent = () => {
        const data = filteredData[activeReport];
        if (!data) return <div className="p-4 bg-gray-50 text-center text-gray-500">Relatório não implementado.</div>;
        
        switch (activeReport) {
            case 'estoque/posicao': return <PosicaoEstoqueReport items={data} />;
            case 'estoque/movimentos': return <MovimentacoesReport movements={data} />;
            case 'estoque/alertas': return <PosicaoEstoqueReport items={data} />;
            case 'pedidos/importados':
            case 'pedidos/atrasados':
            case 'pedidos/com-erro': return <PedidosReport orders={data} generalSettings={generalSettings} />;
            case 'pedidos/devolucoes': return <DevolucoesReport returns={data} />;
            case 'bipagem/por-operador': return <BipagemAgregadaReport data={data} title="Operador" />;
            case 'bipagem/timeline': return <BipagemTimelineReport scans={data} />;
            case 'pesagem/totais': return <TotaisPesagemReport data={data} />;
            case 'moagem/lotes': return <LotesDeMoagemReport batches={data} />;
            case 'moagem/producao-operador': return <ProducaoMoagemOperadorReport data={data} />;
            case 'funcionarios/ponto-diario': return <PontoDiarioReport data={data} />;
            case 'funcionarios/faltas': return <FaltasAtestadosReport data={data} />;
            case 'funcionarios/pesagem': return <PesagemPorFuncionarioReport data={data} />;
            case 'erros/bom-faltante': return <ErrosProdutoCombinadoFaltanteReport items={data} />;
            case 'erros/bip-sem-pedido': return <ErrosBipSemPedidoReport scans={data} />;
            default: return <div className="p-4 bg-gray-50 text-center text-gray-500">Relatório não implementado.</div>;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Sidebar */}
            <div className="lg:col-span-1 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm h-full overflow-y-auto">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Relatórios</h2>
                <div className="space-y-4">
                    {reportCategories.map(cat => (
                        <div key={cat.id}>
                            <button onClick={() => toggleCategory(cat.id)} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-[var(--color-surface-secondary)]">
                                <div className="flex items-center font-semibold text-[var(--color-text-primary)]">{cat.icon} <span className="ml-2">{cat.name}</span></div>
                                <ChevronDown className={`transform transition-transform ${openCategories[cat.id] ? 'rotate-180' : ''}`} />
                            </button>
                            {openCategories[cat.id] && (
                                <div className="pl-6 pt-2 space-y-1">
                                    {cat.reports.map(report => (
                                        <a
                                            key={report.id}
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); setActiveReport(report.id); }}
                                            className={`block p-2 rounded-md text-sm ${activeReport === report.id ? 'bg-[var(--color-primary-bg-subtle)] text-[var(--color-primary-text-subtle)] font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'}`}
                                        >
                                            {report.name}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
                <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{getReportTitle(activeReport)}</h1>
                        <button onClick={handleExport} className="flex items-center gap-2 py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700">
                            <FileDown size={16}/> Exportar para Excel
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                         <div className="flex items-center gap-2">
                             <label className="text-sm font-semibold text-[var(--color-text-secondary)]">Período:</label>
                             <select value={filters.period} onChange={(e) => handleFilterChange('period', e.target.value)} className="p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-surface)]">
                                 <option value="today">Hoje</option>
                                 <option value="yesterday">Ontem</option>
                                 <option value="last7days">Últimos 7 dias</option>
                                 <option value="thisMonth">Este Mês</option>
                                 <option value="custom">Customizado</option>
                             </select>
                         </div>
                         {filters.period === 'custom' && (
                             <div className="flex items-center gap-2">
                                 <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-surface)]" />
                                 <span className="text-[var(--color-text-secondary)]">até</span>
                                 <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-surface)]" />
                             </div>
                         )}
                        {relevantOperators && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">Operador:</label>
                                <select value={filters.operatorId} onChange={(e) => handleFilterChange('operatorId', e.target.value)} className="p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-surface)]">
                                    <option value="ALL">Todos</option>
                                    {relevantOperators.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                         <div className="relative flex-grow">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                            <input type="text" placeholder="Buscar..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border-[var(--color-border)] bg-[var(--color-surface)] rounded-md"/>
                         </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                        {renderReportContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelatoriosPage;