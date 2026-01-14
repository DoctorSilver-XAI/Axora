import { useState, useEffect, useMemo } from 'react'
import {
  Calculator,
  Euro,
  Banknote,
  Coins,
  RotateCcw,
  Printer,
  Check,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@shared/utils/cn'
import {
  FondsCaisses,
  BilletsRetires,
  CashRegisterState,
  CashRegisterResults,
  BILLETS_CONFIG,
} from '../types'

// Formatage monétaire français compact
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

// TODO(human): Implémenter la fonction de calcul des résultats
function calculateResults(state: CashRegisterState): CashRegisterResults {
  // Cette fonction doit calculer tous les résultats de la caisse
  // À toi de jouer !
  return {
    totalFondEspeces: 0,
    valTotalPieces: 0,
    valeurBilletsRetires: 0,
    sommeTotalePhysique: 0,
    especesGenerees: 0,
    ecart: 0,
  }
}

// Valeurs par défaut pour démarrage rapide
const DEFAULT_STATE: CashRegisterState = {
  fondsCaisses: { caisse1: 100, caisse2: 115, caisse3: 115, caisse4: 135 },
  totalPieces: 194.15,
  billetsRetires: { b10: 12, b20: 11, b50: 10, b100: 1, b200: 0, b500: 0 },
  fondVeille: 640.78,
  montantLGPI: 957.15,
}

const EMPTY_STATE: CashRegisterState = {
  fondsCaisses: { caisse1: '', caisse2: '', caisse3: '', caisse4: '' },
  totalPieces: '',
  billetsRetires: { b10: '', b20: '', b50: '', b100: '', b200: '', b500: '' },
  fondVeille: '',
  montantLGPI: '',
}

export function CashRegisterCalculator() {
  const [state, setState] = useState<CashRegisterState>(EMPTY_STATE)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    )
  }, [])

  const results = useMemo(() => calculateResults(state), [state])

  const handleCaisseChange = (key: keyof FondsCaisses, value: string) => {
    setState((prev) => ({
      ...prev,
      fondsCaisses: { ...prev.fondsCaisses, [key]: value === '' ? '' : parseFloat(value) },
    }))
  }

  const handleBilletChange = (key: keyof BilletsRetires, value: string) => {
    setState((prev) => ({
      ...prev,
      billetsRetires: { ...prev.billetsRetires, [key]: value === '' ? '' : parseInt(value) },
    }))
  }

  const handleReset = () => {
    if (showResetConfirm) {
      setState(EMPTY_STATE)
      setShowResetConfirm(false)
    } else {
      setShowResetConfirm(true)
      setTimeout(() => setShowResetConfirm(false), 3000)
    }
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-[18px] h-[18px] text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Calcul de Caisse</h2>
            <div className="flex items-center gap-1.5 text-xs text-white/50 capitalize">
              <Calendar className="w-3 h-3" />
              {currentDate}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setState(DEFAULT_STATE)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
          >
            Exemple
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className={cn(
              'p-2 rounded-lg transition-all',
              showResetConfirm
                ? 'bg-red-500 text-white'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400'
            )}
          >
            {showResetConfirm ? <Check className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Grid - 2 colonnes */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* LEFT: Inputs */}
        <div className="xl:col-span-3 space-y-4">
          {/* Section 1: Fonds de Caisse */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-white">1. Fonds de Caisse</span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                {formatCurrency(results.totalFondEspeces + results.valTotalPieces)}
              </span>
            </div>

            {/* Tiroirs - 4 colonnes */}
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {([1, 2, 3, 4] as const).map((num) => (
                <div key={num}>
                  <label className="text-xs text-white/40 mb-1.5 block">Caisse {num}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={state.fondsCaisses[`caisse${num}` as keyof FondsCaisses]}
                      onChange={(e) => handleCaisseChange(`caisse${num}` as keyof FondsCaisses, e.target.value)}
                      placeholder="0"
                      className="w-full text-right px-2.5 py-2 pl-6 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none"
                    />
                    <span className="absolute left-2 top-2 text-white/30 text-xs">€</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pièces */}
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Coins className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <label className="text-xs text-white/50 block">Total pièces</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={state.totalPieces}
                    onChange={(e) => setState((prev) => ({ ...prev, totalPieces: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                    placeholder="0.00"
                    className="w-full max-w-[140px] text-right px-2.5 py-1.5 pl-6 bg-white/10 border border-emerald-500/30 rounded-lg text-sm font-mono font-semibold text-emerald-400 focus:outline-none"
                  />
                  <span className="absolute left-2 top-1.5 text-emerald-400/50 text-xs">€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Billets Retirés */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                  <Euro className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-white">2. Retraits Banque</span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">
                {formatCurrency(results.valeurBilletsRetires)}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {BILLETS_CONFIG.map((billet) => {
                const qty = Number(state.billetsRetires[billet.key]) || 0
                return (
                  <div key={billet.key} className={cn('p-2.5 rounded-lg border text-center', billet.bgColor)}>
                    <div className={cn('text-xs font-bold mb-1.5', billet.color)}>{billet.value}€</div>
                    <input
                      type="number"
                      min="0"
                      value={state.billetsRetires[billet.key]}
                      onChange={(e) => handleBilletChange(billet.key, e.target.value)}
                      placeholder="0"
                      className="w-full text-center px-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm font-mono font-semibold text-white focus:outline-none"
                    />
                    <div className={cn('text-[10px] mt-1.5', billet.color)}>{formatCurrency(qty * billet.value)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 3: Comparaison */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-amber-500/20">
                <Calculator className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-white">3. Comparaison</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Fond veille (papier)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={state.fondVeille}
                    onChange={(e) => setState((prev) => ({ ...prev, fondVeille: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                    placeholder="0.00"
                    className="w-full text-right px-2.5 py-2 pl-8 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm font-mono text-amber-400 focus:outline-none"
                  />
                  <Banknote className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-amber-400/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Montant LGPI</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={state.montantLGPI}
                    onChange={(e) => setState((prev) => ({ ...prev, montantLGPI: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                    placeholder="0.00"
                    className="w-full text-right px-2.5 py-2 pl-8 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm font-mono text-amber-400 focus:outline-none"
                  />
                  <Calculator className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-amber-400/50" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="xl:col-span-2 space-y-4">
          {/* Main Result */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-gradient-to-br from-surface-100 to-surface-200 border border-white/10 p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl" />

            <div className="relative z-10">
              <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Espèces générées</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-white">
                  {formatCurrency(results.especesGenerees).replace('€', '').trim()}
                </span>
                <span className="text-lg text-white/40">€</span>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-white/50">Objectif LGPI</span>
                  <span className="font-mono text-white/70">{formatCurrency(parseFloat(String(state.montantLGPI)) || 0)}</span>
                </div>

                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-white/60">Écart Final</span>
                    <span
                      className={cn(
                        'text-lg font-bold font-mono',
                        results.ecart > 0.05 ? 'text-blue-400' : results.ecart < -0.05 ? 'text-red-400' : 'text-emerald-400'
                      )}
                    >
                      {results.ecart > 0 ? '+' : ''}{results.ecart.toFixed(2)} €
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full', Math.abs(results.ecart) < 0.05 ? 'bg-emerald-500' : results.ecart > 0 ? 'bg-blue-500' : 'bg-red-500')}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    />
                  </div>

                  <div className="mt-2.5 text-xs">
                    <AnimatePresence mode="wait">
                      {Math.abs(results.ecart) < 0.05 ? (
                        <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Parfait. Caisse juste.
                        </motion.span>
                      ) : results.ecart > 0 ? (
                        <motion.span key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-blue-400 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" /> Excédent détecté
                        </motion.span>
                      ) : (
                        <motion.span key="down" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-400 flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" /> Manquant détecté
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Receipt Summary */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <div className="text-center mb-3 pb-3 border-b border-dashed border-white/20">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Récapitulatif</p>
              <p className="text-[10px] text-white/40 capitalize mt-0.5">{currentDate}</p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-white/50">
                <span>Fonds Espèces</span>
                <span className="text-white">{formatCurrency(results.totalFondEspeces)}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Fonds Pièces</span>
                <span className="text-white">{formatCurrency(results.valTotalPieces)}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Retraits Banque</span>
                <span className="text-white">{formatCurrency(results.valeurBilletsRetires)}</span>
              </div>

              <div className="border-t border-white/10 my-2" />

              <div className="flex justify-between font-semibold text-white text-sm">
                <span>TOTAL PHYSIQUE</span>
                <span>{formatCurrency(results.sommeTotalePhysique)}</span>
              </div>
              <div className="flex justify-between text-white/30 text-[11px]">
                <span>- Fond veille</span>
                <span>-{formatCurrency(parseFloat(String(state.fondVeille)) || 0)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-center print:block">
              <p className="text-[10px] text-white/40 uppercase">Signature Pharmacien</p>
              <div className="h-10 w-24 border-b border-white/20 mt-1.5 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
