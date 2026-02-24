
import React, { useState } from 'react';
import { LayoutDashboard, ScanLine, Package, BarChart3, DollarSign, Printer, Settings, UserCircle, ArrowLeftToLine, ArrowRightFromLine, Weight, Factory, QrCode, Users, ShoppingCart, LogOut, ClipboardCheck, ListPlus, BookOpen, Recycle, HelpCircle, ChevronDown, Link as LinkIcon } from 'lucide-react';
import { User, GeneralSettings } from '../types';
import DynamicIcon from './DynamicIcon';

type NavItemProps = {
  icon: React.ReactNode;
  text: string;
  page: string;
  active?: boolean;
  onClick: (page: string) => void;
  alertCount?: number;
  isCollapsed: boolean;
};

const NavItem = ({ icon, text, page, active = false, onClick, alertCount, isCollapsed }: NavItemProps) => (
  <li className="relative group">
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick(page);
      }}
      className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-[var(--color-primary-bg-subtle)] text-[var(--color-primary-text-subtle)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]'
      } ${isCollapsed ? 'justify-center' : ''}`}
    >
      {icon}
      {!isCollapsed && <span className="ml-3 flex-1">{text}</span>}
      {!isCollapsed && typeof alertCount === 'number' && alertCount > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {alertCount}
        </span>
      )}
    </a>
    {isCollapsed && (
      <div className="absolute left-full ml-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
        {text}
        {typeof alertCount === 'number' && alertCount > 0 && <span className="ml-2 bg-red-500 rounded-full px-1.5 py-0.5">{alertCount}</span>}
      </div>
    )}
  </li>
);

const NavSection: React.FC<{ title: string, isCollapsed: boolean, children: React.ReactNode }> = ({ title, isCollapsed, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (isCollapsed) {
        return <>{children}</>;
    }

    return (
        <div>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold tracking-wider text-[var(--color-text-secondary)] uppercase hover:bg-[var(--color-surface-secondary)] rounded-md"
            >
                {title}
                <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <ul className="mt-1 space-y-1">{children}</ul>}
        </div>
    );
};

interface SidebarProps {
    currentPage: string;
    setCurrentPage: (page: string) => void;
    lowStockCount: number;
    isCollapsed: boolean;
    toggleCollapse: () => void;
    isMobileOpen: boolean;
    setIsMobileSidebarOpen: (isOpen: boolean) => void;
    currentUser: User | null;
    onLogout: () => void;
    generalSettings: GeneralSettings;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, lowStockCount, isCollapsed, toggleCollapse, isMobileOpen, setIsMobileSidebarOpen, currentUser, onLogout, generalSettings }) => {

  const handlePageClick = (page: string) => {
    setCurrentPage(page);
    setIsMobileSidebarOpen(false);
  }
  
  const hasSettingsPermission = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className={`flex items-center overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <DynamicIcon name={generalSettings.appIcon} className="h-8 w-8 text-[var(--color-primary)] flex-shrink-0" />
            {!isCollapsed && <span className="ml-2 text-xl font-bold text-[var(--color-text-primary)] whitespace-nowrap">{generalSettings.companyName}</span>}
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
        <ul className="space-y-1">
            <NavItem icon={<LayoutDashboard size={20} />} text="Dashboard" page="dashboard" active={currentPage === 'dashboard'} onClick={handlePageClick} isCollapsed={isCollapsed} />
        </ul>

        <NavSection title="Produção" isCollapsed={isCollapsed}>
            <NavItem icon={<ScanLine size={20} />} text="Importação" page="importer" active={currentPage === 'importer'} onClick={handlePageClick} isCollapsed={isCollapsed} />
            <NavItem icon={<QrCode size={20} />} text="Bipagem" page="bipagem" active={currentPage === 'bipagem'} onClick={handlePageClick} isCollapsed={isCollapsed} />
            <NavItem icon={<ShoppingCart size={20} />} text="Pedidos" page="pedidos" active={currentPage === 'pedidos'} onClick={handlePageClick} isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection title="Estoque" isCollapsed={isCollapsed}>
            <NavItem icon={<Package size={20} />} text="Estoque" page="estoque" active={currentPage === 'estoque'} onClick={handlePageClick} alertCount={lowStockCount} isCollapsed={isCollapsed} />
            <NavItem icon={<Weight size={20} />} text="Pesagem" page="pesagem" active={currentPage === 'pesagem'} onClick={handlePageClick} isCollapsed={isCollapsed} />
            <NavItem icon={<Recycle size={20} />} text="Moagem" page="moagem" active={currentPage === 'moagem'} onClick={handlePageClick} isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection title="Planejamento" isCollapsed={isCollapsed}>
            <NavItem icon={<ClipboardCheck size={20} />} text="Planejamento" page="planejamento" active={currentPage === 'planejamento'} onClick={handlePageClick} isCollapsed={isCollapsed} />
            <NavItem icon={<ListPlus size={20} />} text="Compras" page="compras" active={currentPage === 'compras'} onClick={handlePageClick} isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection title="Análise" isCollapsed={isCollapsed}>
            <NavItem icon={<DollarSign size={20} />} text="Financeiro" page="financeiro" active={currentPage === 'financeiro'} onClick={handlePageClick} isCollapsed={isCollapsed} />
            <NavItem icon={<BarChart3 size={20} />} text="Relatórios" page="relatorios" active={currentPage === 'relatorios'} onClick={handlePageClick} isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection title="Ferramentas" isCollapsed={isCollapsed}>
            <NavItem icon={<Printer size={20} />} text="Etiquetas" page="etiquetas" active={currentPage === 'etiquetas'} onClick={handlePageClick} isCollapsed={isCollapsed} />
            <NavItem icon={<LinkIcon size={20} />} text="Bling" page="bling" active={currentPage === 'bling'} onClick={handlePageClick} isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection title="Administração" isCollapsed={isCollapsed}>
            <NavItem icon={<Users size={20} />} text="Funcionários" page="funcionarios" active={currentPage === 'funcionarios'} onClick={handlePageClick} isCollapsed={isCollapsed} />
             {hasSettingsPermission && (
                <NavItem icon={<Settings size={20} />} text="Configurações" page="configuracoes" active={currentPage.startsWith('configuracoes')} onClick={handlePageClick} isCollapsed={isCollapsed} />
            )}
        </NavSection>

         <NavSection title="Suporte" isCollapsed={isCollapsed}>
            <NavItem icon={<BookOpen size={20} />} text="Passo a Passo" page="passo-a-passo" active={currentPage === 'passo-a-passo'} onClick={handlePageClick} isCollapsed={isCollapsed} />
            <NavItem icon={<HelpCircle size={20} />} text="Ajuda" page="ajuda" active={currentPage === 'ajuda'} onClick={handlePageClick} isCollapsed={isCollapsed} />
        </NavSection>
      </nav>
      <div className="p-2 border-t border-[var(--color-border)]">
        <div className={`flex items-center px-2 py-3 rounded-lg ${isCollapsed ? 'justify-center' : ''}`}>
          <UserCircle size={36} className="text-[var(--color-text-secondary)] flex-shrink-0" />
          {!isCollapsed && currentUser && (
            <div className="ml-3 overflow-hidden flex-grow">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap">{currentUser.name}</p>
              <p className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">{currentUser.role.replace('_', ' ')}</p>
            </div>
          )}
          {!isCollapsed && (
            <button onClick={onLogout} title="Sair do Sistema" className="ml-2 p-2 text-[var(--color-text-secondary)] hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full flex-shrink-0">
              <LogOut size={18} />
            </button>
          )}
        </div>
        <button onClick={toggleCollapse} className="hidden md:flex w-full items-center justify-center p-2 mt-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors">
            {isCollapsed ? <ArrowRightFromLine size={20} /> : <ArrowLeftToLine size={20} />}
        </button>
      </div>
    </>
  );

  return (
    <>
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity md:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
        <div className={`fixed top-0 left-0 h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] z-40 flex flex-col transition-transform duration-300 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}>
          {sidebarContent}
        </div>

        <div className={`hidden md:flex flex-col h-screen bg-[var(--color-surface)] fixed transition-all duration-300 border-r border-[var(--color-border)] ${isCollapsed ? 'w-20' : 'w-64'}`}>
          {sidebarContent}
        </div>
    </>
  );
};

export default Sidebar;