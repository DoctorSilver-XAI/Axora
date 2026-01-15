import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { analyzeImage, OCRResult } from '@features/phivision/services/OCRService'
import { CaptureService, Capture } from '@features/phivision/services/CaptureService'
import { AgentsService, initializeAgentsService } from '@features/phivision/services/AgentsService'
import type { AgentsResults } from '@features/phivision/types/agents'

type PhiVisionStatus = 'idle' | 'capturing' | 'analyzing' | 'saving' | 'complete' | 'error'

interface PhiVisionState {
  status: PhiVisionStatus
  capturedImage: string | null
  result: OCRResult | null
  error: string | null
  history: Capture[]
  isLoadingHistory: boolean
  // Agents - stockés par ID de capture ('current' pour le résultat non sauvegardé)
  agentsResultsByCapture: Record<string, AgentsResults>
  runningAgentsCaptureId: string | null // ID de la capture en cours d'analyse
}

interface PhiVisionContextType extends PhiVisionState {
  triggerCapture: () => Promise<void>
  analyzeCapture: () => Promise<void>
  clearCapture: () => void
  setManualImage: (base64: string) => void
  loadHistory: () => Promise<void>
  deleteCapture: (id: string) => Promise<void>
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>
  runAgents: (captureId: string, phiBrainData: Record<string, unknown>) => Promise<void>
  getAgentsResults: (captureId: string) => AgentsResults | null
  isRunningAgents: (captureId: string) => boolean
}

const PhiVisionContext = createContext<PhiVisionContextType | undefined>(undefined)

