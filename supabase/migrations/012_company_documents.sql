-- Add company_documents JSONB column to companies table
-- Stores locally-saved document links/uploads for company profiles

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS company_documents jsonb DEFAULT '[]'::jsonb;
