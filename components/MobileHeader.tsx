import React from 'react';
import { Menu, ChevronsRight } from 'lucide-react';

interface MobileHeaderProps {
  currentPage: string;
  onMenuClick: () => void;
}

const getPageTitle = (page: string) => {
    const titles: Record<string, string> = {
        dashboard: 'Dashboard',
        importer: 'Importação',
        bipagem: 'Bipagem',
        estoque: 'Estoque',
        relatorios: 'Relatórios',
        etiquetas: 'Etiquetas',
        configuracoes: 'Configurações',
        'configuracoes-gerais': 'Configurações Gerais'
    };
    return titles[page] || 'ERP Fábrica Pro';
};

const MobileHeader: React.FC<MobileHeaderProps> = ({ currentPage, onMenuClick }) => {
  const isEtiquetas = currentPage === 'etiquetas';
  const headerClasses = `md:hidden flex items-center justify-between p-4 border-b ${
    isEtiquetas 
      ? 'bg-slate-900 border-slate-700 text-white' 
      : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]'
  }`;

  return (
    <header className={headerClasses}>
      <button onClick={onMenuClick} className="p-2 -ml-2">
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-bold">{getPageTitle(currentPage)}</h1>
      <div className="w-8">
         <ChevronsRight className="h-6 w-6 text-[var(--color-primary)]" />
      </div>
    </header>
  );
};

export default MobileHeader;