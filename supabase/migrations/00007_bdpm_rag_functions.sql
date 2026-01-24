-- ============================================
-- Migration: BDPM RAG - Vue matérialisée et fonctions de recherche
-- Dépend de: 00006_bdpm_schema.sql
-- ============================================

-- ============================================
-- 1. VUE MATÉRIALISÉE pour agrégation RAG
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.bdpm_rag_view AS
SELECT
  s.code_cis,
  s.denomination AS product_name,
  s.dci_principal AS dci,
  s.laboratoire_principal AS laboratory,
  s.forme_pharmaceutique,
  ARRAY_TO_STRING(s.voies_administration, ', ') AS voies_admin,
  s.etat_commercialisation,
  s.surveillance_renforcee,

  -- Présentations (agrégées en JSONB)
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'cip13', p.code_cip13,
      'cip7', p.code_cip7,
      'libelle', p.libelle,
      'prix', p.prix_public_ttc,
      'remboursement', p.taux_remboursement,
      'commercialise', p.etat_commercialisation = 'Déclaration de commercialisation'
    ) ORDER BY p.prix_public_ttc), '[]'::jsonb)
    FROM public.bdpm_presentations p
    WHERE p.code_cis = s.code_cis
  ) AS presentations,

  -- Substances actives uniquement (nature_composant = 'SA')
  (
    SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
      'substance', c.denomination_substance,
      'dosage', c.dosage,
      'reference', c.reference_dosage
    )), '[]'::jsonb)
    FROM public.bdpm_compositions c
    WHERE c.code_cis = s.code_cis AND c.nature_composant = 'SA'
  ) AS substances_actives,

  -- Conditions de délivrance
  (
    SELECT COALESCE(array_agg(DISTINCT cd.condition), ARRAY[]::TEXT[])
    FROM public.bdpm_conditions_delivrance cd
    WHERE cd.code_cis = s.code_cis
  ) AS conditions_delivrance,

  -- Info générique (premier groupe trouvé)
  (
    SELECT jsonb_build_object(
      'id_groupe', gg.id_groupe,
      'libelle', gg.libelle_groupe,
      'type', CASE gg.type_generique
        WHEN 0 THEN 'princeps'
        WHEN 1 THEN 'générique'
        WHEN 2 THEN 'complémentarité posologique'
        WHEN 4 THEN 'générique substituable'
        ELSE 'autre'
      END,
      'type_code', gg.type_generique
    )
    FROM public.bdpm_groupes_generiques gg
    WHERE gg.code_cis = s.code_cis
    ORDER BY gg.type_generique
    LIMIT 1
  ) AS info_generique,

  -- Avis SMR le plus récent
  (
    SELECT jsonb_build_object(
      'valeur', smr.valeur_smr,
      'libelle', smr.libelle_smr,
      'date', smr.date_avis,
      'motif', smr.motif_evaluation
    )
    FROM public.bdpm_avis_smr smr
    WHERE smr.code_cis = s.code_cis
    ORDER BY smr.date_avis DESC NULLS LAST
    LIMIT 1
  ) AS avis_smr,

  -- Avis ASMR le plus récent
  (
    SELECT jsonb_build_object(
      'valeur', asmr.valeur_asmr,
      'libelle', asmr.libelle_asmr,
      'date', asmr.date_avis,
      'motif', asmr.motif_evaluation
    )
    FROM public.bdpm_avis_asmr asmr
    WHERE asmr.code_cis = s.code_cis
    ORDER BY asmr.date_avis DESC NULLS LAST
    LIMIT 1
  ) AS avis_asmr,

  -- Alertes actives (date_fin NULL ou >= aujourd'hui)
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'texte', a.texte_alerte,
      'lien', a.lien_alerte,
      'date_debut', a.date_debut,
      'date_fin', a.date_fin
    )), '[]'::jsonb)
    FROM public.bdpm_alertes a
    WHERE a.code_cis = s.code_cis
      AND (a.date_fin IS NULL OR a.date_fin >= CURRENT_DATE)
  ) AS alertes_actives,

  -- Disponibilité (état le plus récent)
  (
    SELECT jsonb_build_object(
      'statut', d.libelle_statut,
      'code', d.code_statut,
      'date_debut', d.date_debut,
      'date_maj', d.date_maj,
      'date_remise', d.date_remise_dispo,
      'lien', d.lien_ansm
    )
    FROM public.bdpm_disponibilite d
    WHERE d.code_cis = s.code_cis
    ORDER BY d.date_maj DESC NULLS LAST
    LIMIT 1
  ) AS disponibilite,

  -- Est un MITM ?
  EXISTS(SELECT 1 FROM public.bdpm_mitm m WHERE m.code_cis = s.code_cis) AS is_mitm,

  -- Code ATC (depuis MITM si disponible)
  (SELECT m.code_atc FROM public.bdpm_mitm m WHERE m.code_cis = s.code_cis LIMIT 1) AS code_atc

