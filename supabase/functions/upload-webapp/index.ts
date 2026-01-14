// Supabase Edge Function: upload-webapp
// Sert une mini webapp mobile pour uploader l'audio depuis iPhone
// et gère l'upload vers Storage + déclenchement du processing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Headers pour les réponses HTML - force l'affichage inline et autorise scripts/styles
const htmlHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Disposition': 'inline',
  'X-Content-Type-Options': 'nosniff',
  // Override le CSP restrictif de Supabase - sandbox avec permissions
  'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';",
}

// HTML de la mini webapp mobile
const getUploadPage = (token: string, error?: string, success?: boolean) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Axora - Upload Audio</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: white;
    }
    .container {
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .subtitle {
      color: rgba(255,255,255,0.6);
      font-size: 14px;
      margin-bottom: 32px;
    }
    .upload-zone {
      background: rgba(255,255,255,0.05);
      border: 2px dashed rgba(255,255,255,0.2);
      border-radius: 16px;
      padding: 32px 24px;
      margin-bottom: 16px;
      transition: all 0.3s ease;
    }
    .upload-zone.dragover {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }
    .upload-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .upload-text {
      font-size: 16px;
      margin-bottom: 8px;
    }
    .upload-hint {
      font-size: 12px;
      color: rgba(255,255,255,0.4);
    }
    input[type="file"] {
      display: none;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .selected-file {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-icon {
      font-size: 24px;
    }
    .file-info {
      flex: 1;
      text-align: left;
    }
    .file-name {
      font-weight: 500;
      font-size: 14px;
      word-break: break-all;
    }
    .file-size {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
    }
    .remove-file {
      background: rgba(239, 68, 68, 0.2);
      border: none;
      color: #ef4444;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
    }
    .progress-container {
      margin-top: 16px;
    }
    .progress-bar {
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      margin-top: 8px;
    }
    .error {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .success {
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #86efac;
      padding: 24px;
      border-radius: 16px;
      text-align: center;
    }
    .success-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .success h2 {
      font-size: 20px;
      margin-bottom: 8px;
    }
    .success p {
      font-size: 14px;
      color: rgba(134, 239, 172, 0.8);
    }
    .hidden {
      display: none;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🎙️</div>
    <h1>Axora PPP</h1>
    <p class="subtitle">Importez votre enregistrement d'entretien</p>

    ${error ? `<div class="error">⚠️ ${error}</div>` : ''}

    <div id="upload-section" class="${success ? 'hidden' : ''}">
      <div class="upload-zone" id="drop-zone">
        <div class="upload-icon">📁</div>
        <p class="upload-text">Sélectionnez un fichier audio</p>
        <p class="upload-hint">M4A, MP3, WAV • Max 50 MB</p>
      </div>

      <div id="file-preview" class="hidden">
        <div class="selected-file">
          <span class="file-icon">🎵</span>
          <div class="file-info">
            <div class="file-name" id="file-name"></div>
            <div class="file-size" id="file-size"></div>
          </div>
          <button class="remove-file" id="remove-file">✕</button>
        </div>
      </div>

      <input type="file" id="file-input" accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.webm">

      <button class="btn btn-primary" id="select-btn">
        📂 Choisir depuis Fichiers
      </button>

      <button class="btn btn-primary hidden" id="upload-btn" disabled>
        <span id="upload-btn-text">📤 Envoyer</span>
        <div class="spinner hidden" id="spinner"></div>
      </button>

      <div class="progress-container hidden" id="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
        </div>
        <p class="progress-text" id="progress-text">Envoi en cours...</p>
      </div>
    </div>

    <div id="success-section" class="${success ? '' : 'hidden'}">
      <div class="success">
        <div class="success-icon">✅</div>
        <h2>Upload réussi !</h2>
        <p>Retournez sur Axora pour voir la synthèse.</p>
        <p style="margin-top: 16px; font-size: 12px; opacity: 0.7;">
          Vous pouvez fermer cette page.
        </p>
      </div>
    </div>
  </div>

  <script>
    const token = '${token}';
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('select-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadBtnText = document.getElementById('upload-btn-text');
    const spinner = document.getElementById('spinner');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeFile = document.getElementById('remove-file');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const uploadSection = document.getElementById('upload-section');
    const successSection = document.getElementById('success-section');

    let selectedFile = null;

    // Format file size
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Handle file selection
    function handleFile(file) {
      if (!file) return;

      // Validate size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert('Fichier trop volumineux. Maximum 50 MB.');
        return;
      }

      selectedFile = file;
      fileName.textContent = file.name;
      fileSize.textContent = formatSize(file.size);

      filePreview.classList.remove('hidden');
      selectBtn.classList.add('hidden');
      uploadBtn.classList.remove('hidden');
      uploadBtn.disabled = false;
    }

    // Click to select
    selectBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', () => {
      if (!selectedFile) fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      handleFile(e.target.files[0]);
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      handleFile(e.dataTransfer.files[0]);
    });

    // Remove file
    removeFile.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      filePreview.classList.add('hidden');
      selectBtn.classList.remove('hidden');
      uploadBtn.classList.add('hidden');
    });

    // Upload
    uploadBtn.addEventListener('click', async () => {
      if (!selectedFile) return;

      uploadBtn.disabled = true;
      uploadBtnText.textContent = 'Envoi...';
      spinner.classList.remove('hidden');
      progressContainer.classList.remove('hidden');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('token', token);

      try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = 'Envoi: ' + percent + '%';
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            progressFill.style.width = '100%';
            progressText.textContent = 'Traitement en cours...';

            setTimeout(() => {
              uploadSection.classList.add('hidden');
              successSection.classList.remove('hidden');
            }, 500);
          } else {
            const error = JSON.parse(xhr.responseText);
            alert('Erreur: ' + (error.error || 'Upload échoué'));
            uploadBtn.disabled = false;
            uploadBtnText.textContent = '📤 Envoyer';
            spinner.classList.add('hidden');
            progressContainer.classList.add('hidden');
          }
        });

        xhr.addEventListener('error', () => {
          alert('Erreur réseau. Vérifiez votre connexion.');
          uploadBtn.disabled = false;
          uploadBtnText.textContent = '📤 Envoyer';
          spinner.classList.add('hidden');
          progressContainer.classList.add('hidden');
        });

        xhr.open('POST', window.location.href);
        xhr.send(formData);

      } catch (err) {
        alert('Erreur: ' + err.message);
        uploadBtn.disabled = false;
        uploadBtnText.textContent = '📤 Envoyer';
        spinner.classList.add('hidden');
        progressContainer.classList.add('hidden');
      }
    });
  </script>
