import { FileText } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import { ModuleDefinition } from '../core/types'
import { PPPGenerator } from './components/PPPGenerator'

// Module definition
const pppModule: ModuleDefinition = {
  id: 'ppp',
  name: 'Plan Personnalisé de Prévention',
  description: 'Générez des bilans de prévention personnalisés pour vos patients',
  version: '1.0.0',
  category: 'tools',
  status: 'available',
  icon: FileText,
  keywords: ['ppp', 'bilan', 'prévention', 'santé', 'patient', 'entretien', 'pharmaceutique'],
  component: PPPGenerator,
}

// Register the module
registerModule(pppModule)

export default pppModule
