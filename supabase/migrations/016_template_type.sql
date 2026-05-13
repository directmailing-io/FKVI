-- Add template_type to document_templates
-- Values: 'fachkraft' (default), 'unternehmen', 'vermittlung'
ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'fachkraft'
    CHECK (template_type IN ('fachkraft', 'unternehmen', 'vermittlung'));
