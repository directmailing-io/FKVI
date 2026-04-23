-- Migration 003: Prefill mode support for document_sends
-- Allows admins to bake profile data directly into PDF before sending to Fachkraft

ALTER TABLE document_sends
  ADD COLUMN IF NOT EXISTS prefill_mode text NOT NULL DEFAULT 'blank'
    CONSTRAINT document_sends_prefill_mode_check CHECK (prefill_mode IN ('blank', 'prefilled')),
  ADD COLUMN IF NOT EXISTS prefilled_storage_path text,
  ADD COLUMN IF NOT EXISTS prefilled_field_ids jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN document_sends.prefill_mode IS 'blank = original PDF shown; prefilled = profile data baked into PDF';
COMMENT ON COLUMN document_sends.prefilled_storage_path IS 'Path in signed-documents bucket to the pre-filled PDF';
COMMENT ON COLUMN document_sends.prefilled_field_ids IS 'Array of field IDs (UUIDs) that were pre-filled into the PDF';
