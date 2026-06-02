import { createClient } from '@supabase/supabase-js'

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

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try { user = await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('brochure_settings')
      .select('contract_template_id, prefill_config, updated_at')
      .eq('id', 1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Einstellungen konnten nicht geladen werden' })
    }

    return res.json({ settings: data || { contract_template_id: null, prefill_config: {} } })
  }

  if (req.method === 'POST') {
    const { contract_template_id, prefill_config } = req.body || {}

    const { error } = await supabaseAdmin
      .from('brochure_settings')
      .upsert({
        id: 1,
        contract_template_id: contract_template_id || null,
        prefill_config: prefill_config || {},
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: 'id' })

    if (error) {
      console.error('brochure/settings upsert error:', error)
      return res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden' })
    }

    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
