-- ============================================
-- AUDIO SESSIONS (Transcription entretiens PPP)
-- ============================================
-- Sessions temporaires pour l'upload et transcription
-- d'enregistrements audio d'entretiens de prévention

CREATE TABLE public.audio_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Token unique pour identifier la session (utilisé dans le QR code)
    token VARCHAR(32) UNIQUE NOT NULL,

    -- Statut du workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- En attente d'upload
        'uploading',    -- Upload en cours
        'processing',   -- Transcription/synthèse en cours
        'completed',    -- Terminé avec succès
        'error'         -- Erreur
    )),

    -- Chemin temporaire de l'audio dans Storage (supprimé après traitement)
    audio_path TEXT,

    -- Résultats
    transcription TEXT,     -- Transcription brute (Whisper)
    synthesis TEXT,         -- Synthèse structurée (GPT-4o)

    -- Gestion des erreurs
    error_message TEXT,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes')
);

-- Index pour lookup rapide par token (utilisé par la webapp mobile)
CREATE INDEX idx_audio_sessions_token ON public.audio_sessions(token);
CREATE INDEX idx_audio_sessions_user_id ON public.audio_sessions(user_id);
CREATE INDEX idx_audio_sessions_expires_at ON public.audio_sessions(expires_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.audio_sessions ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent gérer leurs propres sessions
CREATE POLICY "Users can manage own audio sessions" ON public.audio_sessions
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Note: Le bucket doit être créé manuellement dans Supabase Dashboard
-- ou via l'API Storage avec les paramètres suivants:
-- - Nom: ppp-audio
-- - Public: false
-- - Allowed MIME types: audio/*
-- - Max file size: 50MB

-- ============================================
-- REALTIME
-- ============================================
-- Activer Realtime sur la table pour les notifications de statut
ALTER PUBLICATION supabase_realtime ADD TABLE public.audio_sessions;

-- ============================================
-- CLEANUP FUNCTION (Sessions expirées)
-- ============================================
-- Cette fonction peut être appelée via un cron Supabase (pg_cron)
-- pour nettoyer les sessions expirées

CREATE OR REPLACE FUNCTION public.cleanup_expired_audio_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.audio_sessions
    WHERE expires_at < NOW()
    RETURNING COUNT(*) INTO deleted_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
