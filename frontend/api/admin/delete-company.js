import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!adminCheck) return res.status(403).json({ error: 'Nur für Admins' })

  const { companyId } = req.body
  if (!companyId) return res.status(400).json({ error: 'companyId fehlt' })

  const { data: company } = await supabaseAdmin
    .from('companies').select('user_id').eq('id', companyId).single()

  if (company?.user_id) {
    await supabaseAdmin.auth.admin.deleteUser(company.user_id).catch(() => {})
  }

  await supabaseAdmin.from('companies').delete().eq('id', companyId)

  res.json({ success: true })
}
