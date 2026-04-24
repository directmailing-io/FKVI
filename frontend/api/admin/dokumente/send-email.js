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

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { sendId, recipientEmail, recipientName, customMessage } = req.body || {}
  if (!sendId) return res.status(400).json({ error: 'sendId ist erforderlich' })
  if (!recipientEmail) return res.status(400).json({ error: 'recipientEmail ist erforderlich' })
  if (!recipientName) return res.status(400).json({ error: 'recipientName ist erforderlich' })

  // Load send record
  const { data: send, error: sendErr } = await supabaseAdmin
    .from('document_sends')
    .select('token, template_id, document_templates(name)')
    .eq('id', sendId)
    .single()

  if (sendErr || !send) return res.status(404).json({ error: 'Versendung nicht gefunden' })

  const signerUrl = `${PLATFORM_URL}/dokument/${send.token}`
  const templateName = send.document_templates?.name || 'Dokument'
  const firstName = recipientName.split(' ')[0]

  const defaultMessage = `von Fachkraft Vermittlung International ist ein Dokument eingegangen, das ausgefüllt und unterschrieben werden muss: „${templateName}".`
  const messageText = (customMessage || defaultMessage).trim()

  const htmlBody = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a3a5c;padding:28px 36px;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Fachkraft Vermittlung International</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:0.5px;text-transform:uppercase;">Dokument zum Ausfüllen &amp; Unterschreiben</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 20px;color:#1a1a1a;font-size:16px;font-weight:600;">Hallo ${firstName},</p>
            <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.65;">${messageText.replace(/\n/g, '<br>')}</p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#0ea5a0;border-radius:8px;">
                  <a href="${signerUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                    Dokument öffnen &amp; unterschreiben →
                  </a>
                </td>
              </tr>
            </table>

            <!-- How it works -->
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 12px;color:#1a3a5c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">So einfach geht's</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:#555;font-size:14px;">
                        <span style="display:inline-block;width:22px;height:22px;background:#1a3a5c;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;">1</span>
                        Auf den Button oben klicken
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#555;font-size:14px;">
                        <span style="display:inline-block;width:22px;height:22px;background:#1a3a5c;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;">2</span>
                        Felder ausfüllen und unterschreiben
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#555;font-size:14px;">
                        <span style="display:inline-block;width:22px;height:22px;background:#0ea5a0;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;">3</span>
                        Absenden – fertig! Keine App nötig.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Alternative -->
            <p style="margin:0 0 6px;color:#888;font-size:13px;"><strong style="color:#666;">Alternative:</strong> Dokument ausdrucken, von Hand ausfüllen &amp; unterschreiben und eingescannt per E-Mail zurückschicken.</p>

            <!-- URL fallback -->
            <p style="margin:20px 0 0;color:#aaa;font-size:12px;">Falls der Button nicht funktioniert, diesen Link im Browser öffnen:</p>
            <p style="margin:4px 0 0;word-break:break-all;font-size:12px;">
              <a href="${signerUrl}" style="color:#1a3a5c;">${signerUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f4f8;padding:16px 36px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#999;font-size:12px;text-align:center;">
              Diese E-Mail wurde automatisch von Fachkraft Vermittlung International GmbH &amp; Co. KG gesendet.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY fehlt).' })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fachkraft Vermittlung International <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Dokument zum Unterschreiben: ${templateName}`,
      html: htmlBody,
    }),
  })

  if (!emailRes.ok) {
    let errBody
    try { errBody = await emailRes.json() } catch { errBody = { message: await emailRes.text() } }
    console.error('send-email Resend error:', JSON.stringify(errBody))
    return res.status(500).json({ error: `E-Mail konnte nicht gesendet werden: ${errBody?.message || errBody?.name || JSON.stringify(errBody)}` })
  }

  return res.json({ success: true })
})
