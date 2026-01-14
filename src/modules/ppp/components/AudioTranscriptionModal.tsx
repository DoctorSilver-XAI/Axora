import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Mic,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  FileAudio,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { QRCodeSVG } from 'qrcode.react'
import {
  AudioTranscriptionService,
  CreateSessionResult,
} from '../services/AudioTranscriptionService'

interface AudioTranscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onTranscriptionComplete: (synthesis: string) => void
}

type ModalStep = 'loading' | 'qr' | 'uploading' | 'processing' | 'completed' | 'error'

const STEP_CONFIG: Record<ModalStep, { icon: React.ReactNode; title: string; description: string }> = {
  loading: {
    icon: <Loader2 className="w-8 h-8 text-axora-400 animate-spin" />,
    title: 'Initialisation...',
    description: 'Création de la session de transcription',
  },
  qr: {
    icon: <Smartphone className="w-8 h-8 text-axora-400" />,
    title: 'Scannez le QR Code',
    description: 'Utilisez votre iPhone pour uploader l\'enregistrement audio',
  },
  uploading: {
    icon: <FileAudio className="w-8 h-8 text-blue-400 animate-pulse" />,
    title: 'Réception de l\'audio...',
    description: 'Transfert de l\'enregistrement en cours',
  },
  processing: {
    icon: <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />,
    title: 'Traitement en cours...',
    description: 'Transcription et génération de la synthèse',
  },
  completed: {
    icon: <CheckCircle2 className="w-8 h-8 text-green-400" />,
    title: 'Synthèse prête !',
    description: 'Vérifiez le résultat avant de l\'injecter dans les notes',
  },
  error: {
    icon: <AlertCircle className="w-8 h-8 text-red-400" />,
    title: 'Erreur',
    description: 'Une erreur est survenue lors du traitement',
  },
}

