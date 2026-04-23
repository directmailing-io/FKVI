ALTER TABLE document_sends
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_sends_company_id ON document_sends(company_id);
