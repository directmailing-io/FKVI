import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify caller is an admin
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!adminCheck) return res.status(403).json({ error: 'Nur für Admins' })

  const { companyId } = req.body
  if (!companyId) return res.status(400).json({ error: 'companyId fehlt' })

  // Get company
  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies').select('*').eq('id', companyId).single()
  if (cErr || !company) return res.status(404).json({ error: 'Unternehmen nicht gefunden' })
  if (company.status === 'approved') return res.status(400).json({ error: 'Bereits freigeschaltet' })

  const tempPassword = generatePassword()

  // Create Supabase auth user
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: company.email,
    password: tempPassword,
    email_confirm: true,
  })
  if (authErr) return res.status(500).json({ error: authErr.message })

  // Update company record
  await supabaseAdmin.from('companies').update({
    status: 'approved',
    user_id: authUser.user.id,
    approved_at: new Date().toISOString(),
    approved_by: user.id,
  }).eq('id', companyId)

  // Send approval email via Resend
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@fkvi.de'
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: company.email,
        subject: 'Ihr FKVI-Zugang wurde freigeschaltet',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1e3a5f">Willkommen bei FKVI</h2>
            <p>Sehr geehrte/r ${company.first_name || ''} ${company.last_name || ''},</p>
            <p>Ihr Zugang zur FKVI-Matching-Plattform wurde freigeschaltet. Sie können sich ab sofort anmelden:</p>
            <div style="background:#f5f7fa;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0"><strong>E-Mail:</strong> ${company.email}</p>
              <p style="margin:4px 0"><strong>Passwort:</strong> ${tempPassword}</p>
            </div>
            <p>Bitte ändern Sie Ihr Passwort nach dem ersten Login.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr FKVI-Team</p>
          </div>
        `,
      }),
    }).catch(() => {/* email failure is non-critical */})
  }

  res.json({ success: true, message: 'Unternehmen freigeschaltet' })
}
