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

const EMAIL_STEPS = {
  2: {
    subject: 'Ihr Kennenlerngespräch wurde terminiert – FKVI',
    body: (company, profile) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1e3a5f">Kennenlerngespräch terminiert</h2>
        <p>Sehr geehrte/r ${company.first_name || ''} ${company.last_name || ''},</p>
        <p>wir freuen uns, Ihnen mitteilen zu können, dass das Kennenlerngespräch mit <strong>${profile}</strong>
        nun terminiert wurde. Unser Team wird sich in Kürze bei Ihnen melden, um die Details zu besprechen.</p>
        <p>Sie können den aktuellen Status Ihres Kandidaten jederzeit in Ihrer <a href="https://frontend-nu-two-69.vercel.app/matching/reserviert" style="color:#1e3a5f">FKVI-Matching-Plattform</a> einsehen.</p>
        <p>Mit freundlichen Grüßen,<br><strong>Ihr FKVI-Team</strong></p>
      </div>
    `
  },
  8: {
    subject: 'Das Visum wurde erteilt – FKVI',
    body: (company, profile) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1e3a5f">Visum erteilt – ein großer Meilenstein!</h2>
        <p>Sehr geehrte/r ${company.first_name || ''} ${company.last_name || ''},</p>
        <p>wir haben eine großartige Nachricht: Das Visum für <strong>${profile}</strong> wurde offiziell erteilt!
        Die Einreise nach Deutschland rückt damit in greifbare Nähe.</p>
        <p>Unser Team koordiniert nun die nächsten Schritte und wird Sie über das geplante Einreisedatum informieren.</p>
        <p>Sie können den Status jederzeit in Ihrer <a href="https://frontend-nu-two-69.vercel.app/matching/reserviert" style="color:#1e3a5f">FKVI-Matching-Plattform</a> verfolgen.</p>
        <p>Mit freundlichen Grüßen,<br><strong>Ihr FKVI-Team</strong></p>
      </div>
    `
  },
  9: {
    subject: 'Die Einreise ist geplant – FKVI',
    body: (company, profile) => `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1e3a5f">Einreise geplant – fast am Ziel!</h2>
        <p>Sehr geehrte/r ${company.first_name || ''} ${company.last_name || ''},</p>
        <p>die Einreise von <strong>${profile}</strong> nach Deutschland ist nun offiziell geplant.
        Dies ist ein aufregender Moment für alle Beteiligten!</p>
        <p>Bitte stellen Sie sicher, dass alle Vorbereitungen für die Ankunft und den Arbeitsbeginn getroffen sind.
        Unser Team steht Ihnen dabei selbstverständlich zur Seite.</p>
        <p>Aktuelle Informationen finden Sie in Ihrer <a href="https://frontend-nu-two-69.vercel.app/matching/reserviert" style="color:#1e3a5f">FKVI-Matching-Plattform</a>.</p>
        <p>Mit freundlichen Grüßen,<br><strong>Ihr FKVI-Team</strong></p>
      </div>
    `
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  const user = await requireAdmin(token)
  if (!user) return res.status(403).json({ error: 'Nur für Admins' })

  const { reservationId, newStatus, notes } = req.body
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
  await supabaseAdmin.from('process_status_history').insert({
    reservation_id: reservationId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: user.id,
    notes: notes || null,
  })

  // Email trigger for steps 2, 8, 9
  const emailTpl = EMAIL_STEPS[newStatus]
  if (emailTpl && process.env.RESEND_API_KEY) {
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
        html: emailTpl.body(company || {}, profileName),
      }),
    }).catch(() => {/* non-critical */})
  }

  res.json({ success: true, oldStatus, newStatus })
}
