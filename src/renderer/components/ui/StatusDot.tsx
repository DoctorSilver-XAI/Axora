import React from 'react';

interface StatusDotProps {
    status: 'connected' | 'disconnected' | 'busy' | 'alert';
    size?: number;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 12 }) => {
    const getColor = () => {
        switch (status) {
            case 'connected': return 'var(--neon-green)';
            case 'busy': return 'var(--neon-cyan)';
            case 'alert': return 'var(--neon-alert)';
            default: return '#64748b';
        }
    };

    const color = getColor();

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            {/* Glow Effect - uses @keyframes pulse from variables.css */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                borderRadius: '50%',
                backgroundColor: color,
                opacity: 0.6,
                filter: 'blur(4px)',
                animation: status === 'connected' ? 'pulse 2s infinite' : 'none'
            }} />

            {/* Dot */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                borderRadius: '50%',
                backgroundColor: color,
                border: '1px solid rgba(255,255,255,0.2)'
            }} />
        </div>
    );
};