export function AudioTranscriptionModal({
  isOpen,
  onClose,
  onTranscriptionComplete,
}: AudioTranscriptionModalProps) {
  const [step, setStep] = useState<ModalStep>('loading')
  const [session, setSession] = useState<CreateSessionResult | null>(null)
  const [synthesis, setSynthesis] = useState<string>('')
  const [transcription, setTranscription] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showTranscription, setShowTranscription] = useState(false)
  const [copied, setCopied] = useState(false)

  // Initialiser la session à l'ouverture
  useEffect(() => {
    if (!isOpen) return

    let unsubscribe: (() => void) | null = null

    const initSession = async () => {
      try {
        setStep('loading')
        setErrorMessage('')
        setSynthesis('')
        setTranscription('')

        // Nettoyer les anciennes sessions expirées
        await AudioTranscriptionService.cleanupExpiredSessions()

        // Créer une nouvelle session
        const newSession = await AudioTranscriptionService.createSession()
        setSession(newSession)
        setStep('qr')

        // S'abonner aux mises à jour
        unsubscribe = AudioTranscriptionService.subscribeToSession(
          newSession.sessionId,
          {
            onUploading: () => setStep('uploading'),
            onProcessing: () => setStep('processing'),
            onCompleted: (syn, trans) => {
              setSynthesis(syn)
              setTranscription(trans)
              setStep('completed')
            },
            onError: (msg) => {
              setErrorMessage(msg)
              setStep('error')
            },
          }
        )
      } catch (error) {
        console.error('Erreur initialisation session:', error)
        setErrorMessage('Impossible d\'initialiser la session')
        setStep('error')
      }
    }

    initSession()

    // Cleanup
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [isOpen])

  // Cleanup session à la fermeture
  const handleClose = useCallback(() => {
    if (session && step !== 'completed') {
      AudioTranscriptionService.cancelSession(session.sessionId)
    }
    onClose()
  }, [session, step, onClose])

  // Utiliser la synthèse
  const handleUseSynthesis = useCallback(() => {
    onTranscriptionComplete(synthesis)
    onClose()
  }, [synthesis, onTranscriptionComplete, onClose])

  // Copier l'URL
  const handleCopyUrl = useCallback(() => {
    if (session) {
      navigator.clipboard.writeText(session.qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [session])

  // Réessayer
  const handleRetry = useCallback(() => {
    if (session) {
      AudioTranscriptionService.cancelSession(session.sessionId)
    }
    setSession(null)
    setStep('loading')
  }, [session])

  const currentConfig = STEP_CONFIG[step]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-surface-100 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-lg max-h-[90vh] flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-axora-500/20">
                    <Mic className="w-5 h-5 text-axora-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    Transcription Audio
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Status indicator */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="mb-4">{currentConfig.icon}</div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    {currentConfig.title}
                  </h3>
                  <p className="text-sm text-white/60">
                    {step === 'error' ? errorMessage : currentConfig.description}
                  </p>
                </div>

                {/* QR Code */}
                {step === 'qr' && session && (
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-white rounded-2xl mb-4">
                      <QRCodeSVG
                        value={session.qrUrl}
                        size={200}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    {/* Instructions */}
                    <div className="w-full space-y-3 mt-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-axora-500/20 text-axora-400 text-sm font-medium">
                          1
                        </span>
                        <p className="text-sm text-white/70">
                          Ouvrez l'app <strong className="text-white">Appareil photo</strong> sur votre iPhone
                        </p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-axora-500/20 text-axora-400 text-sm font-medium">
                          2
                        </span>
                        <p className="text-sm text-white/70">
                          Scannez ce QR code et suivez le lien
                        </p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-axora-500/20 text-axora-400 text-sm font-medium">
                          3
                        </span>
                        <p className="text-sm text-white/70">
                          Sélectionnez l'enregistrement depuis <strong className="text-white">Dictaphone</strong>
                        </p>
                      </div>
                    </div>

                    {/* Copy URL fallback */}
                    <button
                      onClick={handleCopyUrl}
                      className="mt-4 flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Lien copié !
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copier le lien
                        </>
                      )}
                    </button>

                    {/* Expiration */}
                    <p className="text-xs text-white/30 mt-4">
                      Ce QR code expire dans 15 minutes
                    </p>
                  </div>
                )}

                {/* Processing animation */}
                {(step === 'uploading' || step === 'processing') && (
                  <div className="flex justify-center">
                    <div className="w-full max-w-xs">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            step === 'uploading' ? 'bg-blue-500' : 'bg-amber-500'
                          )}
                          initial={{ width: '0%' }}
                          animate={{ width: step === 'uploading' ? '40%' : '80%' }}
                          transition={{ duration: 2, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-xs text-white/40 text-center mt-2">
                        {step === 'uploading'
                          ? 'Téléchargement de l\'audio...'
                          : 'Analyse par l\'IA...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completed - Show synthesis */}
                {step === 'completed' && synthesis && (
                  <div className="space-y-4">
                    {/* Synthesis preview */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="text-sm font-medium text-white/80 mb-2">
                        Synthèse générée
                      </h4>
                      <div className="text-sm text-white/70 whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {synthesis}
                      </div>
                    </div>

                    {/* Toggle transcription */}
                    {transcription && (
                      <button
                        onClick={() => setShowTranscription(!showTranscription)}
                        className="text-sm text-white/40 hover:text-white/60 transition-colors"
                      >
                        {showTranscription
                          ? '▼ Masquer la transcription brute'
                          : '▶ Voir la transcription brute'}
                      </button>
                    )}

                    {showTranscription && transcription && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-sm font-medium text-white/60 mb-2">
                          Transcription brute
                        </h4>
                        <div className="text-xs text-white/50 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                          {transcription}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {step === 'error' && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleRetry}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      Réessayer
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02] flex-shrink-0">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {step === 'completed' ? 'Ignorer' : 'Annuler'}
                </button>
                {step === 'completed' && (
                  <button
                    onClick={handleUseSynthesis}
                    className="px-4 py-2 rounded-lg bg-axora-500 text-white font-medium hover:bg-axora-600 transition-colors"
                  >
                    Utiliser cette synthèse
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
