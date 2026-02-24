
import React from 'react';
import { AlertItemData, AlertLevel } from '../types';

const getAlertStyles = (level: AlertLevel) => {
    switch (level) {
        case AlertLevel.Warning:
            return {
                bg: 'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)]',
                iconBg: 'bg-yellow-100 dark:bg-transparent',
                textColor: 'text-[var(--color-warning-text)]',
            };
        case AlertLevel.Danger:
            return {
                bg: 'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)]',
                iconBg: 'bg-red-100 dark:bg-transparent',
                textColor: 'text-[var(--color-danger-text)]',
            };
        case AlertLevel.Info:
        default:
            return {
                bg: 'bg-[var(--color-info-bg)] border-[var(--color-info-border)]',
                iconBg: 'bg-blue-100 dark:bg-transparent',
                textColor: 'text-[var(--color-info-text)]',
            };
    }
}

const AlertItem: React.FC<{ item: AlertItemData }> = ({ item }) => {
    const styles = getAlertStyles(item.level);

    return (
        <div className={`flex items-start p-4 rounded-lg border mb-4 ${styles.bg}`}>
            <div className={`p-2 rounded-full mr-4 ${styles.iconBg} ${styles.textColor}`}>
                {item.icon}
            </div>
            <div>
                <h4 className={`font-bold text-sm ${styles.textColor}`}>{item.title}</h4>
                <p className={`text-sm ${styles.textColor} opacity-90`}>{item.description}</p>
            </div>
        </div>
    )
};


const SystemAlerts: React.FC<{ alerts: AlertItemData[] }> = ({ alerts }) => {
  return (
    <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm flex-1">
      <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Alertas do Sistema</h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">Itens que precisam de atenção</p>
      <div>
        {alerts.map((alert) => (
          <AlertItem key={alert.id} item={alert} />
        ))}
      </div>
    </div>
  );
};

export default SystemAlerts;
