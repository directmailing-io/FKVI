-- Add workflow columns to document_sends for multi-party signing
ALTER TABLE document_sends
  ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'fachkraft' CHECK (recipient_type IN ('fachkraft', 'unternehmen')),
  ADD COLUMN IF NOT EXISTS parent_send_id uuid REFERENCES document_sends(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS field_values jsonb DEFAULT '{}';
