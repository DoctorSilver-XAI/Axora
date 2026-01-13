-- =============================================================================
-- Migration: 003_notion_catalog_rag.sql
-- Description: Add Notion sync support to existing catalog_products table
--              and create knowledge_embeddings for RAG search
-- =============================================================================
-- 
-- NOTE: This migration assumes 002_multi_tenant_catalog.sql has been run.
-- The catalog_products table already has embedding column.
-- We just need to add notion_page_id and create the knowledge_embeddings table.
-- =============================================================================

-- STEP 1: Add notion_page_id to existing catalog_products table
ALTER TABLE public.catalog_products 
ADD COLUMN IF NOT EXISTS notion_page_id TEXT UNIQUE;

-- STEP 2: Add last_synced_at for tracking Notion sync
ALTER TABLE public.catalog_products 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- =============================================================================
-- STEP 3: KNOWLEDGE EMBEDDINGS TABLE (Separate chunks for RAG)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Source reference (can be catalog, FAQ, or other knowledge sources)
    source_type TEXT NOT NULL DEFAULT 'catalog',
    source_id UUID REFERENCES public.catalog_products(id) ON DELETE CASCADE,
    
    -- Content and embedding
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    
    -- Track embedding generation
    embedding_model TEXT DEFAULT 'text-embedding-3-small'
);

-- Index for vector similarity search (HNSW works on empty tables)
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector 
    ON public.knowledge_embeddings 
    USING hnsw (embedding vector_cosine_ops);

-- Index for source lookup
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_source 
    ON public.knowledge_embeddings(source_type, source_id);

-- RLS
ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can search embeddings from their pharmacy's products
CREATE POLICY "Users can search embeddings from own pharmacy"
ON public.knowledge_embeddings FOR SELECT USING (
    source_id IN (
        SELECT id FROM public.catalog_products
        WHERE pharmacy_id IN (
            SELECT pharmacy_id FROM public.pharmacy_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- =============================================================================
-- STEP 4: RAG SEARCH FUNCTION (uses existing columns)
-- =============================================================================

CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity float,
    metadata JSONB,
    product_id UUID,
    product_name TEXT,
    product_cip13 TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        ke.id,
        ke.content,
        1 - (ke.embedding <=> query_embedding) AS similarity,
        ke.metadata,
        cp.id AS product_id,
        cp.nom AS product_name,
        cp.code_cip13 AS product_cip13
    FROM public.knowledge_embeddings ke
    LEFT JOIN public.catalog_products cp ON ke.source_id = cp.id
    WHERE 
        ke.embedding IS NOT NULL
        AND 1 - (ke.embedding <=> query_embedding) > match_threshold
    ORDER BY ke.embedding <=> query_embedding
    LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_knowledge TO authenticated;

-- =============================================================================
-- DONE!
-- The existing match_catalog_products function in 002 already handles 
-- direct product search. match_knowledge is for RAG with chunked content.
-- =============================================================================
