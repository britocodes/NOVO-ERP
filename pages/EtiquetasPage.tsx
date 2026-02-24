
import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { Settings, Printer, Trash2, X, FileText, Loader2, Image as ImageIcon, Zap, Link as LinkIcon, PlusCircle, AlertTriangle, Package, File, Eye, History } from 'lucide-react';
import { ZplSettings, ExtractedZplData, GeneralSettings, UiSettings, StockItem, SkuLink, User, OrderItem, ZplPlatformSettings, EtiquetaHistoryItem, EtiquetasState } from '../types';
import { buildPdf } from '../services/pdfGenerator';
import LinkSkuModal from '../components/LinkSkuModal';
import CreateProductFromImportModal from '../components/CreateProductFromImportModal';
import { simpleHash } from '../utils/zplUtils';

// --- Types ---
type ProcessingMode = 'completo' | 'rapido';

interface EtiquetasPageProps {
  settings: ZplSettings;
  onSettingsSave: (newSettings: ZplSettings) => void;
  generalSettings: GeneralSettings;
  uiSettings: UiSettings;
  onSetUiSettings: (settings: (prev: UiSettings) => UiSettings) => void;
  stockItems: StockItem[];
  skuLinks: SkuLink[];
  onLinkSku: (importedSku: string, masterProductSku: string) => Promise<boolean>;
  onUnlinkSku: (importedSku: string) => Promise<boolean>;
  onAddNewItem: (item: Omit<StockItem, 'id'>) => Promise<StockItem | null>;
  etiquetasState: EtiquetasState;
  setEtiquetasState: React.Dispatch<React.SetStateAction<EtiquetasState>>;
  currentUser: User;
  allOrders: OrderItem[];
  etiquetasHistory: EtiquetaHistoryItem[];
  onSaveHistory: (item: Omit<EtiquetaHistoryItem, 'id' | 'created_at'>) => void;
  onGetHistoryDetails: (id: string) => Promise<EtiquetaHistoryItem | null>;
  onProcessZpl: (mode: ProcessingMode) => Promise<void>;
  isProcessing: boolean;
  progressMessage: string;
}

// ... DraggableFooterEditor e SettingsModal permanecem inalterados, copiados do original ...
// Para brevidade, mantendo apenas a parte lógica principal da página.
// --- Draggable Footer Editor ---
const DraggableFooterEditor: React.FC<{
    settings: ZplPlatformSettings['footer'];
    pageWidth_mm: number;
    pageHeight_mm: number;
    imageAreaPercentage: number;
    onChange: (key: keyof ZplPlatformSettings['footer'], value: any) => void;
    previewImageUrl?: string;
}> = ({ settings, pageWidth_mm, pageHeight_mm, imageAreaPercentage, onChange, previewImageUrl }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handlePositionChange = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x_px = e.clientX - rect.left;
        const y_px = e.clientY - rect.top;

        const scaleX = pageWidth_mm / rect.width;
        const scaleY = pageHeight_mm / rect.height;

        onChange('x_position_mm', Math.max(0, x_px * scaleX));
        onChange('y_position_mm', Math.max(0, y_px * scaleY));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        handlePositionChange(e);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            handlePositionChange(e);
        }
    };

    const handleMouseUp = () => setIsDragging(false);
    
    const containerWidth = 200; // Fixed width for preview
    const containerHeight = (pageHeight_mm / pageWidth_mm) * containerWidth;
    const x_px = (settings.x_position_mm / pageWidth_mm) * containerWidth;
    const y_px = (settings.y_position_mm / pageHeight_mm) * containerHeight;
    const imageAreaHeight_px = containerHeight * (imageAreaPercentage / 100);
    
    const placeholderText = settings.template
        .replace('{sku}', 'SKU-EXEMPLO')
        .replace('{name}', 'PRODUTO EXEMPLO')
        .replace('{qty}', '1');

    return (
        <div className="space-y-2">
            <div
                ref={containerRef}
                className="w-full border-2 border-dashed rounded-lg relative cursor-move bg-gray-200"
                style={{ height: `${containerHeight}px` }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                 {previewImageUrl ? (
                    <img 
                        src={previewImageUrl} 
                        alt="Preview da etiqueta"
                        className="absolute top-0 left-1/2 -translate-x-1/2 object-contain object-top pointer-events-none"
                        style={{ height: `${imageAreaHeight_px}px`, width: '100%' }}
                    />
                ) : (
                    <div className="absolute top-0 left-0 w-full bg-white flex items-center justify-center text-gray-400 text-xs" style={{height: `${imageAreaHeight_px}px`}}>
                        Área da Imagem
                    </div>
                )}
                <div 
                    className="absolute p-1 bg-blue-500 bg-opacity-70 text-white text-xs rounded-sm pointer-events-none whitespace-nowrap"
                    style={{ left: `${x_px}px`, top: `${y_px}px` }}
                >
                    {placeholderText}
                </div>
            </div>
        </div>
    );
};


