/**
 * ONE-TIME migration endpoint - creates entity_documents tables
 * Call with: POST /api/admin/run-migration { secret: 'fkvi-migrate-2026' }
 * Delete this file after use!
 */
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  
  const { secret } = req.body || {}
  if (secret !== 'fkvi-migrate-2026') return res.status(403).json({ error: 'Forbidden' })

  const results = []

  // Create entity_documents table via multiple individual operations
  // Since we can't run raw DDL, we use a creative workaround:
  // Create the table by inserting into information_schema (doesn't work)
  // Instead, use Supabase's postgres JSON RPC via a custom approach

  // Actually check if tables exist by trying to query them
  const { error: checkErr } = await supabaseAdmin.from('entity_documents').select('id').limit(1)
  
  if (!checkErr) {
    return res.json({ success: true, message: 'Tables already exist!', results })
  }

  results.push({ check: checkErr.message })

  // Try to create the table via a special RPC that creates SQL
  // This is a bootstrapping hack - we create a temp function via the API
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS entity_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type TEXT NOT NULL,
      entity_id UUID NOT NULL,
      doc_type TEXT NOT NULL DEFAULT 'upload',
      title TEXT NOT NULL,
      description TEXT,
      storage_path TEXT,
      mime_type TEXT,
      file_size_bytes BIGINT,
      original_filename TEXT,
      template_id UUID,
      sync_source_id UUID,
      sync_partner_type TEXT,
      sync_partner_id UUID,
      sync_partner_name TEXT,
      latest_send_id UUID,
      send_status TEXT DEFAULT 'draft',
      signed_storage_path TEXT,
      signed_at TIMESTAMPTZ,
      visibility TEXT DEFAULT 'internal',
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS entity_document_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT DEFAULT 'admin',
      actor_name TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `ALTER TABLE document_sends ADD COLUMN IF NOT EXISTS entity_document_id UUID`,
  ]

  // Try each statement via RPC
  for (const sql of sqlStatements) {
    try {
      // Try supabase's internal sql function
      const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      })
      results.push({ sql: sql.substring(0, 50), status: r.status })
    } catch (e) {
      results.push({ sql: sql.substring(0, 50), error: e.message })
    }
  }

  // Check if it worked
  const { error: recheckErr } = await supabaseAdmin.from('entity_documents').select('id').limit(1)
  
  return res.json({
    success: !recheckErr,
    tablesCreated: !recheckErr,
    results,
    message: recheckErr
      ? 'Tables could not be created automatically. Run the SQL manually in Supabase dashboard.'
      : 'Tables created successfully!',
    manualSQL: recheckErr ? sqlStatements.join(';\n\n') : null,
  })
}
