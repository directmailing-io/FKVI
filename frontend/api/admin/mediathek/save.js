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

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try { user = await requireAdmin(token) } catch (e) { return res.status(e.status || 401).json({ error: e.message }) }

  const { name, fileName, storagePath, fileSize, pageCount } = req.body || {}
  if (!storagePath) return res.status(400).json({ error: 'storagePath fehlt' })

  // Only insert columns guaranteed to exist in the live DB (name, file_name, storage_path are NOT NULL)
  // Optionally add file_size/page_count if columns exist — use fallback on schema error
  const insertBase = {
    name: name || fileName || 'Vorlage',
    file_name: fileName || name || 'vorlage.pdf',
    storage_path: storagePath,
  }

  let data, error

  // Attempt 1: with optional metadata columns
  ;({ data, error } = await supabaseAdmin
    .from('document_templates')
    .insert({ ...insertBase, file_size: fileSize || null, page_count: pageCount || null })
    .select('id, name, file_name, storage_path, file_size, page_count, is_active, created_at')
    .single())

  if (error?.message?.includes('column')) {
    // Attempt 2: bare minimum only
    ;({ data, error } = await supabaseAdmin
      .from('document_templates')
      .insert(insertBase)
      .select('id, name, file_name, storage_path, created_at')
      .single())
  }

  if (error) return res.status(500).json({ error: error.message })

  return res.json({ template: data })
})
