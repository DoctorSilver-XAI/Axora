import { useState, useCallback, useMemo, useRef } from 'react'
import {
    Plus,
    Trash2,
    FileText,
    Download,
    RotateCcw,
    Settings2,
    Eye,
    EyeOff,
    Users,
    Calendar,
    CreditCard,
    Euro,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import {
    InvoiceClient,
    InvoiceLine,
    InvoiceSettings,
    PaymentMethod,
    VATRate,
    VAT_RATES,
    CLIENT_TYPE_LABELS,
    PAYMENT_METHOD_LABELS,
    DEFAULT_CLIENT,
    DEFAULT_SETTINGS,
    createEmptyLine,
    ClientType,
    InputMode,
} from '../types'
import {
    calculateLineAmounts,
    calculateLineAmountsFromTTC,
    calculateInvoiceTotals,
    generateInvoiceNumber,
    formatCurrency,
} from '../utils/vatCalculations'
import { InvoicePreview } from './InvoicePreview'

export function CommercialInvoiceGenerator() {
    // État du formulaire
    const [invoiceNumber, setInvoiceNumber] = useState(() => generateInvoiceNumber())
    const [invoiceDate, setInvoiceDate] = useState(() => new Date())
    const [client, setClient] = useState<InvoiceClient>(DEFAULT_CLIENT)
    const [lines, setLines] = useState<InvoiceLine[]>([createEmptyLine()])
    const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cb')
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined)
    const [notes, setNotes] = useState('')
    const [showPreview, setShowPreview] = useState(true)
    const [showSettings, setShowSettings] = useState(false)

    const previewRef = useRef<HTMLDivElement>(null)

    // Recalculer les lignes quand les settings changent
    const computedLines = useMemo(() => {
        return lines.map(line => {
            if (settings.inputMode === 'ttc') {
                // Mode TTC: l'utilisateur saisit le prix TTC, on calcule le HT
                const result = calculateLineAmountsFromTTC(
                    line.quantity,
                    line.unitPriceTTC,
                    line.vatRate,
                    settings.applyVAT
                )
                return { ...line, unitPriceHT: result.unitPriceHT, amountHT: result.amountHT, amountVAT: result.amountVAT, amountTTC: result.amountTTC }
            } else {
                // Mode HT: comportement classique
                const amounts = calculateLineAmounts(
                    line.quantity,
                    line.unitPriceHT,
                    line.vatRate,
                    settings.applyVAT
                )
                return { ...line, ...amounts }
            }
        })
    }, [lines, settings.applyVAT, settings.inputMode])

    // Calculer les totaux
    const totals = useMemo(() => {
        return calculateInvoiceTotals(computedLines, settings.applyVAT)
    }, [computedLines, settings.applyVAT])

    // Ajouter une ligne
    const addLine = useCallback(() => {
        const newLine = createEmptyLine()
        newLine.vatRate = settings.defaultVATRate
        setLines(prev => [...prev, newLine])
    }, [settings.defaultVATRate])

    // Supprimer une ligne
    const removeLine = useCallback((id: string) => {
        setLines(prev => prev.filter(line => line.id !== id))
    }, [])

    // Mettre à jour une ligne
    const updateLine = useCallback((id: string, field: keyof InvoiceLine, value: unknown) => {
        setLines(prev => prev.map(line => {
            if (line.id !== id) return line
            return { ...line, [field]: value }
        }))
    }, [])

    // Reset complet
    const handleReset = useCallback(() => {
        setInvoiceNumber(generateInvoiceNumber())
        setInvoiceDate(new Date())
        setClient(DEFAULT_CLIENT)
        setLines([createEmptyLine()])
        setSettings(DEFAULT_SETTINGS)
        setPaymentMethod('cb')
        setPaymentDate(undefined)
        setNotes('')
    }, [])

    // Export PDF
    const handleExportPDF = useCallback(async () => {
        if (!previewRef.current) return

        try {
            const html2canvas = (await import('html2canvas')).default
            const { jsPDF } = await import('jspdf')

            const canvas = await html2canvas(previewRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`${invoiceNumber}.pdf`)
        } catch (error) {
            console.error('Erreur export PDF:', error)
        }
    }, [invoiceNumber])

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20">
                            <FileText className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold">Facture Commerciale</h1>
                            <p className="text-xs text-white/50">Génération avec TVA paramétrable</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Toggle HT / TTC - always visible */}
                        <div className="flex rounded-md overflow-hidden border border-white/20 mr-2">
                            <button
                                onClick={() => setSettings(prev => ({ ...prev, inputMode: 'ht' as InputMode }))}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-medium transition-colors',
                                    settings.inputMode === 'ht'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-white/5 text-white/50 hover:text-white/80'
                                )}
                            >
                                HT
                            </button>
                            <button
                                onClick={() => setSettings(prev => ({ ...prev, inputMode: 'ttc' as InputMode }))}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-medium transition-colors',
                                    settings.inputMode === 'ttc'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-white/5 text-white/50 hover:text-white/80'
                                )}
                            >
                                TTC
                            </button>
                        </div>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                showSettings ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-white/60'
                            )}
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                showPreview ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-white/60'
                            )}
                        >
                            {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleReset}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Exporter PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="flex-shrink-0 px-4 py-2.5 border-b border-white/10 bg-white/5">
                    <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.applyVAT}
                                onChange={(e) => setSettings(prev => ({ ...prev, applyVAT: e.target.checked }))}
                                className="w-3.5 h-3.5 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-xs">Appliquer la TVA</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.showDetails}
                                onChange={(e) => setSettings(prev => ({ ...prev, showDetails: e.target.checked }))}
                                className="w-3.5 h-3.5 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-xs">Afficher les détails</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-white/60">TVA :</span>
                            <select
                                value={settings.defaultVATRate}
                                onChange={(e) => setSettings(prev => ({ ...prev, defaultVATRate: parseFloat(e.target.value) as VATRate }))}
                                className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-xs focus:outline-none focus:border-emerald-500"
                            >
                                {VAT_RATES.map(vat => (
                                    <option key={vat.rate} value={vat.rate}>{vat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Form Panel */}
                <div className={cn(
                    'flex-1 overflow-y-auto p-4 space-y-4',
                    showPreview ? 'max-w-[45%]' : 'max-w-full'
                )}>
                    {/* Invoice Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-white/60 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                N° Facture
                            </label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/60 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={invoiceDate.toISOString().split('T')[0]}
                                onChange={(e) => setInvoiceDate(new Date(e.target.value))}
                                className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center gap-1.5 text-white/80">
                            <Users className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">Client</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs text-white/60">Nom / Raison sociale</label>
                                <input
                                    type="text"
                                    value={client.name}
                                    onChange={(e) => setClient(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Dr. Martin, Cabinet Infirmier..."
                                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm placeholder:text-white/30"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs text-white/60">Adresse</label>
                                <input
                                    type="text"
                                    value={client.address}
                                    onChange={(e) => setClient(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Code Postal</label>
                                <input
                                    type="text"
                                    value={client.postalCode}
                                    onChange={(e) => setClient(prev => ({ ...prev, postalCode: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Ville</label>
                                <input
                                    type="text"
                                    value={client.city}
                                    onChange={(e) => setClient(prev => ({ ...prev, city: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Type de client</label>
                                <select
                                    value={client.clientType}
                                    onChange={(e) => setClient(prev => ({ ...prev, clientType: e.target.value as ClientType }))}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                >
                                    {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Lines */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-white/80">
                                <Euro className="w-3.5 h-3.5" />
                                <span className="text-sm font-medium">Lignes de produits</span>
                            </div>
                            <button
                                onClick={addLine}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Ajouter
                            </button>
                        </div>

                        <div className="space-y-2">
                            {lines.map((line, index) => (
                                <div key={line.id} className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                                    {/* Row 1: Designation */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/40 w-4 flex-shrink-0">{index + 1}</span>
                                        <input
                                            type="text"
                                            value={line.designation}
                                            onChange={(e) => updateLine(line.id, 'designation', e.target.value)}
                                            placeholder="Désignation"
                                            className="flex-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-xs"
                                        />
                                        <button
                                            onClick={() => removeLine(line.id)}
                                            disabled={lines.length === 1}
                                            className="p-1 rounded-md hover:bg-red-500/20 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {/* Row 2: Qty, Price, TVA, Total */}
                                    <div className="flex items-center gap-1.5 pl-6">
                                        <input
                                            type="number"
                                            value={line.quantity || ''}
                                            onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            placeholder="Qté"
                                            min="0"
                                            step="1"
                                            className="w-14 px-2 py-1 rounded-md bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-xs text-center"
                                        />
                                        {settings.inputMode === 'ttc' ? (
                                            <input
                                                type="number"
                                                value={line.unitPriceTTC || ''}
                                                onChange={(e) => updateLine(line.id, 'unitPriceTTC', parseFloat(e.target.value) || 0)}
                                                placeholder="Prix TTC"
                                                min="0"
                                                step="0.01"
                                                className="w-20 px-2 py-1 rounded-md bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-xs text-right"
                                            />
                                        ) : (
                                            <input
                                                type="number"
                                                value={line.unitPriceHT || ''}
                                                onChange={(e) => updateLine(line.id, 'unitPriceHT', parseFloat(e.target.value) || 0)}
                                                placeholder="Prix HT"
                                                min="0"
                                                step="0.01"
                                                className="w-20 px-2 py-1 rounded-md bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-xs text-right"
                                            />
                                        )}
                                        {settings.applyVAT && (
                                            <select
                                                value={line.vatRate}
                                                onChange={(e) => updateLine(line.id, 'vatRate', parseFloat(e.target.value) as VATRate)}
                                                className="w-16 px-1 py-1 rounded-md bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-xs"
                                            >
                                                {VAT_RATES.map(vat => (
                                                    <option key={vat.rate} value={vat.rate}>{vat.label}</option>
                                                ))}
                                            </select>
                                        )}
                                        <div className="flex-1 text-right text-xs text-emerald-400 font-medium">
                                            {formatCurrency(computedLines[index]?.amountTTC || 0)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-1.5 text-white/80">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">Paiement</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Mode de paiement</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                >
                                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Date de paiement</label>
                                <input
                                    type="date"
                                    value={paymentDate?.toISOString().split('T')[0] || ''}
                                    onChange={(e) => setPaymentDate(e.target.value ? new Date(e.target.value) : undefined)}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60">Notes (optionnel)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Remarques, conditions particulières..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none resize-none text-sm placeholder:text-white/30"
                        />
                    </div>

                    {/* Totals Summary (mobile/small view) */}
                    {!showPreview && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/60">Total HT</span>
                                <span>{formatCurrency(totals.totalHT)}</span>
                            </div>
                            {settings.applyVAT && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/60">Total TVA</span>
                                    <span>{formatCurrency(totals.totalVAT)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-bold pt-1.5 border-t border-white/10">
                                <span>NET À PAYER</span>
                                <span className="text-emerald-400">{formatCurrency(totals.totalTTC)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                {showPreview && (
                    <div className="w-[55%] overflow-y-auto p-4 bg-white/5 border-l border-white/10">
                        <div className="sticky top-0 z-10 pb-2">
                            <h2 className="text-xs font-medium text-white/60 uppercase tracking-wider">Aperçu</h2>
                        </div>
                        <div ref={previewRef}>
                            <InvoicePreview
                                invoiceNumber={invoiceNumber}
                                invoiceDate={invoiceDate}
                                client={client}
                                lines={computedLines}
                                settings={settings}
                                paymentMethod={paymentMethod}
                                paymentDate={paymentDate}
                                notes={notes}
                                totals={totals}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
