
import React from 'react';
import { ActionCardData } from '../types';

const ActionCard: React.FC<{ data: ActionCardData }> = ({ data }) => {
    const { title, description, icon, iconBgColor } = data;
  return (
    <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] flex-1 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-[var(--color-text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default ActionCard;
