import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify the company user via their JWT
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { reservationId, arbeitsverhaeltnis, verguetung, massnahme } = req.body
  if (!reservationId) return res.status(400).json({ error: 'reservationId required' })

  // Verify this reservation belongs to the authenticated company
  const { data: company } = await sb
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!company) return res.status(403).json({ error: 'Forbidden' })

  const { data: reservation } = await sb
    .from('reservations')
    .select('id')
    .eq('id', reservationId)
    .eq('company_id', company.id)
    .single()

  if (!reservation) return res.status(403).json({ error: 'Forbidden: reservation not found or not yours' })

  // Update only the Förderfall fields (service role bypasses RLS)
  const { error } = await sb
    .from('reservations')
    .update({
      arbeitsverhaeltnis: arbeitsverhaeltnis || {},
      verguetung: verguetung || {},
      massnahme: massnahme || {},
    })
    .eq('id', reservationId)

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true })
}
