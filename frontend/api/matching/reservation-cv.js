import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token fehlt' })

  const { reservationId } = req.query
  if (!reservationId) return res.status(400).json({ error: 'reservationId fehlt' })

  // Decode JWT to get userId
  let userId
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    userId = payload.sub
    if (!userId) throw new Error('no sub')
  } catch {
    return res.status(401).json({ error: 'Ungültiger Token' })
  }

  // Look up the company for this user
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!company) return res.status(403).json({ error: 'Kein Unternehmen gefunden' })

  // Verify reservation belongs to this company
  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('id, profile_id, company_id')
    .eq('id', reservationId)
    .eq('company_id', company.id)
    .single()

  if (!reservation) return res.status(403).json({ error: 'Zugriff verweigert' })

  // Fetch complete profile data
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', reservation.profile_id)
    .single()

  if (profileError || !profile) return res.status(404).json({ error: 'Profil nicht gefunden' })

  // Fetch non-internal documents
  const { data: documents } = await supabaseAdmin
    .from('profile_documents')
    .select('id, title, doc_type, description, link, sort_order')
    .eq('profile_id', reservation.profile_id)
    .eq('is_internal', false)
    .order('sort_order')

  return res.status(200).json({ profile, documents: documents || [] })
}
