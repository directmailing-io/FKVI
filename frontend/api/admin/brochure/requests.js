import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Verify admin
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  // Fetch all brochure requests with version info
  const { data: rawRequests, error: reqError } = await supabaseAdmin
    .from('brochure_requests')
    .select(`
      id,
      first_name,
      last_name,
      company_name,
      email,
      phone,
      created_at,
      email_confirmed_at,
      access_token,
      company_id,
      brochure_version_id,
      brochure_versions (
        version_number,
        file_name
      )
    `)
    .order('created_at', { ascending: false })

  if (reqError) {
    console.error('admin/brochure/requests fetch error:', reqError)
    return res.status(500).json({ error: 'Anfragen konnten nicht geladen werden' })
  }

  // Fetch all confirmations
  const { data: confirmations } = await supabaseAdmin
    .from('brochure_confirmations')
    .select('request_id, confirmed_at')

  // Fetch access log
  const { data: accessLog } = await supabaseAdmin
    .from('brochure_access_log')
    .select('request_id, accessed_at')
    .order('accessed_at', { ascending: true })

  // Build lookup maps
  const confirmationMap = {}
  for (const c of confirmations || []) {
    if (!confirmationMap[c.request_id]) {
      confirmationMap[c.request_id] = c
    }
  }

  const accessMap = {}
  for (const log of accessLog || []) {
    if (!accessMap[log.request_id]) {
      accessMap[log.request_id] = { count: 0, first_access_at: log.accessed_at }
    }
    accessMap[log.request_id].count += 1
  }

  // Merge and shape response
  const requests = (rawRequests || []).map((r) => {
    const confirmation = confirmationMap[r.id] || null
    const access = accessMap[r.id] || null

    return {
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      company_name: r.company_name,
      email: r.email,
      phone: r.phone,
      created_at: r.created_at,
      email_confirmed_at: r.email_confirmed_at,
      access_token: r.access_token,
      company_id: r.company_id,
      brochure_version: r.brochure_versions
        ? {
            version_number: r.brochure_versions.version_number,
            file_name: r.brochure_versions.file_name,
          }
        : null,
      confirmation: confirmation
        ? { confirmed_at: confirmation.confirmed_at }
        : null,
      access_count: access ? access.count : 0,
      first_access_at: access ? access.first_access_at : null,
    }
  })

  return res.json({ requests })
}
