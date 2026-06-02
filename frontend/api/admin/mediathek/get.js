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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) { return res.status(e.status || 401).json({ error: e.message }) }

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id fehlt' })

  const { data, error } = await supabaseAdmin
    .from('document_templates')
    .select('id, name, file_name, storage_path, fields, page_count, created_at')
    .eq('id', id)
    .single()

  if (error) {
    // page_count might not exist — retry without it
    const { data: d2, error: e2 } = await supabaseAdmin
      .from('document_templates')
      .select('id, name, file_name, storage_path, fields, created_at')
      .eq('id', id)
      .single()
    if (e2) return res.status(404).json({ error: 'Vorlage nicht gefunden' })
    return res.json({ template: { ...d2, fields: d2.fields || [] } })
  }

  return res.json({ template: { ...data, fields: data.fields || [] } })
})
