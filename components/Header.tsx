
import React from 'react';
import { Settings, Clock, Calendar } from 'lucide-react';
import { DashboardFilters, Period, Canal, GeneralSettings } from '../types';

interface HeaderProps {
    filters: DashboardFilters;
    onFilterChange: (filters: DashboardFilters) => void;
    onSettingsClick: () => void;
    generalSettings: GeneralSettings;
}

const Header: React.FC<HeaderProps> = ({ filters, onFilterChange, onSettingsClick, generalSettings }) => {
  const setPeriod = (period: Period) => {
    onFilterChange({ ...filters, period });
  };
  
  const setCanal = (canal: Canal) => {
      onFilterChange({ ...filters, canal });
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, [e.target.name]: e.target.value });
  };
  
  const toggleCompare = () => {
      onFilterChange({ ...filters, compare: !filters.compare });
  };

  const PeriodButton: React.FC<{period: Period, label: string}> = ({ period, label }) => (
    <button
      onClick={() => setPeriod(period)}
      className={`px-3 py-1 text-sm rounded-md ${filters.period === period ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'}`}
    >
      {label}
    </button>
  );

  const CanalButton: React.FC<{canal: Canal, label: string}> = ({ canal, label }) => (
    <button
      onClick={() => setCanal(canal)}
      className={`px-3 py-1 text-sm rounded-md ${filters.canal === canal ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'}`}
    >
      {label}
    </button>
  );
  
  const DateInput: React.FC<{name: string, value?: string}> = ({name, value}) => (
    <div className="relative">
      <input 
        type="date"
        name={name}
        value={value || ''}
        onChange={handleDateChange}
        className="bg-[var(--color-surface-secondary)] border-[var(--color-border)] rounded-md text-sm py-1 pl-2 pr-8 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
      />
      <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );

  return (
    <header>
      <div className="flex justify-between items-start mb-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Olá, Administrador! 👋</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Bem-vindo de volta ao {generalSettings.companyName}</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] px-3 py-2 rounded-lg border border-[var(--color-border)] shadow-sm">
            <Clock size={16} className="text-[var(--color-text-secondary)] mr-2" />
            Último sync: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button 
            onClick={onSettingsClick}
            className="flex items-center text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] px-3 py-2 rounded-lg border border-[var(--color-border)] shadow-sm hover:bg-[var(--color-surface-secondary)] transition-colors"
          >
            <Settings size={16} className="text-[var(--color-text-secondary)] mr-2" />
            Configurações
          </button>
        </div>
      </div>
      <div className="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm mt-6 space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center space-x-2 p-1">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] mr-2">Período:</span>
                <PeriodButton period="today" label="Hoje" />
                <PeriodButton period="last7days" label="Últimos 7 dias" />
                <PeriodButton period="custom" label="Customizado" />
            </div>
            <div className="flex items-center space-x-2 p-1">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] mr-2">Canal:</span>
                <CanalButton canal="ALL" label="Todos" />
                <CanalButton canal="ML" label="ML" />
                <CanalButton canal="SHOPEE" label="Shopee" />
                <CanalButton canal="SITE" label="Site" />
            </div>
          </div>
          {filters.period === 'custom' && (
            <div className="flex items-center space-x-3 p-2 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">De:</span>
                <DateInput name="startDate" value={filters.startDate} />
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Até:</span>
                <DateInput name="endDate" value={filters.endDate} />
            </div>
          )}
          <div className="flex items-center space-x-3 p-2 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
            <label className="flex items-center text-sm font-semibold text-[var(--color-text-secondary)] cursor-pointer">
              <input type="checkbox" checked={filters.compare} onChange={toggleCompare} className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] mr-2"/>
              Comparar com o período:
            </label>
            {filters.compare && (
              <>
                 <DateInput name="compareStartDate" value={filters.compareStartDate} />
                 <span className="text-sm text-[var(--color-text-secondary)]">até</span>
                 <DateInput name="compareEndDate" value={filters.compareEndDate} />
              </>
            )}
          </div>
      </div>
    </header>
  );
};

export default Header;
