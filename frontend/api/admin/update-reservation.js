import { createClient } from '@supabase/supabase-js'

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
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">FKVI</p>
            <p style="margin:4px 0 0;color:#93b4d4;font-size:13px">Fachkräfte Vermittlung International</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">
              FKVI · Fachkräfte Vermittlung International<br>
              <a href="https://frontend-nu-two-69.vercel.app/matching/reserviert" style="color:#1e3a5f;text-decoration:none;font-weight:600">Zur Matching-Plattform →</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const EMAIL_STEPS = {
  2: {
    subject: 'Kennenlerngespräch terminiert – FKVI',
    body: (company, profile, stepDate) => emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;font-weight:700">Kennenlerngespräch terminiert</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px">Sehr geehrte/r ${company.first_name || ''} ${company.last_name || ''},</p>
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6">
        wir freuen uns, Ihnen mitteilen zu können, dass das <strong>Kennenlerngespräch mit ${profile}</strong>
        nun terminiert wurde.
      </p>
      ${stepDate ? `<div style="background:#eff6ff;border-left:4px solid #1e3a5f;border-radius:4px;padding:12px 16px;margin:0 0 16px">
        <p style="margin:0;color:#1e3a5f;font-size:14px;font-weight:600">📅 Termin: ${new Date(stepDate).toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</p>
      </div>` : ''}
      <p style="margin:0 0 24px;color:#1e293b;font-size:15px;line-height:1.6">
        Unser Team wird sich in Kürze bei Ihnen melden, um alle Details zu besprechen.
        Sie können den aktuellen Status jederzeit in Ihrer Plattform einsehen.
      </p>
      <p style="text-align:center;margin:0 0 8px">
        <a href="https://frontend-nu-two-69.vercel.app/matching/reserviert" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Statustracker öffnen →
        </a>
      </p>
      <p style="margin:24px 0 0;color:#64748b;font-size:14px">Mit freundlichen Grüßen,<br><strong style="color:#1e293b">Ihr FKVI-Team</strong></p>
    `)
  },
  8: {
    subject: 'Visum erteilt – FKVI',
    body: (company, profile, stepDate) => emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;font-weight:700">🎉 Visum erteilt!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px">Sehr geehrte/r ${company.first_name || ''} ${company.last_name || ''},</p>
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6">
        wir haben eine <strong>großartige Nachricht</strong>: Das Visum für <strong>${profile}</strong>
        wurde offiziell erteilt! Die Einreise nach Deutschland rückt damit in greifbare Nähe.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;padding:12px 16px;margin:0 0 16px">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600">✅ Visum erfolgreich erteilt</p>
      </div>
      <p style="margin:0 0 24px;color:#1e293b;font-size:15px;line-height:1.6">
        Unser Team koordiniert nun die nächsten Schritte und wird Sie über das geplante Einreisedatum informieren.
        Bitte bereiten Sie alle notwendigen Unterlagen für die Ankunft vor.
      </p>
      <p style="text-align:center;margin:0 0 8px">
        <a href="https://frontend-nu-two-69.vercel.app/matching/reserviert" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Statustracker öffnen →
        </a>
      </p>
      <p style="margin:24px 0 0;color:#64748b;font-size:14px">Mit freundlichen Grüßen,<br><strong style="color:#1e293b">Ihr FKVI-Team</strong></p>
    `)
  },
  9: {
    subject: 'Einreise geplant – FKVI',
    body: (company, profile, stepDate) => emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;font-weight:700">Einreise geplant – fast am Ziel!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px">Sehr geehrte/r ${company.first_name || ''} ${company.last_name || ''},</p>
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6">
        die <strong>Einreise von ${profile}</strong> nach Deutschland ist nun offiziell geplant.
        Dies ist ein aufregender Moment für alle Beteiligten!
      </p>
      ${stepDate ? `<div style="background:#eff6ff;border-left:4px solid #1e3a5f;border-radius:4px;padding:12px 16px;margin:0 0 16px">
        <p style="margin:0;color:#1e3a5f;font-size:14px;font-weight:600">✈️ Einreise geplant am: ${new Date(stepDate).toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</p>
      </div>` : ''}
      <p style="margin:0 0 24px;color:#1e293b;font-size:15px;line-height:1.6">
        Bitte stellen Sie sicher, dass alle Vorbereitungen für die Ankunft und den Arbeitsbeginn getroffen sind.
        Unser Team steht Ihnen dabei selbstverständlich zur Seite.
      </p>
      <p style="text-align:center;margin:0 0 8px">
        <a href="https://frontend-nu-two-69.vercel.app/matching/reserviert" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Statustracker öffnen →
        </a>
      </p>
      <p style="margin:24px 0 0;color:#64748b;font-size:14px">Mit freundlichen Grüßen,<br><strong style="color:#1e293b">Ihr FKVI-Team</strong></p>
    `)
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  const user = await requireAdmin(token)
  if (!user) return res.status(403).json({ error: 'Nur für Admins' })

  const { reservationId, newStatus, notes, stepDate, skipEmail } = req.body
  if (!reservationId || !newStatus) return res.status(400).json({ error: 'reservationId und newStatus erforderlich' })

  // Load full reservation
  const { data: reservation, error: rErr } = await supabaseAdmin
    .from('reservations')
    .select('*, companies(*), profiles(first_name, last_name)')
    .eq('id', reservationId)
    .single()

  if (rErr || !reservation) return res.status(404).json({ error: 'Vermittlung nicht gefunden' })

  const oldStatus = reservation.process_status

  // Update process status
  await supabaseAdmin.from('reservations').update({ process_status: newStatus }).eq('id', reservationId)

  // If final step → mark profile as completed
  if (newStatus === 11) {
    await supabaseAdmin.from('profiles').update({ status: 'completed' }).eq('id', reservation.profile_id)
  }

  // History entry
  const historyNotes = stepDate ? `Datum: ${stepDate}${notes && notes !== `Datum: ${stepDate}` ? ` | ${notes}` : ''}` : (notes || null)
  await supabaseAdmin.from('process_status_history').insert({
    reservation_id: reservationId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: user.id,
    notes: historyNotes,
  })

  // Email trigger for steps 2, 8, 9 (unless admin chose to skip)
  const emailTpl = EMAIL_STEPS[newStatus]
  if (emailTpl && !skipEmail && process.env.RESEND_API_KEY) {
    const company = reservation.companies
    const profileName = reservation.profiles
      ? `${reservation.profiles.first_name || ''} ${reservation.profiles.last_name || ''}`.trim() || 'der Fachkraft'
      : 'der Fachkraft'

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: company?.email,
        subject: emailTpl.subject,
        html: emailTpl.body(company || {}, profileName, stepDate || null),
      }),
    }).catch(() => {/* non-critical */})
  }

  // Broadcast instant update via Supabase JS SDK (subscribe → send → cleanup).
  // Using the SDK directly is more reliable than the HTTP /api/broadcast endpoint
  // in serverless environments because it avoids undocumented API surface.
  // MUST be fully awaited before res.json() — Vercel kills pending async work
  // the moment the response is flushed.
  try {
    const broadcastClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )
    await new Promise((resolve) => {
      const chan = broadcastClient.channel('reservation-updates')
      // Safety timeout: if subscription never reaches SUBSCRIBED, give up after 4s
      const timer = setTimeout(() => {
        console.error('Realtime broadcast timeout — channel never subscribed')
        broadcastClient.removeChannel(chan)
        resolve()
      }, 4000)

      chan.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await chan.send({
              type: 'broadcast',
              event: 'status_update',
              payload: {
                reservationId,
                newStatus,
                oldStatus,
                companyId: reservation.company_id,
              },
            })
          } catch (sendErr) {
            console.error('Realtime broadcast send error:', sendErr.message)
          }
          clearTimeout(timer)
          broadcastClient.removeChannel(chan)
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime channel error:', status)
          clearTimeout(timer)
          broadcastClient.removeChannel(chan)
          resolve()
        }
      })
    })
  } catch (broadcastErr) {
    console.error('Realtime broadcast failed:', broadcastErr.message)
  }

  res.json({ success: true, oldStatus, newStatus })
}