FROM public.bdpm_specialites s
WHERE s.is_active = TRUE;

-- Index unique sur la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_bdpm_rag_view_cis
  ON public.bdpm_rag_view(code_cis);

-- ============================================
-- 2. FONCTION pour rafraîchir la vue
-- ============================================
CREATE OR REPLACE FUNCTION refresh_bdpm_rag_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.bdpm_rag_view;
END;
$$;

-- ============================================
-- 3. TABLE RAG avec embeddings (bdpm_products)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bdpm_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_cis CHAR(8) UNIQUE NOT NULL,

  -- Données dénormalisées pour performance
  product_name TEXT NOT NULL,
  dci TEXT,
  laboratory TEXT,
  forme_pharmaceutique TEXT,
  code_atc VARCHAR(10),

  -- JSONB complet pour le contexte LLM
  product_data JSONB NOT NULL,

  -- Texte searchable pour full-text
  searchable_text TEXT NOT NULL,

  -- Full-text search français (généré automatiquement)
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(product_name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(dci, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(laboratory, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(searchable_text, '')), 'B')
  ) STORED,

  -- Embedding pour recherche sémantique (OpenAI text-embedding-3-small)
  embedding VECTOR(1536),

  -- Catégorisation
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,

  -- Flags spéciaux BDPM
  has_rupture BOOLEAN DEFAULT FALSE,
  has_alerte BOOLEAN DEFAULT FALSE,
  is_generique BOOLEAN DEFAULT FALSE,
  is_mitm BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index HNSW pour vector search
CREATE INDEX IF NOT EXISTS idx_bdpm_products_embedding
  ON public.bdpm_products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index GIN pour full-text search
CREATE INDEX IF NOT EXISTS idx_bdpm_products_search
  ON public.bdpm_products
  USING gin (search_vector);

-- Index pour filtres
CREATE INDEX IF NOT EXISTS idx_bdpm_products_dci ON public.bdpm_products(dci);
CREATE INDEX IF NOT EXISTS idx_bdpm_products_active ON public.bdpm_products(is_active);
CREATE INDEX IF NOT EXISTS idx_bdpm_products_rupture ON public.bdpm_products(has_rupture);
CREATE INDEX IF NOT EXISTS idx_bdpm_products_alerte ON public.bdpm_products(has_alerte);
CREATE INDEX IF NOT EXISTS idx_bdpm_products_generique ON public.bdpm_products(is_generique);
CREATE INDEX IF NOT EXISTS idx_bdpm_products_atc ON public.bdpm_products(code_atc);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_bdpm_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bdpm_products_updated_at
  BEFORE UPDATE ON public.bdpm_products
  FOR EACH ROW
  EXECUTE FUNCTION update_bdpm_products_updated_at();

-- RLS - Accès public en lecture
ALTER TABLE public.bdpm_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for bdpm_products"
  ON public.bdpm_products FOR SELECT
  USING (true);

