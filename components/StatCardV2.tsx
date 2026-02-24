import React from 'react';

export interface StatCardViewData {
    id: string;
    label: string; // e.g., "Total", "ML", "Shopee"
    value: string;
    subValue: string;
    color: 'blue' | 'yellow' | 'orange';
}

interface StatCardV2Props {
    title: string;
    icon: React.ReactNode;
    views: StatCardViewData[];
    activeIndex: number;
    onIndicatorClick: (index: number) => void;
}

const StatCardV2: React.FC<StatCardV2Props> = ({ title, icon, views, activeIndex, onIndicatorClick }) => {
    const activeView = views[activeIndex];
    if (!activeView) return null;

    const indicatorColorClasses = {
        blue: 'bg-blue-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
    };

    return (
        <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] flex-1 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <p className="text-[var(--color-text-secondary)] font-medium">{title}</p>
                    <div className="p-2 bg-[var(--color-primary-bg-subtle)] text-[var(--color-primary-text-subtle)] rounded-lg">
                        {icon}
                    </div>
                </div>
                <div className="mt-2">
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">{activeView.value}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{activeView.subValue}</p>
                </div>
            </div>
            {views.length > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]`}>
                        {activeView.label}
                    </span>
                    <div className="flex space-x-1.5">
                        {views.map((view, index) => (
                            <button
                                key={view.id}
                                onClick={() => onIndicatorClick(index)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    index === activeIndex ? indicatorColorClasses[view.color] : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                aria-label={`View ${view.label}`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatCardV2;