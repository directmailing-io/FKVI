-- =============================================
-- is_private flag on document_templates
-- Templates created from profile/company uploads should NOT appear
-- in the global Mediathek (Dokumentenvorlagen library).
-- =============================================
ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
