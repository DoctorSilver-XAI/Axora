-- ============================================================================
-- PhiVision Captures Table Migration
-- ============================================================================
-- 
-- Purpose: Store PhiVision screen capture analysis sessions for:
-- - Historical tracking
-- - Prompt improvement analysis
-- - Quality monitoring and training data
--
-- Run this migration in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- MAIN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phivision_captures (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Capture Timestamp (when the screenshot was taken)
    captured_at TIMESTAMPTZ NOT NULL,
    
    -- Screenshot Storage
    screenshot_url TEXT,           -- URL to Supabase Storage
    screenshot_thumbnail TEXT,     -- Base64 thumbnail for quick preview (JPEG, ~200px width)
    
    -- OCR Data
    ocr_text_raw TEXT,             -- Full OCR text extracted
    ocr_text_length INT,           -- Length for quick stats
    
    -- Prompts & Model Info (Critical for improvement analysis)
    system_prompt_used TEXT,       -- Full system prompt sent to AI
    user_prompt_used TEXT,         -- User prompt if any
    model_used VARCHAR(100),       -- e.g., "ministral-8b-latest"
    ocr_model_used VARCHAR(100),   -- e.g., "mistral-ocr-latest"
    
    -- API Response Data
    api_response_raw JSONB,        -- Full raw response for debugging
    analysis_result JSONB,         -- Parsed/cleaned result
    
    -- Performance Metrics
    processing_time_ms INT,        -- Total processing time
    ocr_time_ms INT,               -- OCR step duration
    analysis_time_ms INT,          -- AI analysis step duration
    
    -- User & Device Context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_os VARCHAR(50),
    device_resolution VARCHAR(50),
    app_version VARCHAR(20),
    
    -- Annotations (for manual review and quality assessment)
    tags TEXT[],                   -- Array of tags for categorization
    notes TEXT,                    -- Free-form notes for analysis
    quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),  -- 1-5 manual rating
    
    -- Soft Delete
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_phivision_captures_user 
    ON public.phivision_captures(user_id);

-- Timeline queries
CREATE INDEX IF NOT EXISTS idx_phivision_captures_date 
    ON public.phivision_captures(captured_at DESC);

-- Tag filtering (GIN index for array containment queries)
CREATE INDEX IF NOT EXISTS idx_phivision_captures_tags 
    ON public.phivision_captures USING GIN(tags);

-- Quality filtering
CREATE INDEX IF NOT EXISTS idx_phivision_captures_quality 
    ON public.phivision_captures(quality_rating) 
    WHERE quality_rating IS NOT NULL;

-- Model filtering for A/B testing
CREATE INDEX IF NOT EXISTS idx_phivision_captures_model 
    ON public.phivision_captures(model_used);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.phivision_captures ENABLE ROW LEVEL SECURITY;

-- Users can view their own captures
CREATE POLICY "Users can view own captures" 
    ON public.phivision_captures
    FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can insert their own captures
CREATE POLICY "Users can insert own captures" 
    ON public.phivision_captures
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own captures (for notes, tags, rating)
CREATE POLICY "Users can update own captures" 
    ON public.phivision_captures
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================
-- 
-- Create the storage bucket manually in Supabase Dashboard:
-- 1. Go to Storage > Create new bucket
-- 2. Name: phivision-captures
-- 3. Public: Yes (for easy URL access) OR No (if you want signed URLs)
-- 4. File size limit: 10MB
-- 5. Allowed MIME types: image/png, image/jpeg
--
-- Storage RLS Policies (add in Storage > Policies):
--
-- SELECT (download): Allow authenticated users to download their own files
--   bucket_id = 'phivision-captures' AND 
--   (storage.foldername(name))[1] = auth.uid()::text
--
-- INSERT (upload): Allow authenticated users to upload to their folder
--   bucket_id = 'phivision-captures' AND 
--   (storage.foldername(name))[1] = auth.uid()::text
--
-- ============================================================================

-- ============================================================================
-- USEFUL QUERIES (for analysis in Supabase Dashboard)
-- ============================================================================

-- Get capture count per model
-- SELECT model_used, COUNT(*) as count FROM phivision_captures GROUP BY model_used;

-- Get average processing time
-- SELECT AVG(processing_time_ms) as avg_time, model_used FROM phivision_captures GROUP BY model_used;

-- Get recent low-quality captures for review
-- SELECT * FROM phivision_captures WHERE quality_rating <= 2 ORDER BY captured_at DESC LIMIT 20;

-- Get captures with specific tag
-- SELECT * FROM phivision_captures WHERE 'prescription' = ANY(tags);
