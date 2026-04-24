-- Migration 007: Document bundles (Dokument-Pakete)

CREATE TABLE IF NOT EXISTS document_bundles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  title       text,
  message     text,
  profile_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  company_id  uuid REFERENCES companies(id) ON DELETE SET NULL,
  created_by  uuid NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_sends
  ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES document_bundles(id) ON DELETE SET NULL;

ALTER TABLE document_bundles ENABLE ROW LEVEL SECURITY;

-- Public: anyone with the token can read (bundle page is public)
CREATE POLICY "bundle_public_read" ON document_bundles
  FOR SELECT USING (true);
