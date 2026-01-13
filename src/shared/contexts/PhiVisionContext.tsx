import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { analyzeImage, OCRResult } from '@features/phivision/services/OCRService'
import { CaptureService, Capture } from '@features/phivision/services/CaptureService'

type PhiVisionStatus = 'idle' | 'capturing' | 'analyzing' | 'saving' | 'complete' | 'error'

interface PhiVisionState {
  status: PhiVisionStatus
  capturedImage: string | null
  result: OCRResult | null
  error: string | null
  history: Capture[]
  isLoadingHistory: boolean
}

interface PhiVisionContextType extends PhiVisionState {
  triggerCapture: () => Promise<void>
  analyzeCapture: () => Promise<void>
  clearCapture: () => void
  setManualImage: (base64: string) => void
  loadHistory: () => Promise<void>
  deleteCapture: (id: string) => Promise<void>
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>
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
  })

  // Load history from Supabase on mount
  useEffect(() => {
    loadHistory()
  }, [])

  // Écouter les événements IPC
  useEffect(() => {
    if (!window.axora) return

    const unsubscribeStatus = window.axora.phivision.onStatusChange((status) => {
      setState((prev) => ({ ...prev, status: status as PhiVisionStatus }))
    })

    const unsubscribeResult = window.axora.phivision.onResult((result: unknown) => {
      const data = result as { image?: string; error?: string }
      if (data.image) {
        setState((prev) => ({ ...prev, capturedImage: data.image ?? null }))
      } else if (data.error) {
        setState((prev) => ({ ...prev, error: data.error ?? null, status: 'error' }))
      }
    })

    return () => {
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

      // Save to Supabase
      try {
        const capture = await CaptureService.create(
          state.capturedImage,
          result.text,
          result.entities as Array<Record<string, unknown>>,
          result.enrichment as Record<string, unknown>
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
