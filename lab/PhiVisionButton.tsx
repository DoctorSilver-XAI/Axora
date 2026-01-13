import React from 'react';
import { usePhiVision } from '../services/PhiVisionContext';

interface PhiVisionButtonProps {
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const PhiVisionButton: React.FC<PhiVisionButtonProps> = ({ showLabel = false, size = 'md' }) => {
    const { togglePhiVision, triggerAnalysis, isActive, isAnalyzing, closePhiVision } = usePhiVision();

    const handleClick = () => {
        if (isActive) {
            closePhiVision();
        } else {
            triggerAnalysis();
        }
    };

    // Scaling based on size prop
    const scale = size === 'sm' ? 0.8 : size === 'lg' ? 1.2 : 1;
    const containerSize = 38 * scale;
    const lensSize = 28 * scale;
    const irisSize = 16 * scale;
    const pupilSize = 5 * scale;

    return (
        <button
            onClick={handleClick}
            className={`group flex items-center justify-center gap-3 transition-all duration-300 outline-none focus:outline-none ${showLabel ? 'w-full bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/5' : ''}`}
            title={isActive ? "Arrêter PhiVision" : "Activer PhiVision"}
            disabled={isAnalyzing}
        >
            <div
                className="relative flex items-center justify-center shrink-0"
                style={{ width: containerSize, height: containerSize }}
            >
                {/* HUD Ring */}
                <div
                    className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30 w-full h-full"
                    style={{ animation: 'hud-spin 12s linear infinite' }}
                />

                {/* Lens */}
                <div
                    className="relative rounded-full bg-[#050b14] shadow-inner flex items-center justify-center border border-cyan-500/20 overflow-hidden group-hover:border-cyan-400/50 transition-colors duration-300"
                    style={{ width: lensSize, height: lensSize }}
                >
                    {/* Iris */}
                    <div
                        className={`rounded-full border border-cyan-500/50 bg-gradient-to-br from-cyan-900 to-indigo-900 flex items-center justify-center relative shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-300 ${isAnalyzing ? 'animate-pulse' : ''}`}
                        style={{ width: irisSize, height: irisSize }}
                    >
                        {/* Scan Line Animation */}
                        <div
                            className="absolute w-full h-[1px] bg-cyan-400 blur-[0.5px] shadow-[0_0_5px_cyan]"
                            style={{ animation: 'scan-line 2s ease-in-out infinite' }}
                        />
                        {/* Pupil */}
                        <div
                            className="bg-cyan-100 rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-all duration-300"
                            style={{ width: pupilSize, height: pupilSize }}
                        />
                    </div>
                </div>
            </div>

            {showLabel && (
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="font-bold text-sm text-gray-200">
                        {isAnalyzing ? 'Analyse en cours...' : (isActive ? 'Fermer' : 'Activer PhiVision')}
                    </span>
                    {!isAnalyzing && !isActive && (
                        <span className="text-[10px] text-cyan-400 font-medium tracking-wide">
                            CLIQUER POUR ACTIVER
                        </span>
                    )}
                </div>
            )}
        </button>
    );
};
