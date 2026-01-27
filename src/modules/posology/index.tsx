import { Calculator } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import { ModuleDefinition } from '../core/types'
import { PosologyCalculator } from './components/PosologyCalculator'

// Module definition
const posologyModule: ModuleDefinition = {
  id: 'posology',
  name: 'Calculateur Posologie',
  description: 'Recherche BDPM et calculs de posologie intelligents',
  version: '2.0.0',
  category: 'tools',
  status: 'available',
  icon: Calculator,
  keywords: ['posologie', 'calcul', 'dose', 'poids', 'mg/kg', 'bdpm', 'médicament', 'générique'],
  component: PosologyCalculator,
}

// Register the module
registerModule(posologyModule)

export default posologyModule
