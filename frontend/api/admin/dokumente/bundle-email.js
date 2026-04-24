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

  const { bundleId, recipientEmail, recipientName, customMessage } = req.body || {}
  if (!bundleId) return res.status(400).json({ error: 'bundleId ist erforderlich' })
  if (!recipientEmail) return res.status(400).json({ error: 'recipientEmail ist erforderlich' })
  if (!recipientName) return res.status(400).json({ error: 'recipientName ist erforderlich' })

  // Load bundle + its sends
  const { data: bundle, error: bundleErr } = await supabaseAdmin
    .from('document_bundles')
    .select('token, title')
    .eq('id', bundleId)
    .single()

  if (bundleErr || !bundle) return res.status(404).json({ error: 'Paket nicht gefunden' })

  const { data: sends } = await supabaseAdmin
    .from('document_sends')
    .select('document_templates(name)')
    .eq('bundle_id', bundleId)
    .order('created_at')

  const bundleUrl = `${PLATFORM_URL}/bundle/${bundle.token}`
  const firstName = recipientName.split(' ')[0]
  const bundleTitle = bundle.title || 'Dokument-Paket'
  const docCount = (sends || []).length

  const defaultMessage = `von Fachkraft Vermittlung International ist ein Paket mit ${docCount} ${docCount === 1 ? 'Dokument' : 'Dokumenten'} eingegangen, das ausgefüllt und unterschrieben werden muss.`
  const messageText = (customMessage || defaultMessage).trim()

  // Build document list rows for email
  const docListRows = (sends || []).map((s, i) => `
    <tr>
      <td style="padding:8px 0;color:#444;font-size:14px;border-bottom:1px solid #f0f0f0;">
        <span style="display:inline-block;width:22px;height:22px;background:#1a3a5c;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;margin-right:10px;">${i + 1}</span>
        ${s.document_templates?.name || 'Dokument'}
      </td>
    </tr>`).join('')

  const htmlBody = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <tr>
          <td style="background:#1a3a5c;padding:28px 36px;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Fachkraft Vermittlung International</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:0.5px;text-transform:uppercase;">${docCount} ${docCount === 1 ? 'Dokument' : 'Dokumente'} zum Ausfüllen &amp; Unterschreiben</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 20px;color:#1a1a1a;font-size:16px;font-weight:600;">Hallo ${firstName},</p>
            <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.65;">${messageText.replace(/\n/g, '<br>')}</p>

            <!-- Document list -->
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:8px;margin:0 0 28px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 10px;color:#1a3a5c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Enthaltene Dokumente</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  ${docListRows}
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#0ea5a0;border-radius:8px;">
                  <a href="${bundleUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                    Alle Dokumente öffnen →
                  </a>
                </td>
              </tr>
            </table>

            <!-- How it works -->
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
              <tr><td style="padding:20px 22px;">
                <p style="margin:0 0 12px;color:#1a3a5c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">So einfach geht's</p>
                <table cellpadding="0" cellspacing="0">
                  <tr><td style="padding:4px 0;color:#555;font-size:14px;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1a3a5c;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;">1</span>
                    Auf den Button klicken – Übersicht öffnet sich
                  </td></tr>
                  <tr><td style="padding:4px 0;color:#555;font-size:14px;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1a3a5c;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;">2</span>
                    Jedes Dokument einzeln öffnen, ausfüllen &amp; unterschreiben
                  </td></tr>
                  <tr><td style="padding:4px 0;color:#555;font-size:14px;">
                    <span style="display:inline-block;width:22px;height:22px;background:#0ea5a0;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;">3</span>
                    Fertig – in eigenem Tempo, keine App nötig
                  </td></tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 6px;color:#888;font-size:13px;"><strong style="color:#666;">Alternative:</strong> Dokumente ausdrucken, von Hand ausfüllen &amp; unterschreiben und eingescannt zurückschicken.</p>

            <p style="margin:20px 0 0;color:#aaa;font-size:12px;">Falls der Button nicht funktioniert, diesen Link im Browser öffnen:</p>
            <p style="margin:4px 0 0;word-break:break-all;font-size:12px;">
              <a href="${bundleUrl}" style="color:#1a3a5c;">${bundleUrl}</a>
            </p>
          </td>
        </tr>

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

  if (!process.env.RESEND_API_KEY)
    return res.status(500).json({ error: 'E-Mail-Versand ist nicht konfiguriert.' })

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fachkraft Vermittlung International <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `${docCount} ${docCount === 1 ? 'Dokument' : 'Dokumente'} zum Unterschreiben – ${bundleTitle}`,
      html: htmlBody,
    }),
  })

  if (!emailRes.ok) {
    let errBody
    try { errBody = await emailRes.json() } catch { errBody = { message: await emailRes.text() } }
    console.error('bundle-email Resend error:', JSON.stringify(errBody))
    return res.status(500).json({ error: `E-Mail konnte nicht gesendet werden: ${errBody?.message || JSON.stringify(errBody)}` })
  }

  return res.json({ success: true })
})
