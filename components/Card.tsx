import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    const baseClasses = "bg-[var(--card-bg)] p-4 sm:p-6 rounded-xl border border-[var(--card-border)] shadow-[var(--card-shadow)] transition-shadow duration-300";
    const clickableClasses = onClick ? "cursor-pointer hover:shadow-[var(--card-shadow-hover)]" : "";
    
    return (
        <div className={`${baseClasses} ${clickableClasses} ${className}`} onClick={onClick}>
            {children}
        </div>
    );
};

export default Card;
