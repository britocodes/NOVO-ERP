
import React, { useState, useMemo, useEffect } from 'react';
import { OrderItem, User, Canal, OrderStatusValue, ScanLogItem, ReturnItem, GeneralSettings, OrderResolutionDetails, ORDER_STATUS_VALUES, StockItem, SkuLink } from '../types';
// @ts-ignore
import { Search, AlertTriangle, Undo, Info, CheckCircle, FileWarning, ShoppingCart, Trash2, ChevronDown, ChevronRight, PlusCircle, Loader2, Edit, ArrowUp, ArrowDown, Send, Filter, User as UserIcon, X, ChevronLeft, ChevronUp, Calendar, RefreshCw, Link as LinkIcon, Truck } from 'lucide-react';
import ConfirmActionModal from '../components/ConfirmActionModal';
import Pagination from '../components/Pagination';
import LogErrorModal from '../components/LogErrorModal';
import SolutionModal from '../components/SolutionModal';

// --- Helper Functions & Types ---

type DisplayStatus = OrderStatusValue | 'ATRASADO' | 'BIPADO (COM ATRASO)';

const getOrderDate = (order: { data?: string; created_at?: string }, dateSource: 'sale_date' | 'import_date'): Date | null => {
    if (dateSource === 'import_date' && order.created_at) {
        return new Date(order.created_at);
    }
    // Fallback to sale date (order.data) or if source is explicitly sale_date
    const dStr = String(order.data || '');
    if (!dStr) return null;
    
    if (dStr.includes('-')) {
        const [y, m, d] = dStr.split('-');
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    } else if (dStr.includes('/')) {
        const [d, m, y] = dStr.split('/');
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    }
    return null;
}

const getShippingDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    } else if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    }
    return null;
};

const getDisplayStatus = (order: OrderItem, scanHistory: ScanLogItem[], dateSource: 'sale_date' | 'import_date'): DisplayStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const orderDate = getOrderDate(order, dateSource);
    
    if (!orderDate || isNaN(orderDate.getTime())) return order.status;
    
    const compareDate = new Date(orderDate);
    compareDate.setHours(0,0,0,0);

    if (order.status === 'BIPADO') {
        const scan = scanHistory.find(s => s.displayKey === order.orderId || s.displayKey === order.tracking);
        if (scan && scan.time && !isNaN(scan.time.getTime())) {
            const scanDate = new Date(scan.time);
            scanDate.setHours(0, 0, 0, 0);
            if (scanDate > compareDate) {
                return 'BIPADO (COM ATRASO)';
            }
        }
    }
    if (order.status === 'NORMAL' && compareDate < today) {
        return 'ATRASADO';
    }
    return order.status;
};


// --- Sub-components ---

