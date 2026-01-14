-- ============================================
-- PPP (Plan Personnalisé de Prévention) BILANS
-- ============================================
CREATE TABLE public.ppp_bilans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Informations patient
    patient_name TEXT NOT NULL,
    pharmacist_name TEXT NOT NULL,
    pharmacy_name TEXT NOT NULL,
    ppp_date TEXT NOT NULL,
    age_range TEXT NOT NULL CHECK (age_range IN ('18-25', '45-50', '60-65', '70-75')),

    -- Données d'entrée
    image_url TEXT,
    notes TEXT NOT NULL,

    -- Données générées par l'IA (JSON structuré)
    insights JSONB DEFAULT '[]'::jsonb,     -- Synthèse clinique (usage interne)
    priorities JSONB DEFAULT '[]'::jsonb,   -- Mes priorités en santé
    freins JSONB DEFAULT '[]'::jsonb,       -- Freins rencontrés
    conseils JSONB DEFAULT '[]'::jsonb,     -- Conseils, modalités pratiques
    ressources JSONB DEFAULT '[]'::jsonb,   -- Ressources et intervenants
    suivi JSONB DEFAULT '[]'::jsonb,        -- Modalités de suivi

    -- Opposition médecin
    oppose_medecin BOOLEAN DEFAULT FALSE,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ppp_bilans_user_id ON public.ppp_bilans(user_id);
CREATE INDEX idx_ppp_bilans_created_at ON public.ppp_bilans(created_at DESC);
CREATE INDEX idx_ppp_bilans_patient_name ON public.ppp_bilans(patient_name);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.ppp_bilans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own PPP bilans" ON public.ppp_bilans
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_ppp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ppp_update
    BEFORE UPDATE ON public.ppp_bilans
    FOR EACH ROW EXECUTE FUNCTION public.update_ppp_updated_at();
