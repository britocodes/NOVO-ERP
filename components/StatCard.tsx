
import React from 'react';
import { StatCardData } from '../types';

const StatCard: React.FC<{ data: StatCardData }> = ({ data }) => {
  const { title, value, change, changeType, icon, changeLabel } = data;
  const isPositive = changeType === 'positive';

  return (
    <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] flex-1 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <p className="text-[var(--color-text-secondary)] font-medium">{title}</p>
        <div className="p-2 bg-[var(--color-primary-bg-subtle)] text-[var(--color-primary-text-subtle)] rounded-lg">
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-3xl font-bold text-[var(--color-text-primary)]">{value}</p>
        <div className="flex items-center mt-1 text-xs">
          <span className={`flex items-center font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
          <span className="text-[var(--color-text-secondary)] ml-1.5">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
