-- Migration 005: Label field for document_templates
-- Allows categorizing templates as fachkraft / unternehmen / beide

ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT 'beide'
    CONSTRAINT document_templates_label_check CHECK (label IN ('fachkraft', 'unternehmen', 'beide'));

COMMENT ON COLUMN document_templates.label IS 'Target audience: fachkraft, unternehmen, or beide';
