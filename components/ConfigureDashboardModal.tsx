
// components/ConfigureDashboardModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Palette, Text, Save, Volume2, Sun, Moon, Zap, ChevronRight, Laptop, Settings, LayoutDashboard, BarChart3, Package, Bell, History, Box } from 'lucide-react';
import { UiSettings, DashboardWidgetConfig } from '../types';

interface ConfigureDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: DashboardWidgetConfig;
    onSave: (newConfig: DashboardWidgetConfig) => void;
}

const ToggleButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ label, icon, enabled, onChange }) => (
    <div className="flex justify-between items-center p-3 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
        <div className="flex items-center">
            {icon}
            <span className="ml-3 font-medium text-[var(--color-text-primary)] text-sm">{label}</span>
        </div>
        <button
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                enabled ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
            }`}
        >
            <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    </div>
);


const ConfigureDashboardModal: React.FC<ConfigureDashboardModalProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
    const [config, setConfig] = useState(currentConfig);

    useEffect(() => {
        if (isOpen) {
            setConfig(currentConfig);
        }
    }, [isOpen, currentConfig]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(config);
        onClose();
    };
    
    const handleToggle = (key: keyof DashboardWidgetConfig) => {
        setConfig(prev => ({...prev, [key]: !prev[key]}));
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--modal-bg)] text-[var(--modal-text-primary)] rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center"><Settings size={20} className="mr-2"/> Configurar Dashboard</h2>
                    <button onClick={onClose} className="text-[var(--modal-text-secondary)] hover:text-[var(--modal-text-primary)]"><X size={24} /></button>
                </div>
                <p className="text-sm text-[var(--modal-text-secondary)] mb-6">Escolha quais widgets exibir no painel principal.</p>

                <div className="space-y-3">
                    <ToggleButton 
                        label="Resumo da Produção"
                        icon={<BarChart3 size={18} />}
                        enabled={config.showProductionSummary}
                        onChange={() => handleToggle('showProductionSummary')}
                    />
                    <ToggleButton 
                        label="Dedução de Materiais"
                        icon={<Package size={18} />}
                        enabled={config.showMaterialDeductions}
                        onChange={() => handleToggle('showMaterialDeductions')}
                    />
                     <ToggleButton 
                        label="Cartões de Estatísticas"
                        icon={<LayoutDashboard size={18} />}
                        enabled={config.showStatCards}
                        onChange={() => handleToggle('showStatCards')}
                    />
                     <ToggleButton 
                        label="Ações Rápidas"
                        icon={<Zap size={18} />}
                        enabled={config.showActionCards}
                        onChange={() => handleToggle('showActionCards')}
                    />
                     <ToggleButton 
                        label="Status de Pacotes Prontos"
                        icon={<Box size={18} />}
                        enabled={config.showPackGroups}
                        onChange={() => handleToggle('showPackGroups')}
                    />
                     <ToggleButton 
                        label="Atividade Recente"
                        icon={<History size={18} />}
                        enabled={config.showRecentActivity}
                        onChange={() => handleToggle('showRecentActivity')}
                    />
                    <ToggleButton 
                        label="Alertas do Sistema"
                        icon={<Bell size={18} />}
                        enabled={config.showSystemAlerts}
                        onChange={() => handleToggle('showSystemAlerts')}
                    />
                </div>
                
                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-surface-tertiary)]">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold rounded-md hover:bg-[var(--color-primary-hover)]"
                    >
                        <Save size={16} />
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigureDashboardModal;