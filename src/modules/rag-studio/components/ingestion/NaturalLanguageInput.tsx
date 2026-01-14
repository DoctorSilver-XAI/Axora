/**
 * NaturalLanguageInput - Saisie en langage naturel des médicaments
 * L'utilisateur tape simplement les noms des médicaments, l'IA fait le reste
 */

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, MessageSquareText, Sparkles, Plus, X } from 'lucide-react'
import { cn } from '@shared/utils/cn'

interface NaturalLanguageInputProps {
  onBack: () => void
  onContinue: (productNames: string[]) => void
}

// Exemples pour guider l'utilisateur
const EXAMPLES = [
  'Doliprane 500mg',
  'Spasfon Lyoc',
  'Smecta sachets',
  'Gaviscon menthe',
  'Ibuprofène 400mg',
]

export function NaturalLanguageInput({ onBack, onContinue }: NaturalLanguageInputProps) {
  const [inputText, setInputText] = useState('')
  const [products, setProducts] = useState<string[]>([])

  // Ajouter un produit depuis le texte input
  const handleAddProduct = useCallback(() => {
    const trimmed = inputText.trim()
    if (trimmed && !products.includes(trimmed)) {
      setProducts((prev) => [...prev, trimmed])
      setInputText('')
    }
  }, [inputText, products])

  // Supprimer un produit
  const handleRemoveProduct = useCallback((index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Ajouter un exemple
  const handleAddExample = useCallback((example: string) => {
    if (!products.includes(example)) {
      setProducts((prev) => [...prev, example])
    }
  }, [products])

  // Gestion de la touche Entrée
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleAddProduct()
      }
    },
    [handleAddProduct]
  )

  // Continuer vers l'enrichissement Mistral
  const handleContinue = useCallback(() => {
    // Passer directement les noms à Mistral AI
    onContinue(products)
  }, [products, onContinue])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">Saisie en langage naturel</h3>
        <p className="text-sm text-white/50 mt-1">
          Tapez simplement le nom des médicaments, l'IA génèrera les fiches complètes
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Input zone */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/70">
              Nom du médicament
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MessageSquareText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: Doliprane 500mg, Spasfon Lyoc..."
                  className={cn(
                    'w-full pl-12 pr-4 py-3 rounded-xl',
                    'bg-surface-100 border border-white/10',
                    'text-white placeholder-white/30',
                    'focus:outline-none focus:border-axora-500/50 focus:ring-2 focus:ring-axora-500/20',
                    'transition-all'
                  )}
                />
              </div>
              <button
                onClick={handleAddProduct}
                disabled={!inputText.trim()}
                className={cn(
                  'px-4 py-3 rounded-xl font-medium transition-all',
                  'flex items-center gap-2',
                  inputText.trim()
                    ? 'bg-axora-500 text-white hover:bg-axora-600'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                )}
              >
                <Plus className="w-5 h-5" />
                Ajouter
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="space-y-2">
            <p className="text-xs text-white/40">Exemples (cliquez pour ajouter) :</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => {
                const isAdded = products.includes(example)
                return (
                  <button
                    key={example}
                    onClick={() => handleAddExample(example)}
                    disabled={isAdded}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      isAdded
                        ? 'bg-axora-500/20 text-axora-400 cursor-default'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {isAdded ? '✓ ' : '+ '}
                    {example}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Products list */}
          {products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/70">
                  Médicaments à générer ({products.length})
                </p>
                <button
                  onClick={() => setProducts([])}
                  className="text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Tout effacer
                </button>
              </div>

              <div className="space-y-2">
                {products.map((product, index) => (
                  <motion.div
                    key={product}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      'bg-surface-100 border border-white/5',
                      'group'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="flex-1 text-sm text-white font-medium">{product}</span>
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Info box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-300">
                  Génération automatique par GPT-4o
                </p>
                <p className="text-xs text-emerald-300/70 mt-1">
                  L'IA va générer une fiche produit complète pour chaque médicament :
                  posologie, contre-indications, interactions, conseils officinaux...
                  Vous pourrez ensuite valider chaque fiche avant injection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5 bg-surface-50/30">
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="flex items-center gap-4">
            {products.length > 0 && (
              <span className="text-sm text-white/50">
                {products.length} médicament{products.length > 1 ? 's' : ''} à générer
              </span>
            )}
            <button
              onClick={handleContinue}
              disabled={products.length === 0}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all',
                products.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              )}
            >
              <Sparkles className="w-4 h-4" />
              Générer les fiches
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
