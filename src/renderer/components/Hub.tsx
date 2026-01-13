import React, { useEffect, useCallback, useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { NeonButton } from './ui/NeonButton';
import { StatusDot } from './ui/StatusDot';
import { ToolCard } from './ui/ToolCard';
import { VisualTuner } from './ui/VisualTuner';
import { useSettings } from '../services/SettingsContext';

const Hub: React.FC = () => {
    const [showTuner, setShowTuner] = useState(false);
    const { settings } = useSettings();

    const closeHub = useCallback(() => {
        window.axora?.setMode('compact', settings.sidecarVariant);
    }, [settings.sidecarVariant]);

    // Priority 1 Fix: Escape key listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeHub();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeHub]);

    return (
        <div
            className="animate-fade-in"
            style={{
                height: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'var(--bg-deep)' // Restore background for Hub
            }}
        >
            {/* Main Glass Panel */}
            <GlassCard
                noPadding
                className="animate-scale-in"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                    background: 'rgba(12, 16, 24, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)'
                }}
            >
                {/* Header */}
                <header
                    className="draggable"
                    style={{
                        padding: '20px 30px',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'grab'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ fontSize: '28px', filter: 'drop-shadow(0 0 12px rgba(67, 215, 226, 0.4))' }}>💊</div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="text-gradient-brand">AXORA</span>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>HUB</span>
                            </h1>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                                <StatusDot status="connected" size={8} /> SYSTÈME OPÉRATIONNEL
                            </div>
                        </div>
                    </div>

                    <div className="no-drag" style={{ display: 'flex', gap: '10px' }}>
                        <NeonButton variant="ghost" onClick={() => setShowTuner(true)}>
                            🎨 Tuner
                        </NeonButton>
                        <NeonButton variant="ghost" onClick={closeHub}>
                            Fermer (Echap)
                        </NeonButton>
                    </div>
                </header>

                {/* Content */}
                <div style={{ flex: 1, padding: '30px', display: 'flex', gap: '30px' }}>

                    {/* Left Area: Assistant */}
                    <GlassCard style={{ width: '380px', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)' }}>
                        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                            <span style={{ color: 'var(--neon-violet)' }}>✦</span> ASSISTANT CLINIQUE
                        </h2>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: '16px', opacity: 0.6 }}>
                            <span style={{ fontSize: '3rem', filter: 'grayscale(1) opacity(0.5)' }}>🩺</span>
                            <p style={{ fontWeight: 500, textAlign: 'center' }}>
                                Analysez une ordonnance ou<br />posez une question clinique
                            </p>
                        </div>

                        <div style={{ marginTop: 'auto', position: 'relative' }} className="no-drag">
                            <input
                                type="text"
                                placeholder="Poser une question..."
                                className="glass-input"
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    paddingRight: '60px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.3)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--neon-cyan)';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(67, 215, 226, 0.15), inset 0 2px 5px rgba(0,0,0,0.3)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--glass-border)';
                                    e.target.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.3)';
                                }}
                            />
                            <div style={{ position: 'absolute', right: '8px', top: '8px' }}>
                                <NeonButton variant="primary" style={{ padding: '8px 16px' }}>Go</NeonButton>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Right Area: Apps Grid */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <h2 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', letterSpacing: '0.05em', color: 'var(--text)' }}>
                                OUTILS OFFICINE
                            </h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '20px'
                            }}>
                                <ToolCard
                                    title="Bilan Prévention (PPP)"
                                    description="Générer un bilan personnalisé complet pour le patient."
                                    icon="📋"
                                    colorVar="var(--mint)"
                                    status="beta"
                                    onClick={() => console.log('Open PPP')}
                                />
                                <ToolCard
                                    title="TROD Angine"
                                    description="Dépistage angines à streptocoque A. Protocole complet."
                                    icon="🌡️"
                                    colorVar="var(--cyan)"
                                    status="ready"
                                    onClick={() => console.log('Open TROD')}
                                />
                                <ToolCard
                                    title="Vaccination"
                                    description="Test d'éligibilité et édition de bon de prise en charge."
                                    icon="💉"
                                    colorVar="var(--iris)"
                                    status="ready"
                                    onClick={() => console.log('Open Vaccin')}
                                />
                                <ToolCard
                                    title="Ordonnance Sécurisée"
                                    description="Analyse des interactions et contre-indications."
                                    icon="🛡️"
                                    colorVar="var(--amber)"
                                    status="soon"
                                />
                            </div>
                        </div>

                        {/* Recent Activity / Context - DISABLED MODULE
                        <div style={{ marginTop: 'auto' }}>
                            <GlassCard variant="default" style={{
                                borderColor: 'rgba(255,255,255,0.08)',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.03), transparent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ fontSize: '24px' }}>💳</div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Lecteur Vitale</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>En attente de carte...</div>
                                    </div>
                                </div>
                                <StatusDot status="busy" size={10} />
                            </GlassCard>
                        </div>
                        */}
                    </div>

                </div>
            </GlassCard>

            {/* Visual Tuner Modal */}
            {showTuner && <VisualTuner onClose={() => setShowTuner(false)} />}
        </div>
    );
};

export default Hub;
