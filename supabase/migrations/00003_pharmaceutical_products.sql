-- ============================================
-- Migration: Pharmaceutical Products RAG System
-- Description: Table avec embeddings pgvector + full-text search
-- ============================================

-- 1. Activer l'extension pgvector (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table principale des produits pharmaceutiques
CREATE TABLE IF NOT EXISTS public.pharmaceutical_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identité produit
  product_code VARCHAR(50) UNIQUE NOT NULL,  -- CIP13, CIS ou code interne
  product_name TEXT NOT NULL,
  dci TEXT,                                   -- Dénomination Commune Internationale
  laboratory TEXT,
  atc_code VARCHAR(10),                       -- Code ATC (Anatomical Therapeutic Chemical)
  dosage_form TEXT,                           -- Forme galénique

  -- Données structurées complètes (ton schéma JSON)
  product_data JSONB NOT NULL,

  -- Texte searchable pour full-text
  searchable_text TEXT NOT NULL,

  -- Vecteur généré automatiquement pour full-text search français
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(product_name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(dci, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(searchable_text, '')), 'B')
  ) STORED,

  -- Embedding pour recherche sémantique (OpenAI text-embedding-3-small = 1536 dim)
  embedding VECTOR(1536),

  -- Métadonnées
  category TEXT,                              -- Catégorie thérapeutique
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index pour recherche vectorielle (HNSW - optimal pour < 100k vecteurs)
CREATE INDEX IF NOT EXISTS idx_products_embedding
  ON public.pharmaceutical_products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Index GIN pour full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.pharmaceutical_products
  USING gin (search_vector);

-- 5. Index pour filtres courants
CREATE INDEX IF NOT EXISTS idx_products_category ON public.pharmaceutical_products(category);
CREATE INDEX IF NOT EXISTS idx_products_atc ON public.pharmaceutical_products(atc_code);
CREATE INDEX IF NOT EXISTS idx_products_dci ON public.pharmaceutical_products(dci);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.pharmaceutical_products(is_active);

-- 6. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_pharmaceutical_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pharmaceutical_products_updated_at
  BEFORE UPDATE ON public.pharmaceutical_products
  FOR EACH ROW
  EXECUTE FUNCTION update_pharmaceutical_products_updated_at();

-- 7. RLS (Row Level Security)
ALTER TABLE public.pharmaceutical_products ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs authentifiés (produits actifs uniquement)
CREATE POLICY "Authenticated users can read active products"
  ON public.pharmaceutical_products FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- ============================================
-- FONCTIONS RPC POUR RECHERCHE HYBRIDE
-- ============================================

-- 8. Recherche hybride (Vector + Full-text combinés)
CREATE OR REPLACE FUNCTION search_products_hybrid(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  vector_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3,
  category_filter TEXT DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  product_code VARCHAR(50),
  product_name TEXT,
  dci TEXT,
  category TEXT,
  product_data JSONB,
  vector_score FLOAT,
  text_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    -- Recherche par similarité vectorielle (cosine)
    SELECT
      p.id,
      1 - (p.embedding <=> query_embedding) AS v_score
    FROM public.pharmaceutical_products p
    WHERE p.is_active = TRUE
      AND (category_filter IS NULL OR p.category = category_filter)
      AND p.embedding IS NOT NULL
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_search AS (
    -- Recherche full-text française
    SELECT
      p.id,
      ts_rank_cd(p.search_vector, plainto_tsquery('french', query_text)) AS t_score
    FROM public.pharmaceutical_products p
    WHERE p.is_active = TRUE
      AND (category_filter IS NULL OR p.category = category_filter)
      AND p.search_vector @@ plainto_tsquery('french', query_text)
    LIMIT match_count * 2
  ),
  combined AS (
    -- Fusion des résultats avec scoring pondéré
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
    p.product_code,
    p.product_name,
    p.dci,
    p.category,
    p.product_data,
    c.vector_score::FLOAT,
    c.text_score::FLOAT,
    c.combined_score::FLOAT
  FROM combined c
  JOIN public.pharmaceutical_products p ON p.id = c.id
  WHERE c.combined_score >= similarity_threshold
    OR c.vector_score >= similarity_threshold
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- 9. Recherche sémantique pure (vector only)
CREATE OR REPLACE FUNCTION search_products_semantic(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  category_filter TEXT DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  product_code VARCHAR(50),
  product_name TEXT,
  dci TEXT,
  category TEXT,
  product_data JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.product_code,
    p.product_name,
    p.dci,
    p.category,
    p.product_data,
    (1 - (p.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.pharmaceutical_products p
  WHERE p.is_active = TRUE
    AND (category_filter IS NULL OR p.category = category_filter)
    AND p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 10. Recherche full-text pure (keywords only)
CREATE OR REPLACE FUNCTION search_products_fulltext(
  query_text TEXT,
  match_count INT DEFAULT 10,
  category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  product_code VARCHAR(50),
  product_name TEXT,
  dci TEXT,
  category TEXT,
  product_data JSONB,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.product_code,
    p.product_name,
    p.dci,
    p.category,
    p.product_data,
    ts_rank_cd(p.search_vector, plainto_tsquery('french', query_text))::FLOAT AS rank
  FROM public.pharmaceutical_products p
  WHERE p.is_active = TRUE
    AND (category_filter IS NULL OR p.category = category_filter)
    AND p.search_vector @@ plainto_tsquery('french', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- 11. Commentaires pour documentation
COMMENT ON TABLE public.pharmaceutical_products IS 'Catalogue de produits pharmaceutiques avec embeddings pour recherche RAG hybride';
COMMENT ON COLUMN public.pharmaceutical_products.embedding IS 'Vecteur 1536-dim généré par OpenAI text-embedding-3-small';
COMMENT ON COLUMN public.pharmaceutical_products.search_vector IS 'tsvector français auto-généré pour full-text search';
COMMENT ON COLUMN public.pharmaceutical_products.product_data IS 'Données complètes du produit au format JSON standardisé';
COMMENT ON FUNCTION search_products_hybrid IS 'Recherche hybride combinant similarité vectorielle (70%) et full-text (30%)';
