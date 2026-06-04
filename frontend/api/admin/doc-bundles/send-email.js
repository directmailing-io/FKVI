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

function buildEmailHtml({ recipientName, bundleUrl, customMessage, files, entityName }) {
  const fileListHtml = files.map(f => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="vertical-align:top;width:36px;padding-right:12px;">
              <div style="width:36px;height:36px;background:#f0f7ff;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:18px;">📄</span>
              </div>
            </td>
            <td style="vertical-align:top;">
              <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#1a2e45;">${f.title}</p>
              ${f.description ? `<p style="margin:0;font-size:13px;color:#6b7280;">${f.description}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')

  const greeting = recipientName ? `Hallo ${recipientName},` : 'Guten Tag,'
  const customPart = customMessage
    ? `<p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;background:#f9fafb;border-left:3px solid #0d9488;padding:14px 16px;border-radius:0 8px 8px 0;">${customMessage.replace(/\n/g, '<br>')}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:580px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a3a5c 0%,#0d9488 100%);padding:36px 40px;">
          <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Fachkraft Vermittlung International</h1>
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;">Unterlagen für Sie</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 8px;color:#1a2e45;font-size:18px;font-weight:600;">${greeting}</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
            ${entityName ? `im Rahmen Ihrer Zusammenarbeit mit FKVI haben wir folgende Unterlagen für Sie zusammengestellt:` : 'wir haben folgende Unterlagen für Sie zusammengestellt:'}
          </p>

          ${customPart}

          <!-- File list -->
          <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin:0 0 28px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${files.length} Dokument${files.length !== 1 ? 'e' : ''}</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${fileListHtml}
            </table>
          </div>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="background:#0d9488;border-radius:10px;">
              <a href="${bundleUrl}" style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                Unterlagen öffnen →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">Oder diesen Link im Browser öffnen:</p>
          <p style="margin:0;font-size:13px;word-break:break-all;">
            <a href="${bundleUrl}" style="color:#0d9488;text-decoration:none;">${bundleUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
            Diese E-Mail wurde von Fachkraft Vermittlung International GmbH &amp; Co. KG gesendet.<br>
            Bei Fragen wenden Sie sich bitte direkt an uns.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) { return res.status(e.status || 401).json({ error: e.message }) }

  const { bundle_id, recipient_name, recipient_email, custom_message } = req.body || {}
  if (!bundle_id || !recipient_email) {
    return res.status(400).json({ error: 'bundle_id und recipient_email sind erforderlich' })
  }

  // Load bundle
  const { data: bundle, error: bundleErr } = await supabaseAdmin
    .from('doc_bundles')
    .select('*')
    .eq('id', bundle_id)
    .single()

  if (bundleErr || !bundle) return res.status(404).json({ error: 'Bundle nicht gefunden' })

  const bundleUrl = `${PLATFORM_URL}/unterlagen/${bundle.token}`
  const html = buildEmailHtml({
    recipientName: recipient_name || bundle.recipient_name || '',
    bundleUrl,
    customMessage: custom_message || '',
    files: bundle.files || [],
    entityName: bundle.entity_name || '',
  })

  const subject = `Ihre Unterlagen von Fachkraft Vermittlung International`

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'E-Mail-Versand nicht konfiguriert (RESEND_API_KEY fehlt)' })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Fachkraft Vermittlung International <noreply@daniel-kurzeja.de>',
      to: [recipient_email],
      subject,
      html,
    }),
  })

  if (!emailRes.ok) {
    const errBody = await emailRes.text()
    return res.status(500).json({ error: `E-Mail-Fehler: ${errBody}` })
  }

  // Mark email as sent
  await supabaseAdmin
    .from('doc_bundles')
    .update({ email_sent_at: new Date().toISOString(), recipient_email, recipient_name: recipient_name || bundle.recipient_name })
    .eq('id', bundle_id)

  return res.json({ success: true })
})
