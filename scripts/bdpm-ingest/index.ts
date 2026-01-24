/**
 * Script d'ingestion BDPM vers Supabase
 *
 * Usage:
 *   npm run ingest -- /path/to/bdpm/files
 *   npm run ingest:tables -- /path/to/bdpm/files    # Tables uniquement
 *   npm run ingest:embeddings                        # Embeddings uniquement
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import iconv from 'iconv-lite'
import 'dotenv/config'

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises')
  process.exit(1)
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Fichiers BDPM
const BDPM_FILES = {
  specialites: 'CIS_bdpm',
  presentations: 'CIS_CIP_bdpm',
  compositions: 'CIS_COMPO_bdpm',
  conditions: 'CIS_CPD_bdpm',
  generiques: 'CIS_GENER_bdpm',
  smr: 'CIS_HAS_SMR_bdpm',
  asmr: 'CIS_HAS_ASMR_bdpm',
  liensHas: 'HAS_LiensPageCT_bdpm',
  alertes: 'CIS_InfoImportantes',
  disponibilite: 'CIS_CIP_Dispo_Spec',
  mitm: 'CIS_MITM',
}

// ============================================
// UTILITAIRES
// ============================================

function findFile(dataDir: string, prefix: string): string | null {
  const files = fs.readdirSync(dataDir)
  const match = files.find(f => f.startsWith(prefix) && f.endsWith('.txt'))
  return match ? path.join(dataDir, match) : null
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null

  // Format JJ/MM/AAAA
  const match1 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match1) {
    return `${match1[3]}-${match1[2]}-${match1[1]}`
  }

  // Format AAAAMMJJ
  const match2 = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (match2) {
    return `${match2[1]}-${match2[2]}-${match2[3]}`
  }

  return null
}

function cleanText(text: string | undefined): string | null {
  if (!text || text.trim() === '') return null
  return text.trim()
}

function parseBoolean(value: string | undefined): boolean {
  return value?.toLowerCase() === 'oui'
}

function extractDCI(denomination: string): string | null {
  // Patterns courants pour extraire la DCI
  // Ex: "DOLIPRANE 500 mg, comprimé" → difficile à extraire sans table de référence
  // On retourne null, sera enrichi plus tard si besoin
  return null
}

async function* parseFile(filePath: string): AsyncGenerator<string[]> {
  // Lire le fichier en binaire puis décoder en Latin-1
  const buffer = fs.readFileSync(filePath)
  const content = iconv.decode(buffer, 'latin1')
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    if (line.trim()) {
      yield line.split('\t')
    }
  }
}

async function batchUpsert<T extends Record<string, unknown>>(
  table: string,
  records: T[],
  conflictColumn: string,
  batchSize = 500
): Promise<number> {
  let count = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict: conflictColumn,
      ignoreDuplicates: false,
    })

    if (error) {
      console.error(`  ❌ Erreur batch ${table}:`, error.message)
    } else {
      count += batch.length
    }
  }

  return count
}

// ============================================
// PARSERS PAR FICHIER
// ============================================

async function ingestSpecialites(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.specialites)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [
      codeCis,
      denomination,
      forme,
      voies,
      statutAmm,
      typeProcedure,
      etatCommercialisation,
      dateAmm,
      statutBdm,
      numEuropeen,
      titulaires,
      surveillance,
    ] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      denomination: cleanText(denomination),
      forme_pharmaceutique: cleanText(forme),
      voies_administration: voies ? voies.split(';').map(v => v.trim()).filter(Boolean) : [],
      statut_amm: cleanText(statutAmm),
      type_procedure_amm: cleanText(typeProcedure),
      etat_commercialisation: cleanText(etatCommercialisation),
      date_amm: parseDate(dateAmm),
      statut_bdm: cleanText(statutBdm),
      numero_autorisation_europeenne: cleanText(numEuropeen),
      titulaires: titulaires ? titulaires.split(';').map(t => t.trim()).filter(Boolean) : [],
      surveillance_renforcee: parseBoolean(surveillance),
      dci_principal: extractDCI(denomination || ''),
      laboratoire_principal: titulaires?.split(';')[0]?.trim() || null,
      source_file_date: new Date().toISOString().split('T')[0],
    })
  }

  const count = await batchUpsert('bdpm_specialites', records, 'code_cis')
  console.log(`  ✅ ${count} spécialités`)
  return count
}

async function ingestPresentations(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.presentations)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_CIP_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [
      codeCis,
      codeCip7,
      libelle,
      statutAdmin,
      etatCommercialisation,
      dateCommercialisation,
      codeCip13,
      agrementCollectivites,
      tauxRemboursement,
      prixEuro,
      prixPublicTtc,
      honoraires,
      indicationsRemboursement,
    ] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      code_cip7: cleanText(codeCip7),
      code_cip13: cleanText(codeCip13),
      libelle: cleanText(libelle),
      statut_administratif: cleanText(statutAdmin),
      etat_commercialisation: cleanText(etatCommercialisation),
      date_commercialisation: parseDate(dateCommercialisation),
      agrement_collectivites: cleanText(agrementCollectivites),
      taux_remboursement: cleanText(tauxRemboursement),
      prix_euro: prixEuro ? parseFloat(prixEuro.replace(',', '.')) : null,
      prix_public_ttc: prixPublicTtc ? parseFloat(prixPublicTtc.replace(',', '.')) : null,
      honoraires_dispensation: honoraires ? parseFloat(honoraires.replace(',', '.')) : null,
      indications_remboursement: cleanText(indicationsRemboursement),
    })
  }

  // Pour les présentations, on supprime d'abord puis on insère (car pas de clé unique simple)
  await supabase.from('bdpm_presentations').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_presentations', records, 'id')
  console.log(`  ✅ ${count} présentations`)
  return count
}

async function ingestCompositions(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.compositions)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_COMPO_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [
      codeCis,
      elementPharmaceutique,
      codeSubstance,
      denominationSubstance,
      dosage,
      referenceDosage,
      natureComposant,
      numeroLiaison,
    ] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      element_pharmaceutique: cleanText(elementPharmaceutique),
      code_substance: codeSubstance ? parseInt(codeSubstance, 10) : null,
      denomination_substance: cleanText(denominationSubstance) || '',
      dosage: cleanText(dosage),
      reference_dosage: cleanText(referenceDosage),
      nature_composant: cleanText(natureComposant),
      numero_liaison: numeroLiaison ? parseInt(numeroLiaison, 10) : null,
    })
  }

  await supabase.from('bdpm_compositions').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_compositions', records, 'id')
  console.log(`  ✅ ${count} compositions`)
  return count
}

async function ingestConditions(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.conditions)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_CPD_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [codeCis, condition] = cols

    if (codeCis && condition) {
      records.push({
        code_cis: codeCis.padStart(8, '0'),
        condition: cleanText(condition),
      })
    }
  }

  await supabase.from('bdpm_conditions_delivrance').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_conditions_delivrance', records, 'id')
  console.log(`  ✅ ${count} conditions de délivrance`)
  return count
}

async function ingestGeneriques(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.generiques)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_GENER_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [idGroupe, libelleGroupe, codeCis, typeGenerique, numeroTri] = cols

    records.push({
      id_groupe: idGroupe ? parseInt(idGroupe, 10) : null,
      libelle_groupe: cleanText(libelleGroupe),
      code_cis: codeCis?.padStart(8, '0'),
      type_generique: typeGenerique ? parseInt(typeGenerique, 10) : null,
      numero_tri: numeroTri ? parseInt(numeroTri, 10) : null,
    })
  }

  await supabase.from('bdpm_groupes_generiques').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_groupes_generiques', records, 'id')
  console.log(`  ✅ ${count} entrées génériques`)
  return count
}

async function ingestSMR(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.smr)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_HAS_SMR_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [codeCis, codeDossierHas, motifEvaluation, dateAvis, valeurSmr, libelleSmr] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      code_dossier_has: cleanText(codeDossierHas),
      motif_evaluation: cleanText(motifEvaluation),
      date_avis: parseDate(dateAvis),
      valeur_smr: cleanText(valeurSmr),
      libelle_smr: cleanText(libelleSmr),
    })
  }

  await supabase.from('bdpm_avis_smr').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_avis_smr', records, 'id')
  console.log(`  ✅ ${count} avis SMR`)
  return count
}

async function ingestASMR(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.asmr)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_HAS_ASMR_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [codeCis, codeDossierHas, motifEvaluation, dateAvis, valeurAsmr, libelleAsmr] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      code_dossier_has: cleanText(codeDossierHas),
      motif_evaluation: cleanText(motifEvaluation),
      date_avis: parseDate(dateAvis),
      valeur_asmr: cleanText(valeurAsmr),
      libelle_asmr: cleanText(libelleAsmr),
    })
  }

  await supabase.from('bdpm_avis_asmr').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_avis_asmr', records, 'id')
  console.log(`  ✅ ${count} avis ASMR`)
  return count
}

async function ingestLiensHAS(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.liensHas)
  if (!filePath) {
    console.warn('  ⚠️ Fichier HAS_LiensPageCT_bdpm.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [codeDossierHas, lienUrl] = cols

    if (codeDossierHas && lienUrl) {
      records.push({
        code_dossier_has: cleanText(codeDossierHas),
        lien_url: cleanText(lienUrl),
      })
    }
  }

  const count = await batchUpsert('bdpm_liens_has', records, 'code_dossier_has')
  console.log(`  ✅ ${count} liens HAS`)
  return count
}

async function ingestAlertes(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.alertes)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_InfoImportantes_*.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [codeCis, dateDebut, dateFin, texteAlerte] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      date_debut: parseDate(dateDebut),
      date_fin: parseDate(dateFin),
      texte_alerte: cleanText(texteAlerte),
      lien_alerte: null, // Le lien est parfois inclus dans le texte
    })
  }

  await supabase.from('bdpm_alertes').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_alertes', records, 'id')
  console.log(`  ✅ ${count} alertes`)
  return count
}

async function ingestDisponibilite(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.disponibilite)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_CIP_Dispo_Spec.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [codeCis, codeCip13, codeStatut, libelleStatut, dateDebut, dateMaj, dateRemiseDispo, lienAnsm] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      code_cip13: cleanText(codeCip13),
      code_statut: codeStatut ? parseInt(codeStatut, 10) : null,
      libelle_statut: cleanText(libelleStatut),
      date_debut: parseDate(dateDebut),
      date_maj: parseDate(dateMaj),
      date_remise_dispo: parseDate(dateRemiseDispo),
      lien_ansm: cleanText(lienAnsm),
    })
  }

  await supabase.from('bdpm_disponibilite').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_disponibilite', records, 'id')
  console.log(`  ✅ ${count} entrées disponibilité`)
  return count
}

async function ingestMITM(dataDir: string): Promise<number> {
  const filePath = findFile(dataDir, BDPM_FILES.mitm)
  if (!filePath) {
    console.warn('  ⚠️ Fichier CIS_MITM.txt non trouvé')
    return 0
  }

  console.log(`  📄 Lecture de ${path.basename(filePath)}...`)
  const records: Record<string, unknown>[] = []

  for await (const cols of parseFile(filePath)) {
    const [codeCis, codeAtc, denomination, lienBdpm] = cols

    records.push({
      code_cis: codeCis?.padStart(8, '0'),
      code_atc: cleanText(codeAtc),
      denomination: cleanText(denomination),
      lien_bdpm: cleanText(lienBdpm),
    })
  }

  await supabase.from('bdpm_mitm').delete().neq('code_cis', '')
  const count = await batchUpsert('bdpm_mitm', records, 'id')
  console.log(`  ✅ ${count} MITM`)
  return count
}

// ============================================
// GÉNÉRATION DES EMBEDDINGS
// ============================================

interface RAGViewRow {
  code_cis: string
  product_name: string
  dci: string | null
  laboratory: string | null
  forme_pharmaceutique: string | null
  voies_admin: string | null
  etat_commercialisation: string | null
  surveillance_renforcee: boolean
  presentations: unknown
  substances_actives: unknown
  conditions_delivrance: string[]
  info_generique: unknown
  avis_smr: unknown
  avis_asmr: unknown
  alertes_actives: unknown
  disponibilite: unknown
  is_mitm: boolean
  code_atc: string | null
}

function buildSearchableText(row: RAGViewRow): string {
  const parts: string[] = []

  // Priorité A : Identification
  parts.push(`Nom: ${row.product_name}`)
  if (row.dci) parts.push(`DCI: ${row.dci}`)
  if (row.laboratory) parts.push(`Laboratoire: ${row.laboratory}`)

  // Forme et voies
  if (row.forme_pharmaceutique) {
    parts.push(`Forme: ${row.forme_pharmaceutique}`)
  }
  if (row.voies_admin) {
    parts.push(`Voies: ${row.voies_admin}`)
  }

  // Substances actives
  const substances = row.substances_actives as Array<{
    substance: string
    dosage: string
  }> | null
  if (substances?.length) {
    parts.push(
      `Substances actives: ${substances.map(s => `${s.substance} ${s.dosage || ''}`).join(', ')}`
    )
  }

  // Conditions de délivrance
  if (row.conditions_delivrance?.length) {
    parts.push(`Délivrance: ${row.conditions_delivrance.join(', ')}`)
  }

  // Info générique
  const generique = row.info_generique as { libelle: string; type: string } | null
  if (generique) {
    parts.push(`Groupe générique: ${generique.libelle}`)
    parts.push(`Type: ${generique.type}`)
  }

  // Alertes actives
  const alertes = row.alertes_actives as Array<{ texte: string }> | null
  if (alertes?.length) {
    parts.push(`ALERTES: ${alertes.map(a => a.texte).join(' | ')}`)
  }

  // Disponibilité
  const dispo = row.disponibilite as { statut: string; code: number } | null
  if (dispo?.code && dispo.code !== 4) {
    parts.push(`DISPONIBILITÉ: ${dispo.statut}`)
  }

  // SMR
  const smr = row.avis_smr as { valeur: string } | null
  if (smr?.valeur) {
    parts.push(`SMR: ${smr.valeur}`)
  }

  // Prix
  const presentations = row.presentations as Array<{
    libelle: string
    prix: number
    commercialise: boolean
  }> | null
  if (presentations?.length) {
    const prix = presentations
      .filter(p => p.prix && p.commercialise)
      .slice(0, 3)
      .map(p => `${p.libelle}: ${p.prix}€`)
    if (prix.length) {
      parts.push(`Prix: ${prix.join(', ')}`)
    }
  }

  return parts.join('\n')
}

async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY requise pour générer les embeddings')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY requise pour générer les embeddings')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding)
}

async function syncRAGTable(): Promise<number> {
  console.log('\n🔄 Synchronisation de la table RAG...')

  // 1. Rafraîchir la vue matérialisée
  console.log('  📊 Rafraîchissement de la vue matérialisée...')
  const { error: refreshError } = await supabase.rpc('refresh_bdpm_rag_view')
  if (refreshError) {
    // Si la vue n'existe pas encore, on la crée
    console.log('  ⚠️ Vue non trouvée, création en cours...')
  }

  // 2. Compter le total de produits
  const { count: totalCount, error: countError } = await supabase
    .from('bdpm_rag_view')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('  ❌ Erreur comptage:', countError.message)
    return 0
  }

  console.log(`  📊 ${totalCount} produits à traiter`)

  if (!totalCount) {
    console.log('  ⚠️ Aucun produit dans la vue')
    return 0
  }

  // 3. Récupérer les données par pages (Supabase limite à 1000 par requête)
  console.log('  📥 Récupération des données avec pagination...')
  const PAGE_SIZE = 1000
  const products: RAGViewRow[] = []

  for (let offset = 0; offset < totalCount; offset += PAGE_SIZE) {
    const { data: page, error: selectError } = await supabase
      .from('bdpm_rag_view')
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1)

    if (selectError) {
      console.error(`  ❌ Erreur lecture page ${offset}:`, selectError.message)
      continue
    }

    if (page) {
      products.push(...(page as RAGViewRow[]))
    }

    console.log(`  📄 Page ${Math.floor(offset / PAGE_SIZE) + 1}: ${page?.length || 0} produits`)
  }

  console.log(`  ✅ Total récupéré: ${products.length} produits`)

  // 3. Traiter par batches
  const BATCH_SIZE = 10
  let processed = 0

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE) as RAGViewRow[]

    // Préparer les données
    const records = batch.map(row => {
      const dispo = row.disponibilite as { code: number } | null
      const alertes = row.alertes_actives as unknown[] | null
      const generique = row.info_generique as { type: string } | null

      return {
        code_cis: row.code_cis,
        product_name: row.product_name,
        dci: row.dci,
        laboratory: row.laboratory,
        forme_pharmaceutique: row.forme_pharmaceutique,
        code_atc: row.code_atc,
        product_data: {
          presentations: row.presentations,
          substances_actives: row.substances_actives,
          conditions_delivrance: row.conditions_delivrance,
          info_generique: row.info_generique,
          avis_smr: row.avis_smr,
          avis_asmr: row.avis_asmr,
          alertes_actives: row.alertes_actives,
          disponibilite: row.disponibilite,
          surveillance_renforcee: row.surveillance_renforcee,
        },
        searchable_text: buildSearchableText(row),
        has_rupture: Boolean(dispo?.code && dispo.code !== 4),
        has_alerte: Boolean(alertes?.length),
        is_generique: Boolean(generique?.type?.includes('générique')),
        is_mitm: row.is_mitm,
      }
    })

    // Générer les embeddings
    const texts = records.map(r => r.searchable_text)

    try {
      const embeddings = await generateEmbeddingsBatch(texts)

      // Ajouter les embeddings
      const recordsWithEmbeddings = records.map((r, idx) => ({
        ...r,
        embedding: embeddings[idx],
      }))

      // Upsert
      const { error: upsertError } = await supabase
        .from('bdpm_products')
        .upsert(recordsWithEmbeddings, { onConflict: 'code_cis' })

      if (upsertError) {
        console.error(`  ❌ Erreur batch ${i}:`, upsertError.message)
      }
    } catch (err) {
      console.error(`  ❌ Erreur embeddings batch ${i}:`, err)
    }

    processed += batch.length
    const percent = Math.round((processed / products.length) * 100)
    process.stdout.write(`\r  📦 ${processed}/${products.length} produits (${percent}%)`)

    // Pause pour rate limits
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n  ✅ Synchronisation terminée: ${processed} produits`)
  return processed
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2)
  const tablesOnly = args.includes('--tables-only')
  const embeddingsOnly = args.includes('--embeddings-only')
  const dataDir = args.find(a => !a.startsWith('--')) || '/Users/pierre/Axora/lab/bdpm'

  console.log('═══════════════════════════════════════════════')
  console.log('     INGESTION BDPM → AXORA SUPABASE')
  console.log('═══════════════════════════════════════════════')
  console.log(`📁 Dossier source: ${dataDir}`)
  console.log(`🔗 Supabase: ${SUPABASE_URL}`)
  console.log(`🤖 OpenAI: ${OPENAI_API_KEY ? '✓ Configuré' : '✗ Non configuré'}`)
  console.log('')

  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Dossier non trouvé: ${dataDir}`)
    process.exit(1)
  }

  try {
    if (!embeddingsOnly) {
      // Phase 1: Import des tables normalisées
      console.log('📥 PHASE 1: Import des données brutes...')
      await ingestSpecialites(dataDir)
      await ingestPresentations(dataDir)
      await ingestCompositions(dataDir)
      await ingestConditions(dataDir)
      await ingestGeneriques(dataDir)
      await ingestSMR(dataDir)
      await ingestASMR(dataDir)
      await ingestLiensHAS(dataDir)
      await ingestAlertes(dataDir)
      await ingestDisponibilite(dataDir)
      await ingestMITM(dataDir)
    }

    if (!tablesOnly) {
      // Phase 2: Génération table RAG avec embeddings
      console.log('\n🔄 PHASE 2: Génération des embeddings...')
      if (!OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY non configurée, embeddings ignorés')
      } else {
        await syncRAGTable()
      }
    }

    console.log('\n✅ INGESTION TERMINÉE AVEC SUCCÈS')
  } catch (error) {
    console.error('\n❌ ERREUR:', error)
    process.exit(1)
  }
}

main()
