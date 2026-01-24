import { useState, useEffect, useCallback } from 'react'
import { Mic } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import type { ModuleDefinition } from '../core/types'
import { VoiceMemosList } from './components/VoiceMemosList'
import { VoiceMemoDetail } from './components/VoiceMemoDetail'
import { VoiceMemoService } from './services/VoiceMemoService'
import type { VoiceMemo } from './types'

/**
 * Module Voice Memos
 * Affiche et gère les transcriptions automatiques de memos vocaux iPhone
 */
function VoiceMemosModule() {
  const [memos, setMemos] = useState<VoiceMemo[]>([])
  const [selectedMemo, setSelectedMemo] = useState<VoiceMemo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  // Charger les memos
  useEffect(() => {
    const loadMemos = async () => {
      setIsLoading(true)
      try {
        const data = await VoiceMemoService.getAll(showArchived)
        setMemos(data)
      } catch (error) {
        console.error('[VoiceMemos] Erreur chargement:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadMemos()
  }, [showArchived])

  // Abonnement Realtime
  useEffect(() => {
    const unsubscribe = VoiceMemoService.subscribeToChanges({
      onInsert: (memo) => {
        console.log('[VoiceMemos] Nouveau memo reçu:', memo.id)
        setMemos((prev) => [memo, ...prev])
      },
      onUpdate: (memo) => {
        console.log('[VoiceMemos] Memo mis à jour:', memo.id, memo.status)
        setMemos((prev) => prev.map((m) => (m.id === memo.id ? memo : m)))
        if (selectedMemo?.id === memo.id) {
          setSelectedMemo(memo)
        }
      },
      onDelete: (memoId) => {
        console.log('[VoiceMemos] Memo supprimé:', memoId)
        setMemos((prev) => prev.filter((m) => m.id !== memoId))
        if (selectedMemo?.id === memoId) {
          setSelectedMemo(null)
        }
      },
    })

    return unsubscribe
  }, [selectedMemo?.id])

  const handleUpdate = useCallback(async (
    id: string,
    updates: Partial<Pick<VoiceMemo, 'title' | 'notes'>>
  ) => {
    try {
      await VoiceMemoService.update(id, updates)
    } catch (error) {
      console.error('[VoiceMemos] Erreur mise à jour:', error)
    }
  }, [])

  const handleArchive = useCallback(async (id: string) => {
    try {
      await VoiceMemoService.archive(id)
      if (selectedMemo?.id === id) {
        setSelectedMemo(null)
      }
    } catch (error) {
      console.error('[VoiceMemos] Erreur archivage:', error)
    }
  }, [selectedMemo?.id])

  const handleRestore = useCallback(async (id: string) => {
    try {
      await VoiceMemoService.restore(id)
    } catch (error) {
      console.error('[VoiceMemos] Erreur restauration:', error)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await VoiceMemoService.delete(id)
      if (selectedMemo?.id === id) {
        setSelectedMemo(null)
      }
    } catch (error) {
      console.error('[VoiceMemos] Erreur suppression:', error)
    }
  }, [selectedMemo?.id])

  const handleRetry = useCallback(async (id: string) => {
    try {
      await VoiceMemoService.retry(id)
    } catch (error) {
      console.error('[VoiceMemos] Erreur retry:', error)
    }
  }, [])

  return (
    <div className="flex gap-6 h-[500px] -mx-6">
      {/* Liste des memos */}
      <VoiceMemosList
        memos={memos}
        selectedMemo={selectedMemo}
        isLoading={isLoading}
        showArchived={showArchived}
        onSelectMemo={setSelectedMemo}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onDelete={handleDelete}
        onRetry={handleRetry}
        onToggleArchived={() => setShowArchived(!showArchived)}
      />

      {/* Détail du memo */}
      <div className="flex-1 flex flex-col pr-6">
        {selectedMemo ? (
          <VoiceMemoDetail
            memo={selectedMemo}
            onUpdate={(updates) => handleUpdate(selectedMemo.id, updates)}
            onArchive={() => handleArchive(selectedMemo.id)}
            onDelete={() => handleDelete(selectedMemo.id)}
            onRetry={() => handleRetry(selectedMemo.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-surface-50 rounded-xl border border-white/5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/40">
                Sélectionnez un memo vocal
              </p>
              <p className="text-white/30 text-sm mt-2 max-w-xs">
                Les nouveaux memos envoyés depuis votre iPhone
                apparaissent automatiquement ici
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const voiceMemosModule: ModuleDefinition = {
  id: 'voice-memos',
  name: 'Memos Vocaux',
  description: 'Transcription automatique de memos vocaux iPhone',
  version: '1.0.0',
  category: 'productivity',
  status: 'available',
  icon: Mic,
  keywords: ['audio', 'vocal', 'transcription', 'whisper', 'dictée', 'memo', 'voix', 'enregistrement'],
  component: VoiceMemosModule,
}

registerModule(voiceMemosModule)
export default voiceMemosModule
