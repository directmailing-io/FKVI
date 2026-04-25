-- =============================================================================
-- Migration: brochure_language_contract_support
-- Run this in the Supabase SQL Editor for project sbqlpiksowrbefqweasn
-- =============================================================================

-- 1. Language column on brochure_versions (de | en | fr | ar | vi)
ALTER TABLE brochure_versions
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'de';

CREATE INDEX IF NOT EXISTS brochure_versions_language_idx
  ON brochure_versions(language);

-- 2. Language column on brochure_requests
ALTER TABLE brochure_requests
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'de';

-- 3. Contract tracking on brochure_requests
ALTER TABLE brochure_requests
  ADD COLUMN IF NOT EXISTS contract_send_id uuid REFERENCES document_sends(id),
  ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz;

-- 4. Brochure settings singleton (which contract template to auto-send)
CREATE TABLE IF NOT EXISTS brochure_settings (
  id integer PRIMARY KEY DEFAULT 1,
  contract_template_id uuid REFERENCES document_templates(id),
  prefill_config jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT brochure_settings_singleton CHECK (id = 1)
);

INSERT INTO brochure_settings (id, contract_template_id, prefill_config)
VALUES (1, NULL, '{}')
ON CONFLICT (id) DO NOTHING;
