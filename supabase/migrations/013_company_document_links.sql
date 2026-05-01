-- =============================================
-- COMPANY DOCUMENT LINKS
-- Secure, time-limited document access links sent to companies
-- after a Zusage (Step 4) in the Vermittlung process
-- =============================================
CREATE TABLE IF NOT EXISTS company_document_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  reservation_id  UUID REFERENCES reservations(id) ON DELETE SET NULL,
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_email   TEXT NOT NULL,
  company_name    TEXT,
  documents       JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at      TIMESTAMPTZ,
  first_accessed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS company_document_links_token_idx
  ON company_document_links (token);

CREATE INDEX IF NOT EXISTS company_document_links_reservation_idx
  ON company_document_links (reservation_id);

-- =============================================
-- is_internal flag on profile_documents
-- =============================================
ALTER TABLE profile_documents
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- Storage bucket: document-templates
-- =============================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('document-templates', 'document-templates', false)
  ON CONFLICT (id) DO NOTHING;