export function PhiVisionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PhiVisionState>({
    status: 'idle',
    capturedImage: null,
    result: null,
    error: null,
    history: [],
    isLoadingHistory: true,
    agentsResultsByCapture: {},
    runningAgentsCaptureId: null,
  })

  // Initialize AgentsService on mount
  useEffect(() => {
    initializeAgentsService()
  }, [])

  // Load history from Supabase on mount
  useEffect(() => {
    loadHistory()
  }, [])

  // Au montage, verifier s'il y a un pending result de l'Island
  useEffect(() => {
    const checkPendingResult = async () => {
      if (!window.axora?.phivision?.getPending) return

      console.log('[PhiVisionContext] Checking for pending result...')
      try {
        const pending = await window.axora.phivision.getPending()
        if (pending?.image) {
          console.log('[PhiVisionContext] Found pending result! Starting analysis...')

          // Stocker l'image et passer en mode analyse
          setState((prev) => ({
            ...prev,
            capturedImage: pending.image,
            status: 'analyzing',
            error: null,
          }))

          // Lancer l'analyse
          const ocrResult = await analyzeImage(pending.image)
          console.log('[PhiVisionContext] Analysis complete:', ocrResult.analysis?.type)

          setState((prev) => ({ ...prev, status: 'saving' }))

          // Sauvegarder dans Supabase avec le résultat PhiBRAIN complet
          const entities: Array<Record<string, unknown>> = []
          if (ocrResult.analysis?.medications) {
            ocrResult.analysis.medications.forEach((med, index) => {
              entities.push({
                type: 'medication',
                name: med,
                dosage: ocrResult.analysis?.dosages?.[index] || null,
                instruction: ocrResult.analysis?.instructions?.[index] || null,
              })
            })
          }

          const enrichment: Record<string, unknown> = {
            documentType: ocrResult.analysis?.type || 'unknown',
            summary: ocrResult.analysis?.summary || null,
            confidence: ocrResult.confidence,
          }

          // Stocker le JSON PhiBRAIN complet dans raw_text pour PhiVisionLab
          const rawTextForStorage = ocrResult.phiBrain
            ? JSON.stringify(ocrResult.phiBrain)
            : ocrResult.text

          const capture = await CaptureService.create(
            pending.image,
            rawTextForStorage,
            entities,
            enrichment
          )

          setState((prev) => ({
            ...prev,
            status: 'complete',
            result: ocrResult,
            history: [capture, ...prev.history],
          }))

          console.log('[PhiVisionContext] Capture saved to Supabase!')

          // Naviguer vers PhiVision
          if (!window.location.hash.includes('/phivision')) {
            window.location.hash = '#/phivision'
          }
        } else {
          console.log('[PhiVisionContext] No pending result found')
        }
      } catch (err) {
        console.error('[PhiVisionContext] Error processing pending result:', err)
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Erreur lors du traitement',
        }))
      }
    }

    // Petit delai pour s'assurer que le composant est bien monte
    const timer = setTimeout(checkPendingResult, 100)
    return () => clearTimeout(timer)
  }, [])

  // Ecouter les evenements IPC
  useEffect(() => {
    if (!window.axora) return

    // Ecouter le message TRIGGER du raccourci clavier global
    const unsubscribeTrigger = window.axora.phivision.onTrigger(() => {
      // Declencher la capture via l'API
      window.axora.phivision.trigger()
    })

    const unsubscribeStatus = window.axora.phivision.onStatusChange((status) => {
      setState((prev) => ({ ...prev, status: status as PhiVisionStatus }))
    })

    // Ecouter le resultat de capture (image brute) et lancer l'analyse automatiquement
    const unsubscribeResult = window.axora.phivision.onResult(async (result: unknown) => {
      const data = result as { image?: string; error?: string }
      if (data.image) {
        console.log('[PhiVisionContext] Image received, starting automatic analysis...')

        // Stocker l'image et passer en mode analyse
        setState((prev) => ({
          ...prev,
          capturedImage: data.image ?? null,
          status: 'analyzing',
          error: null,
        }))

        // Lancer l'analyse automatiquement (comme le bouton du Hub)
        try {
          const ocrResult = await analyzeImage(data.image)
          console.log('[PhiVisionContext] Analysis complete:', ocrResult.analysis?.type)

          setState((prev) => ({ ...prev, status: 'saving' }))

          // Sauvegarder dans Supabase avec le résultat PhiBRAIN complet
          const entities: Array<Record<string, unknown>> = []
          if (ocrResult.analysis?.medications) {
            ocrResult.analysis.medications.forEach((med, index) => {
              entities.push({
                type: 'medication',
                name: med,
                dosage: ocrResult.analysis?.dosages?.[index] || null,
                instruction: ocrResult.analysis?.instructions?.[index] || null,
              })
            })
          }

          const enrichment: Record<string, unknown> = {
            documentType: ocrResult.analysis?.type || 'unknown',
            summary: ocrResult.analysis?.summary || null,
            confidence: ocrResult.confidence,
          }

          // Stocker le JSON PhiBRAIN complet dans raw_text pour PhiVisionLab
          const rawTextForStorage = ocrResult.phiBrain
            ? JSON.stringify(ocrResult.phiBrain)
            : ocrResult.text

          const capture = await CaptureService.create(
            data.image,
            rawTextForStorage,
            entities,
            enrichment
          )

          setState((prev) => ({
            ...prev,
            status: 'complete',
            result: ocrResult,
            history: [capture, ...prev.history],
          }))

          console.log('[PhiVisionContext] Capture saved to Supabase')

          // Naviguer vers PhiVision si pas deja la
          if (!window.location.hash.includes('/phivision')) {
            window.location.hash = '#/phivision'
          }
        } catch (err) {
          console.error('[PhiVisionContext] Analysis or save failed:', err)
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : 'Analyse echouee',
          }))
        }
      } else if (data.error) {
        setState((prev) => ({ ...prev, error: data.error ?? null, status: 'error' }))
      }
    })

    return () => {
      unsubscribeTrigger()
      unsubscribeStatus()
      unsubscribeResult()
    }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoadingHistory: true }))
      const captures = await CaptureService.getAll()
      setState((prev) => ({ ...prev, history: captures, isLoadingHistory: false }))
    } catch (err) {
      console.error('Failed to load capture history:', err)
      setState((prev) => ({ ...prev, isLoadingHistory: false }))
    }
  }, [])

  const triggerCapture = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'capturing', error: null }))

    try {
      if (window.axora) {
        await window.axora.phivision.trigger()
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Capture failed',
      }))
    }
  }, [])

  const analyzeCapture = useCallback(async () => {
    if (!state.capturedImage) {
      setState((prev) => ({ ...prev, error: 'No image to analyze' }))
      return
    }

    setState((prev) => ({ ...prev, status: 'analyzing', error: null }))

    try {
      const result = await analyzeImage(state.capturedImage)

      setState((prev) => ({ ...prev, status: 'saving' }))

      // Save to Supabase avec le résultat PhiBRAIN complet
      try {
        // Transform analysis into entities and enrichment for Supabase
        const entities: Array<Record<string, unknown>> = []

        // Add medications as entities
        if (result.analysis?.medications) {
          result.analysis.medications.forEach((med, index) => {
            entities.push({
              type: 'medication',
              name: med,
              dosage: result.analysis?.dosages?.[index] || null,
              instruction: result.analysis?.instructions?.[index] || null,
            })
          })
        }

        const enrichment: Record<string, unknown> = {
          documentType: result.analysis?.type || 'unknown',
          summary: result.analysis?.summary || null,
          confidence: result.confidence,
        }

        // Stocker le JSON PhiBRAIN complet dans raw_text pour PhiVisionLab
        const rawTextForStorage = result.phiBrain
          ? JSON.stringify(result.phiBrain)
          : result.text

        const capture = await CaptureService.create(
          state.capturedImage,
          rawTextForStorage,
          entities,
          enrichment
        )

        setState((prev) => ({
          ...prev,
          status: 'complete',
          result,
          history: [capture, ...prev.history],
        }))
      } catch (saveError) {
        console.error('Failed to save capture to Supabase:', saveError)
        // Still show the result even if save failed
        setState((prev) => ({
          ...prev,
          status: 'complete',
          result,
          error: 'Analyse réussie mais sauvegarde échouée',
        }))
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Analysis failed',
      }))
    }
  }, [state.capturedImage])

  const clearCapture = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'idle',
      capturedImage: null,
      result: null,
      error: null,
    }))
  }, [])

  const setManualImage = useCallback((base64: string) => {
    setState((prev) => ({
      ...prev,
      capturedImage: base64,
      status: 'idle',
      result: null,
      error: null,
    }))
  }, [])

  const deleteCapture = useCallback(async (id: string) => {
    try {
      await CaptureService.delete(id)
      setState((prev) => ({
        ...prev,
        history: prev.history.filter((c) => c.id !== id),
      }))
    } catch (err) {
      console.error('Failed to delete capture:', err)
    }
  }, [])

  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    try {
      await CaptureService.toggleFavorite(id, isFavorite)
      setState((prev) => ({
        ...prev,
        history: prev.history.map((c) =>
          c.id === id ? { ...c, isFavorite } : c
        ),
      }))
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }, [])

  const runAgents = useCallback(async (captureId: string, phiBrainData: Record<string, unknown>) => {
    if (!phiBrainData) {
      console.warn('[PhiVisionContext] No PhiBrain data provided for agents')
      return
    }

    console.log(`[PhiVisionContext] Starting agents for capture ${captureId}...`)
    setState((prev) => ({ ...prev, runningAgentsCaptureId: captureId }))

    try {
      const results = await AgentsService.runAllAgents(phiBrainData)
      console.log(`[PhiVisionContext] Agents completed for ${captureId}:`, {
        phiMeds: results.phiMeds?.status,
        phiAdvices: results.phiAdvices?.status,
        phiCrossSell: results.phiCrossSell?.status,
        phiChips: results.phiChips?.status,
      })

      setState((prev) => ({
        ...prev,
        runningAgentsCaptureId: null,
        agentsResultsByCapture: {
          ...prev.agentsResultsByCapture,
          [captureId]: results,
        },
      }))
    } catch (err) {
      console.error(`[PhiVisionContext] Agents failed for ${captureId}:`, err)
      setState((prev) => ({
        ...prev,
        runningAgentsCaptureId: null,
        error: err instanceof Error ? err.message : 'Erreur des agents',
      }))
    }
  }, [])

  // Helper pour récupérer les résultats agents d'une capture spécifique
  const getAgentsResults = useCallback((captureId: string): AgentsResults | null => {
    return state.agentsResultsByCapture[captureId] || null
  }, [state.agentsResultsByCapture])

  // Helper pour vérifier si les agents sont en cours pour une capture
  const isRunningAgents = useCallback((captureId: string): boolean => {
    return state.runningAgentsCaptureId === captureId
  }, [state.runningAgentsCaptureId])

  return (
    <PhiVisionContext.Provider
      value={{
        ...state,
        triggerCapture,
        analyzeCapture,
        clearCapture,
        setManualImage,
        loadHistory,
        deleteCapture,
        toggleFavorite,
        runAgents,
        getAgentsResults,
        isRunningAgents,
      }}
    >
      {children}
    </PhiVisionContext.Provider>
  )
}

export function usePhiVision() {
  const context = useContext(PhiVisionContext)
  if (context === undefined) {
    throw new Error('usePhiVision must be used within a PhiVisionProvider')
  }
  return context
}
