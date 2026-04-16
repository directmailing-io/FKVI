import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query

  if (!token) return res.status(400).json({ error: 'Token fehlt' })

  // Find request by access_token
  const { data: request, error } = await supabaseAdmin
    .from('brochure_requests')
    .select('id, first_name, last_name, company_name, email, email_confirmed_at, brochure_version_id')
    .eq('access_token', token)
    .single()

  if (error || !request) {
    return res.status(404).json({ error: 'Zugangslink nicht gefunden' })
  }

  // Get brochure version info
  let version = null
  if (request.brochure_version_id) {
    const { data: v } = await supabaseAdmin
      .from('brochure_versions')
      .select('version_number, file_name')
      .eq('id', request.brochure_version_id)
      .single()
    version = v
  } else {
    // Fall back to latest version
    const { data: v } = await supabaseAdmin
      .from('brochure_versions')
      .select('version_number, file_name')
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
    version = v
  }

  // Check if already confirmed read
  const { data: confirmation } = await supabaseAdmin
    .from('brochure_confirmations')
    .select('confirmed_at')
    .eq('request_id', request.id)
    .single()

  return res.json({
    request: {
      first_name: request.first_name,
      last_name: request.last_name,
      company_name: request.company_name,
      email: request.email,
    },
    version,
    already_confirmed: !!confirmation,
    confirmed_at: confirmation?.confirmed_at || null,
  })
}
