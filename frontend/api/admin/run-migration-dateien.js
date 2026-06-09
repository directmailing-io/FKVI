/**
 * ONE-TIME: Creates entity_files and doc_bundles tables.
 * POST /api/admin/run-migration-dateien  { "secret": "fkvi-migrate-dateien-2026" }
 * Delete this file after running!
 */
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SQL_ENTITY_FILES = `
CREATE TABLE IF NOT EXISTS entity_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('profile', 'company')),
  entity_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by text
);
CREATE INDEX IF NOT EXISTS entity_files_entity_idx ON entity_files(entity_type, entity_id);
`

const SQL_DOC_BUNDLES = `
CREATE TABLE IF NOT EXISTS doc_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  entity_type text NOT NULL CHECK (entity_type IN ('profile', 'company')),
  entity_id uuid NOT NULL,
  entity_name text,
  title text NOT NULL DEFAULT 'Ihre Unterlagen',
  files jsonb NOT NULL DEFAULT '[]',
  recipient_name text,
  recipient_email text,
  created_at timestamptz DEFAULT now(),
  created_by text,
  email_sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS doc_bundles_entity_idx ON doc_bundles(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS doc_bundles_token_idx ON doc_bundles(token);
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { secret } = req.body || {}
  if (secret !== 'fkvi-migrate-dateien-2026') return res.status(403).json({ error: 'Forbidden' })

  const results = []

  // Check if already exists
  const { error: checkFiles } = await supabaseAdmin.from('entity_files').select('id').limit(1)
  const { error: checkBundles } = await supabaseAdmin.from('doc_bundles').select('id').limit(1)

  if (!checkFiles && !checkBundles) {
    return res.json({ success: true, message: 'Tables already exist!' })
  }

  // Try via rpc/query
  for (const [name, sql] of [['entity_files', SQL_ENTITY_FILES], ['doc_bundles', SQL_DOC_BUNDLES]]) {
    try {
      const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      })
      results.push({ table: name, status: r.status })
    } catch (e) {
      results.push({ table: name, error: e.message })
    }
  }

  const { error: recheck1 } = await supabaseAdmin.from('entity_files').select('id').limit(1)
  const { error: recheck2 } = await supabaseAdmin.from('doc_bundles').select('id').limit(1)
  const success = !recheck1 && !recheck2

  return res.json({
    success,
    results,
    message: success
      ? 'Tabellen erfolgreich erstellt!'
      : 'Automatische Erstellung fehlgeschlagen. Bitte SQL manuell im Supabase Dashboard ausführen.',
    manualSQL: success ? null : SQL_ENTITY_FILES + '\n' + SQL_DOC_BUNDLES,
  })
}
