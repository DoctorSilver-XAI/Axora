import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Scan, Zap } from 'lucide-react'
import { AxoraLogo } from './components/AxoraLogo'
import { StatusDot } from './components/StatusDot'

type PhiVisionStatus = 'idle' | 'capturing' | 'analyzing'

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 }

export function Island() {
  const [isHovered, setIsHovered] = useState(false)
  const [phiVisionStatus, setPhiVisionStatus] = useState<PhiVisionStatus>('idle')

  useEffect(() => {
    if (!window.axora) {
      console.warn('[Island] Electron API not available')
      return
    }

    const unsubscribe = window.axora.phivision.onStatusChange((status) => {
      setPhiVisionStatus(status as PhiVisionStatus)
    })
    return unsubscribe
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
    if (phiVisionStatus === 'idle') {
      window.axora.phivision.trigger()
    } else {
      window.axora.phivision.close()
    }
  }, [phiVisionStatus])

  const isActive = phiVisionStatus !== 'idle'
  const isAnalyzing = phiVisionStatus === 'analyzing'

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
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          cursor: 'default',
        }}
        initial={false}
        animate={{
          width: isHovered ? 280 : 120,
          height: isHovered ? 130 : 36,
          borderRadius: isHovered ? 28 : 18,
        }}
      >
        <AnimatePresence mode="wait">
          {/* COMPACT STATE */}
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
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAnalyzing
                      ? 'bg-indigo-400 animate-pulse'
                      : isActive
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                />
              </div>
            </motion.div>
          )}

          {/* EXPANDED STATE */}
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
                <span>
                  Axora <span className="text-indigo-400">Pro</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <StatusDot
                    status={isAnalyzing ? 'busy' : isActive ? 'busy' : 'online'}
                    pulse={isAnalyzing}
                  />
                  <span>{isAnalyzing ? 'Analyse...' : isActive ? 'Actif' : 'Prêt'}</span>
                </div>
              </div>

              {/* Actions Grid */}
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
                    scale: 1.02,
                    backgroundColor: isActive
                      ? 'rgba(99, 102, 241, 0.3)'
                      : 'rgba(99, 102, 241, 0.2)',
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePhiVision}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-colors p-2 ${
                    isActive
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-white/5 border-white/5 text-white/80 hover:text-white'
                  }`}
                >
                  {isActive ? (
                    <Zap size={20} className="fill-indigo-400/50" />
                  ) : (
                    <Scan size={20} />
                  )}
                  <span className="text-xs font-medium">{isActive ? 'Stop' : 'Vision'}</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
