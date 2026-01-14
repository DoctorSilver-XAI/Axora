/**
 * RAG Studio - Module d'administration des bases vectorielles
 */

import { Database } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import { ModuleDefinition } from '../core/types'
import { RAGStudioMain } from './components/RAGStudioMain'

const ragStudioModule: ModuleDefinition = {
  id: 'rag-studio',
  name: 'RAG Studio',
  description: 'Administration des bases vectorielles et pipelines d\'ingestion',
  version: '1.0.0',
  category: 'tools',
  status: 'beta',
  icon: Database,
  keywords: [
    'rag',
    'vectoriel',
    'embedding',
    'ingestion',
    'index',
    'ia',
    'enrichissement',
    'base de données',
    'catalogue',
  ],
  component: RAGStudioMain,
}

registerModule(ragStudioModule)

export default ragStudioModule
