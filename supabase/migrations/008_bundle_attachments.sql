-- Add attachments column to document_bundles
-- Stores references to external profile documents (no file duplication - just URLs)
-- Shape: [{id, title, doc_type, url, profile_id, profile_name}]
ALTER TABLE document_bundles
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';
