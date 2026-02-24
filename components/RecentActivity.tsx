
import React from 'react';
import { ActivityItemData, ActivityType } from '../types';
import { CheckCircle, Archive, AlertTriangle } from 'lucide-react';

const ActivityIcon = ({ type }: { type: ActivityType }) => {
  switch (type) {
    case ActivityType.OrderScanned:
      return <CheckCircle size={20} className="text-green-500" />;
    case ActivityType.StockUpdated:
      return <Archive size={20} className="text-blue-500" />;
    case ActivityType.StockAlert:
      return <AlertTriangle size={20} className="text-yellow-500" />;
    default:
      return null;
  }
};

const ActivityItem: React.FC<{ item: ActivityItemData }> = ({ item }) => (
    <div className="flex items-start p-4 bg-[var(--color-surface-secondary)] rounded-lg mb-3">
        <div className="p-2 bg-[var(--color-surface)] rounded-full mr-4">
            <ActivityIcon type={item.type} />
        </div>
        <div>
            <p className="font-semibold text-[var(--color-text-primary)] text-sm">{item.title}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{item.description}</p>
            <p className="text-xs text-[var(--color-text-secondary)] opacity-70 mt-1">{item.time}</p>
        </div>
    </div>
);


const RecentActivity: React.FC<{ activities: ActivityItemData[] }> = ({ activities }) => {
  return (
    <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm flex-1">
      <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Atividade Recente</h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">Últimas ações no sistema</p>
      <div>
        {activities.map((activity) => (
          <ActivityItem key={activity.id} item={activity} />
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
