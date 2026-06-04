import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!adminCheck) return res.status(403).json({ error: 'Nur für Admins' })

  const { companyId } = req.body
  if (!companyId) return res.status(400).json({ error: 'companyId fehlt' })

  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies').select('*').eq('id', companyId).single()
  if (cErr || !company) return res.status(404).json({ error: 'Eintrag nicht gefunden' })

  // Create a profile record with basic data from the brochure request
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .insert({
      first_name: company.first_name,
      last_name: company.last_name,
      phone: company.phone,
      contact_email: company.email,
      status: 'draft',
    })
    .select('id')
    .single()

  if (profileErr || !profile) {
    return res.status(500).json({ error: profileErr?.message || 'Profil konnte nicht erstellt werden' })
  }

  // Mark the brochure lead as approved
  await supabaseAdmin
    .from('companies')
    .update({ status: 'approved' })
    .eq('id', companyId)

  return res.json({ success: true, profileId: profile.id })
})
