-- Run this in the Supabase SQL editor
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_access" ON admin_settings
  AS RESTRICTIVE USING (false);

INSERT INTO admin_settings (key, value)
VALUES ('fkvi_company', '{}')
ON CONFLICT (key) DO NOTHING;
