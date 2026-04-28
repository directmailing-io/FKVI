import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) throw { status: 401, message: 'Unauthorized' }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw { status: 401, message: 'Unauthorized' }
  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) throw { status: 403, message: 'Forbidden' }
  return user
}

// Ensure column exists (runs once, idempotent)
async function ensureColumn() {
  try {
    await supabaseAdmin.rpc('exec_sql', {
      sql: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_documents jsonb DEFAULT '[]'::jsonb;`
    })
  } catch {
    // If rpc not available, try direct update with empty docs to see if column exists
  }
}

// POST { companyId, documents } → { success }
export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try {
    await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { companyId, documents } = req.body || {}
  if (!companyId) return res.status(400).json({ error: 'companyId ist erforderlich' })
  if (!Array.isArray(documents)) return res.status(400).json({ error: 'documents muss ein Array sein' })

  const { error } = await supabaseAdmin
    .from('companies')
    .update({ company_documents: documents })
    .eq('id', companyId)

  if (error) {
    console.error('company-docs/save-docs error:', error)
    // Column might not exist yet — return partial success so UI doesn't break
    return res.status(200).json({ success: false, needsMigration: true, error: error.message })
  }

  return res.json({ success: true })
})
