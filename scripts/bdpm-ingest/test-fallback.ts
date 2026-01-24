import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testFallback() {
  console.log('=== Test Fallback bdpm_specialites ===\n')

  const query = 'doliprane'

  const { data: specialites } = await supabase
    .from('bdpm_specialites')
    .select(`
      code_cis,
      denomination,
      forme_pharmaceutique,
      titulaires,
      etat_commercialisation,
      surveillance_renforcee,
      dci_principal,
      laboratoire_principal
    `)
    .or(`denomination.ilike.%${query}%,dci_principal.ilike.%${query}%`)
    .limit(5)

  const count = specialites ? specialites.length : 0
  console.log(`Recherche "${query}" - ${count} résultats:\n`)

  if (specialites) {
    specialites.forEach(s => {
      console.log(`• ${s.denomination}`)
      console.log(`  DCI: ${s.dci_principal || 'N/A'}`)
      console.log(`  Labo: ${s.laboratoire_principal || (s.titulaires ? s.titulaires[0] : 'N/A')}`)
      console.log(`  Forme: ${s.forme_pharmaceutique}`)
      console.log('')
    })
  }
}

testFallback().catch(console.error)
