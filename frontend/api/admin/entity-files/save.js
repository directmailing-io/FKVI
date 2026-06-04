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

  const { id, entity_type, entity_id, title, description, url, sort_order, is_internal } = req.body || {}
  if (!entity_type || !entity_id || !title || !url) {
    return res.status(400).json({ error: 'entity_type, entity_id, title und url sind erforderlich' })
  }

  const payload = {
    entity_type,
    entity_id,
    title: title.trim(),
    description: description?.trim() || null,
    url: url.trim(),
    sort_order: sort_order ?? 0,
    is_internal: is_internal === true,
    created_by: user.email || user.id,
  }

  let data, error
  if (id) {
    // Update existing
    ;({ data, error } = await supabaseAdmin
      .from('entity_files')
      .update({ title: payload.title, description: payload.description, url: payload.url, sort_order: payload.sort_order, is_internal: payload.is_internal })
      .eq('id', id)
      .select()
      .single())
  } else {
    // Insert new
    ;({ data, error } = await supabaseAdmin
      .from('entity_files')
      .insert(payload)
      .select()
      .single())
  }

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ file: data })
})
