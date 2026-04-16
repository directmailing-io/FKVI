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

  // Decode JWT to get userId (sub) — company_id is NOT stored in user_metadata
  let userId
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    userId = payload.sub
    if (!userId) throw new Error('no sub')
  } catch {
    return res.status(401).json({ error: 'Ungültiger Token' })
  }

  // Look up the company that belongs to this user
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (companyError || !company) {
    return res.status(403).json({ error: 'Kein Unternehmen gefunden' })
  }

  // Verify reservation belongs to this company and get profile_id
  const { data: reservation, error: resError } = await supabaseAdmin
    .from('reservations')
    .select('id, profile_id, company_id')
    .eq('id', reservationId)
    .eq('company_id', company.id)
    .single()

  if (resError || !reservation) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  // Fetch non-internal documents for this profile (service role bypasses RLS)
  let { data: docs, error: docsError } = await supabaseAdmin
    .from('profile_documents')
    .select('id, title, doc_type, description, link, sort_order')
    .eq('profile_id', reservation.profile_id)
    .eq('is_internal', false)
    .order('sort_order')

  // Fallback: if is_internal column doesn't exist yet, fetch all documents
  if (docsError?.message?.includes('is_internal')) {
    const { data: allDocs, error: fallbackError } = await supabaseAdmin
      .from('profile_documents')
      .select('id, title, doc_type, description, link, sort_order')
      .eq('profile_id', reservation.profile_id)
      .order('sort_order')
    if (fallbackError) return res.status(500).json({ error: fallbackError.message })
    docs = allDocs
    docsError = null
  }

  if (docsError) return res.status(500).json({ error: docsError.message })

  return res.status(200).json({ documents: docs || [] })
}
