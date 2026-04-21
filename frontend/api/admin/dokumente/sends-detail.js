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

  const { sendId } = req.query
  if (!sendId) return res.status(400).json({ error: 'sendId ist erforderlich' })

  const { data: send, error: sendError } = await supabaseAdmin
    .from('document_sends')
    .select(`
      *,
      document_templates ( name ),
      profiles ( first_name, last_name, gender )
    `)
    .eq('id', sendId)
    .single()

  if (sendError || !send) {
    return res.status(404).json({ error: 'Versendung nicht gefunden' })
  }

  const { data: auditLog, error: auditError } = await supabaseAdmin
    .from('document_audit_log')
    .select('*')
    .eq('document_send_id', sendId)
    .order('created_at', { ascending: true })

  if (auditError) {
    console.error('dokumente/sends-detail audit log error:', auditError)
  }

  // Build signer URL
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const baseUrl = host ? `${proto}://${host}` : ''
  const signerUrl = send.token ? `${baseUrl}/dokument/${send.token}` : null

  let signedPdfUrl = null
  if (send.signed_storage_path) {
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('signed-documents')
      .createSignedUrl(send.signed_storage_path, 3600)
    if (signedError) {
      console.error('dokumente/sends-detail signed URL error:', signedError)
    } else {
      signedPdfUrl = signedData?.signedUrl || null
    }
  }

  // Normalize audit events to match frontend shape
  const events = (auditLog || []).map(e => ({
    type: e.event_type,
    created_at: e.created_at,
    ip_address: e.ip_address,
    metadata: e.metadata,
    count: 1,
  }))

  return res.json({
    send: {
      ...send,
      signer_url: signerUrl,
      template_name: send.document_templates?.name || null,
    },
    template: send.document_templates || null,
    events,
    signedPdfUrl,
  })
})