import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePhiVision, PhiVisionResult } from '../../services/PhiVisionContext';
import { useSettings } from '../../services/SettingsContext';
import { PhiVisionDebugOverlay } from './PhiVisionDebugOverlay';

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const COLORS = {
    bg: {
        dark: 'bg-slate-900/95',
        glass: 'bg-slate-900/80 backdrop-blur-xl',
        accent: 'bg-cyan-500/10',
    },
    border: {
        default: 'border-slate-700/50',
        accent: 'border-cyan-500/30',
        success: 'border-emerald-500/50',
        warning: 'border-amber-500/50',
    },
    text: {
        primary: 'text-white',
        secondary: 'text-slate-400',
        accent: 'text-cyan-400',
        success: 'text-emerald-400',
        warning: 'text-amber-400',
    }
};

// ============================================================================
// LOADING CAPSULE COMPONENT
// Non-invasive loading indicator during analysis
// ============================================================================
const LoadingCapsule: React.FC = () => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 duration-300"
            onMouseEnter={() => window.axora?.setIgnoreMouse(false)}
            onMouseLeave={() => window.axora?.setIgnoreMouse(true)}
        >
            <div className={`
                flex items-center gap-3 px-5 py-3 rounded-2xl
                ${COLORS.bg.glass} ${COLORS.border.accent} border
                shadow-lg shadow-cyan-500/10
            `}>
                {/* Pulsing Indicator */}
                <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-cyan-500 animate-ping absolute inset-0 opacity-60" />
                    <div className="w-3 h-3 rounded-full bg-cyan-400 relative" />
                </div>

                {/* Text */}
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-cyan-100">
                        PhiVision analyse{dots}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                        OCR + IA en cours
                    </span>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-16 h-1.5 bg-slate-700/50 rounded-full overflow-hidden ml-2">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite]"
                        style={{ width: '60%', animation: 'progress 1.5s ease-in-out infinite' }}
                    />
                </div>
            </div>

            {/* Subtle keyboard hint */}
            <div className="text-[9px] text-slate-600 text-right mt-1 mr-2 font-mono">
                ESC pour annuler
            </div>
        </div>
    );
};

