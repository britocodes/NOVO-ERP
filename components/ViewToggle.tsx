import React from 'react';
import { List, LayoutGrid } from 'lucide-react';

interface ViewToggleProps {
    view: 'table' | 'kanban';
    onChange: (view: 'table' | 'kanban') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onChange }) => {
    return (
        <div className="flex items-center p-1 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
            <button
                onClick={() => onChange('table')}
                className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors ${
                    view === 'table' 
                        ? 'bg-[var(--color-surface)] shadow-sm font-semibold text-[var(--color-primary)]' 
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
                aria-pressed={view === 'table'}
            >
                <List size={16} />
                Tabela
            </button>
            <button
                onClick={() => onChange('kanban')}
                className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors ${
                    view === 'kanban' 
                        ? 'bg-[var(--color-surface)] shadow-sm font-semibold text-[var(--color-primary)]' 
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
                 aria-pressed={view === 'kanban'}
            >
                <LayoutGrid size={16} />
                Kanban
            </button>
        </div>
    );
};

export default ViewToggle;
