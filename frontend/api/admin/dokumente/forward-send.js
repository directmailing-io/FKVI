import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLATFORM_URL = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'

async function requireAdmin(token) {
  if (!token) throw { status: 401, message: 'Unauthorized' }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw { status: 401, message: 'Unauthorized' }
  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) throw { status: 403, message: 'Forbidden' }
  return user
}

async function sendEmail({ signerName, signerEmail, signerUrl, message }) {
  const htmlBody = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a3a5c;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Fachkraft Vermittlung International</h1>
              <p style="margin:8px 0 0;color:#a8c4e0;font-size:14px;">Dokument unterzeichnen</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">Hallo ${signerName},</p>
              <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
                Ein Dokument wurde für Ihre Unterschrift weitergeleitet.
              </p>
              ${message ? `<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;padding:16px;background:#f0f4f8;border-left:4px solid #1a3a5c;border-radius:4px;">${message}</p>` : ''}
              <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6;">
                Bitte klicken Sie auf den Button, um das Dokument anzuzeigen und zu unterzeichnen:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#0ea5a0;border-radius:6px;">
                    <a href="${signerUrl}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">
                      Dokument unterzeichnen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#1a3a5c;font-size:13px;word-break:break-all;">
                <a href="${signerUrl}" style="color:#1a3a5c;">${signerUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f0f4f8;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#999;font-size:12px;text-align:center;">
                Automatisch generiert von Fachkraft Vermittlung International GmbH &amp; Co. KG
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fachkraft Vermittlung International <noreply@fkvi-plattform.de>',
      to: [signerEmail],
      subject: 'Dokument unterzeichnen – Fachkraft Vermittlung International',
      html: htmlBody,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('forward-send email error:', err)
  }
}

// POST { originalSendId, signerName, signerEmail, message, expiresInDays, prefillData }
// Creates a new document_sends for Unternehmen, using the FK-signed PDF as base.
export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try {
    user = await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const {
    originalSendId,
    signerName,
    signerEmail,
    message,
    expiresInDays = 30,
    prefillData = {},
  } = req.body || {}

  if (!originalSendId) return res.status(400).json({ error: 'originalSendId ist erforderlich' })
  if (!signerName) return res.status(400).json({ error: 'signerName ist erforderlich' })

  // Load original send
  const { data: original, error: origError } = await supabaseAdmin
    .from('document_sends')
    .select('id, status, template_id, profile_id, company_id, signed_storage_path, field_values, recipient_type, prefill_data')
    .eq('id', originalSendId)
    .single()

  if (origError || !original) {
    return res.status(404).json({ error: 'Ursprünglicher Versand nicht gefunden' })
  }

  if (original.status !== 'submitted' && original.status !== 'signed') {
    return res.status(400).json({ error: 'Dokument wurde noch nicht unterzeichnet' })
  }

  if (!original.signed_storage_path) {
    return res.status(400).json({ error: 'Kein signiertes Dokument vorhanden' })
  }

  // Load template to determine which fields belong to which audience
  const { data: template, error: tplError } = await supabaseAdmin
    .from('document_templates')
    .select('fields')
    .eq('id', original.template_id)
    .single()

  if (tplError || !template) {
    return res.status(404).json({ error: 'Vorlage nicht gefunden' })
  }

  const templateFields = template.fields || []
  const originalRecipientType = original.recipient_type || 'fachkraft'

  // All fields that were already handled (original recipient's + admin fields) are "prefilled"
  const alreadyHandledFieldIds = templateFields
    .filter(f => {
      const audience = f.audience || 'fachkraft'
      return audience === originalRecipientType || audience === 'admin'
    })
    .map(f => f.id)

  // Merge prefill data: original + new company data provided by admin
  const mergedPrefillData = {
    ...(original.prefill_data || {}),
    ...(original.field_values || {}), // values actually submitted by FK
    ...prefillData, // any admin overrides for this forward
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Create the forwarded send
  const { data: newSend, error: insertError } = await supabaseAdmin
    .from('document_sends')
    .insert({
      template_id: original.template_id,
      profile_id: original.profile_id,
      company_id: original.company_id,
      signer_name: signerName,
      signer_email: signerEmail || null,
      message: message || null,
      prefill_data: mergedPrefillData,
      expires_at: expiresAt.toISOString(),
      sent_by: user.id,
      status: 'pending',
      prefill_mode: 'prefilled',
      prefilled_field_ids: alreadyHandledFieldIds,
      // Use FK-signed PDF as the base — Unternehmen sees it with FK signature already in
      prefilled_storage_path: original.signed_storage_path,
      recipient_type: 'unternehmen',
      parent_send_id: originalSendId,
    })
    .select('id, token')
    .single()

  if (insertError || !newSend) {
    console.error('forward-send insert error:', insertError)
    return res.status(500).json({ error: 'Weiterleitung konnte nicht erstellt werden' })
  }

  // Audit log
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null
  const userAgent = req.headers['user-agent'] || null
  await supabaseAdmin.from('document_audit_log').insert({
    document_send_id: newSend.id,
    event_type: 'created',
    ip_address: ip,
    user_agent: userAgent,
    metadata: { forwarded_from: originalSendId },
  })

  const signerUrl = `${PLATFORM_URL}/dokument/${newSend.token}`

  // Send email if provided
  if (signerEmail && process.env.RESEND_API_KEY) {
    try {
      await sendEmail({ signerName, signerEmail, signerUrl, message })
    } catch (emailErr) {
      console.error('forward-send email error:', emailErr)
    }
  }

  return res.json({
    sendId: newSend.id,
    token: newSend.token,
    signerUrl,
  })
})
