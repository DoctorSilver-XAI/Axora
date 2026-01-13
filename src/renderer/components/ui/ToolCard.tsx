import React from 'react';
import { GlassCard } from './GlassCard';

interface ToolCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    status?: 'ready' | 'beta' | 'soon';
    colorVar: string; // e.g., 'var(--mint)'
    onClick?: () => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
    title,
    description,
    icon,
    status = 'ready',
    colorVar,
    onClick
}) => {
    return (
        <GlassCard
            onClick={onClick}
            variant="interactive"
            className="group"
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderColor: status === 'soon' ? 'rgba(255,255,255,0.05)' : undefined,
                opacity: status === 'soon' ? 0.6 : 1,
                cursor: status === 'soon' ? 'not-allowed' : 'pointer'
            }}
        >
            {/* Header: Icon & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${colorVar}15, transparent)`,
                    border: `1px solid ${colorVar}30`,
                    color: colorVar,
                    fontSize: '24px',
                    boxShadow: `0 4px 12px ${colorVar}10`
                }}>
                    {icon}
                </div>

                {status === 'beta' && (
                    <span style={{
                        fontSize: '10px', fontWeight: 700,
                        padding: '4px 8px', borderRadius: '6px',
                        background: 'rgba(247, 198, 92, 0.1)', color: 'var(--amber)',
                        border: '1px solid rgba(247, 198, 92, 0.2)',
                        textTransform: 'uppercase'
                    }}>
                        Beta
                    </span>
                )}
                {status === 'ready' && (
                    <span style={{
                        fontSize: '10px', fontWeight: 700,
                        padding: '4px 8px', borderRadius: '6px',
                        background: 'rgba(46, 228, 198, 0.1)', color: 'var(--mint)',
                        border: '1px solid rgba(46, 228, 198, 0.2)',
                        textTransform: 'uppercase'
                    }}>
                        Dispo
                    </span>
                )}
            </div>

            {/* Content */}
            <div>
                <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    transition: 'color 0.2s'
                }}
                // Inline hover usually tricky in React, handled by css 'group-hover' or JS.
                // For simplicity, we rely on GlassCard's hover effect, but let's add specific text interaction if possible.
                >
                    {title}
                </h3>
                <p style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4
                }}>
                    {description}
                </p>
            </div>

            {/* Action Hint */}
            {status !== 'soon' && (
                <div style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: colorVar,
                    fontWeight: 600
                }}>
                    Lancer <span style={{ transition: 'transform 0.2s' }}>→</span>
                </div>
            )}
        </GlassCard>
    );
};
