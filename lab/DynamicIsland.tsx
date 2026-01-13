import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AxoraLogo } from './AxoraLogo';
import { StatusDot } from './ui/StatusDot';
import { SidecarConfig } from '../../config/sidecar.config';
import { usePhiVision } from '../services/PhiVisionContext';
import { Scan, LayoutGrid, Zap } from 'lucide-react';

export const DynamicIsland: React.FC = () => {
    const { isAnalyzing, triggerAnalysis, isActive, closePhiVision } = usePhiVision();
    const [isHovered, setIsHovered] = useState(false);

    // Synchronize mouse ignore state
    const handleMouseEnter = () => {
        setIsHovered(true);
        window.axora?.setIgnoreMouse(false);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        window.axora?.setIgnoreMouse(true);
    };

    const handleOpenHub = () => {
        window.axora?.setMode('hub');
    };

    const handlePhiVisionToggle = () => {
        if (isActive) closePhiVision();
        else triggerAnalysis();
    };

    // Animation Config
    const springTransition = { type: "spring" as const, stiffness: 400, damping: 30 };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start', // Top alignment
            paddingTop: SidecarConfig.position.margins.top + 'px',
            background: 'transparent' // Click-through wrapper
        }}>
            <motion.div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                layout
                transition={springTransition}
                style={{
                    background: 'rgba(5, 5, 8, 0.85)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    cursor: 'default'
                }}
                initial={false}
                animate={{
                    width: isHovered ? 280 : 120,
                    height: isHovered ? 130 : 36,
                    borderRadius: isHovered ? 28 : 18,
                }}
            >
                <AnimatePresence mode='wait'>
                    {/* ------------------------------------------------------------------ */}
                    {/* IDLE STATE (Compact) */}
                    {/* ------------------------------------------------------------------ */}
                    {!isHovered && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between px-3 h-full w-full"
                        >
                            {/* Left: Mini Logo */}
                            <div className="flex items-center gap-2">
                                <AxoraLogo size={20} />
                            </div>

                            {/* Right: Status Pulse */}
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-500'}`} />
                            </div>
                        </motion.div>
                    )}

                    {/* ------------------------------------------------------------------ */}
                    {/* EXPANDED STATE (Controls) */}
                    {/* ------------------------------------------------------------------ */}
                    {isHovered && (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: 0.05 }}
                            className="flex flex-col p-4 w-full h-full"
                        >
                            {/* Header: Title + Status */}
                            <div className="flex items-center justify-between text-white/40 text-[10px] uppercase font-bold tracking-wider mb-4">
                                <span>Axora <span className="text-indigo-400">Pro</span></span>
                                <div className="flex items-center gap-1.5">
                                    <StatusDot status={isAnalyzing ? 'busy' : 'connected'} size={8} />
                                    <span>{isAnalyzing ? 'Analyse...' : 'Prêt'}</span>
                                </div>
                            </div>

                            {/* Actions Grid */}
                            <div className="grid grid-cols-2 gap-3 h-full">
                                {/* Button 1: Hub */}
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleOpenHub}
                                    className="flex flex-col items-center justify-center gap-1.5 bg-white/5 rounded-xl border border-white/5 text-white/80 hover:text-white transition-colors p-2"
                                >
                                    <LayoutGrid size={20} />
                                    <span className="text-xs font-medium">Hub</span>
                                </motion.button>

                                {/* Button 2: PhiVision */}
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(99, 102, 241, 0.2)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handlePhiVisionToggle}
                                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-colors p-2 ${isActive ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/5 text-white/80 hover:text-white hover:bg-white/10'}`}
                                >
                                    {isActive ? <Zap size={20} className="fill-indigo-400/50" /> : <Scan size={20} />}
                                    <span className="text-xs font-medium">{isActive ? 'Stop' : 'Vision'}</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
