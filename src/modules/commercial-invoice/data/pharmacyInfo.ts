// Informations de la pharmacie pour les factures

export interface PharmacyInfo {
    name: string
    address: string
    postalCode: string
    city: string
    phone: string
    fax: string
    email: string
    website: string
    siret: string
    vatNumber: string  // N° TVA intracommunautaire
    capital: string
    rcs: string
    legalForm: string
}

export const PHARMACY_INFO: PharmacyInfo = {
    name: 'Grande Pharmacie de Tassigny',
    address: '1598 avenue Maréchal De Lattre de Tassigny',
    postalCode: '83600',
    city: 'Fréjus',
    phone: '04 94 51 58 02',
    fax: '04 94 53 75 94',
    email: 'grandepharmaciedetassigny@gmail.com',
    website: 'www.grande-pharmacie-tassigny-frejus.com',
    siret: '81850458100013',
    vatNumber: 'FR77818504581',
    capital: '100000€',
    rcs: '818504581 FREJUS',
    legalForm: 'SELARL',
}

/**
 * Formate le numéro de téléphone pour l'affichage
 */
export const formatPhoneNumber = (phone: string): string => {
    return phone.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

/**
 * Obtient le texte complet des mentions légales
 */
export const getLegalMentions = (): string => {
    const p = PHARMACY_INFO
    return `${p.legalForm} au capital de ${p.capital} - RCS ${p.rcs} - SIRET ${p.siret} - N° TVA intracommunautaire ${p.vatNumber}`
}
