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

  const { entity } = req.query
  if (!entity) return res.status(400).json({ error: 'entity fehlt' })

  if (entity.startsWith('profile-')) {
    const profileId = entity.replace('profile-', '')
    // Note: profiles uses contact_email (not email) and street+house_number (not address)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, birth_date, nationality, marital_status, phone, city, street, house_number, postal_code, contact_email, gender')
      .eq('id', profileId)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Profil nicht gefunden' })
    // Normalize to friendly field names used in auto-fill mappings
    return res.json({
      data: {
        ...data,
        email: data.contact_email || null,
        address: [data.street, data.house_number].filter(Boolean).join(' ') || null,
      }
    })
  }

  if (entity.startsWith('company-')) {
    const companyId = entity.replace('company-', '')
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id, company_name, email, address, postal_code, city, phone')
      .eq('id', companyId)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Unternehmen nicht gefunden' })
    return res.json({ data })
  }

  return res.status(400).json({ error: 'Unbekannter Entity-Typ' })
})
