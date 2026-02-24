import React from 'react';
import { Factory, Building, Warehouse, Box, Package, Settings, Shield, LucideProps } from 'lucide-react';

export const iconMap: { [key: string]: React.FC<LucideProps> } = {
    Factory,
    Building,
    Warehouse,
    Box,
    Package,
    Settings,
    Shield,
};

export const iconList = Object.keys(iconMap);

interface DynamicIconProps extends LucideProps {
    name: string;
}

const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
    const IconComponent = iconMap[name] || Factory; // Fallback to Factory
    return <IconComponent {...props} />;
};

export default DynamicIcon;
