// Supabase Edge Function: upload-voice-memo
// Point d'entrée unique pour le Shortcut iOS
// Accepte le fichier audio en body brut OU en form-data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Récupérer le user_id depuis le header
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Header x-user-id manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Valider que c'est un UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ error: 'user_id invalide (doit être un UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer le fichier audio (body brut ou form-data)
    const contentType = req.headers.get('content-type') || ''
    let audioBuffer: ArrayBuffer
    let mimeType = 'audio/x-m4a'

    if (contentType.includes('multipart/form-data')) {
      // Mode form-data
      const formData = await req.formData()
      const audioFile = formData.get('audio') as File | null

      if (!audioFile) {
        return new Response(
          JSON.stringify({ error: 'Fichier audio manquant (champ "audio")' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      audioBuffer = await audioFile.arrayBuffer()
      mimeType = audioFile.type || 'audio/x-m4a'
    } else {
      // Mode body brut (raw) - iOS Shortcuts envoie souvent comme ça
      audioBuffer = await req.arrayBuffer()

      if (audioBuffer.byteLength === 0) {
        return new Response(
          JSON.stringify({ error: 'Fichier audio vide' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Déterminer le type MIME depuis le header
      if (contentType.includes('audio/')) {
        mimeType = contentType.split(';')[0].trim()
      }
    }

    // Générer le nom du fichier
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const extension = mimeType.includes('m4a') ? 'm4a' :
                      mimeType.includes('mp4') ? 'm4a' :
                      mimeType.includes('mpeg') ? 'mp3' :
                      mimeType.includes('wav') ? 'wav' : 'm4a'
    const filename = `${timestamp}.${extension}`
    const storagePath = `${userId}/${filename}`

    // Créer le client Supabase avec service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Vérifier que l'utilisateur existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upload vers Storage
    const { error: uploadError } = await supabase
      .storage
      .from('audio')
      .upload(storagePath, audioBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Erreur upload:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'upload du fichier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Créer l'entrée dans voice_memos
    const { data: memo, error: insertError } = await supabase
      .from('voice_memos')
      .insert({
        user_id: userId,
        audio_url: storagePath,
        audio_filename: filename,
        audio_size_bytes: audioBuffer.byteLength,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erreur insert:', insertError)
      // Cleanup: supprimer le fichier uploadé
      await supabase.storage.from('audio').remove([storagePath])
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du memo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Déclencher la transcription via supabase.functions.invoke
    // Plus fiable que fetch() dans l'environnement Edge Functions
    supabase.functions.invoke('process-voice-memo', {
      body: { memoId: memo.id },
    }).then(({ error }) => {
      if (error) {
        console.error('Erreur déclenchement transcription:', error)
      } else {
        console.log('Transcription déclenchée pour memo:', memo.id)
      }
    }).catch(err => {
      console.error('Erreur invoke process-voice-memo:', err)
    })

    console.log(`Memo créé: ${memo.id} pour user ${userId}`)

    return new Response(
      JSON.stringify({
        success: true,
        memoId: memo.id,
        audioPath: storagePath,
        message: 'Audio uploadé, transcription en cours...',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Upload voice memo error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
