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

  const { type, q } = req.query
  const search = q?.trim() || ''

  if (type === 'unternehmen') {
    let query = supabaseAdmin
      .from('companies')
      .select('id, company_name, email')
      .order('company_name')
      .limit(15)

    if (search) query = query.ilike('company_name', `%${search}%`)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    const entities = (data || []).map(c => ({
      id: c.id,
      key: `company-${c.id}`,
      name: c.company_name || '(Unbenannt)',
      subtitle: c.email || '',
      type: 'unternehmen',
    }))

    return res.json({ entities })
  }

  if (type === 'fachkraft') {
    let query = supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, profile_image_url')
      .order('last_name')
      .limit(15)

    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    const entities = (data || []).map(p => ({
      id: p.id,
      key: `profile-${p.id}`,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || '(Unbenannt)',
      subtitle: '',
      imageUrl: p.profile_image_url || null,
      type: 'fachkraft',
    }))

    return res.json({ entities })
  }

  return res.status(400).json({ error: 'type muss "fachkraft" oder "unternehmen" sein' })
})
