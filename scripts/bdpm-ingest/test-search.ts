import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
  console.log('=== Diagnostic Doliprane ===\n')
  
  // 1. Chercher dans bdpm_specialites (table source)
  const { data: specDoliprane } = await supabase
    .from('bdpm_specialites')
    .select('code_cis, denomination')
    .ilike('denomination', '%doliprane%')
    .limit(5)
  
  console.log('1. DOLIPRANE dans bdpm_specialites:')
  specDoliprane?.forEach(s => console.log(`   → [${s.code_cis}] ${s.denomination}`))
  
  // 2. Vérifier si ces CIS sont dans bdpm_products
  if (specDoliprane?.[0]) {
    const cis = specDoliprane[0].code_cis
    const { data: prod } = await supabase
      .from('bdpm_products')
      .select('id, product_name, code_cis')
      .eq('code_cis', cis)
      .single()
    
    console.log(`\n2. CIS ${cis} dans bdpm_products:`, prod ? 'OUI' : 'NON')
    if (prod) console.log(`   → ${prod.product_name}`)
  }
  
  // 3. Voir les produits dans bdpm_products 
  const { data: sample } = await supabase
    .from('bdpm_products')
    .select('product_name')
    .limit(10)
  
  console.log('\n3. Échantillon bdpm_products:')
  sample?.forEach(s => console.log(`   → ${s.product_name}`))
  
  // 4. Chercher par full-text dans bdpm_specialites directement
  const { data: ftSearch } = await supabase
    .from('bdpm_specialites')
    .select('code_cis, denomination')
    .textSearch('denomination', 'doliprane', { type: 'websearch', config: 'french' })
    .limit(3)
  
  console.log('\n4. Full-text search "doliprane" dans bdpm_specialites:')
  ftSearch?.forEach(s => console.log(`   → ${s.denomination}`))
}

test().catch(console.error)
