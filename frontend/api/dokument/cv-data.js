import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET ?token=TOKEN → { profile, documents }
// Returns profile data for a view-only CV send (source_url = 'cv:profileId').
// Validates the send token and that the sourceUrl matches.
export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'token ist erforderlich' })

  const { data: send, error: sendError } = await supabaseAdmin
    .from('document_sends')
    .select('id, status, expires_at, send_mode, source_url, profile_id')
    .eq('token', token)
    .single()

  if (sendError || !send) return res.status(404).json({ error: 'Dokument nicht gefunden' })
  if (send.status === 'revoked') return res.status(410).json({ error: 'Dieses Dokument wurde widerrufen' })
  if (send.expires_at && new Date(send.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Dieser Link ist abgelaufen' })
  }

  if (send.send_mode !== 'view' || !send.source_url?.startsWith('cv:')) {
    return res.status(400).json({ error: 'Kein Lebenslauf-Versand' })
  }

  const profileId = send.source_url.replace('cv:', '')

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (profileErr || !profile) return res.status(404).json({ error: 'Profil nicht gefunden' })

  // Fetch profile documents (for CV context)
  const { data: docs } = await supabaseAdmin
    .from('profile_documents')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })

  return res.json({ profile, documents: docs || [] })
})
