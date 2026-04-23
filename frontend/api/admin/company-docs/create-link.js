import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin.from('admin_users').select('id').eq('user_id', user.id).single()
  return data ? user : null
}

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">FKVI</p>
            <p style="margin:4px 0 0;color:#93b4d4;font-size:13px">Fachkräfte Vermittlung International</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">
              FKVI · Fachkräfte Vermittlung International<br>
              Bei Fragen antworten Sie auf diese E-Mail.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '').trim()
  const admin = await requireAdmin(token)
  if (!admin) return res.status(401).json({ error: 'Nicht autorisiert' })

  const { reservationId, profileId, companyEmail, companyName, documents, expiresInDays } = req.body || {}

  if (!companyEmail) return res.status(400).json({ error: 'companyEmail ist erforderlich' })
  if (!Array.isArray(documents)) return res.status(400).json({ error: 'documents muss ein Array sein' })
  if (!expiresInDays || expiresInDays < 1) return res.status(400).json({ error: 'Ungültige Gültigkeitsdauer' })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays))

  // Create record in company_document_links
  const { data: linkRow, error: insertError } = await supabaseAdmin
    .from('company_document_links')
    .insert({
      reservation_id: reservationId || null,
      profile_id: profileId || null,
      company_email: companyEmail,
      company_name: companyName || null,
      documents,
      expires_at: expiresAt.toISOString(),
    })
    .select('token')
    .single()

  if (insertError || !linkRow) {
    console.error('company-docs/create-link insert error:', insertError)
    return res.status(500).json({ error: 'Datenbankfehler beim Erstellen des Links' })
  }

  const baseUrl = process.env.VITE_APP_URL || 'https://frontend-nu-two-69.vercel.app'
  const accessUrl = `${baseUrl}/unterlagen/${linkRow.token}`

  const hasDocs = documents.length > 0

  const docListHtml = hasDocs
    ? documents.map(d =>
        `<li style="margin:0 0 8px;color:#1e293b;font-size:14px;line-height:1.5">
          <strong>${d.title}</strong>${d.doc_type ? ` <span style="color:#64748b;font-size:12px">(${d.doc_type})</span>` : ''}
        </li>`
      ).join('')
    : ''

  const emailHtml = emailWrapper(hasDocs ? `
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;font-weight:700">Ihre Fachkraft-Unterlagen sind bereit</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px">Sehr geehrte Damen und Herren${companyName ? ' von ' + companyName : ''},</p>
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6">
      wir freuen uns, Ihnen mitteilen zu können, dass die <strong>Zusage für Ihre Anfrage</strong> erteilt wurde.
      Folgende Unterlagen der Fachkraft stehen für Sie bereit:
    </p>
    <ul style="margin:0 0 24px;padding-left:20px">${docListHtml}</ul>
    <p style="margin:0 0 20px;color:#1e293b;font-size:15px;line-height:1.6">
      Klicken Sie auf den Button unten, um die Dokumente sicher abzurufen.
      Aus Datenschutzgründen müssen Sie Ihre E-Mail-Adresse zur Verifizierung eingeben.
      Der Link ist für <strong>${expiresInDays} Tage</strong> gültig.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td align="center">
        <a href="${accessUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px">
          Unterlagen abrufen →
        </a>
      </td></tr>
    </table>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">
      Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
      <a href="${accessUrl}" style="color:#1e3a5f;word-break:break-all">${accessUrl}</a>
    </p>
  ` : `
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;font-weight:700">Zusage erteilt</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px">Sehr geehrte Damen und Herren${companyName ? ' von ' + companyName : ''},</p>
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6">
      wir freuen uns, Ihnen mitteilen zu können, dass die <strong>Zusage für Ihre Anfrage</strong> erteilt wurde.
    </p>
    <p style="margin:0 0 24px;color:#1e293b;font-size:15px;line-height:1.6">
      Unser Team wird sich in Kürze mit weiteren Informationen bei Ihnen melden.
    </p>
    <p style="margin:0;color:#94a3b8;font-size:13px">
      Bei Fragen stehen wir Ihnen gerne zur Verfügung.
    </p>
  `)

  // Send email via Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'FKVI <no-reply@fkvi.de>',
      to: [companyEmail],
      subject: hasDocs ? 'Zusage erteilt – Unterlagen der Fachkraft abrufbar' : 'Zusage erteilt – FKVI',
      html: emailHtml,
    }),
  })

  if (!emailRes.ok) {
    const emailErr = await emailRes.text()
    console.error('company-docs/create-link email error:', emailErr)
    return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden' })
  }

  return res.json({ success: true, token: linkRow.token, accessUrl })
})