// --- Settings Modal Component ---
const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentSettings: ZplSettings;
    onSave: (newSettings: ZplSettings) => void;
    previews: string[];
    extractedData: Map<number, ExtractedZplData>;
}> = ({ isOpen, onClose, currentSettings, onSave, previews, extractedData }) => {
    const [settings, setSettings] = useState<ZplSettings>(currentSettings);
    const [activeTab, setActiveTab] = useState<'general' | 'shopee' | 'mercadoLivre'>('general');

    React.useEffect(() => {
        if (isOpen) setSettings(currentSettings);
    }, [isOpen, currentSettings]);
    
    const previewImageUrl = useMemo(() => {
        if (previews.length === 0 || extractedData.size === 0) return undefined;
        
        const targetIsMercadoLivre = activeTab === 'mercadoLivre';

        for (let i = 0; i < previews.length; i += 2) {
            const pairData = extractedData.get(i);
            if (pairData?.isMercadoLivre === targetIsMercadoLivre) {
                const labelPreview = previews[i + 1];
                if (labelPreview && labelPreview.startsWith('data:image')) {
                    return labelPreview;
                }
            }
        }
        // Fallback to first available label if no match for the active tab
        for (let i = 1; i < previews.length; i += 2) {
            if (previews[i] && previews[i].startsWith('data:image')) return previews[i];
        }

        return undefined;
    }, [activeTab, previews, extractedData]);

    if (!isOpen) return null;

    const handlePlatformChange = (platform: 'shopee' | 'mercadoLivre', key: keyof ZplPlatformSettings, value: any) => {
        setSettings(prev => ({ ...prev, [platform]: { ...prev[platform], [key]: value }}));
    };
    
    const handlePlatformFooterChange = (platform: 'shopee' | 'mercadoLivre', key: keyof ZplPlatformSettings['footer'], value: any) => {
        setSettings(prev => ({...prev, [platform]: { ...prev[platform], footer: { ...prev[platform].footer, [key]: value }}}));
    };
    
    const handlePresetChange = (platform: 'shopee' | 'mercadoLivre', preset: 'below' | 'above' | 'custom') => {
        handlePlatformFooterChange(platform, 'positionPreset', preset);
    };
    
    const handleRegexChange = (key: keyof ZplSettings['regex'], value: any) => {
         setSettings(prev => ({...prev, regex: { ...prev.regex, [key]: value } }));
    };

    const renderPlatformSettings = (platform: 'shopee' | 'mercadoLivre') => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-3">Layout da Etiqueta</h3>
                <div className="space-y-4 p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div><label className="text-sm font-medium">Área da Imagem da Etiqueta (%)</label><input type="number" value={settings[platform].imageAreaPercentage_even} onChange={e => handlePlatformChange(platform, 'imageAreaPercentage_even', Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/></div>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-3">Rodapé da Etiqueta</h3>
                <div className="space-y-4 p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div>
                        <label className="text-sm font-medium">Posição Padrão</label>
                        <select 
                            value={settings[platform].footer.positionPreset}
                            onChange={e => handlePresetChange(platform, e.target.value as any)}
                            className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"
                        >
                            <option value="below">Abaixo da Etiqueta</option>
                            <option value="above">Acima da Etiqueta</option>
                            <option value="custom">Personalizado (Arrastar)</option>
                        </select>
                    </div>

                    {settings[platform].footer.positionPreset === 'custom' ? (
                        <>
                            <DraggableFooterEditor 
                                settings={settings[platform].footer}
                                pageWidth_mm={settings.pageWidth}
                                pageHeight_mm={settings.pageHeight}
                                imageAreaPercentage={settings[platform].imageAreaPercentage_even}
                                onChange={(key, value) => handlePlatformFooterChange(platform, key, value)}
                                previewImageUrl={previewImageUrl}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Posição X (mm)</label>
                                    <input type="number" value={settings[platform].footer.x_position_mm.toFixed(0)} onChange={e => handlePlatformFooterChange(platform, 'x_position_mm', Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/>
                                </div>
                                 <div>
                                    <label className="text-sm font-medium">Posição Y (mm)</label>
                                    <input type="number" value={settings[platform].footer.y_position_mm.toFixed(0)} onChange={e => handlePlatformFooterChange(platform, 'y_position_mm', Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/>
                                </div>
                            </div>
                        </>
                    ) : (
                         <div>
                            <label className="text-sm font-medium">Espaçamento (mm)</label>
                            <input type="number" value={settings[platform].footer.spacing_mm} onChange={e => handlePlatformFooterChange(platform, 'spacing_mm', Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/>
                             <p className="text-xs text-[var(--color-text-secondary)] mt-1">Distância entre a imagem da etiqueta e o texto do rodapé.</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium">Tam. Fonte (pt)</label><input type="number" value={settings[platform].footer.fontSize_pt} onChange={e => handlePlatformFooterChange(platform, 'fontSize_pt', Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/></div>
                        <div><label className="text-sm font-medium">Espaçamento (pt)</label><input type="number" value={settings[platform].footer.lineSpacing_pt} onChange={e => handlePlatformFooterChange(platform, 'lineSpacing_pt', Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/></div>
                    </div>
                    <div><label className="text-sm font-medium">Fonte</label><select value={settings[platform].footer.fontFamily} onChange={e => handlePlatformFooterChange(platform, 'fontFamily', e.target.value as any)} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"><option value="helvetica">Helvetica</option><option value="times">Times</option><option value="courier">Courier</option></select></div>
                    <div>
                        <label className="text-sm font-medium">Alinhamento do Texto</label>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => handlePlatformFooterChange(platform, 'textAlign', 'left')} className={`px-3 py-1 text-sm rounded-md border ${settings[platform].footer.textAlign === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>Esquerda</button>
                            <button onClick={() => handlePlatformFooterChange(platform, 'textAlign', 'center')} className={`px-3 py-1 text-sm rounded-md border ${settings[platform].footer.textAlign === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>Centro</button>
                            <button onClick={() => handlePlatformFooterChange(platform, 'textAlign', 'right')} className={`px-3 py-1 text-sm rounded-md border ${settings[platform].footer.textAlign === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>Direita</button>
                        </div>
                    </div>
                     <div><label className="flex items-center"><input type="checkbox" checked={settings[platform].footer.multiColumn} onChange={e => handlePlatformFooterChange(platform, 'multiColumn', e.target.checked)} className="h-4 w-4 rounded"/><span className="ml-2 text-sm">Dividir SKUs em colunas se necessário</span></label></div>
                    <div><label className="text-sm font-medium">Template</label><input type="text" value={settings[platform].footer.template} onChange={e => handlePlatformFooterChange(platform, 'template', e.target.value)} className="mt-1 w-full p-2 border rounded-md font-mono text-sm bg-[var(--color-surface)]"/><p className="text-xs text-[var(--color-text-secondary)] mt-1">Variáveis: {'{sku}'}, {'{name}'}, {'{qty}'}.</p></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg shadow-2xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Configurações de Etiquetas</h2><button onClick={onClose}><X size={24} /></button></div>
                
                <div className="border-b border-[var(--color-border)]">
                    <div className="flex -mb-px">
                        <button onClick={() => setActiveTab('general')} className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}>Geral</button>
                        <button onClick={() => setActiveTab('shopee')} className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${activeTab === 'shopee' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}>Shopee</button>
                        <button onClick={() => setActiveTab('mercadoLivre')} className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${activeTab === 'mercadoLivre' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}>Mercado Livre</button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-6 pr-4 pt-6">
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Layout da Página</h3>
                                    <div className="space-y-4 p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                                        <div>
                                            <label className="text-sm font-medium">Layout do Par (DANFE + Etiqueta)</label>
                                            <div className="flex gap-2 mt-1">
                                                <button onClick={() => setSettings(p => ({...p, pairLayout: 'vertical'}))} className={`px-3 py-1 text-sm rounded-md border ${settings.pairLayout === 'vertical' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>Vertical</button>
                                                <button onClick={() => setSettings(p => ({...p, pairLayout: 'horizontal'}))} className={`px-3 py-1 text-sm rounded-md border ${settings.pairLayout === 'horizontal' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>Horizontal</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm font-medium">Largura (mm)</label><input type="number" value={settings.pageWidth} onChange={e => setSettings(p => ({...p, pageWidth: Number(e.target.value)}))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/></div>
                                            <div><label className="text-sm font-medium">Altura (mm)</label><input type="number" value={settings.pageHeight} onChange={e => setSettings(p => ({...p, pageHeight: Number(e.target.value)}))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Renderização e Processamento</h3>
                                    <div className="space-y-4 p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                                        <div><label className="text-sm font-medium">Qualidade (DPI)</label><select value={settings.dpi} onChange={e => setSettings(p => ({...p, dpi: e.target.value as ZplSettings['dpi']}))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"><option value="Auto">Auto</option><option value="203">203 DPI</option><option value="300">300 DPI</option></select></div>
                                        <div><label className="text-sm font-medium">Escala da DANFE (%)</label><input type="number" value={settings.sourcePageScale_percent} onChange={e => setSettings(p => ({...p, sourcePageScale_percent: Number(e.target.value)}))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"/></div>
                                        <div><label className="text-sm font-medium">Modo de Pareamento</label><select value={settings.pairingMode} onChange={e => setSettings(p => ({...p, pairingMode: e.target.value as ZplSettings['pairingMode']}))} className="mt-1 w-full p-2 border rounded-md bg-[var(--color-surface)]"><option value="Odd/Even Sequential">Ímpar/Par Sequencial</option></select></div>
                                        <div><label className="flex items-center"><input type="checkbox" checked={settings.combineMultiPageDanfe} onChange={e => setSettings(p => ({...p, combineMultiPageDanfe: e.target.checked}))} className="h-4 w-4 rounded"/><span className="ml-2 text-sm">Combinar DANFEs de múltiplas páginas</span></label></div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Padrões de Extração (RegEx)</h3>
                                    <div className="space-y-4 p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                                        <div><label className="text-sm font-medium">ID do Pedido</label><input type="text" value={settings.regex.orderId} onChange={e => handleRegexChange('orderId', e.target.value)} className="mt-1 w-full p-2 border rounded-md font-mono text-sm bg-[var(--color-surface)]"/></div>
                                        <div><label className="text-sm font-medium">SKU</label><input type="text" value={settings.regex.sku} onChange={e => handleRegexChange('sku', e.target.value)} className="mt-1 w-full p-2 border rounded-md font-mono text-sm bg-[var(--color-surface)]"/></div>
                                        <div><label className="text-sm font-medium">Quantidade</label><input type="text" value={settings.regex.quantity} onChange={e => handleRegexChange('quantity', e.target.value)} className="mt-1 w-full p-2 border rounded-md font-mono text-sm bg-[var(--color-surface)]"/></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'shopee' && renderPlatformSettings('shopee')}
                    {activeTab === 'mercadoLivre' && renderPlatformSettings('mercadoLivre')}
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t pt-4"><button onClick={onClose} className="px-4 py-2 rounded-md bg-[var(--color-surface-secondary)]">Cancelar</button><button onClick={() => {onSave(settings); onClose();}} className="px-4 py-2 rounded-md bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold">Salvar</button></div>
            </div>
        </div>
    );
};

const ProcessingModeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectMode: (mode: ProcessingMode) => void;
}> = ({ isOpen, onClose, onSelectMode }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Escolha o modo de processamento</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">O modo "Rápido" economiza recursos ignorando a pré-visualização da DANFE, ideal para grandes volumes ou conexões lentas.</p>
                <div className="space-y-4">
                    <button
                        onClick={() => onSelectMode('completo')}
                        className="w-full flex items-center p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg-subtle)] transition-all"
                    >
                        <Package size={24} className="mr-4 text-[var(--color-primary)]" />
                        <div>
                            <p className="font-semibold text-[var(--color-text-primary)]">Completo (Etiqueta + DANFE)</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">Modo padrão. Gera a pré-visualização de todas as páginas.</p>
                        </div>
                    </button>
                    <button
                        onClick={() => onSelectMode('rapido')}
                        className="w-full flex items-center p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg-subtle)] transition-all"
                    >
                        <Zap size={24} className="mr-4 text-orange-500" />
                        <div>
                            <p className="font-semibold text-[var(--color-text-primary)]">Rápido (Apenas Etiqueta)</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">Processamento otimizado, ignora a DANFE na pré-visualização.</p>
                        </div>
                    </button>
                </div>
                <div className="mt-6 text-right">
                    <button onClick={onClose} className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-4 py-2">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Page Component ---
const EtiquetasPage: React.FC<EtiquetasPageProps> = (props) => {
    const { settings, onSettingsSave, generalSettings, stockItems, skuLinks, onLinkSku, onAddNewItem, etiquetasState, setEtiquetasState, allOrders, currentUser, onSaveHistory, etiquetasHistory, onGetHistoryDetails, onProcessZpl, isProcessing, progressMessage } = props;
    const { zplInput, includeDanfe, zplPages, previews, extractedData, printedIndices, warnings } = etiquetasState;

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [linkModalState, setLinkModalState] = useState<{isOpen: boolean, skus: string[], color: string}>({isOpen: false, skus: [], color: ''});
    const [createModalState, setCreateModalState] = useState<{isOpen: boolean, data: { sku: string; colorSugerida: string } | null}>({isOpen: false, data: null});
    const [isModeModalOpen, setIsModeModalOpen] = useState(false);
    
    // We handle the loading display via props now, but keep this for PDF generation blocking
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const skuLinkMap = useMemo(() => new Map(skuLinks.map(link => [link.importedSku, link.masterProductSku])), [skuLinks]);
    const stockItemMap = useMemo(() => new Map(stockItems.map(item => [item.code, item])), [stockItems]);

    const unlinkedSkusData = useMemo(() => {
        if (extractedData.size === 0) return [];
        const allExtractedSkus = Array.from(extractedData.values()).flatMap((d: ExtractedZplData) => d.skus.map(s => s.sku));
        const uniqueSkus = Array.from(new Set(allExtractedSkus));
        return uniqueSkus.filter(sku => !skuLinkMap.has(sku)).map(sku => ({ sku, colorSugerida: 'Padrão' }));
    }, [extractedData, skuLinkMap]);

    // Simply delegate the start command to the prop function (which is now in App.tsx)
    const startProcessing = (mode: ProcessingMode) => {
        setIsModeModalOpen(false);
        onProcessZpl(mode);
    };

    const handleProcessRequest = () => {
        if (!zplInput.trim()) return;
        setIsModeModalOpen(true);
    };


    const handlePdfAction = useCallback(async () => {
        setIsGeneratingPdf(true);
        try {
            if (onSaveHistory) {
                const pageHashes = zplPages.map(page => simpleHash(page));
                const historyItem: Omit<EtiquetaHistoryItem, 'id' | 'created_at'> = {
                    created_by_name: currentUser.name,
                    page_count: zplPages.length,
                    zpl_content: zplInput,
                    settings_snapshot: settings,
                    page_hashes: pageHashes,
                };
                await onSaveHistory(historyItem);
            }

            const pdfBlob = await buildPdf(previews, extractedData, settings, includeDanfe, stockItems, skuLinks);
            const url = URL.createObjectURL(pdfBlob);
            
            window.open(url, '_blank');

            // Mark as printed locally
            const indicesToMark = new Set<number>(printedIndices);
            previews.forEach((p, index) => {
                if (p && p !== 'SKIPPED' && p !== 'ERROR') {
                     if (includeDanfe) {
                        indicesToMark.add(index);
                    } else if (index % 2 !== 0) { 
                        indicesToMark.add(index);
                    }
                }
            });
            setEtiquetasState(prev => ({ ...prev, printedIndices: indicesToMark }));

        } catch (error) { 
            alert(`Falha ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`); 
        } finally { 
            setIsGeneratingPdf(false); 
        }
    }, [previews, extractedData, settings, includeDanfe, stockItems, skuLinks, onSaveHistory, currentUser, zplInput, zplPages, printedIndices, setEtiquetasState]);

    const handleClear = () => {
        setEtiquetasState(prev => ({ ...prev, zplInput: '', includeDanfe: true, zplPages: [], previews: [], extractedData: new Map(), warnings: [], printedIndices: new Set() }));
    };

    const handleReloadHistory = async (item: EtiquetaHistoryItem) => {
        // Just load the input and prompt for processing
        const fullItem = await onGetHistoryDetails(item.id);
        if (fullItem) {
            setEtiquetasState(prev => ({ ...prev, zplInput: fullItem.zpl_content }));
            onSettingsSave(fullItem.settings_snapshot);
            // Optionally, we could auto-start processing here if we wanted to be aggressive
            setIsModeModalOpen(true);
        }
    };

    const handleConfirmLink = (masterSku: string) => { linkModalState.skus.forEach(importedSku => onLinkSku(importedSku, masterSku)); setLinkModalState({ isOpen: false, skus: [], color: '' }); };
    const handleConfirmCreateAndLink = async (newItemData: Omit<StockItem, 'id'>) => { const newItem = await onAddNewItem(newItemData); if (newItem && createModalState.data) onLinkSku(createModalState.data.sku, newItem.code); setCreateModalState({ isOpen: false, data: null }); };

    return (
        <>
            {/* O indicador de progresso agora é global no Header, mas mantemos o bloqueio para geração de PDF */}
            {(isGeneratingPdf) && <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50"><Loader2 size={48} className="animate-spin text-blue-400 mb-4" /><p className="text-lg text-white">Gerando PDF...</p></div>}
            
            <div className="flex flex-col md:flex-row gap-6 h-full">
                
                <div className="flex-1 flex flex-col gap-6">
                    <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm flex-1 min-h-0">
                        <div className="flex-shrink-0 flex justify-between items-center p-3 gap-2 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-2">
                                <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) file.text().then(text => setEtiquetasState(p => ({...p, zplInput: text}))); e.target.value = ''; }} accept=".txt,.zpl" className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)]"><FileText size={16} /> Importar</button>
                                <button onClick={handleClear} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)]"><Trash2 size={16} /> Limpar</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-full hover:bg-[var(--color-surface-secondary)]"><Settings size={20} /></button>
                                <button onClick={handleProcessRequest} disabled={!zplInput.trim() || isProcessing} className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-md bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold disabled:opacity-50"><Zap size={16}/> Processar</button>
                            </div>
                        </div>
                        <textarea value={zplInput} onChange={(e) => setEtiquetasState(p => ({ ...p, zplInput: e.target.value }))} placeholder="Cole seu código ZPL aqui ou clique em 'Importar'..." className="h-full w-full p-4 font-mono text-sm resize-none focus:outline-none bg-[var(--color-surface)]"/>
                    </div>
                     {(previews.length > 0) && (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            {warnings.length > 0 && <div className="flex-shrink-0 p-3 border-l-4 border-orange-500 bg-orange-50 rounded-r-lg shadow-sm"><h3 className="font-bold text-orange-800 flex items-center gap-2"><AlertTriangle size={18}/> {warnings.join(' ')}</h3></div>}
                            {unlinkedSkusData.length > 0 && <div className="flex-shrink-0 p-3 border-l-4 border-yellow-500 bg-yellow-50 rounded-r-lg shadow-sm"><h3 className="font-bold text-yellow-800 flex items-center gap-2"><AlertTriangle size={18}/> Vínculo de SKUs Pendentes ({unlinkedSkusData.length})</h3><div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-2">{unlinkedSkusData.map(({ sku }) => (<div key={sku} className="flex items-center justify-between bg-white p-2 rounded border border-yellow-200 text-sm"><span className="font-mono text-xs">{sku}</span><div className="flex gap-3"><button onClick={() => setLinkModalState({isOpen: true, skus: [sku], color: 'Padrão'})} className="font-semibold text-blue-600 hover:underline flex items-center gap-1"><LinkIcon size={14}/> Vincular</button><button onClick={() => setCreateModalState({isOpen: true, data: { sku, colorSugerida: 'Padrão' }})} className="font-semibold text-green-600 hover:underline flex items-center gap-1"><PlusCircle size={14}/> Criar</button></div></div>))}</div></div>}

                            <div className="flex-1 flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 overflow-hidden">
                                <div className="flex-shrink-0 flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">Pré-visualização ({previews.filter(p => p && p !== 'SKIPPED').length}/{zplPages.length})</h2><div className="flex items-center gap-4"><label className="flex items-center text-sm"><input type="checkbox" checked={includeDanfe} onChange={(e) => setEtiquetasState(p => ({ ...p, includeDanfe: e.target.checked }))} className="h-4 w-4 rounded"/> <span className="ml-2">Incluir DANFE</span></label><button onClick={handlePdfAction} disabled={previews.length === 0 || previews.every(p => !p) || isProcessing} className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold disabled:opacity-50"><Printer size={16} /> Gerar PDF</button></div></div>
                                <div className="flex-1 overflow-y-auto pr-2"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{previews.map((src, index) => { if (!includeDanfe && index % 2 === 0) return null; const isEvenPage = index % 2 !== 0; const pairData = extractedData.get(Math.floor(index / 2) * 2); const platformSettings = pairData?.isMercadoLivre ? settings.mercadoLivre : settings.shopee; return (<div key={index} className="space-y-2 relative">{printedIndices.has(index) && (<div className="absolute inset-0 bg-green-900 bg-opacity-75 flex items-center justify-center z-10 rounded-lg pointer-events-none"><span className="text-white font-bold text-lg rotate-[-15deg] border-2 border-white px-4 py-1 rounded">IMPRESSO</span></div>)}<div className="bg-[var(--color-surface-secondary)] p-2 rounded-lg shadow-md flex flex-col aspect-[100/150] justify-center items-center overflow-hidden">{src === 'SKIPPED' ? <div className="text-center p-4 text-gray-500"><Eye size={24} className="mx-auto mb-2"/> <p className="font-semibold">DANFE Omitida</p><p className="text-xs">(Modo Rápido)</p></div> : src === 'ERROR' ? <div className="text-red-500 text-center p-4">Erro ao renderizar</div> : src ? <img src={src} alt={`Preview ${index + 1}`} className="max-w-full max-h-full object-contain" /> : <Loader2 className="animate-spin text-gray-400" />}</div>{isEvenPage && pairData && (<>{pairData.isMercadoLivre ? (<div className="text-xs p-2 bg-gray-100 border rounded text-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"><p className="font-bold border-b pb-1 mb-1">Info (Visual):</p>{pairData.orderId && <p className="font-mono truncate" title={`Pedido: ${pairData.orderId}`}>Pedido: {pairData.orderId}</p>}{pairData.skus.length > 0 ? (pairData.skus.map(s => { const masterSku = skuLinkMap.get(s.sku); const product = stockItemMap.get(masterSku || ''); const displayName = product ? product.name : s.sku; return (<p key={s.sku} className="font-mono truncate" title={`${displayName} (x${s.qty})`}>{displayName} (x${s.qty})</p>);})) : (<p className="text-red-600 font-semibold">SKUs não encontrados.</p>)}</div>) : pairData.skus.length > 0 && (<div className="text-center font-semibold text-lg text-gray-800 dark:text-gray-100 p-2 border-t mt-1">{pairData.skus.map(s => { const masterSku = skuLinkMap.get(s.sku); const product = stockItemMap.get(masterSku || ''); const finalSku = product ? product.code : s.sku; const finalName = product ? product.name : s.sku; return platformSettings.footer.template.replace('{sku}', finalSku).replace('{name}', finalName).replace('{qty}', String(s.qty)); }).join(' / ')}</div>)}</>)}<p className="text-xs text-center text-[var(--color-text-secondary)]">Página {index + 1}</p></div>)})}</div></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-1/3 lg:w-1/4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm flex flex-col">
                    <h2 className="text-lg font-semibold p-4 border-b border-[var(--color-border)] flex-shrink-0">Histórico de Impressões</h2>
                    <div className="overflow-y-auto flex-grow p-4">
                        <div className="space-y-3">
                            {etiquetasHistory.length > 0 ? etiquetasHistory.map(item => (
                                <div key={item.id} className="bg-[var(--color-surface-secondary)] p-3 rounded-lg border border-[var(--color-border)]">
                                    <div>
                                        <p className="font-semibold text-sm">Gerado por {item.created_by_name}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">{item.page_count} páginas processadas</p>
                                    </div>
                                    <button onClick={() => handleReloadHistory(item)} className="mt-2 w-full px-3 py-1.5 text-sm bg-blue-100 text-blue-800 font-semibold rounded-md hover:bg-blue-200">Recarregar</button>
                                </div>
                            )) : (
                                <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">Nenhum histórico encontrado.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} currentSettings={settings} onSave={onSettingsSave} previews={previews} extractedData={extractedData} />
            <LinkSkuModal isOpen={linkModalState.isOpen} onClose={() => setLinkModalState({isOpen: false, skus: [], color: ''})} skusToLink={linkModalState.skus} colorSugerida={linkModalState.color} onConfirmLink={handleConfirmLink} products={stockItems.filter(i => i.kind === 'PRODUTO')} onTriggerCreate={() => { setLinkModalState(p => ({ ...p, isOpen: false })); setCreateModalState({isOpen: true, data: { sku: linkModalState.skus[0], colorSugerida: linkModalState.color }}); }} />
            <CreateProductFromImportModal isOpen={createModalState.isOpen} onClose={() => setCreateModalState({isOpen: false, data: null})} unlinkedSkuData={createModalState.data ? {skus: [createModalState.data.sku], colorSugerida: createModalState.data.colorSugerida} : null} onConfirm={handleConfirmCreateAndLink} generalSettings={generalSettings}/>
            <ProcessingModeModal isOpen={isModeModalOpen} onClose={() => setIsModeModalOpen(false)} onSelectMode={startProcessing} />
        </>
    );
}

export default EtiquetasPage;
