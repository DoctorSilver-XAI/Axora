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
} from '../types'
import {
    calculateLineAmounts,
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
            const amounts = calculateLineAmounts(
                line.quantity,
                line.unitPriceHT,
                line.vatRate,
                settings.applyVAT
            )
            return { ...line, ...amounts }
        })
    }, [lines, settings.applyVAT])

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
                        <div className="p-2 rounded-xl bg-emerald-500/20">
                            <FileText className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Facture Commerciale</h1>
                            <p className="text-sm text-white/50">Génération avec TVA paramétrable</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                'p-2 rounded-lg transition-colors',
                                showSettings ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-white/60'
                            )}
                        >
                            <Settings2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={cn(
                                'p-2 rounded-lg transition-colors',
                                showPreview ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-white/60'
                            )}
                        >
                            {showPreview ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleReset}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 transition-colors"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Exporter PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 bg-white/5">
                    <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.applyVAT}
                                onChange={(e) => setSettings(prev => ({ ...prev, applyVAT: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-sm">Appliquer la TVA</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.showDetails}
                                onChange={(e) => setSettings(prev => ({ ...prev, showDetails: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-sm">Afficher les détails</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-white/60">TVA par défaut:</span>
                            <select
                                value={settings.defaultVATRate}
                                onChange={(e) => setSettings(prev => ({ ...prev, defaultVATRate: parseFloat(e.target.value) as VATRate }))}
                                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-sm focus:outline-none focus:border-emerald-500"
                            >
                                {VAT_RATES.map(vat => (
                                    <option key={vat.rate} value={vat.rate}>{vat.label} - {vat.description}</option>
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
                    'flex-1 overflow-y-auto p-6 space-y-6',
                    showPreview ? 'max-w-[50%]' : 'max-w-full'
                )}>
                    {/* Invoice Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-white/60 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                N° Facture
                            </label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white/60 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={invoiceDate.toISOString().split('T')[0]}
                                onChange={(e) => setInvoiceDate(new Date(e.target.value))}
                                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center gap-2 text-white/80">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">Informations Client</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <label className="text-sm text-white/60">Nom / Raison sociale</label>
                                <input
                                    type="text"
                                    value={client.name}
                                    onChange={(e) => setClient(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Dr. Martin, Cabinet Infirmier..."
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none placeholder:text-white/30"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-sm text-white/60">Adresse</label>
                                <input
                                    type="text"
                                    value={client.address}
                                    onChange={(e) => setClient(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-white/60">Code Postal</label>
                                <input
                                    type="text"
                                    value={client.postalCode}
                                    onChange={(e) => setClient(prev => ({ ...prev, postalCode: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-white/60">Ville</label>
                                <input
                                    type="text"
                                    value={client.city}
                                    onChange={(e) => setClient(prev => ({ ...prev, city: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-white/60">Type de client</label>
                                <select
                                    value={client.clientType}
                                    onChange={(e) => setClient(prev => ({ ...prev, clientType: e.target.value as ClientType }))}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                                >
                                    {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Lines */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white/80">
                                <Euro className="w-4 h-4" />
                                <span className="font-medium">Lignes de produits</span>
                            </div>
                            <button
                                onClick={addLine}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter
                            </button>
                        </div>

                        <div className="space-y-3">
                            {lines.map((line, index) => (
                                <div key={line.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                    <span className="text-sm text-white/40 w-6">{index + 1}</span>
                                    <input
                                        type="text"
                                        value={line.designation}
                                        onChange={(e) => updateLine(line.id, 'designation', e.target.value)}
                                        placeholder="Désignation"
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={line.quantity || ''}
                                        onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        placeholder="Qté"
                                        min="0"
                                        step="1"
                                        className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-center"
                                    />
                                    <input
                                        type="number"
                                        value={line.unitPriceHT || ''}
                                        onChange={(e) => updateLine(line.id, 'unitPriceHT', parseFloat(e.target.value) || 0)}
                                        placeholder="Prix HT"
                                        min="0"
                                        step="0.01"
                                        className="w-28 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm text-right"
                                    />
                                    {settings.applyVAT && (
                                        <select
                                            value={line.vatRate}
                                            onChange={(e) => updateLine(line.id, 'vatRate', parseFloat(e.target.value) as VATRate)}
                                            className="w-24 px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-sm"
                                        >
                                            {VAT_RATES.map(vat => (
                                                <option key={vat.rate} value={vat.rate}>{vat.label}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="w-24 text-right text-sm text-white/60">
                                        {formatCurrency(computedLines[index]?.amountTTC || 0)}
                                    </div>
                                    <button
                                        onClick={() => removeLine(line.id)}
                                        disabled={lines.length === 1}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center gap-2 text-white/80">
                            <CreditCard className="w-4 h-4" />
                            <span className="font-medium">Paiement</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-white/60">Mode de paiement</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                                >
                                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-white/60">Date de paiement</label>
                                <input
                                    type="date"
                                    value={paymentDate?.toISOString().split('T')[0] || ''}
                                    onChange={(e) => setPaymentDate(e.target.value ? new Date(e.target.value) : undefined)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/60">Notes (optionnel)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Remarques, conditions particulières..."
                            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none resize-none placeholder:text-white/30"
                        />
                    </div>

                    {/* Totals Summary (mobile/small view) */}
                    {!showPreview && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Total HT</span>
                                <span>{formatCurrency(totals.totalHT)}</span>
                            </div>
                            {settings.applyVAT && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60">Total TVA</span>
                                    <span>{formatCurrency(totals.totalVAT)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                                <span>NET À PAYER</span>
                                <span className="text-emerald-400">{formatCurrency(totals.totalTTC)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                {showPreview && (
                    <div className="w-1/2 overflow-y-auto p-6 bg-white/5 border-l border-white/10">
                        <div className="sticky top-0 z-10 pb-4">
                            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">Aperçu</h2>
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
