import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'token ist erforderlich' })

  const { data: send, error: sendError } = await supabaseAdmin
    .from('document_sends')
    .select(`
      id,
      token,
      signer_name,
      message,
      prefill_data,
      status,
      expires_at,
      open_count,
      first_opened_at,
      template_id,
      prefill_mode,
      prefilled_field_ids,
      recipient_type,
      parent_send_id,
      document_templates (
        name,
        description,
        fields,
        page_count
      )
    `)
    .eq('token', token)
    .single()

  if (sendError || !send) {
    return res.status(404).json({ error: 'Dokument nicht gefunden' })
  }

  // Validate not revoked
  if (send.status === 'revoked') {
    return res.status(410).json({ error: 'Dieses Dokument wurde widerrufen' })
  }

  // Validate not expired
  if (send.expires_at && new Date(send.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Dieser Link ist abgelaufen' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null
  const userAgent = req.headers['user-agent'] || null
  const isFirstOpen = send.status === 'pending'

  // Update open tracking for pending or opened status
  if (send.status === 'pending' || send.status === 'opened') {
    const updates = {
      last_opened_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (send.status === 'pending') {
      updates.status = 'opened'
      updates.first_opened_at = new Date().toISOString()
      updates.open_count = 1
    } else {
      updates.open_count = (send.open_count || 0) + 1
    }

    await supabaseAdmin
      .from('document_sends')
      .update(updates)
      .eq('id', send.id)

    // Insert audit log only on first open
    if (isFirstOpen) {
      await supabaseAdmin.from('document_audit_log').insert({
        document_send_id: send.id,
        event_type: 'opened',
        ip_address: ip,
        user_agent: userAgent,
        metadata: null,
      })
    }
  }

  const tpl = send.document_templates || {}
  const alreadySigned = send.status === 'signed' || send.status === 'submitted'
  const recipientType = send.recipient_type || 'fachkraft'

  // Filter fields to only those relevant to the recipient
  // 'admin'-audience fields are always handled as prefills (never shown to signer)
  const allFields = tpl.fields || []
  const visibleFields = allFields.filter(f => {
    const audience = f.audience || 'fachkraft'
    if (audience === 'admin') return false // admin fields are pre-filled, not shown
    return audience === recipientType
  })

  return res.json({
    sendId: send.id,
    templateName: tpl.name || null,
    description: tpl.description || null,
    signerName: send.signer_name,
    message: send.message || null,
    prefillData: send.prefill_data || {},
    fields: visibleFields,
    pageCount: tpl.page_count || null,
    expiresAt: send.expires_at,
    status: isFirstOpen ? 'opened' : send.status,
    alreadySigned,
    prefillMode: send.prefill_mode || 'blank',
    prefilledFieldIds: send.prefilled_field_ids || [],
    recipientType,
    isForwarded: !!send.parent_send_id,
  })
})