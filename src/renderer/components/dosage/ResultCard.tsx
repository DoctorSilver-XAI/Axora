import React from 'react';
import { CalculationResult } from '../../services/PosoEngine';
import { motion } from 'framer-motion';

interface ResultCardProps {
    result: CalculationResult;
}

export function ResultCard({ result }: ResultCardProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Primary Answer: Recommendation Text */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <h2 className="text-white/70 uppercase tracking-wider text-xs font-semibold mb-2">
                    Posologie Recommandée
                </h2>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 font-mono tracking-tight">
                    {result.recommendation}
                </div>
                <div className="text-emerald-400 font-medium text-lg">
                    {result.numberOfIntakes} fois par jour
                </div>
                {result.recommendation.includes('ml') && (
                    <div className="text-white/40 text-sm mt-2">
                        soit {Math.round(result.dosePerIntakeMg)} mg par prise
                    </div>
                )}
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/50 text-xs uppercase mb-1">Dose Journalière</div>
                    <div className="text-xl text-white font-mono">{Math.round(result.dailyDoseMg)} mg</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/50 text-xs uppercase mb-1">Volume Total Traitement</div>
                    <div className="text-xl text-white font-mono">{Math.round(result.volumeTotalMl)} ml</div>
                    <div className="text-xs text-blue-400 mt-1">
                        Besoin de {result.bottlesNeeded} flacon{result.bottlesNeeded > 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Alerts & Warnings */}
            {(result.alerts.length > 0 || result.warnings.length > 0) && (
                <div className="space-y-3">
                    {result.alerts.map((alert, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={`alert-${idx}`}
                            className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-3 items-start"
                        >
                            <span className="text-red-400 text-xl">⚠️</span>
                            <p className="text-red-200 text-sm pt-0.5">{alert}</p>
                        </motion.div>
                    ))}
                    {result.warnings.map((warn, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={`warn-${idx}`}
                            className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3 items-start"
                        >
                            <span className="text-amber-400 text-xl">ℹ️</span>
                            <p className="text-amber-200 text-sm pt-0.5">{warn}</p>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
