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

  const { reservationId } = req.body
  if (!reservationId) return res.status(400).json({ error: 'reservationId erforderlich' })

  // Load reservation to get profile_id and company_id
  const { data: reservation, error: loadErr } = await supabaseAdmin
    .from('reservations')
    .select('id, profile_id, company_id')
    .eq('id', reservationId)
    .single()

  if (loadErr || !reservation) return res.status(404).json({ error: 'Vermittlung nicht gefunden' })

  // Delete history first (foreign key), then the reservation
  await supabaseAdmin
    .from('process_status_history')
    .delete()
    .eq('reservation_id', reservationId)

  const { error: delErr } = await supabaseAdmin
    .from('reservations')
    .delete()
    .eq('id', reservationId)

  if (delErr) return res.status(500).json({ error: delErr.message })

  // Reset profile status to published
  await supabaseAdmin
    .from('profiles')
    .update({ status: 'published' })
    .eq('id', reservation.profile_id)

  res.json({ success: true })
}
