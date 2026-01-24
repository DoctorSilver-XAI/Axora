-- ============================================
-- VOICE MEMOS (Transcription memos vocaux iPhone)
-- ============================================
-- Table pour stocker les memos vocaux envoyés depuis un iPhone
-- via un Shortcut iOS, avec transcription automatique Whisper

CREATE TABLE public.voice_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Fichier audio source
    audio_url TEXT NOT NULL,               -- Chemin dans le bucket storage (user_id/filename.m4a)
    audio_filename TEXT,                   -- Nom original du fichier
    audio_duration_seconds INTEGER,        -- Durée en secondes (si disponible)
    audio_size_bytes BIGINT,               -- Taille du fichier

    -- Statut du workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Fichier reçu, en attente de traitement
        'processing',   -- Transcription Whisper en cours
        'completed',    -- Transcription terminée
        'error',        -- Erreur de transcription
        'archived'      -- Archivé par l'utilisateur
    )),

    -- Résultat de la transcription
    transcription TEXT,                    -- Transcription brute Whisper

    -- Métadonnées éditables par l'utilisateur
    title TEXT,                            -- Titre (auto-généré puis éditable)
    notes TEXT,                            -- Notes utilisateur

    -- Gestion des erreurs
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- ============================================
-- INDEX
-- ============================================
CREATE INDEX idx_voice_memos_user_id ON public.voice_memos(user_id);
CREATE INDEX idx_voice_memos_status ON public.voice_memos(status);
CREATE INDEX idx_voice_memos_created_at ON public.voice_memos(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.voice_memos ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent gérer leurs propres memos vocaux
CREATE POLICY "Users can manage own voice memos" ON public.voice_memos
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- REALTIME
-- ============================================
-- Activer Realtime pour les notifications de statut en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_memos;

-- ============================================
-- STORAGE BUCKET "audio"
-- ============================================
-- Note: Le bucket doit être créé dans Supabase Dashboard ou via API :
-- - Nom: audio
-- - Public: false
-- - Allowed MIME types: audio/*, audio/x-m4a, audio/mp4, audio/mpeg
-- - Max file size: 50MB

-- IMPORTANT: L'upload se fait via l'Edge Function upload-voice-memo
-- qui utilise le service_role_key (pas besoin de policy INSERT publique)

-- Policies pour le bucket "audio" (à créer dans Dashboard > Storage > Policies) :
--
-- 1. Read policy: "Users can read own audio files"
--    Target: SELECT
--    Expression: (storage.foldername(name))[1] = auth.uid()::text
--
-- 2. Delete policy: "Users can delete own audio files"
--    Target: DELETE
--    Expression: (storage.foldername(name))[1] = auth.uid()::text

-- ============================================
-- WORKFLOW iOS SHORTCUT
-- ============================================
-- Le Shortcut iOS doit appeler l'Edge Function upload-voice-memo :
--
-- URL: https://<project>.supabase.co/functions/v1/upload-voice-memo
-- Méthode: POST
-- Headers:
--   - x-user-id: <votre_user_id>  (UUID de votre compte)
--   - Content-Type: multipart/form-data
-- Body (form-data):
--   - audio: <fichier audio>
--
-- L'Edge Function gère automatiquement :
-- 1. Le stockage du fichier dans le bucket audio
-- 2. La création de l'entrée dans voice_memos
-- 3. Le déclenchement de la transcription Whisper
