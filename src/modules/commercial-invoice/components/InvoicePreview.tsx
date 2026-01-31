import {
    InvoiceClient,
    InvoiceLine,
    InvoiceSettings,
    PaymentMethod,
    VATSummary,
    PAYMENT_METHOD_LABELS,
    VAT_RATES,
} from '../types'
import { formatCurrency, formatDate } from '../utils/vatCalculations'
import { PHARMACY_INFO, getLegalMentions } from '../data/pharmacyInfo'

interface InvoicePreviewProps {
    invoiceNumber: string
    invoiceDate: Date
    client: InvoiceClient
    lines: InvoiceLine[]
    settings: InvoiceSettings
    paymentMethod: PaymentMethod
    paymentDate?: Date
    notes?: string
    totals: {
        totalHT: number
        totalVAT: number
        totalTTC: number
        vatSummary: VATSummary[]
    }
}

export function InvoicePreview({
    invoiceNumber,
    invoiceDate,
    client,
    lines,
    settings,
    paymentMethod,
    paymentDate,
    notes,
    totals,
}: InvoicePreviewProps) {
    const p = PHARMACY_INFO

    return (
        <div className="bg-white text-black rounded-lg shadow-xl overflow-hidden" style={{ aspectRatio: '210/297' }}>
            <div className="p-6 h-full flex flex-col text-[10px]">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    {/* Pharmacy Info */}
                    <div className="space-y-0.5">
                        <div className="text-base font-bold text-emerald-700">{p.name}</div>
                        <div className="text-gray-600">{p.address}</div>
                        <div className="text-gray-600">{p.postalCode} {p.city}</div>
                        <div className="text-gray-500 mt-1">Tél: {p.phone}</div>
                        <div className="text-gray-500">Fax: {p.fax}</div>
                        <div className="text-gray-500">{p.email}</div>
                        <div className="text-gray-500 mt-1">N° TVA: {p.vatNumber}</div>
                        <div className="text-gray-500">SIRET: {p.siret}</div>
                    </div>

                    {/* Invoice Info */}
                    <div className="text-right space-y-0.5">
                        <div className="text-base font-bold text-gray-800">FACTURE</div>
                        <div className="text-gray-600">N° {invoiceNumber}</div>
                        <div className="text-gray-600">Date: {formatDate(invoiceDate)}</div>
                    </div>
                </div>

                {/* Client Box */}
                <div className="border border-gray-300 rounded-lg p-3 mb-6 ml-auto w-2/5">
                    <div className="font-medium text-gray-800 mb-1">Destinataire</div>
                    {client.name && <div className="font-semibold">{client.name}</div>}
                    {client.address && <div className="text-gray-600">{client.address}</div>}
                    {(client.postalCode || client.city) && (
                        <div className="text-gray-600">{client.postalCode} {client.city}</div>
                    )}
                </div>

                {/* Object */}
                <div className="mb-4">
                    <span className="font-medium">Objet: </span>
                    <span className="text-gray-700">Achat produits pharmaceutiques</span>
                </div>

                {/* Products Table */}
                <div className="flex-1 mb-4">
                    {settings.showDetails ? (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="text-left p-2 border border-gray-300 font-medium">Désignation</th>
                                    <th className="text-center p-2 border border-gray-300 font-medium w-12">Qté</th>
                                    <th className="text-right p-2 border border-gray-300 font-medium w-20">P.U. HT</th>
                                    {settings.applyVAT && (
                                        <th className="text-center p-2 border border-gray-300 font-medium w-14">TVA</th>
                                    )}
                                    <th className="text-right p-2 border border-gray-300 font-medium w-20">Total HT</th>
                                    <th className="text-right p-2 border border-gray-300 font-medium w-20">Total TTC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.filter(l => l.designation || l.amountHT > 0).map((line) => (
                                    <tr key={line.id}>
                                        <td className="p-2 border border-gray-300">{line.designation || '-'}</td>
                                        <td className="text-center p-2 border border-gray-300">{line.quantity}</td>
                                        <td className="text-right p-2 border border-gray-300">{formatCurrency(line.unitPriceHT)}</td>
                                        {settings.applyVAT && (
                                            <td className="text-center p-2 border border-gray-300">
                                                {VAT_RATES.find(v => v.rate === line.vatRate)?.label}
                                            </td>
                                        )}
                                        <td className="text-right p-2 border border-gray-300">{formatCurrency(line.amountHT)}</td>
                                        <td className="text-right p-2 border border-gray-300 font-medium">{formatCurrency(line.amountTTC)}</td>
                                    </tr>
                                ))}
                                {/* Empty rows if less than 3 lines */}
                                {lines.length < 3 && Array.from({ length: 3 - lines.length }).map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        <td className="p-2 border border-gray-300">&nbsp;</td>
                                        <td className="p-2 border border-gray-300"></td>
                                        <td className="p-2 border border-gray-300"></td>
                                        {settings.applyVAT && <td className="p-2 border border-gray-300"></td>}
                                        <td className="p-2 border border-gray-300"></td>
                                        <td className="p-2 border border-gray-300"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="border border-gray-300 rounded-lg p-4 text-center">
                            <div className="text-gray-600 mb-2">Achat de produits pharmaceutiques</div>
                            <div className="text-lg font-semibold">
                                {formatCurrency(totals.totalTTC)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-4">
                    <div className="w-1/2 space-y-1">
                        <div className="flex justify-between p-2 border-b border-gray-200">
                            <span className="text-gray-600">Total HT</span>
                            <span>{formatCurrency(totals.totalHT)}</span>
                        </div>

                        {/* VAT Summary */}
                        {settings.applyVAT && totals.vatSummary.map((vat) => (
                            <div key={vat.rate} className="flex justify-between p-2 text-gray-600">
                                <span>TVA {VAT_RATES.find(v => v.rate === vat.rate)?.label} sur {formatCurrency(vat.baseHT)}</span>
                                <span>{formatCurrency(vat.amountVAT)}</span>
                            </div>
                        ))}

                        {settings.applyVAT && (
                            <div className="flex justify-between p-2 border-b border-gray-200">
                                <span className="text-gray-600">Total TVA</span>
                                <span>{formatCurrency(totals.totalVAT)}</span>
                            </div>
                        )}

                        <div className="flex justify-between p-3 bg-emerald-50 rounded-lg font-bold text-base">
                            <span>NET À PAYER</span>
                            <span className="text-emerald-700">{formatCurrency(totals.totalTTC)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment */}
                {paymentDate && (
                    <div className="mb-4 text-gray-600">
                        Paiement par {PAYMENT_METHOD_LABELS[paymentMethod]} le {formatDate(paymentDate)}
                    </div>
                )}

                {/* Notes */}
                {notes && (
                    <div className="mb-4 text-gray-500 italic text-[9px]">
                        Note: {notes}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-gray-200 text-center text-[8px] text-gray-400 space-y-0.5">
                    <div className="text-emerald-600 font-medium">{p.website}</div>
                    <div>Pharmactiv Le Relais Santé</div>
                    <div>{getLegalMentions()}</div>
                </div>
            </div>
        </div>
    )
}
