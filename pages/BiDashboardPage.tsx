import React, { useState, useMemo } from 'react';
import { BiDataItem, User, Canal } from '../types';
import { BarChart4, Box, Clock, Percent, ShoppingCart, User as UserIcon, Filter, ArrowUp, ArrowDown, Award, Star, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import DonutChart from '../components/DonutChart';

interface BiDashboardPageProps {
    biData: BiDataItem[];
    users: User[];
}

const getPeriodDates = (period: 'today' | 'last7days' | 'thisMonth') => {
    const end = new Date();
    const start = new Date();
    switch (period) {
        case 'today':
            break;
        case 'last7days':
            start.setDate(start.getDate() - 6);
            break;
        case 'thisMonth':
            start.setDate(1);
            break;
    }
    const toISODate = (d: Date) => d.toISOString().split('T')[0];
    return { startDate: toISODate(start), endDate: toISODate(end) };
};

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
        <div className="flex justify-between items-start">
            <p className="text-md font-medium text-[var(--color-text-secondary)]">{title}</p>
            <div className="p-2 bg-[var(--color-primary-bg-subtle)] text-[var(--color-primary-text-subtle)] rounded-lg">{icon}</div>
        </div>
        <p className="text-4xl font-bold text-[var(--color-text-primary)] mt-2">{value}</p>
    </div>
);

const HighlightCard: React.FC<{ title: string; value: string; subValue: string; icon: React.ReactNode; }> = ({ title, value, subValue, icon }) => (
     <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm flex items-center gap-4">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-[var(--color-text-secondary)]">{title}</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{subValue}</p>
        </div>
    </div>
);