-- ============================================
-- 4. FONCTION RPC : Recherche hybride BDPM
-- ============================================
CREATE OR REPLACE FUNCTION search_bdpm_hybrid(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  vector_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3,
  include_ruptures BOOLEAN DEFAULT TRUE,
  only_commercialised BOOLEAN DEFAULT FALSE,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  code_cis CHAR(8),
  product_name TEXT,
  dci TEXT,
  laboratory TEXT,
  product_data JSONB,
  has_rupture BOOLEAN,
  has_alerte BOOLEAN,
  is_generique BOOLEAN,
  is_mitm BOOLEAN,
  vector_score FLOAT,
  text_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      p.id,
      1 - (p.embedding <=> query_embedding) AS v_score
    FROM public.bdpm_products p
    WHERE p.is_active = TRUE
      AND p.embedding IS NOT NULL
      AND (include_ruptures OR NOT p.has_rupture)
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  text_search AS (
    SELECT
      p.id,
      ts_rank_cd(p.search_vector, plainto_tsquery('french', query_text)) AS t_score
    FROM public.bdpm_products p
    WHERE p.is_active = TRUE
      AND p.search_vector @@ plainto_tsquery('french', query_text)
      AND (include_ruptures OR NOT p.has_rupture)
    LIMIT match_count * 3
  ),
  combined AS (
    SELECT
      COALESCE(v.id, t.id) AS id,
      COALESCE(v.v_score, 0) AS vector_score,
      COALESCE(t.t_score, 0) AS text_score,
      (COALESCE(v.v_score, 0) * vector_weight + COALESCE(t.t_score, 0) * text_weight) AS combined_score
    FROM vector_search v
    FULL OUTER JOIN text_search t ON v.id = t.id
  )
  SELECT
    p.id,
    p.code_cis,
    p.product_name,
    p.dci,
    p.laboratory,
    p.product_data,
    p.has_rupture,
    p.has_alerte,
    p.is_generique,
    p.is_mitm,
    c.vector_score::FLOAT,
    c.text_score::FLOAT,
    c.combined_score::FLOAT
  FROM combined c
  JOIN public.bdpm_products p ON p.id = c.id
  WHERE c.combined_score >= similarity_threshold
     OR c.vector_score >= similarity_threshold
  ORDER BY
    -- Prioriser les produits avec alertes (important pour sécurité)
    p.has_alerte DESC,
    c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- 5. FONCTION RPC : Recherche par code CIP
-- ============================================
CREATE OR REPLACE FUNCTION search_bdpm_by_cip(
  cip_code TEXT
)
RETURNS TABLE (
  id UUID,
  code_cis CHAR(8),
  product_name TEXT,
  dci TEXT,
  laboratory TEXT,
  product_data JSONB,
  has_rupture BOOLEAN,
  has_alerte BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_cip TEXT;
BEGIN
  -- Normaliser le code CIP (retirer espaces, tirets)
  normalized_cip := REGEXP_REPLACE(cip_code, '[\s\-]', '', 'g');

  RETURN QUERY
  SELECT
    bp.id,
    bp.code_cis,
    bp.product_name,
    bp.dci,
    bp.laboratory,
    bp.product_data,
    bp.has_rupture,
    bp.has_alerte
  FROM public.bdpm_products bp
  WHERE bp.is_active = TRUE
    AND (
      -- Recherche dans le JSONB des présentations
      bp.product_data->'presentations' @> jsonb_build_array(jsonb_build_object('cip13', normalized_cip))
      OR bp.product_data->'presentations' @> jsonb_build_array(jsonb_build_object('cip7', normalized_cip))
      -- Ou via la table des présentations pour CIP13
      OR bp.code_cis IN (
        SELECT pres.code_cis
        FROM public.bdpm_presentations pres
        WHERE pres.code_cip13 = normalized_cip
           OR pres.code_cip7 = normalized_cip
      )
    )
  LIMIT 1;
END;
$$;

-- ============================================
-- 6. FONCTION RPC : Recherche par code CIS
-- ============================================
CREATE OR REPLACE FUNCTION search_bdpm_by_cis(
  cis_code TEXT
)
RETURNS TABLE (
  id UUID,
  code_cis CHAR(8),
  product_name TEXT,
  dci TEXT,
  laboratory TEXT,
  product_data JSONB,
  has_rupture BOOLEAN,
  has_alerte BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.code_cis,
    bp.product_name,
    bp.dci,
    bp.laboratory,
    bp.product_data,
    bp.has_rupture,
    bp.has_alerte
  FROM public.bdpm_products bp
  WHERE bp.code_cis = LPAD(cis_code, 8, '0')
    AND bp.is_active = TRUE
  LIMIT 1;
END;
$$;

-- ============================================
-- 7. FONCTION RPC : Recherche des génériques
-- ============================================
CREATE OR REPLACE FUNCTION search_bdpm_generiques(
  cis_code TEXT
)
RETURNS TABLE (
  id UUID,
  code_cis CHAR(8),
  product_name TEXT,
  laboratory TEXT,
  type_generique TEXT,
  type_code INTEGER,
  product_data JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_groupe_id INTEGER;
BEGIN
  -- Trouver le groupe générique du médicament
  SELECT gg.id_groupe INTO v_groupe_id
  FROM public.bdpm_groupes_generiques gg
  WHERE gg.code_cis = LPAD(cis_code, 8, '0')
  LIMIT 1;

  IF v_groupe_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bp.id,
    bp.code_cis,
    bp.product_name,
    bp.laboratory,
    CASE (bp.product_data->'info_generique'->>'type_code')::INTEGER
      WHEN 0 THEN 'Princeps'
      WHEN 1 THEN 'Générique'
      WHEN 2 THEN 'Complémentarité posologique'
      WHEN 4 THEN 'Générique substituable'
      ELSE 'Autre'
    END AS type_generique,
    (bp.product_data->'info_generique'->>'type_code')::INTEGER AS type_code,
    bp.product_data
  FROM public.bdpm_products bp
  WHERE bp.code_cis IN (
    SELECT gg.code_cis
    FROM public.bdpm_groupes_generiques gg
    WHERE gg.id_groupe = v_groupe_id
  )
  AND bp.is_active = TRUE
  ORDER BY
    (bp.product_data->'info_generique'->>'type_code')::INTEGER,
    bp.product_name;
END;
$$;

-- ============================================
-- 8. FONCTION RPC : Recherche par DCI
-- ============================================
CREATE OR REPLACE FUNCTION search_bdpm_by_dci(
  dci_search TEXT,
  max_results INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  code_cis CHAR(8),
  product_name TEXT,
  dci TEXT,
  laboratory TEXT,
  product_data JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.code_cis,
    bp.product_name,
    bp.dci,
    bp.laboratory,
    bp.product_data
  FROM public.bdpm_products bp
  WHERE bp.is_active = TRUE
    AND bp.dci ILIKE '%' || dci_search || '%'
  ORDER BY
    -- Prioriser les correspondances exactes
    CASE WHEN LOWER(bp.dci) = LOWER(dci_search) THEN 0 ELSE 1 END,
    bp.product_name
  LIMIT max_results;
END;
$$;

-- ============================================
-- 9. FONCTION RPC : Liste des ruptures
-- ============================================
CREATE OR REPLACE FUNCTION get_bdpm_ruptures(
  max_results INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  code_cis CHAR(8),
  product_name TEXT,
  dci TEXT,
  disponibilite JSONB,
  product_data JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.code_cis,
    bp.product_name,
    bp.dci,
    bp.product_data->'disponibilite' AS disponibilite,
    bp.product_data
  FROM public.bdpm_products bp
  WHERE bp.has_rupture = TRUE
    AND bp.is_active = TRUE
  ORDER BY
    (bp.product_data->'disponibilite'->>'date_maj')::DATE DESC NULLS LAST
  LIMIT max_results;
END;
$$;

-- ============================================
-- 10. FONCTION RPC : Liste des alertes
-- ============================================
CREATE OR REPLACE FUNCTION get_bdpm_alertes(
  max_results INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  code_cis CHAR(8),
  product_name TEXT,
  dci TEXT,
  alertes JSONB,
  product_data JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.code_cis,
    bp.product_name,
    bp.dci,
    bp.product_data->'alertes_actives' AS alertes,
    bp.product_data
  FROM public.bdpm_products bp
  WHERE bp.has_alerte = TRUE
    AND bp.is_active = TRUE
  ORDER BY bp.product_name
  LIMIT max_results;
END;
$$;

-- ============================================
-- 11. COMMENTAIRES
-- ============================================
COMMENT ON MATERIALIZED VIEW public.bdpm_rag_view IS 'Vue agrégée des données BDPM pour génération des embeddings RAG';
COMMENT ON TABLE public.bdpm_products IS 'Catalogue BDPM avec embeddings pour recherche RAG hybride';
COMMENT ON FUNCTION search_bdpm_hybrid IS 'Recherche hybride combinant similarité vectorielle (70%) et full-text (30%)';
COMMENT ON FUNCTION search_bdpm_by_cip IS 'Recherche exacte par code CIP (13 ou 7 chiffres)';
COMMENT ON FUNCTION search_bdpm_by_cis IS 'Recherche exacte par code CIS (8 chiffres)';
COMMENT ON FUNCTION search_bdpm_generiques IS 'Liste tous les médicaments d''un même groupe générique';
COMMENT ON FUNCTION search_bdpm_by_dci IS 'Recherche par DCI (substance active)';
COMMENT ON FUNCTION get_bdpm_ruptures IS 'Liste des médicaments en rupture de stock ou tension';
COMMENT ON FUNCTION get_bdpm_alertes IS 'Liste des médicaments avec alertes de sécurité actives';
COMMENT ON FUNCTION refresh_bdpm_rag_view IS 'Rafraîchit la vue matérialisée BDPM (à appeler après import)';
