
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (size: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Se não há itens, não mostra paginação
    if (totalItems === 0) return null;

    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)] mt-4 px-1 flex-wrap gap-4">
            <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--color-text-primary)]">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
                </span>
                <span>-</span>
                 <span className="font-semibold text-[var(--color-text-primary)]">
                    {Math.min(currentPage * itemsPerPage, totalItems)}
                </span>
                <span>de</span> 
                <span className="font-semibold text-[var(--color-text-primary)]">{totalItems}</span>
                <span className="hidden sm:inline">resultados</span>
            </div>
             <div className="flex items-center gap-2">
                <label htmlFor="items-per-page-bottom" className="sr-only">Itens por página</label>
                <select 
                    id="items-per-page-bottom"
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="p-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-sm focus:ring-blue-500 focus:border-blue-500 font-bold"
                >
                    <option value={50}>50 / pág</option>
                    <option value={100}>100 / pág</option>
                    <option value={200}>200 / pág</option>
                    <option value={500}>500 / pág</option>
                    <option value={1000}>1000 / pág</option>
                    <option value={2000}>2000 / pág</option>
                    <option value={5000}>5000 / pág</option>
                    <option value={10000}>10000 / pág</option>
                    <option value={20000}>20000 / pág</option>
                    <option value={totalItems > 0 ? totalItems : 999999}>Todos ({totalItems})</option>
                </select>
                <div className="flex gap-1">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canGoPrev}
                        className="flex items-center justify-center w-8 h-8 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="flex items-center justify-center px-2 font-semibold text-[var(--color-text-primary)] min-w-[3rem]">
                        {currentPage} / {totalPages || 1}
                    </span>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canGoNext}
                        className="flex items-center justify-center w-8 h-8 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
