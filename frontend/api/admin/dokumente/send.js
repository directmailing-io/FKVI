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
          <!-- Header -->
          <tr>
            <td style="background:#1a3a5c;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">FKVI Plattform</h1>
              <p style="margin:8px 0 0;color:#a8c4e0;font-size:14px;">Dokument unterzeichnen</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">Hallo ${signerName},</p>
              <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
                Sie wurden gebeten, ein Dokument zu unterzeichnen.
              </p>
              ${message ? `<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;padding:16px;background:#f0f4f8;border-left:4px solid #1a3a5c;border-radius:4px;">${message}</p>` : ''}
              <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6;">
                Bitte klicken Sie auf den folgenden Button, um das Dokument anzuzeigen und zu unterzeichnen:
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#0ea5a0;border-radius:6px;">
                    <a href="${signerUrl}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                      Dokument unterzeichnen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#888;font-size:13px;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="margin:0;color:#1a3a5c;font-size:13px;word-break:break-all;">
                <a href="${signerUrl}" style="color:#1a3a5c;">${signerUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f0f4f8;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#999;font-size:12px;text-align:center;">
                Diese E-Mail wurde automatisch von der FKVI Plattform gesendet. Bitte antworten Sie nicht auf diese E-Mail.
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
      from: 'FKVI Plattform <noreply@fkvi-plattform.de>',
      to: [signerEmail],
      subject: 'Dokument unterzeichnen – FKVI Plattform',
      html: htmlBody,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Resend email error:', err)
  }
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

  const {
    templateId,
    profileId,
    signerName,
    signerEmail,
    message,
    prefillData,
    expiresInDays = 30,
  } = req.body || {}

  if (!templateId) return res.status(400).json({ error: 'templateId ist erforderlich' })
  if (!signerName) return res.status(400).json({ error: 'signerName ist erforderlich' })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const { data: send, error: insertError } = await supabaseAdmin
    .from('document_sends')
    .insert({
      template_id: templateId,
      profile_id: profileId || null,
      signer_name: signerName,
      signer_email: signerEmail || null,
      message: message || null,
      prefill_data: prefillData || {},
      expires_at: expiresAt.toISOString(),
      sent_by: user.id,
      status: 'pending',
    })
    .select('id, token')
    .single()

  if (insertError || !send) {
    console.error('dokumente/send insert error:', insertError)
    return res.status(500).json({ error: 'Versendung konnte nicht erstellt werden' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null
  const userAgent = req.headers['user-agent'] || null

  // Insert audit log
  await supabaseAdmin.from('document_audit_log').insert({
    document_send_id: send.id,
    event_type: 'created',
    ip_address: ip,
    user_agent: userAgent,
    metadata: null,
  })

  const signerUrl = `${PLATFORM_URL}/dokument/${send.token}`

  // Send email if signerEmail and RESEND_API_KEY are set
  if (signerEmail && process.env.RESEND_API_KEY) {
    try {
      await sendEmail({ signerName, signerEmail, signerUrl, message })
    } catch (emailErr) {
      console.error('dokumente/send email error:', emailErr)
      // Don't fail the request if email fails
    }
  }

  return res.json({
    sendId: send.id,
    token: send.token,
    signerUrl,
  })
})