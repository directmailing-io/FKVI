import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) throw { status: 401, message: 'Unauthorized' }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw { status: 401, message: 'Unauthorized' }
  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) throw { status: 403, message: 'Forbidden' }
  return user
}

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authToken = req.headers.authorization?.replace('Bearer ', '')
  try {
    await requireAdmin(authToken)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { status, profileId, companyId } = req.query

  let query = supabaseAdmin
    .from('document_sends')
    .select(`
      id, token, signer_name, signer_email, status,
      created_at, signed_at, expires_at,
      document_templates ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (profileId) query = query.eq('profile_id', profileId)
  if (companyId) query = query.eq('company_id', companyId)

  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0])
    } else {
      query = query.in('status', statuses)
    }
  }

  const { data: sends, error: fetchError } = await query

  if (fetchError) {
    console.error('dokumente/sends-list error:', fetchError)
    return res.status(500).json({ error: 'Versendungen konnten nicht geladen werden' })
  }

  // Build base URL for signer links
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const baseUrl = host ? `${proto}://${host}` : ''

  const mapped = (sends || []).map(s => ({
    ...s,
    template_name: s.document_templates?.name || null,
    signer_url: s.token ? `${baseUrl}/dokument/${s.token}` : null,
    document_templates: undefined, // strip nested object
  }))

  return res.json({ sends: mapped })
})