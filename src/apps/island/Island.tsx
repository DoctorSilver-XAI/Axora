import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Scan, Sparkles, Camera, AlertCircle, ArrowRight } from 'lucide-react'
import { AxoraLogo } from './components/AxoraLogo'
import {
  PhiVisionStatusDot,
  PhiVisionStatus,
  PHIVISION_COLORS,
} from './components/PhiVisionStatusDot'

interface PhiVisionState {
  status: PhiVisionStatus
  capturedImage: string | null
  error: string | null
}

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 }

export function Island() {
  const [isHovered, setIsHovered] = useState(false)
  const [phiVisionState, setPhiVisionState] = useState<PhiVisionState>({
    status: 'idle',
    capturedImage: null,
    error: null,
  })
  const [showCaptureEffect, setShowCaptureEffect] = useState(false)

  useEffect(() => {
    if (!window.axora) {
      console.warn('[Island] Electron API not available')
      return
    }

    // Ecouter le raccourci clavier global et declencher la capture
    const unsubscribeTrigger = window.axora.phivision.onTrigger(() => {
      console.log('[Island] Received trigger from global shortcut')
      window.axora.phivision.trigger()
    })

    // Ecouter TOUS les changements de statut (broadcastés par le Main Process)
    const unsubscribeStatus = window.axora.phivision.onStatusChange((status) => {
      console.log('[Island] Status changed:', status)
      setPhiVisionState((prev) => ({ ...prev, status: status as PhiVisionStatus }))
      if (status === 'capturing') {
        setShowCaptureEffect(true)
      } else {
        setShowCaptureEffect(false)
      }
    })

    // Ecouter le resultat de capture (pour stocker l'image)
    const unsubscribeResult = window.axora.phivision.onResult((result: unknown) => {
      console.log('[Island] === onResult callback triggered ===')
      const data = result as { image?: string; error?: string }
      console.log('[Island] Data received:', data.image ? `image (${data.image.length} chars)` : 'no image')

      if (data.image) {
        // Stocker l'image localement pour l'affichage Island
        setPhiVisionState((prev) => ({
          ...prev,
          capturedImage: data.image ?? null,
          error: null,
        }))

        // IMPORTANT: Ouvrir automatiquement le Hub pour déclencher le workflow
        // (upload → OCR → save) qui s'exécute dans PhiVisionContext
        console.log('[Island] Opening Hub to trigger PhiVision workflow...')
        window.axora.window.openHub()
      } else if (data.error) {
        setPhiVisionState((prev) => ({
          ...prev,
          status: 'error',
          error: data.error ?? null,
        }))
      }
    })

    return () => {
      unsubscribeTrigger()
      unsubscribeStatus()
      unsubscribeResult()
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    window.axora?.window.setIgnoreMouse(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    window.axora?.window.setIgnoreMouse(true)
  }, [])

  const handleOpenHub = useCallback(() => {
    window.axora?.window.toggleHub()
  }, [])

  const handlePhiVision = useCallback(() => {
    if (!window.axora) return

    const { status } = phiVisionState

    if (status === 'idle' || status === 'complete' || status === 'error') {
      // Reset et nouvelle capture
      setPhiVisionState({
        status: 'idle',
        capturedImage: null,
        error: null,
      })
      window.axora.phivision.trigger()
    }
    // Ne pas permettre l'annulation pendant capturing/analyzing
  }, [phiVisionState])

  const handleResultBadgeClick = useCallback(() => {
    // Ouvrir le Hub - le PhiVisionContext recevra l'image et lancera l'analyse
    window.axora?.window.openHub()

    // Reset apres un delai
    setTimeout(() => {
      setPhiVisionState({
        status: 'idle',
        capturedImage: null,
        error: null,
      })
    }, 500)
  }, [])

  const { status } = phiVisionState
  const isProcessing = status === 'capturing' || status === 'analyzing'
  const hasResult = status === 'complete' && phiVisionState.capturedImage

  // Labels de statut
  const statusLabels: Record<PhiVisionStatus, string> = {
    idle: 'Pret',
    capturing: 'Capture...',
    analyzing: '', // Empty for animation
    saving: 'Sauvegarde...',
    complete: 'Termine',
    error: 'Erreur',
  }

  // Animation values based on state
  const getWidth = () => {
    if (status === 'complete') return 340
    if (status === 'analyzing') return 200 // Custom width for processing animation
    if (isHovered) return 280
    return 120
  }

  const getHeight = () => {
    if (status === 'complete') return 36
    if (isHovered) return hasResult ? 150 : 130
    return 36
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '8px',
        background: 'transparent',
      }}
    >
      <motion.div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        layout
        transition={springTransition}
        style={{
          background: 'rgba(5, 5, 8, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: status === 'analyzing' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          cursor: 'default',
          position: 'relative', // Ensure we can position absolute children
        }}
        initial={false}
        animate={{
          width: getWidth(),
          height: getHeight(),
          borderRadius: isHovered ? 28 : (status === 'complete' ? 18 : 18),
        }}
      >
        {/* Snake Border Animation for Analyzing State */}
        <AnimatePresence>
          {status === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: -20, // Make it larger to ensure rotation covers corners
                  background: 'conic-gradient(from 0deg, transparent 80%, #6366f1 100%)', // Indigo tail
                  animation: 'spin 2s linear infinite',
                }}
              />
              {/* Inner mask to create the border effect */}
              <div
                style={{
                  position: 'absolute',
                  inset: 1.5, // Thickness of the border
                  background: 'rgba(5, 5, 8, 0.95)', // Match island bg
                  borderRadius: 'inherit',
                }}
              />
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* COMPACT STATE (IDLE / PROCESSING) */}
          {!isHovered && status !== 'complete' && (
            <motion.div
              key="compact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between px-3 h-full w-full relative z-10"
            >
              {/* STATUS ANALYZING: Custom Animation (No text/logo, just pure process) */}
              {status === 'analyzing' ? (
                <div className="flex-1 flex items-center justify-center gap-3 w-full h-full">
                  {/* Abstract "Processing" Bars */}
                  <div className="flex items-center gap-1 h-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-indigo-400 rounded-full"
                        initial={{ height: 4, opacity: 0.3 }}
                        animate={{
                          height: [4, 16, 4],
                          opacity: [0.3, 1, 0.3],
                          backgroundColor: ['#818cf8', '#a5b4fc', '#818cf8']
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.1
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* Standard Compact View */
                <>
                  {/* Left: Mini Logo */}
                  <div className="flex items-center gap-2">
                    <AxoraLogo size={20} />
                  </div>

                  {/* Right: PhiVision Status Dot */}
                  <div className="flex items-center gap-2">
                    <PhiVisionStatusDot status={status} showRipple={false} />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* COMPACT COMPLETED STATE (NEW) */}
          {status === 'complete' && (
            <motion.button
              key="compact-complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResultBadgeClick} // Redirect on click
              className="flex items-center gap-3 px-3 h-full w-full relative z-10 cursor-pointer hover:bg-white/5 transition-colors"
            >
              {/* Left: Standard Logo */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <AxoraLogo size={20} />
              </div>

              {/* Divider */}
              <div className="h-3 w-[1px] bg-white/10" />

              {/* Content: Result Text */}
              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={12} className="text-white/60 flex-shrink-0" />
                  <span className="text-xs font-medium text-white/90 tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                    Analyse terminée
                  </span>
                </div>

                {/* Action Hint */}
                <motion.div
                  className="flex-shrink-0 ml-2"
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="p-1 rounded-full bg-white/10">
                    <ArrowRight size={10} className="text-white/60" />
                  </div>
                </motion.div>
              </div>
            </motion.button>
          )}

          {/* EXPANDED STATE */}
          {isHovered && status !== 'complete' && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.05 }}
              className="flex flex-col p-4 w-full h-full relative z-10"
            >
              {/* Header: Title + Status */}
              <div className="flex items-center justify-between text-white/40 text-[10px] uppercase font-bold tracking-wider mb-4">
                <span>
                  Axora <span className="text-indigo-400">Pro</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <PhiVisionStatusDot
                    status={status}
                    showRipple={false}
                    size="md"
                  />
                  <span
                    style={{
                      color:
                        status === 'error'
                          ? PHIVISION_COLORS.error.bg
                          : undefined,
                    }}
                  >
                    {statusLabels[status]}
                  </span>
                </div>
              </div>

              {/* Actions Grid ou Badge de resultat */}
              {!hasResult ? (
                <div className="grid grid-cols-2 gap-3 flex-1">
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
                    whileHover={{
                      scale: isProcessing ? 1 : 1.02,
                      backgroundColor: isProcessing
                        ? undefined
                        : status === 'error'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(99, 102, 241, 0.2)',
                    }}
                    whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                    onClick={handlePhiVision}
                    disabled={isProcessing}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-colors p-2 ${status === 'analyzing'
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                      : status === 'capturing'
                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                        : status === 'error'
                          ? 'bg-red-500/20 border-red-500/30 text-red-300 cursor-pointer'
                          : 'bg-white/5 border-white/5 text-white/80 hover:text-white'
                      }`}
                  >
                    {status === 'analyzing' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles size={20} className="text-indigo-400" />
                      </motion.div>
                    ) : status === 'capturing' ? (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <Camera size={20} className="text-amber-400" />
                      </motion.div>
                    ) : status === 'error' ? (
                      <AlertCircle size={20} className="text-red-400" />
                    ) : (
                      <Scan size={20} />
                    )}
                    <span className="text-xs font-medium">
                      {status === 'analyzing'
                        ? 'Analyse...'
                        : status === 'capturing'
                          ? 'Capture...'
                          : status === 'error'
                            ? 'Reessayer'
                            : 'Vision'}
                    </span>
                  </motion.button>
                </div>
              ) : (
                /* Result Available - Show Badge */
                <div className="flex-1 flex items-end">
                  <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={handleResultBadgeClick}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                               bg-gradient-to-r from-cyan-500/20 to-indigo-500/20
                               border border-cyan-400/30
                               text-cyan-300 text-sm font-medium
                               hover:from-cyan-500/30 hover:to-indigo-500/30
                               hover:border-cyan-400/50
                               transition-all cursor-pointer"
                    style={{
                      boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Resultat disponible
                  </motion.button>
                </div>
              )}

              {/* Error message */}
              {status === 'error' && phiVisionState.error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-red-400 text-xs text-center truncate px-2"
                >
                  {phiVisionState.error}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Effet de capture glassmorphism */}
      <AnimatePresence>
        {showCaptureEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            {/* Overlay subtil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(1px)',
              }}
            />

            {/* Shimmer sweep effect */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.15) 45%, rgba(255, 255, 255, 0.2) 50%, rgba(245, 158, 11, 0.15) 55%, transparent 100%)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />

            {/* Border glow */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 6,
                borderRadius: 16,
                border: '2px solid rgba(245, 158, 11, 0.4)',
                boxShadow:
                  'inset 0 0 60px rgba(245, 158, 11, 0.1), 0 0 30px rgba(245, 158, 11, 0.2)',
              }}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: [0, 1, 0], scale: 1 }}
              transition={{ duration: 0.4 }}
            />

            {/* Corner accents */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner, i) => (
              <motion.div
                key={corner}
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  ...(corner.includes('top') ? { top: 12 } : { bottom: 12 }),
                  ...(corner.includes('left') ? { left: 12 } : { right: 12 }),
                  borderStyle: 'solid',
                  borderWidth: 2,
                  borderColor: 'rgba(245, 158, 11, 0.6)',
                  borderRadius: 4,
                  ...(corner === 'top-left' && {
                    borderRight: 'none',
                    borderBottom: 'none',
                  }),
                  ...(corner === 'top-right' && {
                    borderLeft: 'none',
                    borderBottom: 'none',
                  }),
                  ...(corner === 'bottom-left' && {
                    borderRight: 'none',
                    borderTop: 'none',
                  }),
                  ...(corner === 'bottom-right' && {
                    borderLeft: 'none',
                    borderTop: 'none',
                  }),
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 1, 0], scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animation de succes (ripple global) */}
      {/* Animation de succes (ripple global) - SUPPRIMÉ */}
    </div>
  )
}
