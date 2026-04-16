import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body || {}

  if (!token) return res.status(400).json({ error: 'Token fehlt' })

  // Find request by access_token — email must be confirmed
  const { data: request, error } = await supabaseAdmin
    .from('brochure_requests')
    .select('id, email_confirmed_at, brochure_version_id')
    .eq('access_token', token)
    .single()

  if (error || !request) {
    return res.status(404).json({ error: 'Zugangslink nicht gefunden' })
  }

  if (!request.email_confirmed_at) {
    return res.status(403).json({ error: 'E-Mail nicht bestätigt' })
  }

  // Check if already confirmed
  const { data: existing } = await supabaseAdmin
    .from('brochure_confirmations')
    .select('id')
    .eq('request_id', request.id)
    .single()

  if (existing) {
    return res.json({ success: true, already_done: true })
  }

  // Resolve brochure version id
  let versionId = request.brochure_version_id

  if (!versionId) {
    const { data: v } = await supabaseAdmin
      .from('brochure_versions')
      .select('id')
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
    versionId = v?.id || null
  }

  // Insert confirmation
  const { error: insertError } = await supabaseAdmin
    .from('brochure_confirmations')
    .insert({
      request_id: request.id,
      brochure_version_id: versionId,
    })

  if (insertError) {
    console.error('brochure/confirm-read insert error:', insertError)
    return res.status(500).json({ error: 'Bestätigung konnte nicht gespeichert werden' })
  }

  return res.json({ success: true })
}