// ============================================================================
// FLOATING RESULTS PANEL
// Draggable, resizable panel for results
// ============================================================================
interface FloatingPanelProps {
    data: PhiVisionResult;
    onClose: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({ data, onClose, isExpanded, onToggleExpand }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: window.innerWidth - 620, y: window.innerHeight - 500 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Dragging logic
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    }, [position]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 600, e.clientX - dragOffset.x)),
                y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // Enable mouse interaction when panel is visible
    useEffect(() => {
        window.axora?.setIgnoreMouse(false);
        return () => {
            window.axora?.setIgnoreMouse(true);
        };
    }, []);

    return (
        <div
            ref={panelRef}
            className={`
                fixed z-[9999] 
                ${COLORS.bg.glass} ${COLORS.border.accent} border rounded-2xl
                shadow-2xl shadow-black/30
                transition-all duration-300 ease-out
                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                animate-in slide-in-from-bottom-4 fade-in duration-300
            `}
            style={{
                left: position.x,
                top: position.y,
                width: isExpanded ? 580 : 380,
                maxHeight: isExpanded ? '80vh' : 200,
            }}
            onMouseEnter={() => window.axora?.setIgnoreMouse(false)}
        >
            {/* Header - Draggable */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b border-white/10"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-3">
                    {/* Brand Icon */}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">PhiVision</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                            {data.meds?.length || 0} médicaments détectés
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Expand/Collapse */}
                    <button
                        onClick={onToggleExpand}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                        title={isExpanded ? 'Réduire' : 'Agrandir'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className="text-slate-400 group-hover:text-white transition-colors">
                            {isExpanded ? (
                                <>
                                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                                </>
                            ) : (
                                <>
                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                                </>
                            )}
                        </svg>
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-2 bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500 rounded-lg transition-all group"
                        title="Fermer (ESC)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            className="text-red-400 group-hover:text-red-300 transition-colors">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`overflow-y-auto custom-scrollbar transition-all duration-300 ${isExpanded ? 'max-h-[70vh]' : 'max-h-32'}`}>
                {/* Oral Advice - Always visible */}
                <div className="p-4 border-b border-white/5">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">
                        Conseil oral
                    </div>
                    <p className="text-sm text-cyan-50 font-medium italic leading-relaxed">
                        "{data.advices?.oral_sentence || 'Aucun conseil généré.'}"
                    </p>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <>
                        {/* Medications */}
                        {data.meds && data.meds.length > 0 && (
                            <div className="p-4 border-b border-white/5">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                                    Médicaments détectés
                                </div>
                                <div className="space-y-2">
                                    {data.meds.map((med, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                            <div>
                                                <span className="text-sm text-white font-medium">{med.dci}</span>
                                                <p className="text-xs text-slate-400 mt-0.5">{med.recommendation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Written Points */}
                        {data.advices?.written_points && data.advices.written_points.length > 0 && (
                            <div className="p-4 border-b border-white/5">
                                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">
                                    Points clés patient
                                </div>
                                <ul className="space-y-1.5">
                                    {data.advices.written_points.map((point, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Cross-Selling */}
                        {data.cross_selling && data.cross_selling.length > 0 && (
                            <div className="p-4">
                                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
                                    Produits complémentaires
                                </div>
                                <div className="space-y-2">
                                    {data.cross_selling.map((product, i) => (
                                        <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                                            <span className="text-sm text-amber-200 font-medium">{product.name}</span>
                                            <p className="text-xs text-slate-400 mt-0.5">{product.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer with badges */}
            {isExpanded && data.chips && data.chips.length > 0 && (
                <div className="px-4 py-2 border-t border-white/10 flex flex-wrap gap-1.5">
                    {data.chips.map((chip, i) => {
                        const isWarning = /(alerte|attention|danger|risque|interaction)/i.test(chip);
                        return (
                            <span
                                key={i}
                                className={`
                                    px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide
                                    ${isWarning
                                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                                        : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                                    }
                                `}
                            >
                                {chip}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="px-4 py-1.5 bg-black/20 text-[9px] text-slate-600 font-mono flex items-center gap-3 rounded-b-2xl">
                <span><kbd className="px-1 py-0.5 bg-slate-800 rounded text-[8px]">ESC</kbd> Fermer</span>
                <span><kbd className="px-1 py-0.5 bg-slate-800 rounded text-[8px]">⌘M</kbd> Minimiser</span>
                <span className="text-slate-700">• Glisser l'en-tête pour déplacer</span>
            </div>
        </div>
    );
};

// ============================================================================
// MINIMIZED CAPSULE (Ready State)
// Shows when results are minimized
// ============================================================================
interface MinimizedCapsuleProps {
    data: PhiVisionResult;
    onExpand: () => void;
    onClose: () => void;
}

const MinimizedCapsule: React.FC<MinimizedCapsuleProps> = ({ data, onExpand, onClose }) => {
    return (
        <div
            className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 duration-300"
            onMouseEnter={() => window.axora?.setIgnoreMouse(false)}
            onMouseLeave={() => window.axora?.setIgnoreMouse(true)}
        >
            <div className={`
                flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer
                ${COLORS.bg.glass} border border-emerald-500/30
                shadow-lg shadow-emerald-500/10
                hover:border-emerald-400/50 hover:shadow-emerald-500/20
                transition-all duration-200
            `}
                onClick={onExpand}
            >
                {/* Success indicator */}
                <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Info */}
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-emerald-100">
                        Analyse prête
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                        {data.meds?.length || 0} médicaments • Cliquer pour voir
                    </span>
                </div>

                {/* Alert if minor */}
                {data.is_minor && (
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-[10px] text-amber-500 font-bold">
                        !
                    </div>
                )}

                {/* Close button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                    title="Fermer"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 hover:text-white">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// ANCHORED PANEL (Alternative Display Mode)
// Fixed position panel on the right side
// ============================================================================
interface AnchoredPanelProps {
    data: PhiVisionResult;
    onClose: () => void;
}

const AnchoredPanel: React.FC<AnchoredPanelProps> = ({ data, onClose }) => {
    useEffect(() => {
        window.axora?.setIgnoreMouse(false);
        return () => {
            window.axora?.setIgnoreMouse(true);
        };
    }, []);

    return (
        <div
            className={`
                fixed top-4 right-4 bottom-4 w-[420px] z-[9999]
                ${COLORS.bg.glass} ${COLORS.border.accent} border rounded-2xl
                shadow-2xl shadow-black/40
                animate-in slide-in-from-right duration-300
                flex flex-col
            `}
            onMouseEnter={() => window.axora?.setIgnoreMouse(false)}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">PhiVision</div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                            ✓ Analyse terminée
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500 rounded-lg transition-all"
                    title="Fermer (ESC)"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Oral Advice */}
                <div className="p-4 border-b border-white/5">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">
                        💬 Conseil oral
                    </div>
                    <p className="text-sm text-cyan-50 font-medium italic leading-relaxed bg-cyan-500/5 p-3 rounded-lg border border-cyan-500/20">
                        "{data.advices?.oral_sentence || 'Aucun conseil généré.'}"
                    </p>
                </div>

                {/* Medications */}
                {data.meds && data.meds.length > 0 && (
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                            💊 Médicaments ({data.meds.length})
                        </div>
                        <div className="space-y-2">
                            {data.meds.map((med, i) => (
                                <div key={i} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                    <div className="text-sm text-emerald-200 font-semibold">{med.dci}</div>
                                    <p className="text-xs text-slate-400 mt-1">{med.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Written Points */}
                {data.advices?.written_points && data.advices.written_points.length > 0 && (
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">
                            📋 Points clés patient
                        </div>
                        <ul className="space-y-2">
                            {data.advices.written_points.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400 font-bold shrink-0">
                                        {i + 1}
                                    </span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Cross-Selling */}
                {data.cross_selling && data.cross_selling.length > 0 && (
                    <div className="p-4">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">
                            🛒 Produits complémentaires
                        </div>
                        <div className="space-y-2">
                            {data.cross_selling.map((product, i) => (
                                <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                    <div className="text-sm text-amber-200 font-semibold">{product.name}</div>
                                    <p className="text-xs text-slate-400 mt-1">{product.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer with chips */}
            {data.chips && data.chips.length > 0 && (
                <div className="px-4 py-3 border-t border-white/10 shrink-0">
                    <div className="flex flex-wrap gap-1.5">
                        {data.chips.map((chip, i) => {
                            const isWarning = /(alerte|attention|danger|risque|interaction)/i.test(chip);
                            return (
                                <span
                                    key={i}
                                    className={`
                                        px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide
                                        ${isWarning
                                            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                                            : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                                        }
                                    `}
                                >
                                    {chip}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Keyboard hint */}
            <div className="px-4 py-2 bg-black/30 text-[9px] text-slate-600 font-mono rounded-b-2xl">
                <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[8px]">ESC</kbd> Fermer
            </div>
        </div>
    );
};

// ============================================================================
// FULLSCREEN OVERLAY (Legacy Behavior)
// Full dashboard overlay - original design
// ============================================================================
interface FullscreenOverlayProps {
    data: PhiVisionResult;
    onClose: () => void;
}

const FullscreenOverlay: React.FC<FullscreenOverlayProps> = ({ data, onClose }) => {
    useEffect(() => {
        window.axora?.setIgnoreMouse(false);
        return () => {
            window.axora?.setIgnoreMouse(true);
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[9999] bg-[#050910]/95 backdrop-blur-md p-6 animate-in fade-in duration-200"
            onMouseEnter={() => window.axora?.setIgnoreMouse(false)}
        >
            {/* Close on background click */}
            <div
                className="absolute inset-0 -z-10 cursor-pointer"
                onClick={onClose}
                title="Cliquer pour fermer"
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Axora <span className="text-cyan-400 font-light">PhiVision</span></h1>
                        <p className="text-xs text-slate-500 font-mono">PhiGenix Ecosystem • Mode Plein Écran</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-3 bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500 rounded-xl transition-all"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Main Grid - Similar to original */}
            <div className="grid grid-cols-2 gap-4 h-[calc(100%-120px)]">
                {/* Left Column */}
                <div className="flex flex-col gap-4">
                    {/* Oral Advice */}
                    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 flex-1">
                        <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
                            Conseil Oral
                        </div>
                        <p className="text-lg text-cyan-50 font-medium italic leading-relaxed">
                            "{data.advices?.oral_sentence || 'Aucun conseil généré.'}"
                        </p>
                    </div>

                    {/* Written Points */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex-1">
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">
                            Points Clés Patient
                        </div>
                        <ul className="space-y-2">
                            {data.advices?.written_points?.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                    <span>{point}</span>
                                </li>
                            )) || <li className="text-slate-500 italic">Aucun point</li>}
                        </ul>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4">
                    {/* Medications */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex-1">
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
                            Médicaments Détectés
                        </div>
                        <div className="space-y-2">
                            {data.meds?.map((med, i) => (
                                <div key={i} className="bg-emerald-500/10 rounded-lg p-2">
                                    <div className="text-sm text-emerald-200 font-semibold">{med.dci}</div>
                                    <p className="text-xs text-slate-400">{med.recommendation}</p>
                                </div>
                            )) || <p className="text-slate-500 italic">Aucun médicament détecté</p>}
                        </div>
                    </div>

                    {/* Cross-Selling */}
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex-1">
                        <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
                            Produits Complémentaires
                        </div>
                        <div className="space-y-2">
                            {data.cross_selling?.map((product, i) => (
                                <div key={i} className="bg-amber-500/10 rounded-lg p-2">
                                    <div className="text-sm text-amber-200 font-semibold">{product.name}</div>
                                    <p className="text-xs text-slate-400">{product.reason}</p>
                                </div>
                            )) || <p className="text-slate-500 italic">Aucune suggestion</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                    {data.chips?.map((chip, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400">
                            {chip}
                        </span>
                    ))}
                </div>
                <div className="text-xs text-slate-600 font-mono">
                    ESC pour fermer • Cliquer sur le fond pour fermer
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN OVERLAY COMPONENT
// Orchestrates display based on state and user preference
// ============================================================================
export const PhiVisionOverlay: React.FC = () => {
    const { isActive, isAnalyzing, result, closePhiVision } = usePhiVision();
    const { settings } = useSettings();
    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // ESC = Close completely
            if (e.key === 'Escape') {
                e.preventDefault();
                closePhiVision();
            }
            // Cmd/Ctrl + M = Minimize
            if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
                e.preventDefault();
                setIsMinimized(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, closePhiVision]);

    // Reset state when closing
    useEffect(() => {
        if (!isActive) {
            setIsMinimized(false);
            setIsExpanded(true);
        }
    }, [isActive]);

    if (!isActive) return null;

    const data = result as PhiVisionResult;
    const displayMode = settings.phivisionDisplayMode;

    // CRITICAL: Enable mouse interaction when showing the debug overlay
    const showingDebugOverlay = !isAnalyzing && data && !isMinimized;
    useEffect(() => {
        if (showingDebugOverlay) {
            window.axora?.setIgnoreMouse(false);
        }
        return () => {
            // Restore ignore on unmount
            window.axora?.setIgnoreMouse(true);
        };
    }, [showingDebugOverlay]);

    // Loading State - Always show capsule regardless of display mode
    if (isAnalyzing) {
        return <LoadingCapsule />;
    }

    // No data yet
    if (!data) return null;

    // Data received - just log to console, don't render anything that could cause issues
    // Note: Rendering here was causing crashes, so we keep it minimal
    const debugData = data as any;

    // Return minimal "toast" that doesn't interact with phivision mode
    return (
        <div
            className="fixed bottom-6 right-6 z-[9999] pointer-events-none"
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
        >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-900/90 backdrop-blur-xl border border-emerald-500/30 shadow-lg">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-emerald-100">OCR Terminé ✓</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                        {debugData.ocrLength || debugData.ocrText?.length || 0} caractères
                    </span>
                </div>
            </div>
            <div className="text-[9px] text-slate-500 text-center mt-1">
                Voir PhiVision Lab pour les détails
            </div>
        </div>
    );
};

// CSS for progress animation (add to global styles or use inline)
const style = document.createElement('style');
style.textContent = `
@keyframes progress {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(50%); }
    100% { transform: translateX(100%); }
}
`;
if (typeof document !== 'undefined') {
    document.head.appendChild(style);
}
