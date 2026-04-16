import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!adminCheck) return res.status(403).json({ error: 'Nur für Admins' })

  const { companyId } = req.body
  if (!companyId) return res.status(400).json({ error: 'companyId fehlt' })

  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies').select('*').eq('id', companyId).single()
  if (cErr || !company) return res.status(404).json({ error: 'Unternehmen nicht gefunden' })
  if (company.status === 'approved') return res.status(400).json({ error: 'Bereits freigeschaltet' })

  // Create auth user with random password — user sets own password via the link
  const tempPw = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: company.email,
    password: tempPw,
    email_confirm: true,
  })
  if (authErr) return res.status(500).json({ error: authErr.message })

  // Generate a one-time password-setup link
  const platformUrl = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: company.email,
    options: { redirectTo: `${platformUrl}/matching/konto-einrichten` },
  })
  // Replace localhost with real URL (workaround for Supabase Site URL still set to localhost)
  const rawLink = linkData?.properties?.action_link || ''
  const setupLink = rawLink
    ? rawLink.replace(/^https?:\/\/localhost(:\d+)?/, platformUrl)
    : `${platformUrl}/matching/konto-einrichten`

  // Update company record
  await supabaseAdmin.from('companies').update({
    status: 'approved',
    user_id: authUser.user.id,
    approved_at: new Date().toISOString(),
    approved_by: user.id,
  }).eq('id', companyId)

  // Send branded approval email via Resend
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  let emailSent = false
  let emailError = null

  if (!resendKey) {
    emailError = 'RESEND_API_KEY ist nicht als Vercel-Umgebungsvariable gesetzt.'
  } else {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: company.email,
          subject: 'Ihr FKVI-Zugang wurde freigeschaltet – Passwort festlegen',
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
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Herzlich willkommen!</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280">Ihr Zugang zur FKVI-Matching-Plattform wurde freigeschaltet.</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151">Sehr geehrte/r <strong>${company.first_name || ''} ${company.last_name || ''}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              Ihre Anfrage wurde genehmigt. Bitte legen Sie jetzt Ihr persönliches Passwort fest, um Zugang zur Plattform zu erhalten.
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
            <p style="margin:0 0 8px;font-size:13px;color:#9ca3af">Dieser Link ist 24 Stunden gültig. Danach können Sie auf der Anmeldeseite "Passwort vergessen" nutzen.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:24px 0">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Ihre Zugangsdaten</p>
              <p style="margin:0 0 4px;font-size:14px;color:#111827"><strong>E-Mail:</strong> ${company.email}</p>
              <p style="margin:0;font-size:14px;color:#111827"><strong>Plattform:</strong> <a href="${platformUrl}/matching" style="color:#1e3a5f">${platformUrl}/matching</a></p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center">
            <p style="margin:0;font-size:13px;color:#9ca3af">
              Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br>
              <strong style="color:#6b7280">Ihr FKVI-Team</strong>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        }),
      })
      if (emailRes.ok) {
        emailSent = true
      } else {
        const body = await emailRes.json().catch(() => ({}))
        emailError = body.message || `Resend HTTP ${emailRes.status}`
      }
    } catch (err) {
      emailError = err.message
    }
  }

  res.json({ success: true, message: 'Unternehmen freigeschaltet', emailSent, emailError })
}
