-- Migration: Tables pour index RAG custom
-- Date: 2026-01-16
-- Description: Permet aux utilisateurs de créer leurs propres index RAG depuis l'interface

-- ============================================================================
-- TABLE: DÉFINITIONS D'INDEX CUSTOM
-- ============================================================================

CREATE TABLE public.custom_rag_indexes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Identité
  slug VARCHAR(100) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'Database',
  category VARCHAR(50) DEFAULT 'custom',

  -- Configuration
  schema_config JSONB DEFAULT '{}',
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  search_weights JSONB DEFAULT '{"vector": 0.7, "text": 0.3}',

  -- État
  status VARCHAR(20) DEFAULT 'active',
  document_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT unique_user_slug UNIQUE (user_id, slug)
);

-- Index pour performance
CREATE INDEX idx_custom_indexes_user_id ON public.custom_rag_indexes(user_id);
CREATE INDEX idx_custom_indexes_status ON public.custom_rag_indexes(status);

-- ============================================================================
-- TABLE: DOCUMENTS CUSTOM
-- ============================================================================

CREATE TABLE public.custom_rag_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  index_id UUID REFERENCES public.custom_rag_indexes(id) ON DELETE CASCADE NOT NULL,

  -- Contenu
  title TEXT,
  content JSONB NOT NULL,
  searchable_text TEXT NOT NULL,

  -- Vecteur full-text (généré automatiquement)
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(searchable_text, ''))
  ) STORED,

  -- Embedding vectoriel
  embedding VECTOR(1536),

  -- Métadonnées
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_custom_docs_index_id ON public.custom_rag_documents(index_id);
CREATE INDEX idx_custom_docs_is_active ON public.custom_rag_documents(is_active);
CREATE INDEX idx_custom_docs_created_at ON public.custom_rag_documents(created_at DESC);

-- Index HNSW pour recherche vectorielle
CREATE INDEX idx_custom_docs_embedding ON public.custom_rag_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index GIN pour recherche full-text française
CREATE INDEX idx_custom_docs_search_vector ON public.custom_rag_documents
  USING gin(search_vector);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.custom_rag_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rag_documents ENABLE ROW LEVEL SECURITY;

-- Policies pour custom_rag_indexes
CREATE POLICY "Users can view their own indexes"
  ON public.custom_rag_indexes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own indexes"
  ON public.custom_rag_indexes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own indexes"
  ON public.custom_rag_indexes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own indexes"
  ON public.custom_rag_indexes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies pour custom_rag_documents (basées sur l'index parent)
CREATE POLICY "Users can view documents from their indexes"
  ON public.custom_rag_documents FOR SELECT
  TO authenticated
  USING (
    index_id IN (SELECT id FROM public.custom_rag_indexes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert documents into their indexes"
  ON public.custom_rag_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    index_id IN (SELECT id FROM public.custom_rag_indexes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update documents in their indexes"
  ON public.custom_rag_documents FOR UPDATE
  TO authenticated
  USING (
    index_id IN (SELECT id FROM public.custom_rag_indexes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete documents from their indexes"
  ON public.custom_rag_documents FOR DELETE
  TO authenticated
  USING (
    index_id IN (SELECT id FROM public.custom_rag_indexes WHERE user_id = auth.uid())
  );

-- ============================================================================
-- FONCTION RPC: RECHERCHE HYBRIDE CUSTOM
-- ============================================================================

CREATE OR REPLACE FUNCTION search_custom_index(
  p_index_id UUID,
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  vector_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  metadata JSONB,
  vector_score FLOAT,
  text_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Vérifier que l'utilisateur possède cet index
  SELECT user_id INTO v_user_id
  FROM public.custom_rag_indexes
  WHERE custom_rag_indexes.id = p_index_id;

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Index non trouvé ou accès non autorisé';
  END IF;

  RETURN QUERY
  WITH vector_search AS (
    SELECT
      d.id,
      1 - (d.embedding <=> query_embedding) AS v_score
    FROM public.custom_rag_documents d
    WHERE d.index_id = p_index_id
      AND d.is_active = TRUE
      AND d.embedding IS NOT NULL
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_search AS (
    SELECT
      d.id,
      ts_rank_cd(d.search_vector, plainto_tsquery('french', query_text)) AS t_score
    FROM public.custom_rag_documents d
    WHERE d.index_id = p_index_id
      AND d.is_active = TRUE
      AND d.search_vector @@ plainto_tsquery('french', query_text)
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, t.id) AS doc_id,
      COALESCE(v.v_score, 0) AS vector_score,
      COALESCE(t.t_score, 0) AS text_score,
      (COALESCE(v.v_score, 0) * vector_weight + COALESCE(t.t_score, 0) * text_weight) AS combined_score
    FROM vector_search v
    FULL OUTER JOIN text_search t ON v.id = t.id
  )
  SELECT
    d.id,
    d.title,
    d.content,
    d.metadata,
    c.vector_score::FLOAT,
    c.text_score::FLOAT,
    c.combined_score::FLOAT
  FROM combined c
  JOIN public.custom_rag_documents d ON d.id = c.doc_id
  WHERE c.combined_score >= similarity_threshold
     OR c.vector_score >= similarity_threshold
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- TRIGGER: MISE À JOUR AUTOMATIQUE DU COMPTEUR
-- ============================================================================

CREATE OR REPLACE FUNCTION update_custom_index_document_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.custom_rag_indexes
    SET document_count = document_count + 1,
        updated_at = NOW()
    WHERE id = NEW.index_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.custom_rag_indexes
    SET document_count = GREATEST(0, document_count - 1),
        updated_at = NOW()
    WHERE id = OLD.index_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si is_active change
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
      UPDATE public.custom_rag_indexes
      SET document_count = GREATEST(0, document_count - 1),
          updated_at = NOW()
      WHERE id = NEW.index_id;
    ELSIF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
      UPDATE public.custom_rag_indexes
      SET document_count = document_count + 1,
          updated_at = NOW()
      WHERE id = NEW.index_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_document_count
AFTER INSERT OR DELETE OR UPDATE OF is_active ON public.custom_rag_documents
FOR EACH ROW
EXECUTE FUNCTION update_custom_index_document_count();

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE public.custom_rag_indexes IS 'Index RAG créés par les utilisateurs';
COMMENT ON TABLE public.custom_rag_documents IS 'Documents vectorisés dans les index custom';
COMMENT ON FUNCTION search_custom_index IS 'Recherche hybride (vector + full-text) dans un index custom';
