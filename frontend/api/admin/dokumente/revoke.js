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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try {
    user = await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { sendId } = req.body || {}
  if (!sendId) return res.status(400).json({ error: 'sendId ist erforderlich' })

  const { error: updateError } = await supabaseAdmin
    .from('document_sends')
    .update({
      status: 'revoked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sendId)

  if (updateError) {
    console.error('dokumente/revoke update error:', updateError)
    return res.status(500).json({ error: 'Versendung konnte nicht widerrufen werden' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null
  const userAgent = req.headers['user-agent'] || null

  await supabaseAdmin.from('document_audit_log').insert({
    document_send_id: sendId,
    event_type: 'revoked',
    ip_address: ip,
    user_agent: userAgent,
    metadata: { revoked_by: user.id },
  })

  return res.json({ success: true })
})