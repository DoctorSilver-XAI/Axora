import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { NOTE_TEMPLATES } from '../constants/templates'
import type { NoteTemplate } from '../types'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: NoteTemplate) => void
}

export function TemplateModal({ isOpen, onClose, onSelectTemplate }: TemplateModalProps) {
  const handleSelect = (template: NoteTemplate) => {
    onSelectTemplate(template)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-surface-100 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-axora-500/20">
                    <FileText className="w-5 h-5 text-axora-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Nouvelle note</h2>
                    <p className="text-sm text-white/50">Choisissez un modèle pour commencer</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Templates Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {NOTE_TEMPLATES.map((template, index) => (
                    <motion.button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'group p-4 rounded-xl text-left transition-all',
                        'bg-white/5 border border-white/10',
                        'hover:bg-white/10 hover:border-axora-500/30 hover:shadow-lg hover:shadow-axora-500/10'
                      )}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-3xl mb-3">{template.icon}</div>
                      <h3 className="font-medium text-white group-hover:text-axora-400 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
