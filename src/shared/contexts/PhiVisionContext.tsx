import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
// analyzeImage pour les analyses manuelles, analyzeImageFromUrl pour le flux automatique
import { analyzeImage, analyzeImageFromUrl, OCRResult } from '@features/phivision/services/OCRService'
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
  loadAgentsFromCapture: (capture: Capture) => void
}

const PhiVisionContext = createContext<PhiVisionContextType | undefined>(undefined)

// Garde partagée au niveau module pour éviter les doublons d'appels API
// (accessible par tous les useEffect du composant)
let processingImageId: string | null = null

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

  // Au montage, verifier s'il y a un pending result du Main Process
  useEffect(() => {
    const processPendingImage = async (image: string) => {
      // Vérifier la garde partagée pour éviter les doublons
      const imageId = image.substring(0, 100)
      if (processingImageId === imageId) {
        console.log('[PhiVisionContext] Pending: Already processing this image, ignoring')
        return
      }
      processingImageId = imageId

      // Workflow complet: Upload → OCR → Save (même que onResult)
      console.log('[PhiVisionContext] Processing pending image...')

      window.axora?.phivision?.sendStatus?.('saving')
      setState((prev) => ({
        ...prev,
        capturedImage: image,
        status: 'saving',
        error: null,
      }))

      try {
        // ÉTAPE 1: Upload image vers Supabase Storage
        console.log('[PhiVisionContext] Pending: Step 1 - Uploading image...')
        const uploadResult = await CaptureService.uploadImage(image)
        const imageUrl = uploadResult.url
        console.log('[PhiVisionContext] Pending: Image uploaded:', imageUrl.substring(0, 80) + '...')

        // ÉTAPE 2: Analyser avec l'URL
        window.axora?.phivision?.sendStatus?.('analyzing')
        setState((prev) => ({ ...prev, status: 'analyzing' }))
        console.log('[PhiVisionContext] Pending: Step 2 - Analyzing...')
        const ocrResult = await analyzeImageFromUrl(imageUrl)
        console.log('[PhiVisionContext] Pending: OCR complete:', ocrResult.phiBrain?.context)

        // ÉTAPE 3: Sauvegarder le record
        window.axora?.phivision?.sendStatus?.('saving')
        setState((prev) => ({ ...prev, status: 'saving' }))
        console.log('[PhiVisionContext] Pending: Step 3 - Saving record...')

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

        const rawTextForStorage = ocrResult.phiBrain
          ? JSON.stringify(ocrResult.phiBrain)
          : ocrResult.text

        const capture = await CaptureService.createWithUrl(
          imageUrl,
          rawTextForStorage,
          entities,
          enrichment
        )
        console.log('[PhiVisionContext] Pending: Capture saved:', capture.id)

        // ÉTAPE 4: Terminé !
        window.axora?.phivision?.sendStatus?.('complete')
        setState((prev) => ({
          ...prev,
          status: 'complete',
          result: ocrResult,
          history: [capture, ...prev.history],
        }))

        // Naviguer vers PhiVision
        if (!window.location.hash.includes('/phivision')) {
          window.location.hash = '#/phivision'
        }

        // Reset la garde après un délai pour permettre de nouvelles captures
        setTimeout(() => {
          processingImageId = null
        }, 2000)
      } catch (error) {
        console.error('[PhiVisionContext] Pending: Error in capture flow:', error)
        window.axora?.phivision?.sendStatus?.('error')
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erreur lors du traitement',
        }))
        processingImageId = null // Reset en cas d'erreur
      }
    }

    const checkPendingResult = async () => {
      if (!window.axora?.phivision?.getPending) return

      console.log('[PhiVisionContext] Checking for pending result...')
      try {
        const pending = await window.axora.phivision.getPending()

        if (!pending?.image) {
          console.log('[PhiVisionContext] No pending result found')
          return
        }

        console.log('[PhiVisionContext] Found pending result!')

        // Lancer le workflow complet (upload → OCR → save)
        await processPendingImage(pending.image)
      } catch (err) {
        console.error('[PhiVisionContext] Error checking pending result:', err)
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

    // Ecouter les changements de status du Main Process
    const unsubscribeStatus = window.axora.phivision.onStatusChange((status) => {
      setState((prev) => ({ ...prev, status: status as PhiVisionStatus }))
    })

    // Ecouter le resultat de capture (image brute)
    // Workflow: 1. Upload image → 2. Get URL → 3. OCR avec URL → 4. Save record
    // Note: processingImageId est maintenant au niveau module pour être partagé
    const unsubscribeResult = window.axora.phivision.onResult(async (result: unknown) => {
      const data = result as { image?: string; error?: string }
      if (data.image) {
        // Créer un ID unique basé sur les premiers caractères de l'image
        const imageId = data.image.substring(0, 100)

        // Éviter les doublons si on traite déjà cette image
        if (processingImageId === imageId) {
          console.log('[PhiVisionContext] Already processing this image, ignoring duplicate')
          return
        }
        processingImageId = imageId

        console.log('[PhiVisionContext] Image received from Main Process')

        // Stocker l'image et passer en mode 'saving' (upload en cours)
        window.axora?.phivision?.sendStatus?.('saving')
        setState((prev) => ({
          ...prev,
          capturedImage: data.image ?? null,
          status: 'saving',
          error: null,
        }))

        let imageUrl: string | null = null

        try {
          // ÉTAPE 1: Upload image vers Supabase Storage
          console.log('[PhiVisionContext] Step 1: Uploading image to Supabase Storage...')
          const uploadResult = await CaptureService.uploadImage(data.image)
          imageUrl = uploadResult.url
          console.log('[PhiVisionContext] Image uploaded, URL:', imageUrl.substring(0, 80) + '...')

          // ÉTAPE 2: Passer en mode 'analyzing' et lancer l'OCR avec l'URL
          window.axora?.phivision?.sendStatus?.('analyzing')
          setState((prev) => ({ ...prev, status: 'analyzing' }))

          console.log('[PhiVisionContext] Step 2: Analyzing image with Mistral OCR...')
          const ocrResult = await analyzeImageFromUrl(imageUrl)
          console.log('[PhiVisionContext] OCR complete:', ocrResult.phiBrain?.context)

          // ÉTAPE 3: Sauvegarder le record avec les résultats OCR
          window.axora?.phivision?.sendStatus?.('saving')
          setState((prev) => ({ ...prev, status: 'saving' }))

          console.log('[PhiVisionContext] Step 3: Saving capture record...')
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

          const rawTextForStorage = ocrResult.phiBrain
            ? JSON.stringify(ocrResult.phiBrain)
            : ocrResult.text

          const capture = await CaptureService.createWithUrl(
            imageUrl,
            rawTextForStorage,
            entities,
            enrichment
          )

          console.log('[PhiVisionContext] Capture saved to Supabase:', capture.id)

          // ÉTAPE 4: Terminé !
          window.axora?.phivision?.sendStatus?.('complete')
          setState((prev) => ({
            ...prev,
            status: 'complete',
            result: ocrResult,
            history: [capture, ...prev.history],
          }))

          // Réinitialiser le garde après un délai pour permettre de nouvelles captures
          setTimeout(() => {
            processingImageId = null
          }, 2000)

        } catch (error) {
          console.error('[PhiVisionContext] Error in capture flow:', error)
          window.axora?.phivision?.sendStatus?.('error')
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: error instanceof Error ? error.message : 'Erreur lors du traitement',
          }))
          processingImageId = null // Réinitialiser en cas d'erreur
        }
      } else if (data.error) {
        setState((prev) => ({ ...prev, error: data.error ?? null, status: 'error' }))
      }
    })

    // Ecouter le resultat d'analyse complet du Main Process
    const unsubscribeAnalysisComplete = window.axora.phivision.onAnalysisComplete?.((data) => {
      console.log('[PhiVisionContext] Analysis complete from Main Process')
      const ocrResult = data.result as OCRResult

      setState((prev) => ({
        ...prev,
        capturedImage: data.image,
        status: 'complete',
        result: ocrResult,
        error: null,
      }))

      // Recharger l'historique si la capture a été sauvée
      if (data.captureId) {
        console.log('[PhiVisionContext] Capture saved with ID:', data.captureId)
        loadHistory()
      }

      // Naviguer vers PhiVision si pas deja la
      if (!window.location.hash.includes('/phivision')) {
        window.location.hash = '#/phivision'
      }
    })

    // Ecouter les erreurs d'analyse du Main Process
    const unsubscribeAnalysisError = window.axora.phivision.onAnalysisError?.((data) => {
      console.error('[PhiVisionContext] Analysis error from Main Process:', data.error)
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: data.error,
      }))
    })

    return () => {
      unsubscribeTrigger()
      unsubscribeStatus()
      unsubscribeResult()
      unsubscribeAnalysisComplete?.()
      unsubscribeAnalysisError?.()
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

    // Même workflow que pour les captures automatiques:
    // 1. Upload image → 2. Get URL → 3. OCR avec URL → 4. Save record
    setState((prev) => ({ ...prev, status: 'saving', error: null }))

    try {
      // Étape 1: Upload image vers Supabase Storage
      console.log('[analyzeCapture] Uploading image to Supabase Storage...')
      const uploadResult = await CaptureService.uploadImage(state.capturedImage)
      const imageUrl = uploadResult.url

      // Étape 2: Analyser avec l'URL
      setState((prev) => ({ ...prev, status: 'analyzing' }))
      console.log('[analyzeCapture] Analyzing image from URL...')
      const result = await analyzeImageFromUrl(imageUrl)

      // Étape 3: Sauvegarder le record
      setState((prev) => ({ ...prev, status: 'saving' }))
      const entities: Array<Record<string, unknown>> = []
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

      const rawTextForStorage = result.phiBrain
        ? JSON.stringify(result.phiBrain)
        : result.text

      const capture = await CaptureService.createWithUrl(
        imageUrl,
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
    } catch (error) {
      console.error('Failed to process capture:', error)
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur lors du traitement',
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

      // Sauvegarder dans Supabase si c'est une vraie capture (pas 'current')
      if (captureId !== 'current') {
        try {
          await CaptureService.saveAgentResults(captureId, {
            phiMeds: results.phiMeds as Record<string, unknown> | null,
            phiAdvices: results.phiAdvices as Record<string, unknown> | null,
            phiCrossSell: results.phiCrossSell as Record<string, unknown> | null,
            phiChips: results.phiChips as Record<string, unknown> | null,
          })
          console.log(`[PhiVisionContext] Agent results saved to Supabase for ${captureId}`)
        } catch (saveErr) {
          console.error(`[PhiVisionContext] Failed to save agent results:`, saveErr)
          // On continue quand même, les résultats sont en mémoire
        }
      }

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

  // Charger les résultats agents depuis une capture archivée (depuis Supabase)
  const loadAgentsFromCapture = useCallback((capture: Capture) => {
    // Si déjà en mémoire, ne rien faire
    if (state.agentsResultsByCapture[capture.id]) {
      console.log(`[PhiVisionContext] Agents already loaded for ${capture.id}`)
      return
    }

    // Vérifier si la capture a des résultats d'agents
    const hasAgentData = capture.agentPhiMeds || capture.agentPhiAdvices ||
                         capture.agentPhiCrossSell || capture.agentPhiChips

    if (!hasAgentData) {
      console.log(`[PhiVisionContext] No agent data in capture ${capture.id}`)
      return
    }

    console.log(`[PhiVisionContext] Loading agent results from capture ${capture.id}`)

    // Transformer les données Supabase en AgentsResults
    const agentsResults: AgentsResults = {
      phiMeds: capture.agentPhiMeds as AgentsResults['phiMeds'],
      phiAdvices: capture.agentPhiAdvices as AgentsResults['phiAdvices'],
      phiCrossSell: capture.agentPhiCrossSell as AgentsResults['phiCrossSell'],
      phiChips: capture.agentPhiChips as AgentsResults['phiChips'],
    }

    setState((prev) => ({
      ...prev,
      agentsResultsByCapture: {
        ...prev.agentsResultsByCapture,
        [capture.id]: agentsResults,
      },
    }))

    console.log(`[PhiVisionContext] Agent results loaded for ${capture.id}`)
  }, [state.agentsResultsByCapture])

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
        loadAgentsFromCapture,
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
