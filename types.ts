
import React from 'react';

// Basic Types
export type Period = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom' | 'last_upload';
export type Canal = 'ML' | 'SHOPEE' | 'SITE' | 'ALL' | 'AUTO';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
export type UserSetor = 'ADMINISTRATIVO' | 'EMBALAGEM' | 'PESAGEM' | 'MOAGEM';

// UI & Settings
export interface UiSettings {
    baseTheme: 'light' | 'dark' | 'system';
    accentColor: 'indigo' | 'emerald' | 'fuchsia' | 'orange' | 'slate' | 'custom';
    customAccentColor?: string;
    fontSize: number;
    soundOnSuccess: boolean;
    soundOnDuplicate: boolean;
    soundOnError: boolean;
}

export interface BipagemSettings {
    soundOnSuccess: boolean;
    soundOnDuplicate: boolean;
    soundOnError: boolean;
}

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface AdminNotice {
    id: string;
    text: string;
    level: 'green' | 'yellow' | 'red';
    type: 'post-it' | 'banner';
    createdBy: string;
    createdAt: string;
}

export interface AttendanceRecord {
    date: string;
    status: 'PRESENT' | 'ABSENT';
    hasDoctorsNote?: boolean;
    doctorsNoteFile?: any;
    leftEarly?: string | null;
    overtime?: string | null;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    role: UserRole;
    setor: UserSetor[];
    password?: string;
    prefix?: string;
    attendance: AttendanceRecord[];
    ui_settings?: UiSettings;
}

// Dashboard & Stats
export interface DashboardFilters {
    period: Period;
    canal: Canal;
    startDate?: string;
    endDate?: string;
    compare: boolean;
    compareStartDate?: string;
    compareEndDate?: string;
    shippingDateStart?: string;
    shippingDateEnd?: string;
}

export interface StatCardData {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ReactNode;
    changeLabel?: string;
}

export interface ActionCardData {
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBgColor: string;
    page: string;
}

export enum ActivityType {
    OrderScanned = 'OrderScanned',
    StockUpdated = 'StockUpdated',
    StockAlert = 'StockAlert'
}

export interface ActivityItemData {
    id: string;
    type: ActivityType;
    title: string;
    description: string;
    time: string;
}

export enum AlertLevel {
    Info = 'info',
    Warning = 'warning',
    Danger = 'danger'
}

export interface AlertItemData {
    id: string;
    level: AlertLevel;
    title: string;
    description: string;
    icon: React.ReactNode;
}

// FIX: Add missing properties showRecentActivity and showSystemAlerts
export interface DashboardWidgetConfig {
    showProductionSummary: boolean;
    showMaterialDeductions: boolean;
    showStatCards: boolean;
    showActionCards: boolean;
    showPackGroups: boolean;
    showRecentActivity: boolean;
    showSystemAlerts: boolean;
}

export interface ProductionStats {
    totalPedidos: number;
    totalPacotes: number;
    totalUnidades: number;
    totalUnidadesBranca: number;
    totalUnidadesPreta: number;
    totalUnidadesEspecial: number;
    totalMiudos: number;
    miudos: { [category: string]: number };
}

export interface ProductionSummaryData {
    ml: ProductionStats;
    shopee: ProductionStats;
    total: ProductionStats;
}

export interface DeducedMaterial {
    name: string;
    quantity: number;
    unit: string;
}

// Stock & Products
export type StockItemKind = 'INSUMO' | 'PRODUTO' | 'PROCESSADO';

export interface StockItem {
    id: string;
    code: string;
    name: string;
    kind: StockItemKind;
    unit: 'kg' | 'un' | 'm' | 'L';
    current_qty: number;
    min_qty: number;
    category?: string;
    color?: string;
    product_type?: 'papel_de_parede' | 'miudos';
    substitute_product_code?: string;
    expedition_items?: { stockItemCode: string; qty_per_pack: number }[];
    barcode?: string;
}

export type StockMovementOrigin = 'AJUSTE_MANUAL' | 'PRODUCAO_MANUAL' | 'BIP' | 'PESAGEM' | 'MOAGEM' | 'IMPORT_XML' | 'PRODUCAO_INTERNA';

export interface StockMovement {
    id: string;
    stockItemCode: string;
    stockItemName: string;
    origin: StockMovementOrigin | string;
    qty_delta: number;
    ref: string;
    createdAt: Date;
    createdBy: string;
    fromWeighing?: boolean;
    productSku?: string;
}