const RegisteredReturnsTable: React.FC<{ returns: ReturnItem[], title?: string, onRemove?: (item: ReturnItem) => void }> = ({ returns, title = "Devoluções Registradas", onRemove }) => (
    <div className="mt-6">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">{title}</h3>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full bg-[var(--color-surface)] text-sm">
                <thead className="bg-[var(--color-surface-secondary)] sticky top-0">
                    <tr>
                        {['Data', 'Rastreio', 'Nome do Cliente', 'Registrado por'].map(h => 
                            <th key={h} className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>
                        )}
                        {onRemove && <th className="py-2 px-3 text-center font-semibold text-[var(--color-text-secondary)]">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                    {returns.length > 0 ? returns.map(item => (
                        <tr key={item.id}>
                            <td className="py-2 px-3">{item.loggedAt && !isNaN(item.loggedAt.getTime()) ? item.loggedAt.toLocaleString('pt-BR') : 'Data inválida'}</td>
                            <td className="py-2 px-3 font-mono">{item.tracking}</td>
                            <td className="py-2 px-3">{item.customerName}</td>
                            <td className="py-2 px-3">{item.loggedBy}</td>
                            {onRemove && (
                                <td className="py-2 px-3 text-center">
                                    <button onClick={() => onRemove(item)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full" title="Remover devolução">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={onRemove ? 5 : 4} className="text-center py-8 text-[var(--color-text-secondary)]">
                                Nenhuma devolução encontrada.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

interface PedidosPageProps {
    allOrders: OrderItem[];
    scanHistory: ScanLogItem[];
    returns: ReturnItem[];
    onLogError: (orderIdentifier: string, reason: string) => Promise<boolean>;
    onLogReturn: (tracking: string, customerName: string) => Promise<boolean>;
    currentUser: User;
    onDeleteOrders: (orderIds: string[]) => Promise<void>;
    onBulkCancelBipagem: (scanIds: string[]) => Promise<void>;
    onUpdateStatus: (orderIds: string[], newStatus: OrderStatusValue) => Promise<boolean>;
    onRemoveReturn: (returnId: string) => Promise<boolean>;
    onSolveOrders: (orderIds: string[], resolution: Omit<OrderResolutionDetails, 'resolved_by' | 'resolved_at'>) => Promise<boolean>;
    generalSettings: GeneralSettings;
    users: User[];
    skuLinks: SkuLink[];
    stockItems: StockItem[];
}

type Tab = 'consultar' | 'conferencia' | 'devolucao';
type SortKey = 'data' | 'customer_name' | 'status' | 'bipadoPor';
type AugmentedOrder = (OrderItem | GroupedOrder) & { displayStatus: DisplayStatus; bipadoPor?: string };
type GroupedOrder = {
    isGroup: true;
    groupKey: string;
    items: OrderItem[];
    id: string; 
    orderId: string;
    tracking: string;
    data: string;
    created_at?: string;
    status: OrderStatusValue;
    canal: Canal;
    customer_name?: string;
    customer_cpf_cnpj?: string;
    data_prevista_envio?: string;
};

const TabButton: React.FC<{ tab: Tab, activeTab: Tab, label: string, icon: React.ReactNode, onClick: (tab: Tab) => void }> = ({ tab, activeTab, label, icon, onClick }) => (
    <button
        onClick={() => onClick(tab)}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tab ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-border)]'}`}
    >
        {icon} <span className="ml-2">{label}</span>
    </button>
);

const PedidosPage: React.FC<PedidosPageProps> = (props) => {
    const { allOrders, scanHistory, returns, onLogError, onLogReturn, currentUser, onDeleteOrders, onBulkCancelBipagem, onUpdateStatus, onRemoveReturn, onSolveOrders, generalSettings, users, skuLinks, stockItems } = props;
    
    const [activeTab, setActiveTab] = useState<Tab>('consultar');
    const [filters, setFilters] = useState({ 
        search: '', 
        canal: 'ALL' as Canal, 
        status: 'ALL' as DisplayStatus | 'ALL',
        startDate: '',
        endDate: '',
        shippingDateStart: '',
        shippingDateEnd: '',
    });
    
    // Configuração local de fonte de data, iniciando com a global mas permitindo override
    const [dateSourceMode, setDateSourceMode] = useState<'sale_date' | 'import_date'>(generalSettings.dateSource || 'sale_date');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'data', direction: 'desc' });
    const [isSelectionMenuOpen, setIsSelectionMenuOpen] = useState(false);
    
    // Modal states
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean, order: OrderItem | null }>({ isOpen: false, order: null });
    const [solutionModal, setSolutionModal] = useState<{ isOpen: boolean, orders: OrderItem[] }>({ isOpen: false, orders: [] });
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [pageInput, setPageInput] = useState(currentPage.toString());

    // Link maps for display
    const skuLinkMap = useMemo(() => new Map(skuLinks.map(l => [l.importedSku.toUpperCase(), l.masterProductSku.toUpperCase()])), [skuLinks]);
    const stockMap = useMemo(() => new Map(stockItems.map(i => [i.code.toUpperCase(), i])), [stockItems]);

    useEffect(() => {
        setSelectedIds(new Set());
        setCurrentPage(1);
    }, [activeTab, filters, itemsPerPage, dateSourceMode]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const scanMap = useMemo(() => {
        const map = new Map<string, string>();
        scanHistory.forEach(s => {
            if (s.status === 'OK' || s.synced) {
                map.set(s.displayKey, s.user);
            }
        });
        return map;
    }, [scanHistory]);

    const augmentedAndFilteredOrders = useMemo(() => {
        const searchLower = filters.search.toLowerCase();
        
        const grouped = new Map<string, OrderItem[]>();
        allOrders.forEach(order => {
            const key = order.orderId || order.tracking;
            if (!key) return;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(order);
        });

        let displayList: AugmentedOrder[] = [];
        grouped.forEach((items, groupKey) => {
            if (items.length > 1) {
                const first = items[0];
                const displayStatus = getDisplayStatus(first, scanHistory, dateSourceMode);
                const bipadoPor = scanMap.get(first.orderId) || scanMap.get(first.tracking);
                displayList.push({ 
                    isGroup: true, groupKey, items, id: first.id, orderId: first.orderId, tracking: first.tracking, 
                    data: first.data, created_at: first.created_at, status: first.status, canal: first.canal, 
                    customer_name: first.customer_name, customer_cpf_cnpj: first.customer_cpf_cnpj, 
                    data_prevista_envio: first.data_prevista_envio, displayStatus, bipadoPor 
                });
            } else {
                const order = items[0];
                const displayStatus = getDisplayStatus(order, scanHistory, dateSourceMode);
                const bipadoPor = scanMap.get(order.orderId) || scanMap.get(order.tracking);
                displayList.push({ ...order, displayStatus, bipadoPor });
            }
        });

        const filtered = displayList.filter(o => {
            if (filters.canal !== 'ALL' && o.canal !== filters.canal) return false;
            if (filters.status !== 'ALL' && o.displayStatus !== filters.status) return false;
            if (searchLower && !(
                o.orderId.toLowerCase().includes(searchLower) ||
                o.tracking.toLowerCase().includes(searchLower) ||
                o.customer_name?.toLowerCase().includes(searchLower) ||
                o.customer_cpf_cnpj?.toLowerCase().includes(searchLower) ||
                ('isGroup' in o ? o.items.some(i => i.sku.toLowerCase().includes(searchLower)) : o.sku.toLowerCase().includes(searchLower))
            )) return false;
            
            // Filtro de Data (Venda ou Importação)
            if (filters.startDate || filters.endDate) {
                const orderDate = getOrderDate(o, dateSourceMode);
                if (!orderDate || isNaN(orderDate.getTime())) return false;

                if (filters.startDate) {
                    const startDate = new Date(filters.startDate + "T00:00:00Z");
                    if (orderDate < startDate) return false;
                }
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate + "T23:59:59Z");
                    if (orderDate > endDate) return false;
                }
            }

            // Filtro Específico Shopee: Data Prevista de Envio
            if (filters.canal === 'SHOPEE' && (filters.shippingDateStart || filters.shippingDateEnd)) {
                const shippingDate = getShippingDate(o.data_prevista_envio);
                if (!shippingDate) return false; // Se não tem data de envio, exclui do filtro

                if (filters.shippingDateStart) {
                    const startShip = new Date(filters.shippingDateStart + "T00:00:00Z");
                    if (shippingDate < startShip) return false;
                }
                if (filters.shippingDateEnd) {
                    const endShip = new Date(filters.shippingDateEnd + "T23:59:59Z");
                    if (shippingDate > endShip) return false;
                }
            }
            
            return true;
        });
        
        // Sorting
        filtered.sort((a, b) => {
            let aVal, bVal;
            if (sortConfig.key === 'data') {
                const dateA = getOrderDate(a, dateSourceMode);
                const dateB = getOrderDate(b, dateSourceMode);
                aVal = dateA ? dateA.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
                bVal = dateB ? dateB.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
            } else {
                aVal = a[sortConfig.key] || '';
                bVal = b[sortConfig.key] || '';
            }
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [allOrders, filters, scanHistory, scanMap, sortConfig, dateSourceMode]);

    const totalPages = Math.ceil(augmentedAndFilteredOrders.length / itemsPerPage);

    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);
    
    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPageInput(e.target.value);
    };

    const handlePageInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const page = parseInt(pageInput, 10);
        if (!isNaN(page) && page > 0 && page <= totalPages) {
            setCurrentPage(page);
        } else {
            setPageInput(currentPage.toString()); // revert if invalid
        }
    };

    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return augmentedAndFilteredOrders.slice(startIndex, startIndex + itemsPerPage);
    }, [augmentedAndFilteredOrders, currentPage, itemsPerPage]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ label: string, sortKey: SortKey }> = ({ label, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        const Icon = sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;
        return <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1 hover:text-[var(--color-primary)]">{label}{isSorted && <Icon size={14}/>}</button>
        </th>;
    };
    
    // ... Selection and Action Handlers (same as before) ...
    // --- Selection Handlers ---
    const handleSelect = (item: AugmentedOrder, isSelected: boolean) => {
        const idsToAddOrRemove = 'isGroup' in item ? item.items.map(i => i.id) : [item.id];
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            idsToAddOrRemove.forEach(id => {
                if (isSelected) newSet.add(id);
                else newSet.delete(id);
            });
            return newSet;
        });
    };
    
    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const allPageIds = paginatedOrders.flatMap(o => 'isGroup' in o ? o.items.map(i => i.id) : o.id);
        if (e.target.checked) {
            setSelectedIds(prev => new Set([...prev, ...allPageIds]));
        } else {
            const pageIdsSet = new Set(allPageIds);
            setSelectedIds(prev => new Set(Array.from(prev).filter(id => !pageIdsSet.has(id))));
        }
    };

    const handleSelectAllFiltered = () => {
        // This selects ALL items matching the filter, not just the page
        const allFilteredIds = augmentedAndFilteredOrders.flatMap(o => 'isGroup' in o ? o.items.map(i => i.id) : o.id);
        setSelectedIds(new Set(allFilteredIds));
        setIsSelectionMenuOpen(false);
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
        setIsSelectionMenuOpen(false);
    };
    
    // --- Action Handlers ---
    const createConfirmAction = (title: string, message: React.ReactNode, action: () => Promise<any>) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: async () => {
                setIsActionLoading(true);
                await action();
                setSelectedIds(new Set());
                setIsActionLoading(false);
                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };
    
    const handleBulkDelete = () => createConfirmAction(`Excluir ${selectedIds.size} Pedidos`, `Tem certeza que deseja excluir permanentemente ${selectedIds.size} pedido(s) selecionado(s)? Esta ação é irreversível.`, () => onDeleteOrders(Array.from(selectedIds)));
    
    const handleCancelBips = () => {
        const selectedOrders = allOrders.filter(o => selectedIds.has(o.id));
        if (selectedOrders.some(o => o.status !== 'BIPADO')) {
             alert("Apenas pedidos com status 'BIPADO' podem ter a bipagem cancelada.");
             return;
        }
        const identifiers = selectedOrders.map(o => o.orderId || o.tracking);
        const scanIdsToCancel = scanHistory.filter(s => identifiers.includes(s.displayKey)).map(s => s.id);
        if (scanIdsToCancel.length === 0) return;
        createConfirmAction(`Cancelar ${scanIdsToCancel.length} Bipagens`, `Isso irá reverter o status e o estoque para ${scanIdsToCancel.length} bipagens relacionadas. Deseja continuar?`, () => onBulkCancelBipagem(scanIdsToCancel));
    };

    const handleUpdateSelectedStatus = (newStatus: OrderStatusValue) => {
        if (selectedIds.size === 0) return;
        let ordersToUpdate = allOrders.filter(o => selectedIds.has(o.id));
        
        if (newStatus === 'SOLUCIONADO') {
            ordersToUpdate = ordersToUpdate.filter(o => o.status === 'ERRO');
            if(ordersToUpdate.length === 0) {
                alert("A ação 'Solucionar' só pode ser aplicada a pedidos com status 'ERRO'.");
                return;
            }
        }
        
        if (newStatus === 'BIPADO') { // For 'Regularizar Atraso'
             ordersToUpdate = ordersToUpdate.filter(o => getDisplayStatus(o, scanHistory, dateSourceMode) === 'ATRASADO');
             if(ordersToUpdate.length === 0) {
                 alert("Apenas pedidos 'ATRASADOS' podem ser regularizados.");
                 return;
             }
        }

        if (newStatus === 'ERRO') {
            setErrorModal({ isOpen: true, order: ordersToUpdate[0] }); // For now, handle one by one for error reason
        } else if (newStatus === 'SOLUCIONADO') {
            setSolutionModal({ isOpen: true, orders: ordersToUpdate });
        } else {
            const ids = ordersToUpdate.map(o => o.id);
            createConfirmAction(`Atualizar ${ids.length} Pedidos`, `Deseja alterar o status de ${ids.length} pedido(s) para "${newStatus}"?`, () => onUpdateStatus(ids, newStatus));
        }
    };

    const handleConfirmLogError = async (reason: string) => {
        setIsActionLoading(true);
        if (errorModal.order) {
            await onLogError(errorModal.order.orderId || errorModal.order.tracking, reason);
        }
        setIsActionLoading(false);
        setErrorModal({ isOpen: false, order: null });
        setSelectedIds(new Set());
        return true;
    };
    
    const handleConfirmSolution = async (details: any) => {
        setIsActionLoading(true);
        const success = await onSolveOrders(solutionModal.orders.map(o => o.id), details);
        setIsActionLoading(false);
        if (success) {
            setSolutionModal({ isOpen: false, orders: [] });
            setSelectedIds(new Set());
        }
        return success;
    };
    
    const handleRemoveReturnAction = (item: ReturnItem) => createConfirmAction('Remover Devolução', `Tem certeza que deseja remover a devolução do rastreio ${item.tracking}? O status do pedido original será revertido para NORMAL.`, () => onRemoveReturn(item.id));

    // --- Devolution Tab ---
    const [returnTracking, setReturnTracking] = useState('');
    const [returnCustomer, setReturnCustomer] = useState('');
    const [isLoggingReturn, setIsLoggingReturn] = useState(false);
    const [devolutionFilters, setDevolutionFilters] = useState({ startDate: '', endDate: '', canal: 'ALL' as Canal });
    
    const handleLogReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!returnTracking) return;
        
        const orderToReturn = allOrders.find(o => o.tracking === returnTracking);
        if(!orderToReturn || orderToReturn.status !== 'BIPADO') {
            alert("Devoluções só podem ser registradas para pedidos com status 'BIPADO'.");
            return;
        }

        setIsLoggingReturn(true);
        const success = await onLogReturn(returnTracking, returnCustomer || orderToReturn.customer_name || '');
        if (success) {
            setReturnTracking('');
            setReturnCustomer('');
        }
        setIsLoggingReturn(false);
    };
    
    const filteredReturns = useMemo(() => {
        return returns.filter(r => {
            const order = allOrders.find(o => o.tracking === r.tracking);
            if (devolutionFilters.canal !== 'ALL' && order?.canal !== devolutionFilters.canal) return false;
            
            const returnDate = new Date(r.loggedAt);
            if (devolutionFilters.startDate && returnDate < new Date(devolutionFilters.startDate + 'T00:00:00')) return false;
            if (devolutionFilters.endDate && returnDate > new Date(devolutionFilters.endDate + 'T23:59:59')) return false;

            return true;
        });
    }, [returns, allOrders, devolutionFilters]);

    // --- Conferencia Tab ---
    const [conferenciaFilters, setConferenciaFilters] = useState({ operatorId: 'ALL', search: '' });

    const conferenciaScans = useMemo(() => {
        const search = conferenciaFilters.search.toLowerCase();
        return scanHistory
            .filter(s => s.status === 'OK' || s.synced)
            .map(scan => ({ scan, order: allOrders.find(o => o.orderId === scan.displayKey || o.tracking === scan.displayKey) }))
            .filter(item => {
                if (!item.order) return false;
                if (conferenciaFilters.operatorId !== 'ALL' && item.scan.userId !== conferenciaFilters.operatorId) return false;
                if (search && !(
                    item.order.sku.toLowerCase().includes(search) ||
                    item.order.color.toLowerCase().includes(search)
                )) return false;
                return true;
            })
            .slice(0, 100);
    }, [scanHistory, allOrders, conferenciaFilters]);
    
    const isConsultarTab = activeTab === 'consultar';
    const areSomeSelected = selectedIds.size > 0;
    const selectedOrdersForActions = allOrders.filter(o => selectedIds.has(o.id));
    const canCancelBip = areSomeSelected && selectedOrdersForActions.every(o => o.status === 'BIPADO');
    const canSolve = areSomeSelected && selectedOrdersForActions.some(o => o.status === 'ERRO');
    const canRegularize = areSomeSelected && selectedOrdersForActions.some(o => getDisplayStatus(o, scanHistory, dateSourceMode) === 'ATRASADO');

    const getLinkedProductName = (sku: string) => {
        const masterCode = skuLinkMap.get(sku.toUpperCase());
        const product = masterCode ? stockMap.get(masterCode) : null;
        return product ? product.name : null;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header ... */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex-shrink-0">Gerenciamento de Pedidos</h1>
                <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1">
                    <button 
                        onClick={() => setDateSourceMode('sale_date')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${dateSourceMode === 'sale_date' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Calendar size={14}/>
                        Data da Venda (Planilha)
                    </button>
                    <button 
                        onClick={() => setDateSourceMode('import_date')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${dateSourceMode === 'import_date' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <RefreshCw size={14}/>
                        Data de Importação
                    </button>
                </div>
            </div>

            <div className="flex-grow flex flex-col bg-[var(--color-surface)] p-4 sm:p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="border-b border-[var(--color-border)] flex-shrink-0"><div className="flex -mb-px flex-wrap"><TabButton tab="consultar" activeTab={activeTab} label="Consultar Pedidos" icon={<ShoppingCart size={16}/>} onClick={setActiveTab} /><TabButton tab="conferencia" activeTab={activeTab} label="Conferência Pós-Bipagem" icon={<Send size={16}/>} onClick={setActiveTab} /><TabButton tab="devolucao" activeTab={activeTab} label={`Devoluções (${returns.length})`} icon={<Undo size={16}/>} onClick={setActiveTab} /></div></div>

                <div className="mt-6 flex-1 flex flex-col min-h-0">
                    {activeTab === 'consultar' && (
                         <div className="flex flex-col flex-1">
                            {/* ... Filters ... */}
                            <div className="flex-shrink-0 flex flex-wrap gap-4 justify-between items-center mb-4">
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="relative flex-grow min-w-[250px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" /><input type="text" placeholder="Buscar..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border-[var(--color-border)] bg-[var(--color-surface)] rounded-md"/></div>
                                    <select value={filters.canal} onChange={e => handleFilterChange('canal', e.target.value)} className="p-2 text-sm border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"><option value="ALL">Todos Canais</option><option value="ML">Mercado Livre</option><option value="SHOPEE">Shopee</option><option value="SITE">Site</option></select>
                                    <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="p-2 text-sm border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"><option value="ALL">Todos Status</option>{[...ORDER_STATUS_VALUES, 'ATRASADO'].map(status => <option key={status} value={status}>{status}</option>)}</select>
                                    
                                    {/* DATA DA VENDA / IMPORTACAO */}
                                    <div className="flex items-center gap-2 p-1 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-md">
                                        <label htmlFor="startDate" className="text-sm font-medium text-[var(--color-text-secondary)] pl-1">De:</label>
                                        <input id="startDate" type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="p-1.5 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-surface)]" />
                                        <label htmlFor="endDate" className="text-sm font-medium text-[var(--color-text-secondary)]">Até:</label>
                                        <input id="endDate" type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="p-1.5 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-surface)]" />
                                        {(filters.startDate || filters.endDate) && (
                                            <button onClick={() => setFilters(p => ({...p, startDate: '', endDate: ''}))} className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-600">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* FILTRO DE ENVIO PREVISTO (APENAS SHOPEE) */}
                                    {filters.canal === 'SHOPEE' && (
                                        <div className="flex items-center gap-2 p-1 bg-orange-50 border border-orange-200 rounded-md">
                                            <Truck size={14} className="text-orange-500 ml-1"/>
                                            <label htmlFor="shipStart" className="text-sm font-bold text-orange-700 pl-1">Prev. Envio:</label>
                                            <input id="shipStart" type="date" value={filters.shippingDateStart} onChange={e => handleFilterChange('shippingDateStart', e.target.value)} className="p-1.5 border border-orange-200 rounded-md text-sm bg-white" />
                                            <span className="text-xs text-orange-400">até</span>
                                            <input id="shipEnd" type="date" value={filters.shippingDateEnd} onChange={e => handleFilterChange('shippingDateEnd', e.target.value)} className="p-1.5 border border-orange-200 rounded-md text-sm bg-white" />
                                             {(filters.shippingDateStart || filters.shippingDateEnd) && (
                                                <button onClick={() => setFilters(p => ({...p, shippingDateStart: '', shippingDateEnd: ''}))} className="p-1.5 text-orange-400 hover:text-red-600">
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* ... Pagination Controls ... */}
                                <div className="flex items-center gap-2">
                                    <label htmlFor="items-per-page-top" className="text-sm font-medium text-[var(--color-text-secondary)]">Exibir:</label>
                                    <select 
                                        id="items-per-page-top"
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1); // Reset to first page
                                        }}
                                        className="p-2 text-sm border-[var(--color-border)] rounded-md bg-[var(--color-surface)] font-bold"
                                    >
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                        <option value={500}>500</option>
                                        <option value={augmentedAndFilteredOrders.length}>Todos ({augmentedAndFilteredOrders.length})</option>
                                    </select>
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] disabled:opacity-50">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 text-sm">
                                        <input 
                                            type="number" 
                                            value={pageInput}
                                            onChange={handlePageInputChange}
                                            onBlur={() => setPageInput(currentPage.toString())} // Revert on blur if not submitted
                                            className="w-16 p-2 text-center border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"
                                        />
                                        <span className="text-[var(--color-text-secondary)]">/ {totalPages}</span>
                                    </form>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] disabled:opacity-50">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                             {selectedIds.size > 0 && (
                                <div className="flex-shrink-0 flex gap-2 flex-wrap mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <span className="font-semibold text-blue-800 text-sm p-2">{selectedIds.size} selecionado(s)</span>
                                    <button onClick={() => handleUpdateSelectedStatus('ERRO')} className="flex items-center gap-1 text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] p-2 rounded-md hover:brightness-95 border border-[var(--color-danger-border)]"><AlertTriangle size={14}/> Marcar Erro</button>
                                    <button onClick={() => handleUpdateSelectedStatus('SOLUCIONADO')} disabled={!canSolve} className="flex items-center gap-1 text-sm text-[var(--color-success-text)] bg-[var(--color-success-bg)] p-2 rounded-md hover:brightness-95 border border-[var(--color-success-border)] disabled:opacity-50"><CheckCircle size={14}/> Solucionar</button>
                                    <button onClick={handleCancelBips} disabled={!canCancelBip} className="flex items-center gap-1 text-sm text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-2 rounded-md hover:brightness-95 border border-[var(--color-warning-border)] disabled:opacity-50"><Undo size={14}/> Cancelar Bip</button>
                                    <button onClick={() => handleUpdateSelectedStatus('BIPADO')} disabled={!canRegularize} className="flex items-center gap-1 text-sm text-[var(--color-primary-text-subtle)] bg-[var(--color-primary-bg-subtle)] p-2 rounded-md hover:brightness-95 disabled:opacity-50">Regularizar Atraso</button>
                                    <button onClick={handleBulkDelete} className="flex items-center gap-1 text-sm text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] p-2 rounded-md hover:bg-[var(--color-surface-tertiary)]"><Trash2 size={14}/> Excluir</button>
                                </div>
                            )}
                            
                            {/* Mobile Card View */}
                            <div className="md:hidden flex-grow overflow-auto space-y-3">
                                {paginatedOrders.map(item => (
                                    <OrderCard
                                        key={item.id}
                                        item={item}
                                        isSelected={'isGroup' in item ? item.items.every(i => selectedIds.has(i.id)) : selectedIds.has(item.id)}
                                        onSelect={(isSelected) => handleSelect(item, isSelected)}
                                        isExpanded={'isGroup' in item && expandedGroups.has(item.groupKey)}
                                        onToggleExpand={() => 'isGroup' in item && setExpandedGroups(p => { const n = new Set(p); n.has(item.groupKey) ? n.delete(item.groupKey) : n.add(item.groupKey); return n; })}
                                    />
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block flex-grow overflow-auto rounded-lg border border-[var(--color-border)]">
                                <table className="min-w-full bg-[var(--color-surface)] text-sm">
                                    <thead className="bg-[var(--color-surface-secondary)] sticky top-0">
                                        <tr>
                                            <th className="py-2 px-3 w-12 text-center relative">
                                                <div className="flex items-center justify-center">
                                                    <input type="checkbox" onChange={handleSelectAllOnPage} checked={paginatedOrders.length > 0 && paginatedOrders.every(o => 'isGroup' in o ? o.items.every(i => selectedIds.has(i.id)) : selectedIds.has(o.id))} className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"/>
                                                    <button onClick={() => setIsSelectionMenuOpen(prev => !prev)} className="ml-1 p-0.5 rounded-full hover:bg-[var(--color-surface-tertiary)]"><ChevronDown size={14} /></button>
                                                </div>
                                                {isSelectionMenuOpen && (
                                                    <div className="absolute top-full left-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg z-10 w-48">
                                                        <button onClick={handleSelectAllFiltered} className="block w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-secondary)]">Selecionar todos filtrados ({augmentedAndFilteredOrders.length})</button>
                                                        <button onClick={handleClearSelection} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-[var(--color-surface-secondary)]">Limpar seleção</button>
                                                    </div>
                                                )}
                                            </th>
                                            <th className="py-2 px-3 w-8"></th>
                                            <SortableHeader label={dateSourceMode === 'sale_date' ? "Data Venda" : "Data Import."} sortKey="data"/>
                                            <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">Canal</th>
                                            <SortableHeader label="Cliente" sortKey="customer_name"/>
                                            {isConsultarTab && generalSettings.pedidos.displayCustomerIdentifier && <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">CPF/CNPJ</th>}
                                            <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">Pedido/Rastreio</th>
                                            <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">SKU / Produto Vinculado</th>
                                            <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">Qtd</th>
                                            <th className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">Cor</th>
                                            <SortableHeader label="Status" sortKey="status"/>
                                            <SortableHeader label="Bipado por" sortKey="bipadoPor"/>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {paginatedOrders.map(item => {
                                            const isGroup = 'isGroup' in item;
                                            const isSelected = isGroup ? item.items.every(i => selectedIds.has(i.id)) : selectedIds.has(item.id);
                                            const isExpanded = isGroup && expandedGroups.has(item.groupKey);
                                            
                                            const displayDate = dateSourceMode === 'import_date' && item.created_at 
                                                ? new Date(item.created_at).toLocaleDateString('pt-BR') 
                                                : item.data;
                                            
                                            const linkedProduct = !isGroup ? getLinkedProductName((item as OrderItem).sku) : null;

                                            return <React.Fragment key={item.id}>
                                                <tr className={isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                                    <td className="py-2 px-3 text-center"><input type="checkbox" checked={isSelected} onChange={(e) => handleSelect(item, e.target.checked)} className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" /></td>
                                                    <td className="py-2 px-3 text-center">{isGroup && <button onClick={() => setExpandedGroups(p => {const n=new Set(p); n.has(item.groupKey)?n.delete(item.groupKey):n.add(item.groupKey); return n;})}>{isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>}</td>
                                                    <td className="py-2 px-3">{displayDate}</td>
                                                    <td className="py-2 px-3">{item.canal}</td>
                                                    <td className="py-2 px-3">{item.customer_name || '-'}</td>
                                                    {isConsultarTab && generalSettings.pedidos.displayCustomerIdentifier && <td className="py-2 px-3 font-mono text-xs">{item.customer_cpf_cnpj || '-'}</td>}
                                                    <td className="py-2 px-3 font-mono text-xs"><div>{item.orderId}</div><div>{item.tracking}</div></td>
                                                    <td className="py-2 px-3">
                                                        {isGroup ? `Múltiplos (${item.items.length})` : (
                                                            <div>
                                                                <div className="font-bold text-slate-800">{(item as OrderItem).sku}</div>
                                                                {linkedProduct && <div className="text-[10px] text-green-600 flex items-center gap-1"><LinkIcon size={10}/> {linkedProduct}</div>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-bold">{isGroup ? item.items.reduce((acc, i) => acc + i.qty_final, 0) : (item as OrderItem).qty_final}</td>
                                                    <td className="py-2 px-3">{isGroup ? 'Diversas' : (item as OrderItem).color}</td>
                                                    <td className="py-2 px-3 font-semibold">{item.displayStatus}</td>
                                                    <td className="py-2 px-3">{item.bipadoPor || '-'}</td>
                                                </tr>
                                                {isExpanded && isGroup && item.items.map(subItem => {
                                                    const subLinked = getLinkedProductName(subItem.sku);
                                                    return (
                                                        <tr key={subItem.id} className="bg-[var(--color-surface-secondary)]">
                                                            <td colSpan={isConsultarTab && generalSettings.pedidos.displayCustomerIdentifier ? 7 : 6}></td>
                                                            <td className="py-1 px-3 pl-8">
                                                                <div className="font-bold text-slate-700">{subItem.sku}</div>
                                                                {subLinked && <div className="text-[10px] text-green-600 flex items-center gap-1"><LinkIcon size={10}/> {subLinked}</div>}
                                                            </td>
                                                            <td className="py-1 px-3 text-center font-bold">{subItem.qty_final}</td>
                                                            <td className="py-1 px-3">{subItem.color}</td>
                                                            <td colSpan={2}></td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-shrink-0">
                                <Pagination currentPage={currentPage} totalItems={augmentedAndFilteredOrders.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
                            </div>
                         </div>
                    )}
                    {activeTab === 'conferencia' && (
                        // ... (rest of the file remains same) ...
                        <div>
                            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                                <div className="flex flex-wrap gap-4 items-center">
                                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Últimos Pedidos Bipados</h3>
                                    <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" /><input type="text" placeholder="Buscar SKU/Cor..." value={conferenciaFilters.search} onChange={e => setConferenciaFilters(p => ({...p, search: e.target.value}))} className="w-full pl-9 pr-3 py-2 text-sm border-[var(--color-border)] bg-[var(--color-surface)] rounded-md"/></div>
                                    <select value={conferenciaFilters.operatorId} onChange={e => setConferenciaFilters(p => ({...p, operatorId: e.target.value}))} className="p-2 text-sm border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md">
                                        <option value="ALL">Todos Operadores</option>
                                        {users.filter(u => Array.isArray(u.setor) && u.setor.includes('EMBALAGEM')).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                                 <table className="min-w-full bg-[var(--color-surface)] text-sm">
                                     <thead className="bg-[var(--color-surface-secondary)] sticky top-0"><tr>{['Horário Bip', 'Operador', 'Pedido', 'Itens', 'Ações'].map(h => <th key={h} className="py-2 px-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>)}</tr></thead>
                                     <tbody className="divide-y divide-[var(--color-border)]">
                                         {conferenciaScans.map(({ scan, order }) => (<tr key={scan.id}>
                                             <td className="py-2 px-3">{scan.time && !isNaN(scan.time.getTime()) ? scan.time.toLocaleString('pt-BR') : 'Data inválida'}</td>
                                             <td className="py-2 px-3">{scan.user}</td>
                                             <td className="py-2 px-3 font-mono">{order!.orderId || order!.tracking}</td>
                                             <td className="py-2 px-3">{order!.sku} ({order!.qty_final} un) - {order!.color}</td>
                                             <td className="py-2 px-3"><button onClick={() => setErrorModal({ isOpen: true, order })} className="flex items-center gap-1 text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] p-1 rounded-md hover:brightness-95 border border-[var(--color-danger-border)]"><AlertTriangle size={14}/> Lançar Erro</button></td>
                                         </tr>))}
                                        {conferenciaScans.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-[var(--color-text-secondary)]">Nenhuma bipagem encontrada para os filtros.</td></tr>}
                                     </tbody>
                                 </table>
                             </div>
                        </div>
                    )}
                    {activeTab === 'devolucao' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div className="md:col-span-1">
                                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Registrar Nova Devolução</h3>
                                <form onSubmit={handleLogReturnSubmit} className="space-y-4 p-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg">
                                    <div><label className="text-sm font-medium">Código de Rastreio</label><input type="text" value={returnTracking} onChange={e => setReturnTracking(e.target.value)} className="w-full mt-1 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md" required/></div>
                                    <div><label className="text-sm font-medium">Nome do Cliente (Opcional)</label><input type="text" value={returnCustomer} onChange={e => setReturnCustomer(e.target.value)} className="w-full mt-1 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md"/></div>
                                    <button type="submit" disabled={isLoggingReturn} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50">{isLoggingReturn ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>} Registrar</button>
                                </form>
                           </div>
                           <div className="md:col-span-2">
                                <div className="flex flex-wrap gap-4 items-center mb-4">
                                    <input type="date" value={devolutionFilters.startDate} onChange={e => setDevolutionFilters(p => ({...p, startDate: e.target.value}))} className="p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm" />
                                    <input type="date" value={devolutionFilters.endDate} onChange={e => setDevolutionFilters(p => ({...p, endDate: e.target.value}))} className="p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm" />
                                    <select value={devolutionFilters.canal} onChange={e => setDevolutionFilters(p => ({...p, canal: e.target.value as Canal}))} className="p-2 text-sm border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md">
                                        <option value="ALL">Todos Canais</option><option value="ML">Mercado Livre</option><option value="SHOPEE">Shopee</option>
                                    </select>
                                </div>
                                <RegisteredReturnsTable returns={filteredReturns} onRemove={handleRemoveReturnAction} />
                           </div>
                        </div>
                    )}
                </div>
            </div>
            
            <ConfirmActionModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(p => ({...p, isOpen: false}))} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} isConfirming={isActionLoading} />
            <LogErrorModal isOpen={errorModal.isOpen} onClose={() => setErrorModal({ isOpen: false, order: null })} order={errorModal.order} onConfirm={handleConfirmLogError} errorReasons={generalSettings.pedidos.errorReasons} />
            <SolutionModal isOpen={solutionModal.isOpen} onClose={() => setSolutionModal({ isOpen: false, orders: [] })} orders={solutionModal.orders} onConfirm={handleConfirmSolution as any} resolutionTypes={generalSettings.pedidos.resolutionTypes} currentUser={currentUser} />
        </div>
    );
};

const OrderCard: React.FC<{ item: AugmentedOrder; isSelected: boolean; onSelect: (isSelected: boolean) => void; isExpanded: boolean; onToggleExpand: () => void; }> = ({ item, isSelected, onSelect, isExpanded, onToggleExpand }) => {
    const isGroup = 'isGroup' in item;

    const statusColors: Record<DisplayStatus, string> = {
        'NORMAL': 'bg-gray-100 text-gray-800',
        'BIPADO': 'bg-green-100 text-green-800',
        'ATRASADO': 'bg-orange-100 text-orange-800',
        'BIPADO (COM ATRASO)': 'bg-yellow-100 text-yellow-800',
        'ERRO': 'bg-red-100 text-red-800',
        'DEVOLVIDO': 'bg-purple-100 text-purple-800',
        'SOLUCIONADO': 'bg-blue-100 text-blue-800',
    };
    const canalColors: Record<Canal, string> = {
        'ML': 'bg-yellow-100 text-yellow-800',
        'SHOPEE': 'bg-orange-100 text-orange-800',
        'SITE': 'bg-blue-100 text-blue-800',
        'ALL': '',
        'AUTO': 'bg-gray-200 text-gray-800',
    }

    return (
        <div className={`p-3 rounded-lg border ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-[var(--color-surface-secondary)] border-[var(--color-border)]'}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <input type="checkbox" checked={isSelected} onChange={e => onSelect(e.target.checked)} className="h-5 w-5 mt-1"/>
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">{item.customer_name || 'Cliente não informado'}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] font-mono">{item.orderId}</p>
                    </div>
                </div>
                {isGroup && (
                    <button onClick={onToggleExpand} className="p-1">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                )}
            </div>

            <div className="mt-2 pt-2 border-t border-[var(--color-border)] text-sm space-y-2">
                <div className="flex justify-between">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[item.displayStatus]}`}>{item.displayStatus}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${canalColors[item.canal]}`}>{item.canal}</span>
                </div>

                {!isGroup ? (
                    <div>
                        <p><strong>SKU:</strong> {(item as OrderItem).sku}</p>
                        <p><strong>Qtd:</strong> {(item as OrderItem).qty_final}</p>
                        <p><strong>Cor:</strong> {(item as OrderItem).color}</p>
                    </div>
                ) : (
                    <p><strong>Itens:</strong> {item.items.length} SKUs, {item.items.reduce((acc, i) => acc + i.qty_final, 0)} unidades</p>
                )}
                
                {isExpanded && isGroup && (
                    <div className="pl-4 mt-2 space-y-1 border-l-2">
                        {item.items.map(sub => (
                            <div key={sub.id} className="text-xs">
                                <p><strong>SKU:</strong> {sub.sku}</p>
                                <p><strong>Qtd:</strong> {sub.qty_final}</p>
                            </div>
                        ))}
                    </div>
                )}
                 <div>
                    <p><strong>Data:</strong> {item.data}</p>
                    {item.bipadoPor && <p><strong>Bipado por:</strong> {item.bipadoPor}</p>}
                </div>
            </div>
        </div>
    );
};

export default PedidosPage;
