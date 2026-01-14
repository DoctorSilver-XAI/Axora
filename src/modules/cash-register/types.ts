// Types pour le module Cash Register

export interface FondsCaisses {
  caisse1: number | string
  caisse2: number | string
  caisse3: number | string
  caisse4: number | string
}

export interface BilletsRetires {
  b10: number | string
  b20: number | string
  b50: number | string
  b100: number | string
  b200: number | string
  b500: number | string
}

export type BilletDenomination = 10 | 20 | 50 | 100 | 200 | 500

export interface BilletConfig {
  value: BilletDenomination
  key: keyof BilletsRetires
  color: string
  bgColor: string
}

export const BILLETS_CONFIG: BilletConfig[] = [
  { value: 10, key: 'b10', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  { value: 20, key: 'b20', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  { value: 50, key: 'b50', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30' },
  { value: 100, key: 'b100', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  { value: 200, key: 'b200', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  { value: 500, key: 'b500', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30' },
]

export interface CashRegisterState {
  fondsCaisses: FondsCaisses
  totalPieces: number | string
  billetsRetires: BilletsRetires
  fondVeille: number | string
  montantLGPI: number | string
}

export interface CashRegisterResults {
  totalFondEspeces: number
  valTotalPieces: number
  valeurBilletsRetires: number
  sommeTotalePhysique: number
  especesGenerees: number
  ecart: number
}

// Types pour la persistance des clôtures de caisse
export interface CashClosure {
  id: string
  date: string // ISO date (YYYY-MM-DD)
  fondsCaisses: FondsCaisses
  totalPieces: number
  billetsRetires: BilletsRetires
  fondVeille: number
  montantLGPI: number
  results: CashRegisterResults
  created_at: string
  notes?: string
}

export interface CashClosureSummary {
  id: string
  date: string
  especesGenerees: number
  ecart: number
  created_at: string
}
