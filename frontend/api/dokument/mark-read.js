import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: 'token ist erforderlich' })

  const { data: send, error } = await supabaseAdmin
    .from('document_sends')
    .select('id, status, send_mode')
    .eq('token', token)
    .single()

  if (error || !send) return res.status(404).json({ error: 'Dokument nicht gefunden' })
  if (send.send_mode !== 'view') return res.status(400).json({ error: 'Nur für Ansichts-Versendungen' })
  if (send.status === 'submitted' || send.status === 'signed') {
    return res.json({ ok: true, alreadyRead: true })
  }

  await supabaseAdmin
    .from('document_sends')
    .update({ status: 'submitted', signed_at: new Date().toISOString() })
    .eq('id', send.id)

  await supabaseAdmin.from('document_audit_log').insert({
    document_send_id: send.id,
    event_type: 'submitted',
    ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
    user_agent: req.headers['user-agent'] || null,
    metadata: { action: 'mark_read' },
  })

  return res.json({ ok: true })
})