</body>
</html>
`

// Page d'erreur HTML simple
const getErrorPage = (message: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur - Axora</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #1a1a2e;
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      margin: 0;
    }
    .error-box {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      max-width: 400px;
    }
    .error-icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { color: rgba(255,255,255,0.7); font-size: 14px; }
  </style>
</head>
<body>
  <div class="error-box">
    <div class="error-icon">⚠️</div>
    <h1>Erreur</h1>
    <p>${message}</p>
  </div>
</body>
</html>
`

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Vérifier les variables d'environnement
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing env vars:', { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY })
      return new Response(
        getErrorPage('Configuration serveur incomplète. Contactez le support.'),
        { headers: htmlHeaders }
      )
    }

    // Validate token
    if (!token) {
      return new Response(
        getUploadPage('', 'Token manquant. Veuillez rescanner le QR code.'),
        { headers: htmlHeaders }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Check session exists and is valid
  const { data: session, error: sessionError } = await supabase
    .from('audio_sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (sessionError || !session) {
    return new Response(
      getUploadPage(token, 'Session invalide ou expirée. Veuillez générer un nouveau QR code.'),
      { headers: htmlHeaders }
    )
  }

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    return new Response(
      getUploadPage(token, 'Session expirée. Veuillez générer un nouveau QR code.'),
      { headers: htmlHeaders }
    )
  }

  // GET: Show upload page
  if (req.method === 'GET') {
    const isCompleted = session.status === 'completed'
    return new Response(
      getUploadPage(token, undefined, isCompleted),
      { headers: htmlHeaders }
    )
  }

  // POST: Handle file upload
  if (req.method === 'POST') {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'Aucun fichier fourni' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update status to uploading
      await supabase
        .from('audio_sessions')
        .update({ status: 'uploading' })
        .eq('id', session.id)

      // Generate unique filename
      const ext = file.name.split('.').pop() || 'm4a'
      const audioPath = `${session.id}/${Date.now()}.${ext}`

      // Upload to Storage
      const { error: uploadError } = await supabase
        .storage
        .from('ppp-audio')
        .upload(audioPath, file, {
          contentType: file.type || 'audio/m4a',
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        await supabase
          .from('audio_sessions')
          .update({ status: 'error', error_message: 'Erreur lors de l\'upload' })
          .eq('id', session.id)

        return new Response(
          JSON.stringify({ error: 'Erreur upload Storage' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update session with audio path
      await supabase
        .from('audio_sessions')
        .update({ audio_path: audioPath, status: 'processing' })
        .eq('id', session.id)

      // Trigger processing (call process-audio function)
      const processUrl = `${SUPABASE_URL}/functions/v1/process-audio`
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sessionId: session.id }),
      }).catch(err => {
        console.error('Error triggering process-audio:', err)
      })

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Upload error:', error)
      return new Response(
        JSON.stringify({ error: 'Erreur lors du traitement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

    return new Response('Method not allowed', { status: 405 })

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      getErrorPage('Une erreur inattendue est survenue. Veuillez réessayer.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
})
