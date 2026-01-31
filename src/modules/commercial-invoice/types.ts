// Types pour le module Commercial Invoice (Facture Commerciale avec TVA)

// Types de clients professionnels
export type ClientType = 'medecin' | 'infirmier' | 'organisme' | 'autre'

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
    medecin: 'Médecin',
    infirmier: 'Infirmier(ère)',
    organisme: 'Organisme',
    autre: 'Autre',
}

// Taux de TVA français pour la pharmacie
export type VATRate = 0 | 2.1 | 5.5 | 10 | 20

export interface VATRateConfig {
    rate: VATRate
    label: string
    description: string
}

export const VAT_RATES: VATRateConfig[] = [
    { rate: 0, label: '0%', description: 'Exonéré' },
    { rate: 2.1, label: '2,1%', description: 'Médicaments remboursables' },
    { rate: 5.5, label: '5,5%', description: 'Produits de première nécessité' },
    { rate: 10, label: '10%', description: 'Dispositifs médicaux' },
    { rate: 20, label: '20%', description: 'Taux normal (parapharmacie)' },
]

// Informations client
export interface InvoiceClient {
    name: string
    address: string
    postalCode: string
    city: string
    clientType: ClientType
}

// Ligne de facture
export interface InvoiceLine {
    id: string
    designation: string
    quantity: number
    unitPriceHT: number
    vatRate: VATRate
    // Champs calculés
    amountHT: number
    amountVAT: number
    amountTTC: number
}

// Récapitulatif TVA par taux
export interface VATSummary {
    rate: VATRate
    baseHT: number
    amountVAT: number
}

// Mode de paiement
export type PaymentMethod = 'cb' | 'especes' | 'cheque' | 'virement' | 'autre'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cb: 'Carte Bancaire',
    especes: 'Espèces',
    cheque: 'Chèque',
    virement: 'Virement',
    autre: 'Autre',
}

// Configuration de la facture
export interface InvoiceSettings {
    applyVAT: boolean       // Appliquer la TVA ou non
    showDetails: boolean    // Afficher les détails des lignes
    defaultVATRate: VATRate // Taux TVA par défaut pour nouvelles lignes
}

// Données complètes de la facture
export interface InvoiceData {
    invoiceNumber: string
    invoiceDate: Date
    client: InvoiceClient
    lines: InvoiceLine[]
    settings: InvoiceSettings
    paymentMethod: PaymentMethod
    paymentDate?: Date
    notes?: string
    // Totaux calculés
    totalHT: number
    totalVAT: number
    totalTTC: number
    vatSummary: VATSummary[]
}

// État initial par défaut
export const DEFAULT_CLIENT: InvoiceClient = {
    name: '',
    address: '',
    postalCode: '',
    city: '',
    clientType: 'autre',
}

export const DEFAULT_SETTINGS: InvoiceSettings = {
    applyVAT: true,
    showDetails: true,
    defaultVATRate: 20,
}

export const createEmptyLine = (): InvoiceLine => ({
    id: crypto.randomUUID(),
    designation: '',
    quantity: 1,
    unitPriceHT: 0,
    vatRate: 20,
    amountHT: 0,
    amountVAT: 0,
    amountTTC: 0,
})
