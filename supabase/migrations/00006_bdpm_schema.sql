-- ============================================
-- Migration: BDPM Schema - Tables Normalisées
-- Description: Base de Données Publique des Médicaments (ANSM)
-- Source: https://base-donnees-publique.medicaments.gouv.fr
-- ============================================

-- ============================================
-- 1. TABLE PRINCIPALE : SPÉCIALITÉS (CIS_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_specialites (
  code_cis CHAR(8) PRIMARY KEY,
  denomination TEXT NOT NULL,
  forme_pharmaceutique TEXT,
  voies_administration TEXT[],
  statut_amm VARCHAR(100),
  type_procedure_amm VARCHAR(100),
  etat_commercialisation VARCHAR(100),
  date_amm DATE,
  statut_bdm VARCHAR(50),
  numero_autorisation_europeenne VARCHAR(50),
  titulaires TEXT[],
  surveillance_renforcee BOOLEAN DEFAULT FALSE,

  -- Champs calculés pour RAG
  dci_principal TEXT,
  laboratoire_principal TEXT,

  -- Métadonnées
  is_active BOOLEAN DEFAULT TRUE,
  source_file_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche full-text sur dénomination
CREATE INDEX IF NOT EXISTS idx_bdpm_specialites_denomination
  ON public.bdpm_specialites
  USING gin(to_tsvector('french', denomination));

CREATE INDEX IF NOT EXISTS idx_bdpm_specialites_dci
  ON public.bdpm_specialites(dci_principal);

CREATE INDEX IF NOT EXISTS idx_bdpm_specialites_statut
  ON public.bdpm_specialites(etat_commercialisation);

CREATE INDEX IF NOT EXISTS idx_bdpm_specialites_active
  ON public.bdpm_specialites(is_active);

-- ============================================
-- 2. PRÉSENTATIONS / CIP (CIS_CIP_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_presentations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  code_cip7 CHAR(7),
  code_cip13 CHAR(13),
  libelle TEXT NOT NULL,
  statut_administratif VARCHAR(100),
  etat_commercialisation VARCHAR(100),
  date_commercialisation DATE,
  agrement_collectivites VARCHAR(20),
  taux_remboursement TEXT,
  prix_euro DECIMAL(10,2),
  prix_public_ttc DECIMAL(10,2),
  honoraires_dispensation DECIMAL(10,2),
  indications_remboursement TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_bdpm_cis_cip7 UNIQUE (code_cis, code_cip7)
);

CREATE INDEX IF NOT EXISTS idx_bdpm_presentations_cis
  ON public.bdpm_presentations(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_presentations_cip13
  ON public.bdpm_presentations(code_cip13);

CREATE INDEX IF NOT EXISTS idx_bdpm_presentations_remboursement
  ON public.bdpm_presentations(taux_remboursement);

-- ============================================
-- 3. COMPOSITIONS (CIS_COMPO_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_compositions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  element_pharmaceutique TEXT,
  code_substance INTEGER,
  denomination_substance TEXT NOT NULL,
  dosage TEXT,
  reference_dosage TEXT,
  nature_composant VARCHAR(10),  -- "SA" ou "ST"
  numero_liaison INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_compositions_cis
  ON public.bdpm_compositions(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_compositions_substance
  ON public.bdpm_compositions(denomination_substance);

CREATE INDEX IF NOT EXISTS idx_bdpm_compositions_nature
  ON public.bdpm_compositions(nature_composant);

-- ============================================
-- 4. CONDITIONS DE PRESCRIPTION/DÉLIVRANCE (CIS_CPD_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_conditions_delivrance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  condition TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_conditions_cis
  ON public.bdpm_conditions_delivrance(code_cis);

-- ============================================
-- 5. GROUPES GÉNÉRIQUES (CIS_GENER_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_groupes_generiques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_groupe INTEGER NOT NULL,
  libelle_groupe TEXT NOT NULL,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  type_generique INTEGER NOT NULL,  -- 0=princeps, 1=générique, 2=complémentarité, 4=substituable
  numero_tri INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_generiques_groupe
  ON public.bdpm_groupes_generiques(id_groupe);

CREATE INDEX IF NOT EXISTS idx_bdpm_generiques_cis
  ON public.bdpm_groupes_generiques(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_generiques_type
  ON public.bdpm_groupes_generiques(type_generique);

-- ============================================
-- 6. AVIS SMR HAS (CIS_HAS_SMR_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_avis_smr (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  code_dossier_has VARCHAR(50),
  motif_evaluation TEXT,
  date_avis DATE,
  valeur_smr VARCHAR(50),
  libelle_smr TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_smr_cis
  ON public.bdpm_avis_smr(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_smr_dossier
  ON public.bdpm_avis_smr(code_dossier_has);

CREATE INDEX IF NOT EXISTS idx_bdpm_smr_date
  ON public.bdpm_avis_smr(date_avis DESC);

-- ============================================
-- 7. AVIS ASMR HAS (CIS_HAS_ASMR_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_avis_asmr (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  code_dossier_has VARCHAR(50),
  motif_evaluation TEXT,
  date_avis DATE,
  valeur_asmr VARCHAR(10),
  libelle_asmr TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_asmr_cis
  ON public.bdpm_avis_asmr(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_asmr_dossier
  ON public.bdpm_avis_asmr(code_dossier_has);

-- ============================================
-- 8. LIENS VERS AVIS HAS (HAS_LiensPageCT_bdpm.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_liens_has (
  code_dossier_has VARCHAR(50) PRIMARY KEY,
  lien_url TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ALERTES / INFORMATIONS IMPORTANTES (CIS_InfoImportantes_*.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_alertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  date_debut DATE,
  date_fin DATE,
  texte_alerte TEXT,
  lien_alerte TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_alertes_cis
  ON public.bdpm_alertes(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_alertes_dates
  ON public.bdpm_alertes(date_debut, date_fin);

-- ============================================
-- 10. DISPONIBILITÉ (CIS_CIP_Dispo_Spec.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_disponibilite (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  code_cip13 CHAR(13),
  code_statut INTEGER,  -- 1=rupture, 2=tension, 3=arrêt, 4=remise dispo
  libelle_statut TEXT,
  date_debut DATE,
  date_maj DATE,
  date_remise_dispo DATE,
  lien_ansm TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_disponibilite_cis
  ON public.bdpm_disponibilite(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_disponibilite_statut
  ON public.bdpm_disponibilite(code_statut);

CREATE INDEX IF NOT EXISTS idx_bdpm_disponibilite_cip13
  ON public.bdpm_disponibilite(code_cip13);

-- ============================================
-- 11. MITM - Médicaments d'Intérêt Thérapeutique Majeur (CIS_MITM.txt)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_mitm (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) NOT NULL REFERENCES public.bdpm_specialites(code_cis) ON DELETE CASCADE,
  code_atc VARCHAR(10),
  denomination TEXT,
  lien_bdpm TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdpm_mitm_cis
  ON public.bdpm_mitm(code_cis);

CREATE INDEX IF NOT EXISTS idx_bdpm_mitm_atc
  ON public.bdpm_mitm(code_atc);

-- ============================================
-- 12. TRIGGERS pour updated_at sur specialites
-- ============================================
CREATE OR REPLACE FUNCTION update_bdpm_specialites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bdpm_specialites_updated_at
  BEFORE UPDATE ON public.bdpm_specialites
  FOR EACH ROW
  EXECUTE FUNCTION update_bdpm_specialites_updated_at();

-- ============================================
-- 13. RLS - Accès public en lecture
-- ============================================

-- Spécialités
ALTER TABLE public.bdpm_specialites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_specialites"
  ON public.bdpm_specialites FOR SELECT
  USING (true);

-- Présentations
ALTER TABLE public.bdpm_presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_presentations"
  ON public.bdpm_presentations FOR SELECT
  USING (true);

-- Compositions
ALTER TABLE public.bdpm_compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_compositions"
  ON public.bdpm_compositions FOR SELECT
  USING (true);

-- Conditions de délivrance
ALTER TABLE public.bdpm_conditions_delivrance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_conditions_delivrance"
  ON public.bdpm_conditions_delivrance FOR SELECT
  USING (true);

-- Groupes génériques
ALTER TABLE public.bdpm_groupes_generiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_groupes_generiques"
  ON public.bdpm_groupes_generiques FOR SELECT
  USING (true);

-- Avis SMR
ALTER TABLE public.bdpm_avis_smr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_avis_smr"
  ON public.bdpm_avis_smr FOR SELECT
  USING (true);

-- Avis ASMR
ALTER TABLE public.bdpm_avis_asmr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_avis_asmr"
  ON public.bdpm_avis_asmr FOR SELECT
  USING (true);

-- Liens HAS
ALTER TABLE public.bdpm_liens_has ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_liens_has"
  ON public.bdpm_liens_has FOR SELECT
  USING (true);

-- Alertes
ALTER TABLE public.bdpm_alertes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_alertes"
  ON public.bdpm_alertes FOR SELECT
  USING (true);

-- Disponibilité
ALTER TABLE public.bdpm_disponibilite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_disponibilite"
  ON public.bdpm_disponibilite FOR SELECT
  USING (true);

-- MITM
ALTER TABLE public.bdpm_mitm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for bdpm_mitm"
  ON public.bdpm_mitm FOR SELECT
  USING (true);

-- ============================================
-- 14. COMMENTAIRES
-- ============================================
COMMENT ON TABLE public.bdpm_specialites IS 'Spécialités pharmaceutiques - Table principale BDPM (CIS_bdpm.txt)';
COMMENT ON TABLE public.bdpm_presentations IS 'Présentations/conditionnements des médicaments avec prix et remboursement (CIS_CIP_bdpm.txt)';
COMMENT ON TABLE public.bdpm_compositions IS 'Composition en substances actives et fractions thérapeutiques (CIS_COMPO_bdpm.txt)';
COMMENT ON TABLE public.bdpm_conditions_delivrance IS 'Conditions de prescription et de délivrance (CIS_CPD_bdpm.txt)';
COMMENT ON TABLE public.bdpm_groupes_generiques IS 'Groupes génériques avec princeps et génériques (CIS_GENER_bdpm.txt)';
COMMENT ON TABLE public.bdpm_avis_smr IS 'Avis de Service Médical Rendu de la HAS (CIS_HAS_SMR_bdpm.txt)';
COMMENT ON TABLE public.bdpm_avis_asmr IS 'Avis d''Amélioration du SMR de la HAS (CIS_HAS_ASMR_bdpm.txt)';
COMMENT ON TABLE public.bdpm_liens_has IS 'Liens vers les avis complets de la Commission de Transparence (HAS_LiensPageCT_bdpm.txt)';
COMMENT ON TABLE public.bdpm_alertes IS 'Informations importantes et alertes de sécurité (CIS_InfoImportantes_*.txt)';
COMMENT ON TABLE public.bdpm_disponibilite IS 'État de disponibilité : ruptures, tensions, arrêts (CIS_CIP_Dispo_Spec.txt)';
COMMENT ON TABLE public.bdpm_mitm IS 'Médicaments d''Intérêt Thérapeutique Majeur (CIS_MITM.txt)';
