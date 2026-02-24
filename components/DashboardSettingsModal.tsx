// components/DashboardSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Palette, Text, Save, Volume2, Sun, Moon, Zap, ChevronRight, Laptop } from 'lucide-react';
import { UiSettings } from '../types';

interface DashboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: UiSettings;
    onSave: (newSettings: UiSettings) => void;
    setCurrentPage: (page: string) => void;
}

const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave, setCurrentPage }) => {
    const [settings, setSettings] = useState<UiSettings>(currentSettings);

    useEffect(() => {
        if (isOpen) {
            setSettings(currentSettings);
        }
    }, [isOpen, currentSettings]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(settings);
        onClose();
    };
    
    const handleToggle = (key: keyof UiSettings) => {
        setSettings(prev => ({...prev, [key]: !prev[key]}));
    }

    const AccentColorOption: React.FC<{
        value: UiSettings['accentColor'];
        label: string;
        currentValue: string;
        onClick: (value: any) => void;
    }> = ({ value, label, currentValue, onClick }) => {
        const colors = {
            indigo: 'bg-indigo-600',
            emerald: 'bg-emerald-600',
            fuchsia: 'bg-fuchsia-600',
            orange: 'bg-orange-500',
            slate: 'bg-slate-500',
        };
        const finalBgColor = value === 'custom' ? '' : colors[value];
        const isSelected = currentValue === value;

        return (
             <button
                onClick={() => onClick(value)}
                className={`flex-1 p-2 rounded-md text-sm font-medium border-2 transition-all flex items-center justify-center gap-2 ${
                    isSelected ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-bg-subtle)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-surface-tertiary)]'
                }`}
            >
                <div 
                    className={`w-4 h-4 rounded-full ${finalBgColor}`}
                    style={value === 'custom' ? { backgroundColor: settings.customAccentColor || '#000000' } : {}}
                ></div>
                {label}
            </button>
        );
    }
    
    const BaseThemeOption: React.FC<{
        value: 'light' | 'dark' | 'system';
        label: string;
        icon: React.ReactNode;
        currentValue: string;
        onClick: (value: any) => void;
    }> = ({ value, label, icon, currentValue, onClick }) => (
         <button
            onClick={() => onClick(value)}
            className={`flex-1 p-3 rounded-md text-sm font-medium border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                currentValue === value ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-bg-subtle)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-surface-tertiary)]'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const ToggleButton: React.FC<{
        label: string;
        enabled: boolean;
        onChange: (enabled: boolean) => void;
    }> = ({ label, enabled, onChange }) => (
        <div className="flex justify-between items-center p-3 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
            <span className="font-medium text-[var(--color-text-primary)] text-sm">{label}</span>
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

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4`}>
            <div className="bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Configurações de Aparência</h2>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                        <X size={24} />
                    </button>
                </div>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-md font-semibold mb-2 flex items-center">
                            <Palette size={18} className="mr-2" /> Tema de Fundo
                        </h3>
                        <div className="flex gap-2">
                             <BaseThemeOption value="light" label="Claro" icon={<Sun/>} currentValue={settings.baseTheme} onClick={(v) => setSettings(s => ({...s, baseTheme: v}))} />
                             <BaseThemeOption value="dark" label="Escuro" icon={<Moon/>} currentValue={settings.baseTheme} onClick={(v) => setSettings(s => ({...s, baseTheme: v}))} />
                             <BaseThemeOption value="system" label="Sistema" icon={<Laptop/>} currentValue={settings.baseTheme} onClick={(v) => setSettings(s => ({...s, baseTheme: v}))} />
                        </div>
                    </div>
                     <div>
                        <h3 className="text-md font-semibold mb-2 flex items-center">
                            <Palette size={18} className="mr-2" /> Paletas Pré-definidas
                        </h3>
                         <div className="grid grid-cols-2 gap-2">
                            <AccentColorOption value="indigo" label="Profissional" currentValue={settings.accentColor} onClick={(v) => setSettings(s => ({...s, accentColor: v}))} />
                            <AccentColorOption value="emerald" label="Moderno" currentValue={settings.accentColor} onClick={(v) => setSettings(s => ({...s, accentColor: v}))} />
                            <AccentColorOption value="orange" label="Entardecer" currentValue={settings.accentColor} onClick={(v) => setSettings(s => ({...s, accentColor: v}))} />
                            <AccentColorOption value="slate" label="Grafite" currentValue={settings.accentColor} onClick={(v) => setSettings(s => ({...s, accentColor: v}))} />
                        </div>
                    </div>
                     <div>
                        <h3 className="text-md font-semibold mb-2 flex items-center">
                           <Palette size={18} className="mr-2" /> Cor de Destaque Customizada
                        </h3>
                        <div className="flex items-center gap-2 p-2 bg-[var(--color-surface-secondary)] rounded-lg">
                            <AccentColorOption value="custom" label="Custom" currentValue={settings.accentColor} onClick={(v) => setSettings(s => ({...s, accentColor: v}))} />
                            <input
                                id="custom-color-picker"
                                type="color"
                                value={settings.customAccentColor || '#4f46e5'}
                                onChange={(e) => setSettings(s => ({...s, customAccentColor: e.target.value, accentColor: 'custom'}))}
                                className="w-10 h-10 p-0 border-none rounded-md cursor-pointer bg-transparent"
                            />
                            <input
                                type="text"
                                value={settings.customAccentColor || '#4f46e5'}
                                onChange={(e) => setSettings(s => ({...s, customAccentColor: e.target.value, accentColor: 'custom'}))}
                                className="flex-grow p-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono"
                            />
                        </div>
                    </div>
                     <div>
                        <h3 className="text-md font-semibold mb-2 flex items-center">
                            <Text size={18} className="mr-2" /> Tamanho da Fonte ({settings.fontSize}px)
                        </h3>
                         <input
                            type="range"
                            min="14"
                            max="24"
                            step="1"
                            value={settings.fontSize}
                            onChange={(e) => setSettings(s => ({...s, fontSize: Number(e.target.value)}))}
                            className="w-full h-2 bg-[var(--color-surface-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                        />
                    </div>
                    <div>
                        <h3 className="text-md font-semibold mb-2 flex items-center">
                           <Volume2 size={18} className="mr-2" /> Sons da Bipagem
                        </h3>
                         <div className="space-y-2">
                            <ToggleButton 
                                label="Som de Sucesso"
                                enabled={settings.soundOnSuccess}
                                onChange={() => handleToggle('soundOnSuccess')}
                            />
                            <ToggleButton 
                                label="Som de Duplicado"
                                enabled={settings.soundOnDuplicate}
                                onChange={() => handleToggle('soundOnDuplicate')}
                            />
                            <ToggleButton 
                                label="Som de Erro / Não Encontrado"
                                enabled={settings.soundOnError}
                                onChange={() => handleToggle('soundOnError')}
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-semibold mb-2 flex items-center">
                            <Zap size={18} className="mr-2" /> Ações Rápidas
                        </h3>
                        <button
                            onClick={() => {
                                setCurrentPage('pedidos');
                                onClose();
                            }}
                            className="w-full text-left p-3 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)] flex justify-between items-center hover:bg-[var(--color-surface-tertiary)]"
                        >
                            <span className="font-medium text-[var(--color-text-primary)] text-sm">Consultar Pedidos</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
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

export default DashboardSettingsModal;