export interface ProdutoCombinado {
    productSku: string;
    items: {
        stockItemCode: string;
        qty_per_pack: number;
        fromWeighing?: boolean;
        substituteCode?: string;
    }[];
}

export interface StockPackGroup {
    id: string;
    name: string;
    barcode?: string;
    item_codes: string[];
    min_pack_qty: number;
    created_at?: string;
}

export type StockDeductionMode = 'STOCK' | 'PRODUCTION';

// Production: Weighing & Grinding
export type WeighingType = 'daily' | 'hourly';

export interface WeighingBatch {
    id: string;
    stock_item_code: string;
    stock_item_name: string;
    stockItemName: string; // Alias
    initialQty: number;
    initial_qty: number; // DB alias
    usedQty: number;
    used_qty: number; // DB alias
    createdAt: Date;
    userId: string;
    createdBy: string;
    weighingType: WeighingType;
    weighing_type?: WeighingType;
}

export interface GrindingBatch {
    id: string;
    sourceInsumoCode: string;
    sourceInsumoName: string;
    sourceQtyUsed: number;
    outputInsumoCode: string;
    outputInsumoName: string;
    outputQtyProduced: number;
    createdAt: Date;
    userId: string;
    userName: string;
    mode: 'manual' | 'automatico';
}

// Orders
export type OrderStatusValue = 'NORMAL' | 'ERRO' | 'DEVOLVIDO' | 'BIPADO' | 'SOLUCIONADO';
export const ORDER_STATUS_VALUES: OrderStatusValue[] = ['NORMAL', 'ERRO', 'DEVOLVIDO', 'BIPADO', 'SOLUCIONADO'];

export interface OrderResolutionDetails {
    resolution_type: string;
    notes: string;
    new_tracking?: string;
    refunded: boolean;
    shipping_cost?: number;
    resolved_by: string;
    resolved_at: string;
}

export interface OrderItem {
    id: string;
    orderId: string;
    blingId?: string; // ID interno do Bling para vínculos
    tracking: string;
    sku: string;
    qty_original: number;
    multiplicador: number;
    qty_final: number;
    color: string;
    canal: Canal;
    data: string;
    created_at?: string;
    status: OrderStatusValue;
    customer_name?: string;
    customer_cpf_cnpj?: string;
    price_gross: number;
    price_total: number;
    platform_fees: number;
    shipping_fee: number;
    shipping_paid_by_customer: number;
    price_net: number;
    error_reason?: string;
    resolution_details?: OrderResolutionDetails;
    data_prevista_envio?: string;
}

export interface ScanLogItem {
    id: string;
    time: Date;
    userId: string;
    user: string;
    device: string;
    displayKey: string;
    status: 'OK' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR' | 'ADJUSTED';
    synced: boolean;
    canal?: Canal;
}

export interface ScanResult {
    status: 'OK' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
    message: string;
    input_code: string;
    display_key: string;
    synced_with_list: boolean;
    channel?: Canal;
    order_key?: string;
    sku_key?: string;
    tracking_number?: string;
    first_scan?: {
        by: string;
        at: string;
        device: string;
    };
    scan?: {
        id: string;
        at: string;
    };
    user?: {
        name: string;
        device: string;
    };
}

export interface ReturnItem {
    id: string;
    tracking: string;
    customerName?: string;
    loggedBy: string;
    loggedById: string;
    loggedAt: Date;
    order_id?: string;
}

export interface SkuLink {
    importedSku: string;
    masterProductSku: string;
}

// Bling Integration
export interface BlingSettings {
    apiKey: string; // Access Token
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string; // NOVO: Para renovação automática
    expiresIn?: number;    // NOVO: Tempo em segundos
    createdAt?: number;    // NOVO: Timestamp da criação
    autoSync: boolean;
    scope: {
        importarProdutos: boolean;
        importarPedidos: boolean;
        importarNotasFiscais: boolean;
        gerarEtiquetas: boolean;
    };
}

export interface BlingSaleOrderItem {
    codigo: string;
    descricao: string;
    quantidade: number;
    valorunidade: number;
}

