import { CashRegisterState, CashRegisterResults, BILLETS_CONFIG } from '../types'

interface CashClosurePrintViewProps {
  state: CashRegisterState
  results: CashRegisterResults
  date: string
  onClose: () => void
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function CashClosurePrintView({ state, results, date, onClose }: CashClosurePrintViewProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Overlay pour fermer - masqué à l'impression */}
      <div
        className="fixed inset-0 bg-black/60 z-40 print:hidden"
        onClick={onClose}
      />

      {/* Boutons d'action - masqués à l'impression */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-axora-500 hover:bg-axora-600 text-white rounded-lg font-medium text-sm"
        >
          Imprimer
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-sm"
        >
          Fermer
        </button>
      </div>

      {/* Document imprimable */}
      <div className="fixed inset-0 z-40 overflow-auto print:relative print:inset-auto">
        <div className="min-h-screen flex items-start justify-center py-8 print:py-0 print:min-h-0">
          <div className="bg-white text-black w-[210mm] min-h-[297mm] p-10 shadow-2xl print:shadow-none print:p-8">
            {/* En-tête */}
            <header className="border-b-2 border-black pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">CLÔTURE DE CAISSE</h1>
                  <p className="text-sm text-gray-600 mt-1">Document de contrôle journalier</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-lg font-semibold capitalize">{formatDate(date)}</p>
                </div>
              </div>
            </header>

            {/* Section 1: Fonds de Caisse */}
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-1">
                1. Fonds de Caisse - Espèces
              </h2>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {(['caisse1', 'caisse2', 'caisse3', 'caisse4'] as const).map((key, i) => (
                  <div key={key} className="border border-gray-300 rounded p-3">
                    <p className="text-xs text-gray-500 mb-1">Caisse {i + 1}</p>
                    <p className="text-lg font-mono font-semibold text-right">
                      {formatCurrency(parseFloat(String(state.fondsCaisses[key])) || 0)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-gray-50 rounded p-3">
                <span className="font-medium">Sous-total Espèces Tiroirs</span>
                <span className="text-xl font-mono font-bold">{formatCurrency(results.totalFondEspeces)}</span>
              </div>
            </section>

            {/* Section 2: Pièces */}
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-1">
                2. Fonds de Caisse - Pièces
              </h2>
              <div className="flex justify-between items-center bg-gray-50 rounded p-3">
                <span className="font-medium">Total Pièces (comptage machine)</span>
                <span className="text-xl font-mono font-bold">{formatCurrency(results.valTotalPieces)}</span>
              </div>
            </section>

            {/* Section 3: Billets Retirés */}
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-1">
                3. Billets Retirés pour la Banque
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Dénomination</th>
                    <th className="text-center py-2 font-medium text-gray-600">Quantité</th>
                    <th className="text-right py-2 font-medium text-gray-600">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {BILLETS_CONFIG.map((billet) => {
                    const qty = parseInt(String(state.billetsRetires[billet.key])) || 0
                    const montant = qty * billet.value
                    if (qty === 0) return null
                    return (
                      <tr key={billet.key} className="border-b border-gray-100">
                        <td className="py-2">Billet de {billet.value} €</td>
                        <td className="py-2 text-center font-mono">{qty}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(montant)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-2" colSpan={2}>Total Billets Retirés</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(results.valeurBilletsRetires)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            {/* Section 4: Récapitulatif des Calculs */}
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-1">
                4. Récapitulatif des Calculs
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span>Espèces Tiroirs</span>
                  <span className="font-mono">{formatCurrency(results.totalFondEspeces)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span>Pièces</span>
                  <span className="font-mono">{formatCurrency(results.valTotalPieces)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span>Billets Retirés</span>
                  <span className="font-mono">{formatCurrency(results.valeurBilletsRetires)}</span>
                </div>
                <div className="flex justify-between py-2 bg-gray-100 px-3 rounded font-semibold">
                  <span>SOMME TOTALE PHYSIQUE</span>
                  <span className="font-mono">{formatCurrency(results.sommeTotalePhysique)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 text-gray-600">
                  <span>− Fond de caisse veille</span>
                  <span className="font-mono">− {formatCurrency(parseFloat(String(state.fondVeille)) || 0)}</span>
                </div>
                <div className="flex justify-between py-3 bg-black text-white px-3 rounded font-bold text-lg">
                  <span>ESPÈCES GÉNÉRÉES</span>
                  <span className="font-mono">{formatCurrency(results.especesGenerees)}</span>
                </div>
              </div>
            </section>

            {/* Section 5: Contrôle */}
            <section className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-1">
                5. Contrôle LGPI
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-gray-300 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Montant LGPI (théorique)</p>
                  <p className="text-lg font-mono font-semibold">
                    {formatCurrency(parseFloat(String(state.montantLGPI)) || 0)}
                  </p>
                </div>
                <div className="border border-gray-300 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Espèces Générées (réel)</p>
                  <p className="text-lg font-mono font-semibold">{formatCurrency(results.especesGenerees)}</p>
                </div>
                <div
                  className={`border-2 rounded p-3 ${
                    Math.abs(results.ecart) < 0.05
                      ? 'border-green-500 bg-green-50'
                      : results.ecart > 0
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">Écart</p>
                  <p
                    className={`text-xl font-mono font-bold ${
                      Math.abs(results.ecart) < 0.05
                        ? 'text-green-700'
                        : results.ecart > 0
                        ? 'text-blue-700'
                        : 'text-red-700'
                    }`}
                  >
                    {results.ecart > 0 ? '+' : ''}
                    {results.ecart.toFixed(2)} €
                  </p>
                  <p className="text-xs mt-1 text-gray-600">
                    {Math.abs(results.ecart) < 0.05
                      ? 'Caisse conforme'
                      : results.ecart > 0
                      ? 'Excédent de caisse'
                      : 'Manquant de caisse'}
                  </p>
                </div>
              </div>
            </section>

            {/* Signature */}
            <footer className="border-t-2 border-black pt-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-medium mb-2">Observations :</p>
                  <div className="border border-gray-300 rounded h-20" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Signature du pharmacien :</p>
                  <div className="border border-gray-300 rounded h-20 flex items-end justify-end p-2">
                    <p className="text-xs text-gray-400">Date et signature</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-6">
                Document généré par Axora — {new Date().toLocaleString('fr-FR')}
              </p>
            </footer>
          </div>
        </div>
      </div>
    </>
  )
}
