import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@fkvi.de'

export const PROCESS_STATUS_LABELS = {
  1: 'Kennenlernen gestartet',
  2: 'Kennenlerngespräch terminiert',
  3: 'Kennenlerngespräch durchgeführt',
  4: 'Zusage erfolgt',
  5: 'Vertrag unterzeichnet',
  6: 'Visumverfahren läuft',
  7: 'Botschaftstermin erfolgt',
  8: 'Visum erteilt',
  9: 'Einreise geplant',
  10: 'Eingereist',
  11: 'Arbeitsstart erfolgt',
}

const EMAIL_TRIGGERS = [2, 8, 9]

export async function sendStatusUpdateEmail({ company, profileRef, newStatus }) {
  if (!EMAIL_TRIGGERS.includes(newStatus)) return

  const statusLabel = PROCESS_STATUS_LABELS[newStatus]

  const subjects = {
    2: `Kennenlerngespräch terminiert – ${profileRef}`,
    8: `Visum erteilt – ${profileRef}`,
    9: `Einreise geplant – ${profileRef}`,
  }

  const bodies = {
    2: `
      <p>Sehr geehrte Damen und Herren,</p>
      <p>wir freuen uns, Ihnen mitteilen zu können, dass das Kennenlerngespräch für <strong>${profileRef}</strong> terminiert wurde.</p>
      <p>Bitte melden Sie sich in Ihrer FKVI-Plattform an, um alle Details einzusehen.</p>
      <p>Mit freundlichen Grüßen,<br/>Ihr FKVI-Team</p>
    `,
    8: `
      <p>Sehr geehrte Damen und Herren,</p>
      <p>wir freuen uns, Ihnen mitteilen zu können, dass das Visum für <strong>${profileRef}</strong> erteilt wurde.</p>
      <p>Die Einreise kann nun geplant werden. Bitte melden Sie sich in Ihrer FKVI-Plattform an, um den aktuellen Status einzusehen.</p>
      <p>Mit freundlichen Grüßen,<br/>Ihr FKVI-Team</p>
    `,
    9: `
      <p>Sehr geehrte Damen und Herren,</p>
      <p>die Einreise von <strong>${profileRef}</strong> ist nun geplant.</p>
      <p>Bitte melden Sie sich in Ihrer FKVI-Plattform an, um alle Details und den genauen Einreisetermin einzusehen.</p>
      <p>Mit freundlichen Grüßen,<br/>Ihr FKVI-Team</p>
    `,
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: company.email,
      subject: subjects[newStatus],
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Inter, Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="border-bottom: 3px solid #1a3a5c; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #1a3a5c; font-size: 24px; margin: 0;">FKVI</h1>
            <p style="color: #6b7280; margin: 4px 0 0;">Fachkraft Vermittlung International</p>
          </div>
          ${bodies[newStatus]}
          <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 16px; color: #6b7280; font-size: 12px;">
            <p>Diese E-Mail wurde automatisch von der FKVI-Plattform generiert.</p>
          </div>
        </body>
        </html>
      `,
    })
    console.log(`Email sent for status ${newStatus} to ${company.email}`)
  } catch (err) {
    console.error('Email send error:', err)
  }
}

export async function sendApprovalEmail({ company, tempPassword }) {
  try {
    await resend.emails.send({
      from: FROM,
      to: company.email,
      subject: 'Ihr FKVI-Zugang wurde freigeschaltet',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Inter, Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="border-bottom: 3px solid #1a3a5c; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #1a3a5c; font-size: 24px; margin: 0;">FKVI</h1>
            <p style="color: #6b7280; margin: 4px 0 0;">Fachkraft Vermittlung International</p>
          </div>
          <p>Sehr geehrte Damen und Herren,</p>
          <p>Ihr Zugang zur FKVI Matching-Plattform wurde freigeschaltet.</p>
          <p><strong>Ihre Zugangsdaten:</strong></p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>E-Mail:</strong> ${company.email}</p>
            <p style="margin: 8px 0 0;"><strong>Temporäres Passwort:</strong> ${tempPassword}</p>
          </div>
          <p>Bitte melden Sie sich an und ändern Sie Ihr Passwort nach dem ersten Login.</p>
          <p>Mit freundlichen Grüßen,<br/>Ihr FKVI-Team</p>
        </body>
        </html>
      `,
    })
  } catch (err) {
    console.error('Approval email error:', err)
  }
}