export interface BlingSaleOrder {
    numero: string;
    numeroPedidoLoja?: string;
    data: string;
    totalvenda: number;
    cliente: { nome: string };
    itens: BlingSaleOrderItem[];
    transporte?: { codigoRastreamento?: string };
    situacao: string;
    id: string;
    nota?: { numero?: string; };
}

export interface BlingInvoice {
    id: string;
    numero: string;
    serie: string;
    dataEmissao: string;
    nomeCliente: string;
    valorNota: number;
    chaveAcesso?: string;
    situacao: string;
    idPedidoVenda?: string;
    linkDanfe?: string;
}

export interface BlingProduct {
    id: string;
    codigo: string; // SKU
    descricao: string;
    preco: number;
    estoqueAtual: number;
}


// ZPL & Labels
export interface ZplPlatformSettings {
    imageAreaPercentage_even: number;
    footer: {
        positionPreset: 'below' | 'above' | 'custom';
        x_position_mm: number;
        y_position_mm: number;
        spacing_mm: number;
        fontSize_pt: number;
        lineSpacing_pt: number;
        fontFamily: 'helvetica' | 'times' | 'courier';
        textAlign: 'left' | 'center' | 'right';
        multiColumn: boolean;
        template: string;
    };
}

export interface ZplSettings {
    pageWidth: number;
    pageHeight: number;
    dpi: '203' | '300' | 'Auto';
    sourcePageScale_percent: number;
    pairingMode: 'Odd/Even Sequential';
    pairLayout: 'vertical' | 'horizontal';
    combineMultiPageDanfe: boolean;
    regex: {
        orderId: string;
        sku: string;
        quantity: string;
    };
    shopee: ZplPlatformSettings;
    mercadoLivre: ZplPlatformSettings;
}

export const defaultZplSettings: ZplSettings = {
    pageWidth: 100,
    pageHeight: 150,
    dpi: 'Auto',
    sourcePageScale_percent: 100,
    pairingMode: 'Odd/Even Sequential',
    pairLayout: 'vertical',
    combineMultiPageDanfe: true,
    regex: {
        orderId: 'Order ID: ([A-Z0-9]+)',
        sku: 'SKU: ([A-Z0-9-]+)',
        quantity: 'Qty: (\\d+)',
    },
    shopee: {
        imageAreaPercentage_even: 70,
        footer: {
            positionPreset: 'below',
            x_position_mm: 2,
            y_position_mm: 105,
            spacing_mm: 5,
            fontSize_pt: 10,
            lineSpacing_pt: 12,
            fontFamily: 'helvetica',
            textAlign: 'left',
            multiColumn: false,
            template: 'SKU: {sku} | Qtd: {qty} - {name}',
        },
    },
    mercadoLivre: {
        imageAreaPercentage_even: 70,
        footer: {
            positionPreset: 'below',
            x_position_mm: 2,
            y_position_mm: 105,
            spacing_mm: 5,
            fontSize_pt: 10,
            lineSpacing_pt: 12,
            fontFamily: 'helvetica',
            textAlign: 'left',
            multiColumn: false,
            template: 'SKU: {sku} | Qtd: {qty} - {name}',
        },
    }
};

export interface ExtractedZplData {
    skus: { sku: string; qty: number }[];
    orderId?: string;
    hasDanfe?: boolean;
    isMercadoLivre?: boolean;
    containsDanfeInLabel?: boolean;
}

export interface EtiquetaHistoryItem {
    id: string;
    created_at: string;
    created_by_name: string;
    page_count: number;
    zpl_content: string;
    settings_snapshot: ZplSettings;
    page_hashes: string[];
}

export type EtiquetasState = {
    zplInput: string;
    includeDanfe: boolean;
    zplPages: string[];
    previews: string[];
    extractedData: Map<number, ExtractedZplData>;
    printedIndices: Set<number>;
    warnings: string[];
}

// Planning & Shopping
export interface PlanningParameters {
    purchaseSuggestionMultiplier: number;
    stockProjectionDays: number;
    promotionMultiplier: number;
    analysisPeriodValue: number;
    analysisPeriodUnit: 'days' | 'months';
    forecastPeriodDays: number;
    safetyStockDays: number;
    defaultLeadTimeDays: number;
    historicalSpikeDays?: { date: string, name: string, channel: 'Geral' | 'ML' | 'SHOPEE' }[];
    targetMode: PlanningTargetMode;
    targetValue: number;
}

