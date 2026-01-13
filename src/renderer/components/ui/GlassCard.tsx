import React, { HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'active' | 'alert' | 'interactive';
    noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    style,
    variant = 'default',
    noPadding = false,
    ...props
}) => {
    const getBorderColor = () => {
        switch (variant) {
            case 'active': return 'var(--neon-cyan)';
            case 'alert': return 'var(--neon-alert)';
            case 'interactive': return 'rgba(255,255,255,0.15)'; // Slightly lighter default
            default: return 'var(--glass-border)';
        }
    };

    const cssStyle: React.CSSProperties = {
        background: 'var(--glass-bg-dark)',
        backdropFilter: 'var(--backdrop-blur)',
        WebkitBackdropFilter: 'var(--backdrop-blur)',
        border: `1px solid ${getBorderColor()}`,
        boxShadow: variant === 'active'
            ? '0 0 10px rgba(0, 242, 255, 0.2), var(--glass-shadow)'
            : 'var(--glass-shadow)',
        borderRadius: '12px',
        padding: noPadding ? '0' : '20px',
        color: 'var(--text-primary)',
        transition: 'var(--transition-fast)',
        ...style
    };

    return (
        <div className={`glass-card ${className}`} style={cssStyle} {...props}>
            {children}
        </div>
    );
};
