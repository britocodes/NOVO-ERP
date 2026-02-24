// components/BipagemSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { BipagemSettings } from '../types';

interface BipagemSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: BipagemSettings;
    onSave: (newSettings: BipagemSettings) => void;
}

const ToggleButton: React.FC<{
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ label, enabled, onChange }) => (
    <div className="flex justify-between items-center p-3 bg-[var(--color-surface-secondary)] rounded-lg">
        <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
        <button
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                enabled ? 'bg-[var(--color-primary)]' : 'bg-gray-400 dark:bg-gray-600'
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

const BipagemSettingsModal: React.FC<BipagemSettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
    const [settings, setSettings] = useState<BipagemSettings>(currentSettings);

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
    
    const handleToggle = (key: keyof BipagemSettings) => {
        setSettings(prev => ({...prev, [key]: !prev[key]}));
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Configurações de Som</h2>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                        <X size={24} />
                    </button>
                </div>
                <div className="space-y-4">
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

export default BipagemSettingsModal;