import React, { useState, useEffect } from 'react';
import { StatusDot } from './ui/StatusDot';
import { AxoraLogo } from './AxoraLogo';
import { SidecarConfig } from '../../config/sidecar.config';
import { usePhiVision } from '../services/PhiVisionContext';
import { PhiVisionButton } from './PhiVisionButton';
import { DynamicIsland } from './DynamicIsland';
import { useSettings } from '../services/SettingsContext';

interface SidecarProps {
    mode?: 'compact' | 'hub' | 'phivision'; // 'hub' is rarely used here but kept for types
}

const Sidecar: React.FC<SidecarProps> = ({ mode = 'compact' }) => {
    const { settings } = useSettings();

    if (settings.sidecarVariant === 'dynamic-island') {
        return <DynamicIsland />;
    }

    const { triggerAnalysis, isAnalyzing, isActive, closePhiVision } = usePhiVision();

    const switchMode = (newMode: 'hub' | 'compact') => {
        window.axora?.setMode(newMode);
    };

    // Ensure we start in INTERACTIVE mode for compact/hub, 
    // but for phivision, DualModeController sets it to ignored by default.
    useEffect(() => {
        if (mode === 'compact') {
            window.axora?.setIgnoreMouse(false);
        }
    }, [mode]);

    const handleMouseEnter = () => {
        // In phivision mode, we must explicitly enable mouse when hovering the tool
        if (mode === 'phivision') {
            window.axora?.setIgnoreMouse(false);
        }
    };

    const handleMouseLeave = () => {
        // In phivision mode, revert to ignore when leaving the tool
        if (mode === 'phivision') {
            window.axora?.setIgnoreMouse(true);
        }
    };

    const handlePhiVisionClick = () => {
        if (isActive) {
            closePhiVision();
        } else {
            triggerAnalysis();
        }
    };

    // Drag style if enabled (only in compact mode usually)
    const canDrag = SidecarConfig.behavior.isDraggable && mode === 'compact';
    const dragStyle = canDrag ? {
        WebkitAppRegion: 'drag',
    } as React.CSSProperties : {};

    // No-drag style for interactive elements
    const noDragStyle = {
        WebkitAppRegion: 'no-drag',
    } as React.CSSProperties;

    // Layout Style Helper
    const getContainerStyle = (): React.CSSProperties => {
        if (mode === 'phivision') {
            // Fullscreen overlay mode: Position absolutely to mimic the compact position
            // We use fixed to ensure it stays in place relative to the viewport
            const { height: h, width: w } = SidecarConfig.visual;
            const { margins } = SidecarConfig.position;

            // Calculate Top based on config (Approximate for now based on 'upper-quarter')
            // 'upper-quarter' = 25% of screen height - half sidecar height
            // We use clamp to ensure it never goes off-screen (min 12px from top, max 12px from bottom)
            const topCalc = `clamp(12px, calc(25vh - ${h / 2}px), calc(100vh - ${h}px - 12px))`;

            return {
                position: 'fixed',
                right: margins.right + 'px',
                top: topCalc,
                width: `${w}px`,
                height: `${h}px`,
                // Ensure z-index is above the overlay background
                zIndex: 10001,
            };
        }

        // Compact Mode: Centered in its own transparent window
        return {
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent'
        };
    };

    return (
        /* Main Wrapper */
        <div
            style={getContainerStyle()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                className="glass-panel"
                style={{
                    /* Configured Dimensions */
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    borderRadius: `${SidecarConfig.visual.borderRadius}px`,

                    /* Visual Style */
                    backdropFilter: `blur(${SidecarConfig.theme.blurIntensity}px)`,
                    background: SidecarConfig.theme.backgroundColor,
                    boxShadow: SidecarConfig.theme.shadow.enabled ? SidecarConfig.theme.shadow.size + ' ' + SidecarConfig.theme.shadow.color : 'none',
                    border: `1px solid ${SidecarConfig.theme.borderColor}`,

                    /* Layout */
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '16px 0',
                    gap: '0',
                    overflow: 'hidden',

                    /* Draggable Region */
                    ...dragStyle
                }}
            >
                {/* 1. Status Indicator (Top) */}
                <div
                    style={{
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                    }}
                    title="Axora Connecté"
                >
                    <StatusDot status={isAnalyzing ? 'busy' : 'connected'} size={12} />
                </div>

                {/* 2. Main Action: Search/Hub (Center-Top) - NOW LOGO */}
                <button
                    className="icon-button"
                    onClick={() => switchMode('hub')}
                    aria-label="Ouvrir le Hub Axora"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        ...noDragStyle
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <AxoraLogo size={38} />
                </button>

                {/* 3. Separator */}
                <div style={{
                    width: '24px',
                    height: '1px',
                    background: 'rgba(255,255,255,0.15)',
                    marginBottom: '16px'
                }} />

                {/* 4. PhiVision Trigger (Modernized v2.0) */}
                {/* 4. PhiVision Trigger (Modernized v2.0) */}
                <div style={{ marginTop: 'auto', marginBottom: '10px' }}>
                    <PhiVisionButton size="md" />
                </div>


            </div>
        </div>
    );
};

export default Sidecar;