export type PlanningTargetMode = 'growth_percentage' | 'revenue_target' | 'unit_target';

export interface ProductionPlanItem {
    product: StockItem;
    avgDailySales: number;
    forecastedDemand: number;
    requiredProduction: number;
    reason: string;
    substitute?: StockItem;
    avgPrice?: number;
    projectedRevenue?: number;
}

export interface ProductionPlan {
    id: string;
    name: string;
    status: 'Draft' | 'Final';
    parameters: PlanningParameters;
    items: any[];
    planDate: string;
    createdAt: string;
    createdBy: string;
}

export interface ShoppingListItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    is_purchased?: boolean;
}

export interface RequiredInsumo {
    insumo: StockItem;
    requiredQty: number;
    currentStock: number;
    deficit: number;
    leadTime: number;
    purchaseBy: Date;
}

// Import & Parser
export interface ResumidaItem {
    sku: string;
    color: string;
    distribution: { [qty: number]: number };
    total_units: number;
}

export interface MaterialItem {
    name: string;
    quantity: number;
    unit: string;
}

export interface ProcessedData {
    importId: string;
    canal: Canal;
    lists: {
        completa: OrderItem[];
        resumida: ResumidaItem[];
        totaisPorCor: any[];
        listaDeMateriais?: MaterialItem[];
    };
    skusNaoVinculados: { sku: string; colorSugerida: string }[];
    idempotencia: { lancaveis: number; jaSalvos: number };
    summary: {
        totalPedidos: number;
        totalPacotes: number;
        totalUnidades: number;
        totalUnidadesBranca: number;
        totalUnidadesPreta: number;
        totalUnidadesEspecial: number;
        totalMiudos: number;
    };
}

export interface ImportHistoryItem {
    id: string;
    fileName: string;
    processedAt: string;
    user: string;
    itemCount: number;
    unlinkedCount: number;
    unlinked_count: number;
    canal: Canal;
    processedData?: ProcessedData;
    processed_data?: ProcessedData;
}

export interface ParsedNfeItem {
    code: string;
    name: string;
    quantity: number;
    unit: 'kg' | 'un' | 'm' | 'L';
}

// General Settings Structure
export interface ColumnMapping {
    orderId: string;
    sku: string;
    qty: string;
    tracking: string;
    date: string;
    dateShipping: string;
    priceGross: string;
    totalValue?: string;
    shippingFee: string;
    shippingPaidByCustomer?: string;
    fees: string[];
    customerName: string;
    customerCpf: string;
    statusColumn?: string;
    acceptedStatusValues?: string[];
}

export interface ExpeditionRule {
    id: string;
    from: number;
    to: number;
    stockItemCode: string;
    quantity: number;
    category: string;
}

export interface ExpeditionSettings {
    packagingRules: ExpeditionRule[];
    miudosPackagingRules: ExpeditionRule[];
}

export interface ProductBaseConfig {
    type: 'branca' | 'preta' | 'especial';
    specialBaseSku?: string;
}

export interface GeneralSettings {
    companyName: string;
    appIcon: string;
    dateSource: 'sale_date' | 'import_date';
    isRepeatedValue: boolean;
    bipagem: { 
        debounceTime_ms: number; 
        scanSuffix: string; 
        defaultOperatorId: string; 
    };
    etiquetas: { 
        labelaryApiUrl: string; 
        apiRequestDelay_ms: number; 
        renderChunkSize: number; 
    };
    estoque: PlanningParameters;
    dashboard: DashboardWidgetConfig;
    baseColorConfig: { [key: string]: ProductBaseConfig };
    miudosCategoryList: string[];
    miudosCategories?: { [key: string]: string };
    productTypeNames: { papel_de_parede: string; miudos: string; };
    insumoCategoryList: string[];
    productCategoryList: string[];
    expeditionRules: ExpeditionSettings;
    importer: {
        ml: ColumnMapping;
        shopee: ColumnMapping;
        site: ColumnMapping;
    };
    pedidos: { 
        errorReasons: string[]; 
        resolutionTypes: string[]; 
        displayCustomerIdentifier: boolean; 
    };
    integrations?: {
        bling: BlingSettings;
    };
    setorList: UserSetor[];
}

