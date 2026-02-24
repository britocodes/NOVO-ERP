import React, { useState, useEffect, useRef } from 'react';
import { Bell, Package, ChevronRight } from 'lucide-react';
import { StockItem } from '../types';

interface NotificationPanelProps {
    lowStockItems: StockItem[];
    onNavigate: (page: string) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ lowStockItems, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const count = lowStockItems.length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleItemClick = () => {
        onNavigate('estoque');
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <Bell size={22} />
                {count > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white">
                        {count}
                    </span>
                )}
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
                    <div className="p-3 border-b">
                        <h3 className="font-semibold text-gray-800">Notificações de Estoque Baixo</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {count > 0 ? (
                            lowStockItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={handleItemClick}
                                    className="flex items-start p-3 hover:bg-gray-50 cursor-pointer"
                                >
                                    <div className="p-2 bg-red-100 rounded-full mr-3">
                                        <Package size={20} className="text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">
                                            Atual: <span className="font-bold text-red-600">{item.current_qty}</span> / Mínimo: {item.min_qty}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-400 self-center" />
                                </div>
                            ))
                        ) : (
                            <div className="text-center p-6 text-sm text-gray-500">
                                Nenhuma notificação nova.
                            </div>
                        )}
                    </div>
                    {count > 0 && (
                        <div className="p-2 border-t text-center">
                             <button onClick={handleItemClick} className="text-sm font-medium text-blue-600 hover:underline">
                                Ver todos os alertas de estoque
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default NotificationPanel;
