import { Wallet } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import { ModuleDefinition } from '../core/types'
import { CashRegisterCalculator } from './components/CashRegisterCalculator'

const cashRegisterModule: ModuleDefinition = {
  id: 'cash-register',
  name: 'Calcul de Caisse',
  description: 'Calculez et vérifiez votre caisse en fin de journée',
  version: '1.0.0',
  category: 'productivity',
  status: 'available',
  icon: Wallet,
  keywords: ['caisse', 'espèces', 'monnaie', 'billets', 'comptage', 'fermeture', 'LGPI', 'banque'],
  component: CashRegisterCalculator,
}

registerModule(cashRegisterModule)

export default cashRegisterModule