export const defaultGeneralSettings: GeneralSettings = {
    companyName: 'ERP Fábrica Pro',
    appIcon: 'Factory',
    dateSource: 'sale_date',
    isRepeatedValue: false,
    bipagem: { debounceTime_ms: 50, scanSuffix: '', defaultOperatorId: '' },
    // Configurações de etiquetas ajustadas para estabilidade
    etiquetas: { 
        labelaryApiUrl: 'https://api.labelary.com/v1/printers/{dpmm}dpmm/labels/{width}x{height}/0/', 
        apiRequestDelay_ms: 1200, // Aumentado para 1200ms
        renderChunkSize: 3 // Reduzido para 3
    },
    estoque: { purchaseSuggestionMultiplier: 2, stockProjectionDays: 7, promotionMultiplier: 0, analysisPeriodValue: 7, analysisPeriodUnit: 'days', forecastPeriodDays: 7, safetyStockDays: 7, defaultLeadTimeDays: 14, historicalSpikeDays: [], targetMode: 'growth_percentage', targetValue: 10 },
    dashboard: { showProductionSummary: true, showMaterialDeductions: true, showStatCards: true, showActionCards: true, showRecentActivity: true, showSystemAlerts: true, showPackGroups: true },
    baseColorConfig: {},
    miudosCategoryList: [],
    productTypeNames: { papel_de_parede: 'Papel de Parede', miudos: 'Miúdos' },
    insumoCategoryList: [],
    productCategoryList: [],
    expeditionRules: { packagingRules: [], miudosPackagingRules: [] },
    importer: {
        ml: { 
            orderId: 'N.º de venda', 
            sku: 'SKU', 
            qty: 'Quantidade', 
            tracking: 'Código de rastreamento', 
            date: 'Data de venda',
            dateShipping: '',
            priceGross: 'Receita por produtos (BRL)', 
            totalValue: '',
            shippingFee: '', 
            fees: ['Tarifa de venda e impostos (BRL)'], 
            customerName: 'Comprador', 
            customerCpf: 'Documento do comprador',
            statusColumn: '',
            acceptedStatusValues: [] 
        },
        shopee: { 
            orderId: 'N.º do pedido', 
            sku: 'Referência SKU', 
            qty: 'Quantidade', 
            tracking: 'Código de rastreio', 
            date: 'Data de criação do pedido',
            dateShipping: 'Data de envio prevista',
            priceGross: 'Preço acordado',
            totalValue: '',
            shippingFee: 'Desconto de Frete Aproximado', 
            shippingPaidByCustomer: 'Taxa de envio paga pelo comprador',
            fees: ['Taxa de comissão', 'Taxa de serviço'], 
            customerName: 'Nome do Comprador', 
            customerCpf: '',
            statusColumn: '',
            acceptedStatusValues: [] 
        },
        site: {
            orderId: '',
            sku: '',
            qty: '',
            tracking: '',
            date: '',
            dateShipping: '',
            priceGross: '',
            totalValue: '',
            shippingFee: '',
            shippingPaidByCustomer: '',
            fees: [],
            customerName: '',
            customerCpf: '',
            statusColumn: '',
            acceptedStatusValues: []
        }
    },
    pedidos: { errorReasons: ["Sem cola", "Quantidade errada", "Cor errada"], resolutionTypes: ["Reenviado", "Reembolso"], displayCustomerIdentifier: false },
    setorList: ['ADMINISTRATIVO', 'EMBALAGEM', 'PESAGEM', 'MOAGEM'],
};

// BI Data
export interface BiDataItem {
    id_pedido: string;
    codigo_pedido: string;
    data_pedido: string;
    canal: Canal;
    status_pedido: string;
    sku_mestre: string;
    nome_produto: string;
    quantidade_final: number;
    bipado_por: string;
    bipado_por_id: string;
    data_bipagem: string;
    status_derivado: string;
    tempo_separacao_horas: number;
}

export type ReportFilters = {
    period: string;
    startDate: string;
    endDate: string;
    search: string;
    canal: string;
    status: string;
    insumoCode: string;
    operatorId: string;
    stockKindFilter: string;
    orderStatusFilter: string;
};

export type ReportPeriod = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'custom';
export type BipStatus = 'OK' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR' | 'ADJUSTED';

export interface OrderProduct {
    product: StockItem;
    quantity: number;
}

export interface TaxEntry {
    id: string;
    name: string;
    type: 'percent' | 'fixed';
    value: number;
    calculatedAmount?: number;
}