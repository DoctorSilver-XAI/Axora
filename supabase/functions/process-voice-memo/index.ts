// Supabase Edge Function: process-voice-memo
// Transcrit un fichier audio avec OpenAI Whisper
// Déclenché automatiquement via Database Webhook sur INSERT dans voice_memos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
    const { memoId } = await req.json()

    if (!memoId) {
      return new Response(
        JSON.stringify({ error: 'memoId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Créer le client Supabase avec le service role key
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Récupérer le memo
    const { data: memo, error: memoError } = await supabase
      .from('voice_memos')
      .select('*')
      .eq('id', memoId)
      .single()

    if (memoError || !memo) {
      console.error('Memo introuvable:', memoError)
      return new Response(
        JSON.stringify({ error: 'Memo introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier que le memo n'est pas déjà traité
    if (memo.status === 'completed') {
      return new Response(
        JSON.stringify({ message: 'Memo déjà traité' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour le statut → processing
    await supabase
      .from('voice_memos')
      .update({ status: 'processing' })
      .eq('id', memoId)

    // Télécharger l'audio depuis Storage
    const { data: audioData, error: downloadError } = await supabase
      .storage
      .from('audio')
      .download(memo.audio_url)

    if (downloadError || !audioData) {
      console.error('Erreur téléchargement:', downloadError)
      await supabase
        .from('voice_memos')
        .update({
          status: 'error',
          error_message: 'Impossible de télécharger le fichier audio',
          retry_count: (memo.retry_count || 0) + 1,
        })
        .eq('id', memoId)

      return new Response(
        JSON.stringify({ error: 'Erreur téléchargement audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transcription avec OpenAI Whisper
    const formData = new FormData()
    formData.append('file', audioData, memo.audio_filename || 'audio.m4a')
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
        .from('voice_memos')
        .update({
          status: 'error',
          error_message: 'Erreur de transcription Whisper',
          retry_count: (memo.retry_count || 0) + 1,
        })
        .eq('id', memoId)

      return new Response(
        JSON.stringify({ error: 'Erreur transcription Whisper' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transcription = await whisperResponse.text()

    // Générer un titre automatique (première phrase ou premiers mots)
    const autoTitle = transcription
      .split(/[.!?]/)[0]
      .trim()
      .substring(0, 60) || 'Memo vocal'

    // Mettre à jour le memo avec les résultats
    await supabase
      .from('voice_memos')
      .update({
        status: 'completed',
        transcription,
        title: autoTitle,
        processed_at: new Date().toISOString(),
      })
      .eq('id', memoId)

    console.log(`Memo ${memoId} transcrit avec succès`)

    return new Response(
      JSON.stringify({ success: true, transcription, title: autoTitle }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process voice memo error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
