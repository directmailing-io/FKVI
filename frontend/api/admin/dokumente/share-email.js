import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

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

  const { recipientEmail, recipientName, documentTitle, documentUrl, customMessage } = req.body || {}
  if (!recipientEmail || !documentTitle || !documentUrl)
    return res.status(400).json({ error: 'recipientEmail, documentTitle und documentUrl sind erforderlich' })

  const firstName = (recipientName || '').split(' ')[0] || recipientName || 'Empfänger'
  const greeting = customMessage
    || `von Fachkraft Vermittlung International wurde ein Dokument für weitergeleitet: „${documentTitle}".`

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <div style="background:#1a3a5c;padding:28px 32px">
      <p style="margin:0;color:rgba(255,255,255,.55);font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:500">Fachkraft Vermittlung International</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">Dokument erhalten</h1>
    </div>
    <div style="padding:28px 32px;color:#374151">
      <p style="margin:0 0 16px;font-size:15px">Hallo ${firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b7280">${greeting}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px">
        <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:600">Dokument</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${documentTitle}</p>
      </div>
      <a href="${documentUrl}"
         style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:0 0 24px">
        Dokument öffnen →
      </a>
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">Oder diesen Link kopieren:</p>
      <p style="margin:0;font-size:11px;color:#6b7280;word-break:break-all">${documentUrl}</p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#fafafa">
      <p style="margin:0;font-size:11px;color:#9ca3af">Fachkraft Vermittlung International GmbH &amp; Co. KG</p>
    </div>
  </div>
</body>
</html>`

  const { error: mailErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Fachkraft Vermittlung International <noreply@daniel-kurzeja.de>',
    to: [recipientEmail],
    subject: `Dokument weitergeleitet – ${documentTitle}`,
    html,
  })

  if (mailErr) {
    console.error('share-email error:', mailErr)
    return res.status(500).json({ error: mailErr.message || 'E-Mail konnte nicht gesendet werden' })
  }

  return res.json({ ok: true })
})
