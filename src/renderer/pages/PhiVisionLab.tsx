import React, { useState, useEffect } from 'react';

// Type for log entries
interface PhiVisionLogEntry {
    id: string;
    timestamp: string;
    screenshotPath: string | null;
    screenshotBase64: string | null;
    supabaseUrl: string;
    ocrTextRaw: string;
    ocrLength: number;
    ocrTimeMs: number;
    totalTimeMs: number;
    mistralResponseRaw: any;
    parsedAnnotation?: any;
    enrichedData?: any;
    version: string;
}

export function PhiVisionLab() {
    const [logs, setLogs] = useState<PhiVisionLogEntry[]>([]);
    const [selectedLog, setSelectedLog] = useState<PhiVisionLogEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ocr' | 'parsed' | 'enrichment' | 'mistral' | 'metadata'>('ocr');
    const [enriching, setEnriching] = useState(false);

    // Load logs on mount
    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.axora?.invoke('AXORA_PHIVISION_GET_LOGS');
            if (result?.success) {
                setLogs(result.data);
            }
        } catch (err) {
            console.error('Failed to load logs:', err);
        }
        setLoading(false);
    };

    const selectLog = async (id: string) => {
        try {
            // @ts-ignore
            const result = await window.axora?.invoke('AXORA_PHIVISION_GET_LOG', id);
            if (result?.success) {
                setSelectedLog(result.data);
            }
        } catch (err) {
            console.error('Failed to load log:', err);
        }
    };

    const deleteLog = async (id: string) => {
        if (!confirm('Supprimer cette capture ?')) return;
        try {
            // @ts-ignore
            await window.axora?.invoke('AXORA_PHIVISION_DELETE_LOG', id);
            loadLogs();
            if (selectedLog?.id === id) setSelectedLog(null);
        } catch (err) {
            console.error('Failed to delete log:', err);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="h-full flex flex-col bg-slate-950">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">🔬</span>
                    PhiVision Lab
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Historique et analyse des captures OCR
                </p>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Log List */}
                <div className="w-80 border-r border-slate-800 flex flex-col">
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-sm text-slate-400">{logs.length} captures</span>
                        <button
                            onClick={loadLogs}
                            className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                        >
                            Actualiser
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500">Chargement...</div>
                        ) : logs.length === 0 ? (
                            <div className="p-4 text-center text-slate-500">
                                <div className="text-4xl mb-2">📷</div>
                                Aucune capture.<br />
                                Utilisez <span className="font-mono bg-slate-800 px-1 rounded">Cmd+Shift+P</span>
                            </div>
                        ) : (
                            logs.map(log => (
                                <div
                                    key={log.id}
                                    onClick={() => selectLog(log.id)}
                                    className={`p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors ${selectedLog?.id === log.id ? 'bg-cyan-900/20 border-l-2 border-l-cyan-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-sm text-white font-medium">
                                                {log.ocrLength} caractères
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {formatDate(log.timestamp)}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                                            {log.totalTimeMs}ms
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-1 truncate font-mono">
                                        {log.ocrTextRaw?.substring(0, 50) || 'Aucun texte'}...
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel - Log Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {!selectedLog ? (
                        <div className="flex-1 flex items-center justify-center text-slate-600">
                            <div className="text-center">
                                <div className="text-5xl mb-3">👈</div>
                                <div>Sélectionnez une capture</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className="flex border-b border-slate-800">
                                {(['ocr', 'parsed', 'enrichment', 'mistral', 'metadata'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {tab === 'ocr' && '📝 Texte OCR'}
                                        {tab === 'parsed' && '✨ Données Parsées'}
                                        {tab === 'enrichment' && '🧠 Enrichissement'}
                                        {tab === 'mistral' && '🤖 Réponse Mistral'}
                                        {tab === 'metadata' && '📊 Métadonnées'}
                                    </button>
                                ))}
                                <div className="ml-auto mr-2 flex items-center">
                                    <button
                                        onClick={() => deleteLog(selectedLog.id)}
                                        className="text-xs px-2 py-1 text-red-400 hover:bg-red-500/10 rounded"
                                    >
                                        🗑️ Supprimer
                                    </button>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-auto p-4">
                                {activeTab === 'ocr' && (
                                    <div className="grid grid-cols-2 gap-4 h-full">
                                        {/* Screenshot */}
                                        <div className="bg-black rounded-lg border border-slate-800 overflow-hidden">
                                            <div className="p-2 border-b border-slate-800 text-xs text-slate-500">
                                                📷 Capture d'écran
                                            </div>
                                            {selectedLog.screenshotBase64 ? (
                                                <img
                                                    src={selectedLog.screenshotBase64}
                                                    alt="Screenshot"
                                                    className="w-full h-auto max-h-[500px] object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<div class="p-4 text-red-400 text-center text-xs">⚠️ Impossible de charger l\'image (Fichier corrompu ou introuvable)</div>');
                                                    }}
                                                />
                                            ) : (
                                                <div className="p-4 text-slate-600 text-center">
                                                    Aperçu non disponible
                                                </div>
                                            )}
                                        </div>

                                        {/* OCR Text */}
                                        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex flex-col">
                                            <div className="p-2 border-b border-slate-800 text-xs text-slate-500 flex justify-between">
                                                <span>📝 Texte extrait ({selectedLog.ocrLength} chars)</span>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(selectedLog.ocrTextRaw)}
                                                    className="text-cyan-400 hover:text-cyan-300"
                                                >
                                                    Copier
                                                </button>
                                            </div>
                                            <pre className="flex-1 overflow-auto p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                                                {selectedLog.ocrTextRaw || 'Aucun texte extrait'}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'parsed' && (
                                    <div className="space-y-4">
                                        {selectedLog.parsedAnnotation ? (
                                            <>
                                                {/* Status Badge */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                                                        ✓ Parsing réussi (v{selectedLog.parsedAnnotation.schema_version})
                                                    </span>
                                                    {!selectedLog.parsedAnnotation.patient && (
                                                        <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                                                            🛒 Vente simple (sans ordonnance)
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Patient & Prescriber */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                                            <span>👤</span> Patient
                                                        </h3>
                                                        {selectedLog.parsedAnnotation.patient ? (
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-500">Nom</span>
                                                                    <span className="text-white font-medium">
                                                                        {selectedLog.parsedAnnotation.patient.first_name} {selectedLog.parsedAnnotation.patient.last_name}
                                                                    </span>
                                                                </div>
                                                                {selectedLog.parsedAnnotation.patient.age_years && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-500">Âge</span>
                                                                        <span className="text-white">{selectedLog.parsedAnnotation.patient.age_years} ans</span>
                                                                    </div>
                                                                )}
                                                                {selectedLog.parsedAnnotation.patient.mandatory_insurance?.name && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-500">AMO</span>
                                                                        <span className="text-cyan-400 text-xs">{selectedLog.parsedAnnotation.patient.mandatory_insurance.name}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-600 text-sm italic">Aucun patient (vente libre)</div>
                                                        )}
                                                    </div>

                                                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                                            <span>🩺</span> Prescripteur
                                                        </h3>
                                                        {selectedLog.parsedAnnotation.prescriber ? (
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-500">Nom</span>
                                                                    <span className="text-white font-medium">
                                                                        {selectedLog.parsedAnnotation.prescriber.first_name} {selectedLog.parsedAnnotation.prescriber.last_name}
                                                                    </span>
                                                                </div>
                                                                {selectedLog.parsedAnnotation.prescriber.specialty && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-500">Spécialité</span>
                                                                        <span className="text-white">{selectedLog.parsedAnnotation.prescriber.specialty}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-600 text-sm italic">Aucun prescripteur</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Dispensation Lines */}
                                                <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                                        <span>💊</span> Lignes de délivrance ({selectedLog.parsedAnnotation.dispensation_lines?.length || 0})
                                                    </h3>
                                                    {selectedLog.parsedAnnotation.dispensation_lines?.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-slate-500 border-b border-slate-800">
                                                                        <th className="text-left py-2 px-2">#</th>
                                                                        <th className="text-left py-2 px-2">Désignation</th>
                                                                        <th className="text-right py-2 px-2">Qté</th>
                                                                        <th className="text-right py-2 px-2">PU</th>
                                                                        <th className="text-right py-2 px-2">Stock</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedLog.parsedAnnotation.dispensation_lines.map((line: any, idx: number) => (
                                                                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                                            <td className="py-2 px-2 text-slate-600">{line.line_no || idx + 1}</td>
                                                                            <td className="py-2 px-2 text-white font-medium">{line.designation}</td>
                                                                            <td className="py-2 px-2 text-right text-cyan-400">{line.quantity ?? '-'}</td>
                                                                            <td className="py-2 px-2 text-right text-slate-300">{line.unit_price_eur ? `${line.unit_price_eur.toFixed(2)}€` : '-'}</td>
                                                                            <td className="py-2 px-2 text-right text-slate-500">{line.stock_level ?? '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-600 text-sm italic">Aucune ligne détectée</div>
                                                    )}
                                                </div>

                                                {/* Totals */}
                                                {selectedLog.parsedAnnotation.totals && (
                                                    <div className="bg-gradient-to-r from-cyan-900/20 to-emerald-900/20 rounded-lg border border-cyan-800/50 p-4">
                                                        <h3 className="text-sm font-medium text-white mb-3">💰 Totaux</h3>
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="text-center">
                                                                <div className="text-2xl font-bold text-cyan-400">
                                                                    {selectedLog.parsedAnnotation.totals.total_amount_eur?.toFixed(2) ?? '0.00'} €
                                                                </div>
                                                                <div className="text-xs text-slate-500">Total</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-2xl font-bold text-amber-400">
                                                                    {selectedLog.parsedAnnotation.totals.patient_share_eur?.toFixed(2) ?? '0.00'} €
                                                                </div>
                                                                <div className="text-xs text-slate-500">Part patient</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-2xl font-bold text-purple-400">
                                                                    {selectedLog.parsedAnnotation.totals.number_of_lines ?? '-'}
                                                                </div>
                                                                <div className="text-xs text-slate-500">Lignes</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Alerts */}
                                                {selectedLog.parsedAnnotation.alerts?.length > 0 && (
                                                    <div className="bg-red-900/20 rounded-lg border border-red-800/50 p-4">
                                                        <h3 className="text-sm font-medium text-red-400 mb-2">⚠️ Alertes ({selectedLog.parsedAnnotation.alerts.length})</h3>
                                                        <ul className="space-y-1">
                                                            {selectedLog.parsedAnnotation.alerts.map((alert: any, idx: number) => (
                                                                <li key={idx} className="text-xs text-red-300">
                                                                    [{alert.severity?.toUpperCase() || 'INFO'}] {alert.message}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Raw JSON Output */}
                                                <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                                                    <div className="p-2 border-b border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                                                        <span>🔧 JSON Schéma de sortie (contrôle qualité)</span>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedLog.parsedAnnotation, null, 2))}
                                                            className="text-cyan-400 hover:text-cyan-300"
                                                        >
                                                            Copier
                                                        </button>
                                                    </div>
                                                    <pre className="overflow-auto p-3 text-xs text-emerald-300 font-mono max-h-[400px]">
                                                        {JSON.stringify(selectedLog.parsedAnnotation, null, 2)}
                                                    </pre>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
                                                <div className="text-4xl mb-3">🔄</div>
                                                <div className="text-slate-400">Parsing non disponible</div>
                                                <div className="text-xs text-slate-600 mt-1">Cette capture n'a pas été parsée par le LLM</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'enrichment' && (
                                    <div className="space-y-4">
                                        {/* Header with trigger button */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-medium text-white">🧠 Enrichissement IA</h3>
                                                <p className="text-xs text-slate-500">Analyse pharmaceutique augmentée par intelligence artificielle</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!selectedLog?.parsedAnnotation) return;
                                                    setEnriching(true);
                                                    try {
                                                        // @ts-ignore
                                                        const result = await window.axora?.invoke('AXORA_PHIVISION_ENRICH', selectedLog.id);
                                                        if (result?.success) {
                                                            // Refresh the selected log to get enriched data
                                                            selectLog(selectedLog.id);
                                                        } else {
                                                            console.error('Enrichment failed:', result?.error);
                                                        }
                                                    } catch (err) {
                                                        console.error('Enrichment error:', err);
                                                    }
                                                    setEnriching(false);
                                                }}
                                                disabled={enriching || !selectedLog?.parsedAnnotation}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${enriching
                                                        ? 'bg-purple-500/30 text-purple-300 cursor-wait'
                                                        : selectedLog?.parsedAnnotation
                                                            ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500 shadow-lg shadow-purple-500/25'
                                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                {enriching ? '⏳ Enrichissement en cours...' : '🚀 Lancer l\'enrichissement'}
                                            </button>
                                        </div>

                                        {/* Enrichment results */}
                                        {selectedLog.enrichedData ? (
                                            <>
                                                {/* Status */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                                                        ✓ Enrichi (v{selectedLog.enrichedData.version})
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {selectedLog.enrichedData.processingTimeMs}ms • {selectedLog.enrichedData.agentsExecuted?.length || 0} agents
                                                    </span>
                                                </div>

                                                {/* DCI Resolver Results */}
                                                {selectedLog.enrichedData.dciResolver && (
                                                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                                        <h4 className="text-sm font-medium text-white mb-3">🧬 Normalisation DCI</h4>
                                                        <div className="space-y-2">
                                                            {selectedLog.enrichedData.dciResolver.products?.map((p: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-800/50 rounded">
                                                                    <span className="text-slate-400">{p.originalDesignation}</span>
                                                                    <span className="text-cyan-400 font-medium">{p.dci || '?'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Pharma Analyzer Results */}
                                                {selectedLog.enrichedData.pharmaAnalyzer && (
                                                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                                        <h4 className="text-sm font-medium text-white mb-3">⚕️ Analyse Pharmaceutique</h4>
                                                        <div className="mb-3">
                                                            <div className="text-2xl font-bold text-emerald-400">
                                                                {(selectedLog.enrichedData.pharmaAnalyzer.conformiteGlobale * 100).toFixed(0)}%
                                                            </div>
                                                            <div className="text-xs text-slate-500">Conformité globale</div>
                                                        </div>
                                                        {selectedLog.enrichedData.pharmaAnalyzer.recommandationsPatient?.length > 0 && (
                                                            <div className="mt-3 p-2 bg-cyan-900/20 rounded border border-cyan-800/50">
                                                                <div className="text-xs text-cyan-400 font-medium mb-1">💬 Conseils patient</div>
                                                                <ul className="text-xs text-slate-300 space-y-1">
                                                                    {selectedLog.enrichedData.pharmaAnalyzer.recommandationsPatient.map((r: string, idx: number) => (
                                                                        <li key={idx}>• {r}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Context Deductor Results */}
                                                {selectedLog.enrichedData.contextDeductor && (
                                                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                                        <h4 className="text-sm font-medium text-white mb-3">🔍 Déduction Clinique</h4>
                                                        <div className="space-y-2">
                                                            {selectedLog.enrichedData.contextDeductor.hypothesesCliniques?.map((h: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                                                                    <span className="text-white text-sm">{h.pathologie}</span>
                                                                    <span className={`text-xs px-2 py-0.5 rounded ${h.confidence > 0.7 ? 'bg-emerald-500/20 text-emerald-400' : h.confidence > 0.4 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600 text-slate-400'}`}>
                                                                        {(h.confidence * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Opportunity Scout Results */}
                                                {selectedLog.enrichedData.opportunityScout && (
                                                    <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-lg border border-amber-800/50 p-4">
                                                        <h4 className="text-sm font-medium text-amber-400 mb-3">💡 Opportunités Conseils</h4>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {selectedLog.enrichedData.opportunityScout.opportunites?.map((o: any, idx: number) => (
                                                                <div key={idx} className="p-2 bg-slate-900/50 rounded border border-slate-800">
                                                                    <div className="text-white text-sm font-medium">{o.produit}</div>
                                                                    <div className="text-xs text-slate-400 mt-1">{o.argumentaire}</div>
                                                                    <div className="flex justify-between mt-2">
                                                                        <span className="text-xs text-slate-600">{o.categorie}</span>
                                                                        <span className="text-xs text-emerald-400">{(o.pertinence * 100).toFixed(0)}%</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Raw JSON */}
                                                <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                                                    <div className="p-2 border-b border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                                                        <span>🔧 JSON Enrichissement complet</span>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedLog.enrichedData, null, 2))}
                                                            className="text-cyan-400 hover:text-cyan-300"
                                                        >
                                                            Copier
                                                        </button>
                                                    </div>
                                                    <pre className="overflow-auto p-3 text-xs text-purple-300 font-mono max-h-[300px]">
                                                        {JSON.stringify(selectedLog.enrichedData, null, 2)}
                                                    </pre>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
                                                <div className="text-5xl mb-4">🧠</div>
                                                <div className="text-white font-medium mb-2">Enrichissement non effectué</div>
                                                <div className="text-xs text-slate-500 mb-4">
                                                    Cliquez sur "Lancer l'enrichissement" pour analyser cette capture avec l'IA
                                                </div>
                                                {!selectedLog?.parsedAnnotation && (
                                                    <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded inline-block">
                                                        ⚠️ Parsing requis avant enrichissement
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'mistral' && (
                                    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                                        <div className="p-2 border-b border-slate-800 text-xs text-slate-500 flex justify-between">
                                            <span>🤖 Réponse brute Mistral OCR API</span>
                                            <a
                                                href={selectedLog.supabaseUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-cyan-400 hover:text-cyan-300"
                                            >
                                                Voir image Supabase ↗
                                            </a>
                                        </div>
                                        <pre className="overflow-auto p-3 text-xs text-green-300 font-mono max-h-[600px]">
                                            {JSON.stringify(selectedLog.mistralResponseRaw, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {activeTab === 'metadata' && (
                                    <div className="space-y-4">
                                        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                            <h3 className="text-sm font-medium text-white mb-3">📊 Informations</h3>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-slate-500">ID</div>
                                                    <div className="text-white font-mono text-xs">{selectedLog.id}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-500">Horodatage</div>
                                                    <div className="text-white">{new Date(selectedLog.timestamp).toLocaleString('fr-FR')}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-500">Version</div>
                                                    <div className="text-white">{selectedLog.version}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-500">URL Supabase</div>
                                                    <div className="text-cyan-400 text-xs truncate">{selectedLog.supabaseUrl}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                                            <h3 className="text-sm font-medium text-white mb-3">⏱️ Performance</h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="text-center p-3 bg-slate-800 rounded">
                                                    <div className="text-2xl font-bold text-cyan-400">{selectedLog.ocrTimeMs}ms</div>
                                                    <div className="text-xs text-slate-500">Temps OCR</div>
                                                </div>
                                                <div className="text-center p-3 bg-slate-800 rounded">
                                                    <div className="text-2xl font-bold text-emerald-400">{selectedLog.totalTimeMs}ms</div>
                                                    <div className="text-xs text-slate-500">Temps total</div>
                                                </div>
                                                <div className="text-center p-3 bg-slate-800 rounded">
                                                    <div className="text-2xl font-bold text-purple-400">{selectedLog.ocrLength}</div>
                                                    <div className="text-xs text-slate-500">Caractères</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PhiVisionLab;
