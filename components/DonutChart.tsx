import React from 'react';

interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
    title: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm h-full flex flex-col">
                 <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">{title}</h3>
                 <div className="flex-grow flex items-center justify-center">
                    <p className="text-sm text-[var(--color-text-secondary)]">Nenhum dado para exibir.</p>
                 </div>
            </div>
        );
    }

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">{title}</h3>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="relative w-48 h-48 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 200 200">
                        {data.map((item, index) => {
                            const percentage = (item.value / total) * 100;
                            const strokeDasharray = `${(percentage * circumference) / 100} ${circumference}`;
                            const strokeDashoffset = -offset;
                            offset += (percentage * circumference) / 100;

                            return (
                                <circle
                                    key={index}
                                    className="transition-all duration-500"
                                    cx="100"
                                    cy="100"
                                    r={radius}
                                    fill="transparent"
                                    stroke={item.color}
                                    strokeWidth="25"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    transform="rotate(-90 100 100)"
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-3xl font-bold text-[var(--color-text-primary)]">{total}</span>
                        <span className="text-sm text-[var(--color-text-secondary)]">Total</span>
                    </div>
                </div>
                <div className="space-y-2">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                <span className="font-medium text-[var(--color-text-secondary)]">{item.label}</span>
                            </div>
                            <span className="font-bold text-[var(--color-text-primary)]">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DonutChart;