const SimpleBarChart: React.FC<{ title: string; data: { label: string; value: number }[] }> = ({ title, data }) => {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm h-full">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">{title}</h3>
            <div className="space-y-4">
                {data.map(({ label, value }) => (
                    <div key={label}>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-medium text-[var(--color-text-secondary)]">{label}</span>
                            <span className="font-bold text-[var(--color-text-primary)]">{value}</span>
                        </div>
                        <div className="w-full bg-[var(--color-surface-secondary)] rounded-full h-4">
                            <div
                                className="bg-[var(--color-primary)] h-4 rounded-full transition-all duration-500"
                                style={{ width: `${(value / maxValue) * 100}%` }}
                                aria-label={`${label}: ${value}`}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BiDashboardPage: React.FC<BiDashboardPageProps> = ({ biData, users }) => {
    const [filters, setFilters] = useState({
        period: 'last7days' as 'today' | 'last7days' | 'thisMonth' | 'custom',
        startDate: getPeriodDates('last7days').startDate,
        endDate: getPeriodDates('last7days').endDate,
        canal: 'ALL' as Canal,
        operator: 'ALL',
    });
    
    const [sortConfig, setSortConfig] = useState<{ key: keyof BiDataItem, direction: 'asc' | 'desc' }>({ key: 'data_bipagem', direction: 'desc' });

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'period' && value !== 'custom') {
            const { startDate, endDate } = getPeriodDates(value as any);
            newFilters.startDate = startDate;
            newFilters.endDate = endDate;
        }
        setFilters(newFilters);
    };
    
    const filteredData = useMemo(() => {
        const start = new Date(`${filters.startDate}T00:00:00Z`);
        const end = new Date(`${filters.endDate}T23:59:59Z`);

        return biData
            .filter(item => {
                if (filters.canal !== 'ALL' && item.canal !== filters.canal) return false;
                if (filters.operator !== 'ALL' && item.bipado_por_id && item.bipado_por_id !== filters.operator) return false;
                 if (filters.operator !== 'ALL' && !item.bipado_por_id && item.bipado_por !== filters.operator) return false;


                const itemDate = new Date(item.data_pedido + "T12:00:00Z");
                if (isNaN(itemDate.getTime())) return false;
                
                return itemDate >= start && itemDate <= end;
            })
            .sort((a, b) => {
                const aVal = a[sortConfig.key] || (sortConfig.direction === 'asc' ? 'zzzzzz' : ''); // Treat nulls
                const bVal = b[sortConfig.key] || (sortConfig.direction === 'asc' ? 'zzzzzz' : '');
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [biData, filters, sortConfig]);

    const kpisAndCharts = useMemo(() => {
        const totalPedidosPeriodo = filteredData.length;
        const bipados = filteredData.filter(d => d.data_bipagem);
        const totalBipados = bipados.length;
        
        const totalTempo = bipados.reduce((sum, item) => sum + (item.tempo_separacao_horas || 0), 0);
        const tempoMedio = totalBipados > 0 ? (totalTempo / totalBipados).toFixed(1) : '0';

        const atrasados = bipados.filter(d => d.status_derivado === 'Bipado com Atraso').length;
        const taxaAtraso = totalBipados > 0 ? ((atrasados / totalBipados) * 100).toFixed(1) : '0';

        const totalUnidades = filteredData.reduce((sum, item) => sum + item.quantidade_final, 0);

        const pedidosComErro = filteredData.filter(d => d.status_derivado === 'ERRO').length;
        const taxaErro = totalBipados > 0 ? ((pedidosComErro / totalBipados) * 100).toFixed(1) : '0';
        
        const eficiencia = totalPedidosPeriodo > 0 ? ((totalBipados / totalPedidosPeriodo) * 100).toFixed(1) : '0';

        // Chart data
        const pedidosPorCanalMap: Record<string, number> = { 'ML': 0, 'SHOPEE': 0, 'SITE': 0 };
        const statusMap = new Map<string, number>();
        const operadorMap = new Map<string, number>();
        const skuMap = new Map<string, { name: string, count: number }>();

        filteredData.forEach(item => {
            if (pedidosPorCanalMap[item.canal] !== undefined) pedidosPorCanalMap[item.canal]++;
            statusMap.set(item.status_derivado, (statusMap.get(item.status_derivado) || 0) + 1);

            if (item.bipado_por) operadorMap.set(item.bipado_por, (operadorMap.get(item.bipado_por) || 0) + 1);
            if (item.data_bipagem) skuMap.set(item.sku_mestre, { name: item.nome_produto, count: (skuMap.get(item.sku_mestre)?.count || 0) + 1 });
        });

        const pedidosPorCanal = Object.entries(pedidosPorCanalMap).map(([label, value]) => ({ label, value }));

        const statusColors: Record<string, string> = {
            'Pendente': '#f59e0b', 'Atrasado': '#f97316', 'Bipado no Prazo': '#10b981', 'Bipado com Atraso': '#eab308', 'ERRO': '#ef4444', 'DEVOLVIDO': '#8b5cf6', 'SOLUCIONADO': '#3b82f6',
        };
        const statusDistribution = Array.from(statusMap.entries()).map(([label, value]) => ({ label, value, color: statusColors[label] || '#6b7280' }));

        const desempenhoOperador = Array.from(operadorMap.entries()).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);

        const topSku = Array.from(skuMap.entries()).sort((a, b) => b[1].count - a[1].count)[0];
        const topOperator = desempenhoOperador[0];
        const topCanal = pedidosPorCanal.sort((a, b) => b.value - a.value)[0];

        return {
            kpis: { totalPedidosPeriodo, totalBipados, tempoMedio, taxaAtraso, totalUnidades, pedidosComErro, taxaErro, eficiencia },
            charts: { pedidosPorCanal, statusDistribution, desempenhoOperador },
            highlights: { topSku, topOperator, topCanal },
        };
    }, [filteredData]);
    
    const requestSort = (key: keyof BiDataItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ label: string, sortKey: keyof BiDataItem }> = ({ label, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        const Icon = sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;
        return <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]"><button onClick={() => requestSort(sortKey)} className="flex items-center gap-1">{label}{isSorted && <Icon size={14}/>}</button></th>;
    };
    const {kpis, charts, highlights} = kpisAndCharts;
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-3"><BarChart4 size={32}/> BI Dashboard</h1>
            
            <div className="flex flex-wrap gap-4 items-center p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm">
                <Filter size={18} className="text-[var(--color-text-secondary)]"/>
                <select value={filters.period} onChange={e => handleFilterChange('period', e.target.value)} className="p-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]">
                    <option value="last7days">Últimos 7 dias</option>
                    <option value="thisMonth">Este Mês</option>
                    <option value="today">Hoje</option>
                    <option value="custom">Customizado</option>
                </select>
                {filters.period === 'custom' && (<>
                    <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="p-2 text-sm border rounded-md" />
                    <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="p-2 text-sm border rounded-md" />
                </>)}
                <select value={filters.canal} onChange={e => handleFilterChange('canal', e.target.value)} className="p-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"><option value="ALL">Todos Canais</option><option value="ML">ML</option><option value="SHOPEE">Shopee</option><option value="SITE">Site</option></select>
                <select value={filters.operator} onChange={e => handleFilterChange('operator', e.target.value)} className="p-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"><option value="ALL">Todos Operadores</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard title="Total de Pedidos" value={kpis.totalPedidosPeriodo.toString()} icon={<ShoppingCart size={20}/>} />
                <KpiCard title="Pedidos Bipados" value={kpis.totalBipados.toString()} icon={<CheckCircle size={20}/>} />
                <KpiCard title="Eficiência de Bipagem" value={`${kpis.eficiencia} %`} icon={<TrendingUp size={20}/>} />
                <KpiCard title="Tempo Médio de Separação" value={`${kpis.tempoMedio} h`} icon={<Clock size={20}/>} />
                <KpiCard title="Pedidos com Erro" value={kpis.pedidosComErro.toString()} icon={<AlertTriangle size={20}/>} />
                <KpiCard title="Taxa de Erro" value={`${kpis.taxaErro} %`} icon={<Percent size={20}/>} />
            </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <HighlightCard title="Operador Destaque" value={highlights.topOperator?.label || 'N/A'} subValue={`${highlights.topOperator?.value || 0} bipagens`} icon={<Award size={24}/>} />
                <HighlightCard title="SKU Mais Bipado" value={highlights.topSku?.[0] || 'N/A'} subValue={`${highlights.topSku?.[1].count || 0} bipagens`} icon={<Star size={24}/>} />
                <HighlightCard title="Canal Principal" value={highlights.topCanal?.label || 'N/A'} subValue={`${highlights.topCanal?.value || 0} pedidos`} icon={<TrendingUp size={24}/>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DonutChart title="Distribuição de Status" data={charts.statusDistribution} />
                <SimpleBarChart title="Desempenho por Operador" data={charts.desempenhoOperador} />
            </div>

            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Dados Detalhados</h3>
                <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] max-h-[500px]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-[var(--color-surface-secondary)] sticky top-0">
                            <tr>
                                <SortableHeader label="Pedido" sortKey="codigo_pedido" />
                                <SortableHeader label="Data Pedido" sortKey="data_pedido" />
                                <SortableHeader label="Canal" sortKey="canal" />
                                <SortableHeader label="Operador" sortKey="bipado_por" />
                                <SortableHeader label="SKU" sortKey="sku_mestre" />
                                <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">Qtd</th>
                                <SortableHeader label="Status" sortKey="status_derivado" />
                                <SortableHeader label="T. Separação (h)" sortKey="tempo_separacao_horas" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredData.map(item => (
                                <tr key={item.id_pedido} className="hover:bg-[var(--color-surface-secondary)]">
                                    <td className="py-2 px-3 font-mono">{item.codigo_pedido}</td>
                                    <td className="py-2 px-3">{item.data_pedido}</td>
                                    <td className="py-2 px-3">{item.canal}</td>
                                    <td className="py-2 px-3">{item.bipado_por || '-'}</td>
                                    <td className="py-2 px-3">{item.sku_mestre}</td>
                                    <td className="py-2 px-3 text-center">{item.quantidade_final}</td>
                                    <td className="py-2 px-3">{item.status_derivado}</td>
                                    <td className="py-2 px-3 text-center">{item.tempo_separacao_horas?.toFixed(1) || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BiDashboardPage;