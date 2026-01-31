import { Receipt } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import { ModuleDefinition } from '../core/types'
import { CommercialInvoiceGenerator } from './components/CommercialInvoiceGenerator'

// Module definition
const commercialInvoiceModule: ModuleDefinition = {
    id: 'commercial-invoice',
    name: 'Facture Commerciale',
    description: 'Créez des factures commerciales avec TVA paramétrable pour vos clients professionnels',
    version: '1.0.0',
    category: 'productivity',
    status: 'available',
    icon: Receipt,
    keywords: [
        'facture',
        'invoice',
        'tva',
        'commercial',
        'médecin',
        'infirmier',
        'organisme',
        'professionnel',
        'hors taxe',
        'ttc',
    ],
    component: CommercialInvoiceGenerator,
}

// Register the module
registerModule(commercialInvoiceModule)

export default commercialInvoiceModule
