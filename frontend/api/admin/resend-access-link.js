import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

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
  try { await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { companyId } = req.body
  if (!companyId) return res.status(400).json({ error: 'companyId fehlt' })

  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies').select('*').eq('id', companyId).single()
  if (cErr || !company) return res.status(404).json({ error: 'Unternehmen nicht gefunden' })
  if (!company.user_id) return res.status(400).json({ error: 'Kein Auth-Nutzer verknüpft. Bitte Unternehmen zuerst freischalten.' })

  const platformUrl = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'

  // Generate a new password-reset link
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: company.email,
    options: { redirectTo: `${platformUrl}/matching/konto-einrichten` },
  })
  if (linkErr) return res.status(500).json({ error: linkErr.message })

  const rawLink = linkData?.properties?.action_link || ''
  const setupLink = rawLink
    ? rawLink.replace(/^https?:\/\/localhost(:\d+)?/, platformUrl)
    : `${platformUrl}/matching/passwort-vergessen`

  // Send via Resend
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY nicht konfiguriert' })

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: company.email,
      subject: 'Ihr FKVI-Zugangslink – Passwort festlegen / zurücksetzen',
      html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center">
            <p style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">FKVI</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.65);font-size:12px;letter-spacing:1px;text-transform:uppercase">Fachkraft Vermittlung International</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Ihr Zugangslink</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#374151">
              Sehr geehrte/r <strong>${company.first_name || ''} ${company.last_name || ''}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              Klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen und auf die FKVI-Matching-Plattform zuzugreifen:
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px">
              <tr>
                <td style="background:#1e3a5f;border-radius:8px;padding:14px 28px">
                  <a href="${setupLink}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:block">
                    Passwort festlegen &amp; Plattform öffnen
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#9ca3af">Dieser Link ist 24 Stunden gültig.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:24px 0">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Ihre Zugangsdaten</p>
              <p style="margin:0 0 4px;font-size:14px;color:#111827"><strong>E-Mail:</strong> ${company.email}</p>
              <p style="margin:0;font-size:14px;color:#111827"><strong>Plattform:</strong> <a href="${platformUrl}/matching" style="color:#1e3a5f">${platformUrl}/matching</a></p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center">
            <p style="margin:0;font-size:13px;color:#9ca3af">Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br><strong style="color:#6b7280">Ihr FKVI-Team</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  })

  if (!emailRes.ok) {
    const body = await emailRes.json().catch(() => ({}))
    return res.status(500).json({ error: body.message || `E-Mail-Fehler: HTTP ${emailRes.status}` })
  }

  return res.json({ success: true })
})
