import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { archiveCapture, PhiVisionCaptureData } from './PhiVisionArchiveService';

// Types
export interface PhiVisionAdvice {
    oral_sentence: string;
    written_points: string[];
}

export interface PhiVisionMed {
    dci: string;
    recommendation: string;
}

export interface PhiVisionCrossSell {
    name: string;
    reason: string;
}

interface ArchiveMetadata {
    ocrTextRaw: string;
    ocrTextLength: number;
    systemPromptUsed: string;
    userPromptUsed: string;
    modelUsed: string;
    ocrModelUsed: string;
    apiResponseRaw: object;
    processingTimeMs: number;
    ocrTimeMs: number;
    analysisTimeMs: number;
    capturedAt: string;
}

export interface PhiVisionResult {
    analysis_context?: string;
    advices?: PhiVisionAdvice;
    meds?: PhiVisionMed[];
    cross_selling?: PhiVisionCrossSell[];
    chips?: string[];
    is_minor?: boolean;
    detected_items?: string[];
    insights?: any[];
    capturedImage?: string;
    error?: string;
    isMock?: boolean;
    _archiveMetadata?: ArchiveMetadata;
}

interface PhiVisionContextType {
    isActive: boolean;
    isAnalyzing: boolean;
    result: PhiVisionResult | null;
    togglePhiVision: () => void;
    triggerAnalysis: (scenarioOverride?: string) => Promise<void>;
    runV2TestImage: (file: File) => Promise<void>;
    closePhiVision: () => void;
}

const PhiVisionContext = createContext<PhiVisionContextType | undefined>(undefined);

export const PhiVisionProvider = ({ children }: { children: ReactNode }) => {
    const [isActive, setIsActive] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<PhiVisionResult | null>(null);

    const togglePhiVision = () => {
        const newActive = !isActive;
        setIsActive(newActive);

        if (newActive) {
            window.axora?.setMode('phivision');
        } else {
            window.axora?.setMode('compact');
            setResult(null);
        }
    };

    const runAnalysis = async (scenarioOverride?: string) => {
        console.log('Starting PhiVision Analysis...');

        try {
            // @ts-ignore
            const response = await window.axora.runPhiVisionCapture('v2', scenarioOverride);

            if (response && response.success) {
                const data = response.data;
                console.log('[PhiVision] Received Data:', data);

                setResult({
                    ...data,
                    analysis_context: data.context || "PhiVision Analysis",
                    chips: data.insights?.map((i: any) => i.title) || ["Ready"],
                    isMock: data.isMock
                });

                // Archive to Supabase (non-blocking)
                if (data._archiveMetadata && data.capturedImage && !data.isMock) {
                    const archiveData: PhiVisionCaptureData = {
                        capturedAt: new Date(data._archiveMetadata.capturedAt),
                        screenshotBase64: data.capturedImage,
                        ocrTextRaw: data._archiveMetadata.ocrTextRaw,
                        ocrTextLength: data._archiveMetadata.ocrTextLength || 0,
                        systemPromptUsed: data._archiveMetadata.systemPromptUsed,
                        userPromptUsed: data._archiveMetadata.userPromptUsed || '',
                        modelUsed: data._archiveMetadata.modelUsed,
                        ocrModelUsed: data._archiveMetadata.ocrModelUsed || 'mistral-ocr-latest',
                        apiResponseRaw: data._archiveMetadata.apiResponseRaw || {},
                        analysisResult: {
                            analysis_context: data.analysis_context,
                            advices: data.advices,
                            meds: data.meds,
                            cross_selling: data.cross_selling,
                            chips: data.chips,
                            is_minor: data.is_minor
                        },
                        processingTimeMs: data._archiveMetadata.processingTimeMs,
                        ocrTimeMs: data._archiveMetadata.ocrTimeMs || 0,
                        analysisTimeMs: data._archiveMetadata.analysisTimeMs || 0,
                        deviceOs: navigator.platform || 'unknown',
                        deviceResolution: `${window.screen.width}x${window.screen.height}`,
                        appVersion: '3.0.0'
                    };

                    archiveCapture(archiveData)
                        .then(archiveResult => {
                            if (archiveResult.success) {
                                console.log(`[PhiVision] ✅ Archived: ${archiveResult.captureId}`);
                            } else {
                                console.warn(`[PhiVision] ⚠️ Archive failed: ${archiveResult.error}`);
                            }
                        })
                        .catch(err => {
                            console.error('[PhiVision] Archive error:', err);
                        });
                }
            } else {
                setResult({ error: 'Echec de l\'analyse.' });
            }
        } catch (err) {
            console.error('PhiVision Error:', err);
            setResult({ error: 'Erreur technique.' });
        }
    };

    const runV2TestImage = async (file: File) => {
        // @ts-ignore - 'path' property exists on File object in Electron environment
        const filePath = file.path;
        if (!filePath) {
            console.error("No file path found");
            return;
        }

        setIsAnalyzing(true);
        setResult(null);

        try {
            // @ts-ignore
            const response = await window.axora.runPhiVisionTestImage(filePath);

            if (response && response.success) {
                const data = response.data;
                console.log('[PhiVision] Test Image Data:', data);

                setResult({
                    ...data,
                    analysis_context: data.context || "Simulateur PhiVision",
                    chips: data.insights?.map((i: any) => i.title) || ["Simulation"],
                    isMock: data.isMock
                });
            } else {
                setResult({ error: 'Echec de la simulation.' });
            }
        } catch (err) {
            console.error('PhiVision Simulation Error:', err);
            setResult({ error: 'Erreur technique Simulation.' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const triggerAnalysis = useCallback(async (scenarioOverride?: string) => {
        setIsActive(true);
        window.axora?.setMode('phivision');

        setIsAnalyzing(true);
        setResult(null);

        try {
            await runAnalysis(scenarioOverride);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    // Listen for Global Shortcuts (Main -> Renderer)
    React.useEffect(() => {
        if (!window.axora?.onTriggerPhiVision) return;

        const cleanup = window.axora.onTriggerPhiVision(() => {
            console.log('PhiVision: Global Shortcut received - Triggering Analysis');
            triggerAnalysis();
        });

        return () => {
            if (cleanup) cleanup();
        };
    }, [triggerAnalysis]);

    const closePhiVision = () => {
        console.log('Closing PhiVision -> Forcing Compact Mode');
        setIsActive(false);
        setIsAnalyzing(false);
        setResult(null);
        window.axora?.setMode('compact');
    };

    return (
        <PhiVisionContext.Provider value={{
            isActive,
            isAnalyzing,
            result,
            togglePhiVision,
            triggerAnalysis,
            runV2TestImage,
            closePhiVision
        }}>
            {children}
        </PhiVisionContext.Provider>
    );
};

export const usePhiVision = () => {
    const context = useContext(PhiVisionContext);
    if (!context) {
        throw new Error('usePhiVision must be used within a PhiVisionProvider');
    }
    return context;
};
