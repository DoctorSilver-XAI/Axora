import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Save,
  History,
  Sparkles,
  X,
  ChevronRight,
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
import type { CashClosureData } from '@shared/types/electron'
import { CashClosurePrintView } from './CashClosurePrintView'

// Formatage monétaire français compact
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

function calculateResults(state: CashRegisterState): CashRegisterResults {
  // 1. Total des espèces dans les 4 tiroirs-caisses
  const totalFondEspeces = Object.values(state.fondsCaisses).reduce(
    (acc, val) => acc + (parseFloat(String(val)) || 0),
    0
  )

  // 2. Total des pièces (valeur directe)
  const valTotalPieces = parseFloat(String(state.totalPieces)) || 0

  // 3. Valeur des billets retirés pour la banque
  const valeurBilletsRetires = BILLETS_CONFIG.reduce((acc, billet) => {
    const qty = Number(state.billetsRetires[billet.key]) || 0
    return acc + qty * billet.value
  }, 0)

  // 4. Somme totale physique = tout l'argent compté
  const sommeTotalePhysique = totalFondEspeces + valTotalPieces + valeurBilletsRetires

  // 5. Espèces générées = argent d'aujourd'hui (on soustrait le fond de la veille)
  const fondVeille = parseFloat(String(state.fondVeille)) || 0
  const especesGenerees = sommeTotalePhysique - fondVeille

  // 6. Écart = différence entre le réel et ce que LGPI dit
  const montantLGPI = parseFloat(String(state.montantLGPI)) || 0
  const ecart = especesGenerees - montantLGPI

  return {
    totalFondEspeces,
    valTotalPieces,
    valeurBilletsRetires,
    sommeTotalePhysique,
    especesGenerees,
    ecart,
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

// Helper pour formater une date ISO en format lisible
const formatDateShort = (isoDate: string) => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Helper pour obtenir la date d'aujourd'hui en ISO
const getTodayISO = () => new Date().toISOString().split('T')[0]

export function CashRegisterCalculator() {
  const [state, setState] = useState<CashRegisterState>(EMPTY_STATE)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [currentDate, setCurrentDate] = useState('')
  const [todayISO, setTodayISO] = useState('')

  // États pour la persistance
  const [fondVeilleAuto, setFondVeilleAuto] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [closureHistory, setClosureHistory] = useState<CashClosureData[]>([])
  const [showPrintView, setShowPrintView] = useState(false)

  // Charger le fond de veille automatique depuis la dernière clôture
  useEffect(() => {
    const loadLastClosure = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window.axora as any)?.cashRegister
        if (!api) return

        const latest = await api.getLatest()
        if (latest) {
          const parsedResults = JSON.parse(latest.results_json)
          // Le fond de veille d'aujourd'hui = somme totale physique d'hier
          setFondVeilleAuto(parsedResults.sommeTotalePhysique)
          // Pré-remplir si le champ est vide
          setState(prev => ({
            ...prev,
            fondVeille: prev.fondVeille === '' ? parsedResults.sommeTotalePhysique : prev.fondVeille
          }))
        }
      } catch (error) {
        console.error('[CashRegister] Failed to load last closure:', error)
      }
    }
    loadLastClosure()
  }, [])

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    )
    setTodayISO(getTodayISO())
  }, [])

  const results = useMemo(() => calculateResults(state), [state])

  // Sauvegarder la clôture
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window.axora as any)?.cashRegister
      if (!api) throw new Error('API non disponible')

      // Convertir les valeurs en nombres
      const fondsCaissesNum: Record<string, number> = {}
      for (const [key, val] of Object.entries(state.fondsCaisses)) {
        fondsCaissesNum[key] = parseFloat(String(val)) || 0
      }

      const billetsRetiresNum: Record<string, number> = {}
      for (const [key, val] of Object.entries(state.billetsRetires)) {
        billetsRetiresNum[key] = parseInt(String(val)) || 0
      }

      await api.save({
        date: todayISO,
        fondsCaisses: fondsCaissesNum,
        totalPieces: parseFloat(String(state.totalPieces)) || 0,
        billetsRetires: billetsRetiresNum,
        fondVeille: parseFloat(String(state.fondVeille)) || 0,
        montantLGPI: parseFloat(String(state.montantLGPI)) || 0,
        results,
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('[CashRegister] Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }, [state, results, todayISO])

  // Charger l'historique
  const loadHistory = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window.axora as any)?.cashRegister
      if (!api) return

      const history = await api.getAll(30)
      setClosureHistory(history)
    } catch (error) {
      console.error('[CashRegister] Failed to load history:', error)
    }
  }, [])

  // Charger une clôture depuis l'historique
  const loadClosure = useCallback((closure: CashClosureData) => {
    const fondsCaisses = JSON.parse(closure.fonds_caisses_json)
    const billetsRetires = JSON.parse(closure.billets_retires_json)

    setState({
      fondsCaisses,
      totalPieces: closure.total_pieces,
      billetsRetires,
      fondVeille: closure.fond_veille,
      montantLGPI: closure.montant_lgpi,
    })
    setShowHistory(false)
  }, [])

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
          {/* Indicateur fond veille auto */}
          {fondVeilleAuto !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">Fond veille auto</span>
            </div>
          )}
          <button
            onClick={() => {
              setShowHistory(true)
              loadHistory()
            }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
            title="Historique"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setState(DEFAULT_STATE)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
          >
            Exemple
          </button>
          <button
            onClick={() => setShowPrintView(true)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
            title="Imprimer"
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
            title="Réinitialiser"
          >
            {showResetConfirm ? <Check className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all',
              saveSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-axora-500 hover:bg-axora-600 text-white'
            )}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Enregistré
              </>
            ) : isSaving ? (
              'Enregistrement...'
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Enregistrer
              </>
            )}
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

      {/* Vue d'impression */}
      {showPrintView && (
        <CashClosurePrintView
          state={state}
          results={results}
          date={todayISO}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {/* Modal Historique */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[80vh] bg-surface-100 border border-white/10 rounded-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-axora-400" />
                  <h3 className="font-semibold text-white">Historique des clôtures</h3>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Liste */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {closureHistory.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune clôture enregistrée</p>
                  </div>
                ) : (
                  closureHistory.map((closure) => {
                    const closureResults = JSON.parse(closure.results_json)
                    const isToday = closure.date === todayISO
                    return (
                      <button
                        key={closure.id}
                        onClick={() => loadClosure(closure)}
                        className={cn(
                          'w-full p-3 rounded-xl border text-left transition-all hover:bg-white/5',
                          isToday
                            ? 'bg-axora-500/10 border-axora-500/30'
                            : 'bg-white/[0.02] border-white/10'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {formatDateShort(closure.date)}
                            </span>
                            {isToday && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-axora-500/20 text-axora-400 font-medium">
                                Aujourd'hui
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/30" />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Espèces générées</span>
                          <span className="font-mono text-white">
                            {formatCurrency(closureResults.especesGenerees)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-white/50">Écart</span>
                          <span
                            className={cn(
                              'font-mono font-medium',
                              Math.abs(closureResults.ecart) < 0.05
                                ? 'text-emerald-400'
                                : closureResults.ecart > 0
                                ? 'text-blue-400'
                                : 'text-red-400'
                            )}
                          >
                            {closureResults.ecart > 0 ? '+' : ''}
                            {closureResults.ecart.toFixed(2)} €
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
