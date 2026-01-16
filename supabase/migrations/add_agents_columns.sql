-- Migration: Ajouter les colonnes pour les résultats des agents multi-agents
-- Date: 2026-01-16
-- Description: 4 colonnes JSONB pour stocker les résultats de chaque agent (PhiMEDS, PhiADVICES, PhiCROSS_SELL, PhiCHIPS)

-- Ajouter les colonnes pour les résultats des agents
ALTER TABLE captures
ADD COLUMN IF NOT EXISTS agent_phimeds JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS agent_phiadvices JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS agent_phicrosssell JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS agent_phichips JSONB DEFAULT NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN captures.agent_phimeds IS 'Résultat de l''agent PhiMEDS (DCI + recommandations)';
COMMENT ON COLUMN captures.agent_phiadvices IS 'Résultat de l''agent PhiADVICES (conseils patients)';
COMMENT ON COLUMN captures.agent_phicrosssell IS 'Résultat de l''agent PhiCROSS_SELL (suggestions cross-selling)';
COMMENT ON COLUMN captures.agent_phichips IS 'Résultat de l''agent PhiCHIPS (micro-rappels)';
