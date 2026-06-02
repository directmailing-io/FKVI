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
  try { await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { profileId } = req.query
  if (!profileId) return res.status(400).json({ error: 'profileId erforderlich' })

  const { data: docs, error } = await supabaseAdmin
    .from('profile_documents')
    .select('id, title, doc_type, link, description, sort_order')
    .eq('profile_id', profileId)
    .eq('is_internal', false)
    .not('link', 'is', null)
    .order('sort_order')

  if (error) {
    console.error('profile-docs/list error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ docs: docs || [] })
})
