import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

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

const SETTINGS_KEY = 'fkvi_company'

export default withHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    // If table doesn't exist yet, return empty settings gracefully
    if (error) {
      if (error.code === '42P01') return res.json({ settings: {} })
      return res.status(500).json({ error: error.message })
    }
    return res.json({ settings: data?.value || {} })
  }

  if (req.method === 'POST') {
    const settings = req.body || {}

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert({ key: SETTINGS_KEY, value: settings, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
      if (error.code === '42P01') return res.status(503).json({ error: 'Einstellungstabelle nicht gefunden. Bitte SQL-Migration ausführen.' })
      return res.status(500).json({ error: error.message })
    }
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
