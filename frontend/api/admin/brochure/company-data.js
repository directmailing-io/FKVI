import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: admin } = await supabaseAdmin.from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { companyId } = req.query
  if (!companyId) return res.status(400).json({ error: 'companyId required' })

  // Get brochure request for this company — first by company_id, then by email (retroactive fallback)
  let { data: request } = await supabaseAdmin
    .from('brochure_requests')
    .select('*, brochure_versions(version_number, file_name, uploaded_at)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!request) {
    // Try email fallback
    const { data: company } = await supabaseAdmin
      .from('companies').select('email').eq('id', companyId).single()
    if (company?.email) {
      const { data: byEmail } = await supabaseAdmin
        .from('brochure_requests')
        .select('*, brochure_versions(version_number, file_name, uploaded_at)')
        .eq('email', company.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (byEmail) {
        request = byEmail
        // Retroactively link
        await supabaseAdmin
          .from('brochure_requests')
          .update({ company_id: companyId })
          .eq('email', company.email)
          .is('company_id', null)
      }
    }
  }

  if (!request) return res.json({ request: null })

  // Get confirmation
  const { data: confirmation } = await supabaseAdmin
    .from('brochure_confirmations')
    .select('confirmed_at, brochure_versions(version_number)')
    .eq('request_id', request.id)
    .order('confirmed_at', { ascending: true })
    .limit(1)
    .single()

  // Get access log (last 20)
  const { data: accessLog } = await supabaseAdmin
    .from('brochure_access_log')
    .select('accessed_at, ip_address, user_agent')
    .eq('request_id', request.id)
    .order('accessed_at', { ascending: false })
    .limit(20)

  return res.status(200).json({
    request: {
      id: request.id,
      first_name: request.first_name,
      last_name: request.last_name,
      email: request.email,
      phone: request.phone,
      created_at: request.created_at,
      email_confirmed_at: request.email_confirmed_at,
      brochure_version: request.brochure_versions,
    },
    confirmation: confirmation || null,
    access_log: accessLog || [],
  })
}
