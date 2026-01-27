export interface AxoraAPI {
  window: {
    openHub: () => void
    closeHub: () => void
    toggleHub: () => void
    minimize: () => void
    maximize: () => void
    close: () => void
    setIgnoreMouse: (ignore: boolean) => void
  }

  phivision: {
    trigger: () => Promise<{ success: boolean }>
    capture: () => Promise<{ success: boolean; imageData: string | null }>
    analyze: (imageData: string) => Promise<{ success: boolean; result: unknown }>
    getPending: () => Promise<{ image: string } | null>
    close: () => void
    onTrigger: (callback: () => void) => () => void
    onResult: (callback: (result: unknown) => void) => () => void
    onStatusChange: (callback: (status: string) => void) => () => void
    onAnalysisResult: (callback: (result: unknown) => void) => () => void
  }

  ai: {
    sendMessage: (message: string, conversationId?: string) => Promise<{ success: boolean }>
    getProviders: () => Promise<string[]>
    setProvider: (provider: string) => Promise<void>
    cancel: () => void
    onStreamChunk: (callback: (chunk: string) => void) => () => void
    onStreamEnd: (callback: () => void) => () => void
  }

  auth: {
    login: (email: string, password: string) => Promise<unknown>
    logout: () => Promise<void>
    register: (email: string, password: string) => Promise<unknown>
    getSession: () => Promise<unknown>
    onSessionChange: (callback: (session: unknown) => void) => () => void
  }

  localConversations: {
    getAll: () => Promise<LocalConversation[]>
    getById: (id: string) => Promise<LocalConversationWithMessages | null>
    create: (provider: string, model?: string) => Promise<LocalConversation>
    updateTitle: (id: string, title: string) => Promise<void>
    delete: (id: string) => Promise<void>
    archive: (id: string) => Promise<void>
    togglePin: (id: string, isPinned: boolean) => Promise<void>
    addMessage: (
      conversationId: string,
      role: 'user' | 'assistant' | 'system',
      content: string,
      provider?: string,
      model?: string
    ) => Promise<LocalMessage>
  }

  ppp: {
    print: () => void
    captureScreen: () => Promise<string>
  }

  cashRegister: {
    getAll: (limit?: number) => Promise<CashClosureData[]>
    getByDate: (date: string) => Promise<CashClosureData | null>
    getLatest: () => Promise<CashClosureData | null>
    save: (data: {
      date: string
      fondsCaisses: Record<string, number | string>
      totalPieces: number
      billetsRetires: Record<string, number | string>
      fondVeille: number
      montantLGPI: number
      results: Record<string, number>
      notes?: string
    }) => Promise<CashClosureData>
    delete: (id: string) => Promise<void>
  }

  bdpm: {
    search: (query: string, limit?: number) => Promise<LocalBDPMSearchResult[]>
    searchByCIP: (cip: string) => Promise<LocalBDPMSearchResult | null>
    getByCodeCIS: (codeCis: string) => Promise<LocalBDPMSearchResult | null>
    getPosologie: (dci: string) => Promise<LocalBDPMPosologie | null>
    getAllPosologies: () => Promise<LocalBDPMPosologie[]>
    isInitialized: () => Promise<boolean>
    count: () => Promise<number>
    importMedicaments: (medicaments: Omit<LocalBDPMMedicament, 'created_at'>[]) => Promise<number>
    importCompositions: (compositions: Omit<LocalBDPMComposition, 'id'>[]) => Promise<number>
    importPresentations: (presentations: Omit<LocalBDPMPresentation, 'id'>[]) => Promise<number>
    importPosologies: (posologies: Omit<LocalBDPMPosologie, 'id' | 'dci_normalized'>[]) => Promise<number>
    clearAll: () => Promise<void>
  }

  platform: NodeJS.Platform
}

export interface LocalConversation {
  id: string
  title: string
  provider: string
  model: string | null
  created_at: string
  updated_at: string
  is_archived: number
  is_pinned: number
}

export interface LocalMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  provider: string | null
  model: string | null
  created_at: string
}

export interface LocalConversationWithMessages extends LocalConversation {
  messages: LocalMessage[]
}

export interface CashClosureData {
  id: string
  date: string
  fonds_caisses_json: string
  total_pieces: number
  billets_retires_json: string
  fond_veille: number
  montant_lgpi: number
  results_json: string
  notes: string | null
  created_at: string
}

// ========== BDPM Types ==========

export interface LocalBDPMMedicament {
  code_cis: string
  denomination: string
  forme_pharmaceutique: string | null
  voies_administration: string | null
  dci_principal: string | null
  laboratoire: string | null
  etat_commercialisation: string
  surveillance_renforcee: number
  created_at: string
}

export interface LocalBDPMComposition {
  id: number
  code_cis: string
  substance: string
  dosage: string | null
  reference_dosage: string | null
}

export interface LocalBDPMPresentation {
  id: number
  code_cis: string
  cip13: string
  cip7: string | null
  libelle: string
  prix: number | null
  remboursement: string | null
  commercialise: number
}

export interface LocalBDPMPosologie {
  id: number
  dci: string
  dci_normalized: string
  mg_per_kg_per_day: number
  max_daily_mg: number
  max_single_dose_mg: number
  default_frequency: number
  min_interval_hours: number
  min_age_months: number | null
  max_age_years: number | null
  notes: string
}

export interface LocalBDPMSearchResult {
  medicament: LocalBDPMMedicament
  compositions: LocalBDPMComposition[]
  presentations: LocalBDPMPresentation[]
  posologie: LocalBDPMPosologie | null
}

export interface IslandAPI {
  window: {
    openHub: () => void
    toggleHub: () => void
    setIgnoreMouse: (ignore: boolean) => void
  }

  phivision: {
    trigger: () => Promise<{ success: boolean }>
    close: () => void
    setStatus: (status: string) => void
    broadcastAnalysisResult: (result: unknown) => void
    onTrigger: (callback: () => void) => () => void
    onStatusChange: (callback: (status: string) => void) => () => void
    onResult: (callback: (result: unknown) => void) => () => void
  }

  platform: NodeJS.Platform
}

declare global {
  interface Window {
    axora: AxoraAPI | IslandAPI
  }
}

export { }
