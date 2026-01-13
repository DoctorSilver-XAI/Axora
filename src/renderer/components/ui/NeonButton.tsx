import React, { ButtonHTMLAttributes } from 'react';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger';
    icon?: React.ReactNode;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
    children,
    variant = 'primary',
    icon,
    style,
    ...props
}) => {
    const getBaseStyles = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            outline: 'none',
            ...style
        };

        switch (variant) {
            case 'primary':
                return {
                    ...base,
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid var(--neon-cyan)',
                    color: 'var(--neon-cyan)',
                    boxShadow: '0 0 10px rgba(0, 242, 255, 0.1), inset 0 0 10px rgba(0, 242, 255, 0.05)',
                };
            case 'danger':
                return {
                    ...base,
                    background: 'rgba(255, 0, 85, 0.1)',
                    border: '1px solid var(--neon-alert)',
                    color: 'var(--neon-alert)',
                };
            case 'ghost':
                return {
                    ...base,
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                };
            default:
                return base;
        }
    };

    return (
        <button
            className={`neon-button-${variant}`}
            style={getBaseStyles()}
            {...props}
            onMouseEnter={(e) => {
                if (variant === 'primary') {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 255, 0.4), inset 0 0 20px rgba(0, 242, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }
            }}
            onMouseLeave={(e) => {
                if (variant === 'primary') {
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.1), inset 0 0 10px rgba(0, 242, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
        >
            {icon && <span style={{ fontSize: '1.2em' }}>{icon}</span>}
            {children}
        </button>
    );
};
