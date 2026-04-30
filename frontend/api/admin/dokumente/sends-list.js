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
      id, token, template_id, signer_name, signer_email, status, bundle_id,
      created_at, signed_at, submitted_at, expires_at,
      recipient_type, parent_send_id, send_mode, source_url, message,
      open_count, first_opened_at, last_opened_at, signed_storage_path,
      document_templates ( name ),
      document_bundles ( id, token, title )
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

  // Fetch parent send info for chain sends (forward workflow)
  const parentIds = [...new Set((sends || []).map(s => s.parent_send_id).filter(Boolean))]
  const parentMap = {}
  if (parentIds.length > 0) {
    const { data: parents } = await supabaseAdmin
      .from('document_sends')
      .select('id, signer_name, submitted_at, signed_at, status, created_at, first_opened_at, open_count')
      .in('id', parentIds)
    ;(parents || []).forEach(p => { parentMap[p.id] = p })
  }

  // Build base URL for signer links
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const baseUrl = host ? `${proto}://${host}` : ''

  const mapped = (sends || []).map(s => ({
    ...s,
    template_name: s.document_templates?.name || null,
    signer_url: s.token ? `${baseUrl}/dokument/${s.token}` : null,
    bundle_url: s.document_bundles?.token ? `${baseUrl}/bundle/${s.document_bundles.token}` : null,
    bundle_title: s.document_bundles?.title || null,
    bundle_token: s.document_bundles?.token || null,
    document_templates: undefined,
    document_bundles: undefined,
    // Derived title for display (template name or source_url title or fallback)
    display_title: s.document_templates?.name || (s.source_url?.startsWith('cv:') ? 'Lebenslauf' : s.source_url ? 'Dokument (Link)' : '–'),
    // Parent send data for chain history (FK's submission info when this is a forwarded company send)
    parent_send: s.parent_send_id ? (parentMap[s.parent_send_id] || null) : null,
  }))

  return res.json({ sends: mapped })
})