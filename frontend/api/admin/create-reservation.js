import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin.from('admin_users').select('id').eq('user_id', user.id).single()
  return data ? user : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  const user = await requireAdmin(token)
  if (!user) return res.status(403).json({ error: 'Nur für Admins' })

  const { profileId, companyId } = req.body
  if (!profileId || !companyId) return res.status(400).json({ error: 'profileId und companyId erforderlich' })

  // Check not already reserved
  const { data: existing } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('profile_id', profileId)
    .eq('company_id', companyId)
    .single()
  if (existing) return res.status(409).json({ error: 'Diese Kombination ist bereits reserviert' })

  // Set profile → reserved
  await supabaseAdmin.from('profiles').update({ status: 'reserved' }).eq('id', profileId)

  // Create reservation (process_status starts at 1)
  const { data: reservation, error } = await supabaseAdmin
    .from('reservations')
    .insert({ profile_id: profileId, company_id: companyId, reserved_by: user.id, process_status: 1 })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // First history entry
  await supabaseAdmin.from('process_status_history').insert({
    reservation_id: reservation.id,
    old_status: null,
    new_status: 1,
    changed_by: user.id,
    notes: 'Vermittlung gestartet',
  })

  // Auto-upgrade company type: Lead → Kunde (only if currently 'lead')
  await supabaseAdmin
    .from('companies')
    .update({ company_type: 'customer' })
    .eq('id', companyId)
    .eq('company_type', 'lead')

  res.json({ success: true, reservation })
}
