// Supabase Edge Function: process-audio
// Transcrit un fichier audio avec Whisper et génère une synthèse avec GPT-4o

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Prompt de synthèse médicale
const TRANSCRIPTION_SYNTHESIS_PROMPT = `Tu es un assistant pharmaceutique spécialisé dans la rédaction de comptes-rendus d'entretiens de prévention en officine.

MISSION
À partir de la transcription brute d'un entretien entre un pharmacien et un patient, génère une synthèse structurée et professionnelle qui servira de base pour le Plan Personnalisé de Prévention (PPP).

ENTRÉE
- Transcription audio d'un entretien de prévention (15-30 minutes typiquement)
- Le dialogue peut contenir des erreurs de transcription, des hésitations, des répétitions

RÈGLES D'EXTRACTION
- Extrais UNIQUEMENT les informations explicitement mentionnées dans l'entretien
- Ne fabrique JAMAIS d'informations non présentes dans la transcription
- Si un terme médical semble mal transcrit, propose la correction probable entre parenthèses
- Ignore les bavardages non médicaux (météo, actualités, etc.)

FORMAT DE SORTIE (texte structuré, pas de JSON)

**Motif de l'entretien**
[Raison principale de la consultation : bilan annuel, sortie d'hospitalisation, renouvellement, nouveau traitement, etc.]

**Profil patient**
[Informations démographiques et contexte médical mentionnés : âge approximatif si évoqué, pathologies connues, contexte de vie]

**Traitements évoqués**
[Liste des médicaments mentionnés avec posologie si précisée, observance signalée, difficultés de prise]

**Points de santé abordés**
• [Sujet 1 : résumé des échanges]
• [Sujet 2 : résumé des échanges]
[...]

**Observations du pharmacien**
[Éléments cliniques notés : tension artérielle, poids, glycémie, observations visuelles]

**Freins et difficultés identifiés**
[Obstacles à l'observance, inquiétudes du patient, effets indésirables rapportés, difficultés organisationnelles]

**Conseils et recommandations donnés**
[Conseils délivrés par le pharmacien pendant l'entretien, explications fournies, adaptations suggérées]

**Produits recommandés ou délivrés**
[Médicaments, compléments alimentaires, dispositifs médicaux mentionnés avec leur indication]

**Suivi prévu**
[Prochains rendez-vous évoqués, contrôles à faire, signaux d'alerte mentionnés]

RÈGLES DE RÉDACTION
- Sois concis mais exhaustif sur les éléments médicalement pertinents
- Utilise un vocabulaire pharmaceutique professionnel
- Si une section n'est pas abordée dans l'entretien, indique "[Non abordé]"
- Corrige les fautes de transcription évidentes (médicaments, termes médicaux)
- Garde un ton neutre et factuel`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Créer le client Supabase avec le service role key
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Récupérer la session
    const { data: session, error: sessionError } = await supabase
      .from('audio_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!session.audio_path) {
      return new Response(
        JSON.stringify({ error: 'Aucun fichier audio associé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour le statut → processing
    await supabase
      .from('audio_sessions')
      .update({ status: 'processing' })
      .eq('id', sessionId)

    // Télécharger l'audio depuis Storage
    const { data: audioData, error: downloadError } = await supabase
      .storage
      .from('ppp-audio')
      .download(session.audio_path)

    if (downloadError || !audioData) {
      await supabase
        .from('audio_sessions')
        .update({ status: 'error', error_message: 'Impossible de télécharger l\'audio' })
        .eq('id', sessionId)

      return new Response(
        JSON.stringify({ error: 'Erreur téléchargement audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === ÉTAPE 1: Transcription avec Whisper ===
    const formData = new FormData()
    formData.append('file', audioData, 'audio.m4a')
    formData.append('model', 'whisper-1')
    formData.append('language', 'fr')
    formData.append('response_format', 'text')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Whisper error:', errorText)

      await supabase
        .from('audio_sessions')
        .update({ status: 'error', error_message: 'Erreur de transcription Whisper' })
        .eq('id', sessionId)

      return new Response(
        JSON.stringify({ error: 'Erreur transcription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transcription = await whisperResponse.text()

    // === ÉTAPE 2: Synthèse avec GPT-4o ===
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: TRANSCRIPTION_SYNTHESIS_PROMPT },
          { role: 'user', content: `Voici la transcription de l'entretien de prévention :\n\n${transcription}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text()
      console.error('GPT-4o error:', errorText)

      // Sauvegarder au moins la transcription
      await supabase
        .from('audio_sessions')
        .update({
          status: 'error',
          transcription,
          error_message: 'Erreur de génération de la synthèse',
        })
        .eq('id', sessionId)

      return new Response(
        JSON.stringify({ error: 'Erreur synthèse' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gptData = await gptResponse.json()
    const synthesis = gptData.choices[0]?.message?.content || ''

    // === ÉTAPE 3: Supprimer l'audio (RGPD) ===
    await supabase
      .storage
      .from('ppp-audio')
      .remove([session.audio_path])

    // === ÉTAPE 4: Mettre à jour la session avec les résultats ===
    await supabase
      .from('audio_sessions')
      .update({
        status: 'completed',
        transcription,
        synthesis,
        audio_path: null, // Audio supprimé
      })
      .eq('id', sessionId)

    return new Response(
      JSON.stringify({ success: true, transcription, synthesis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process audio error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
