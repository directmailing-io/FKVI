import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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

async function applyPrefillToPdf(pdfDoc, templateFields, prefillConfig, leadData) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const field of templateFields) {
    if (field.type === 'signature' || field.type === 'checkbox') continue
    const fieldConfig = prefillConfig[field.id]
    if (!fieldConfig?.source) continue
    const value = String(leadData[fieldConfig.source] || '')
    if (!value) continue

    const pageIndex = (field.page || 1) - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const absX = (field.x / 100) * pageWidth
    const absH = (field.height / 100) * pageHeight
    const absY = pageHeight - (field.y / 100) * pageHeight - absH
    const absW = (field.width / 100) * pageWidth

    const maxFontSize = Math.min(10, absH * 0.65)
    const availWidth = absW - 4
    const textWidth = font.widthOfTextAtSize(value, maxFontSize)
    const fontSize = textWidth > availWidth
      ? Math.max(4, maxFontSize * (availWidth / textWidth))
      : maxFontSize

    page.drawText(value, {
      x: absX + 2,
      y: absY + (absH - fontSize) / 2,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: availWidth,
    })
  }
}

async function sendContractEmail({ signerName, signerEmail, signerUrl }) {
  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a3a5c;padding:32px 40px;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Fachkraft Vermittlung International</h1>
          <p style="margin:8px 0 0;color:#a8c4e0;font-size:14px;">Dein Vermittlungsvertrag</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;color:#333;font-size:16px;">Hallo ${signerName},</p>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            du hast die FKVI-Informationsbroschüre vollständig gelesen. Wir freuen uns sehr darüber!
            Hier ist dein persönlicher Vermittlungsvertrag – bitte lies ihn sorgfältig durch und unterschreibe ihn digital.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td style="background:#0ea5a0;border-radius:6px;">
              <a href="${signerUrl}" style="display:inline-block;padding:16px 40px;color:#fff;font-size:16px;font-weight:700;text-decoration:none;">
                Vertrag unterschreiben
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#888;font-size:13px;">Oder kopiere diesen Link in deinen Browser:</p>
          <p style="margin:0;color:#1a3a5c;font-size:13px;word-break:break-all;">
            <a href="${signerUrl}" style="color:#1a3a5c;">${signerUrl}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f0f4f8;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">
            Diese E-Mail wurde automatisch von Fachkraft Vermittlung International GmbH &amp; Co. KG gesendet.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fachkraft Vermittlung International <noreply@fkvi-plattform.de>',
      to: [signerEmail],
      subject: 'Dein Vermittlungsvertrag – Fachkraft Vermittlung International',
      html,
    }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try { user = await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { requestId } = req.body || {}
  if (!requestId) return res.status(400).json({ error: 'requestId fehlt' })

  // Load lead
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('brochure_requests')
    .select('id, first_name, last_name, email, phone, contract_send_id, contract_sent_at')
    .eq('id', requestId)
    .single()

  if (leadError || !lead) return res.status(404).json({ error: 'Lead nicht gefunden' })
  if (lead.contract_sent_at) return res.status(409).json({ error: 'Vertrag wurde bereits verschickt' })

  // Load settings
  const { data: settings } = await supabaseAdmin
    .from('brochure_settings')
    .select('contract_template_id, prefill_config')
    .eq('id', 1)
    .single()

  if (!settings?.contract_template_id) {
    return res.status(400).json({ error: 'Keine Vertragsvorlage konfiguriert. Bitte zuerst unter "Vertragsvorlage" eine Vorlage auswählen.' })
  }

  // Load template
  const { data: template } = await supabaseAdmin
    .from('document_templates')
    .select('id, name, storage_path, fields')
    .eq('id', settings.contract_template_id)
    .single()

  if (!template) return res.status(404).json({ error: 'Vertragsvorlage nicht gefunden' })

  const signerName = `${lead.first_name} ${lead.last_name}`
  const leadData = {
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone || '',
    full_name: signerName,
  }

  const prefillConfig = settings.prefill_config || {}
  const hasPrefilledFields = Object.values(prefillConfig).some(c => c?.source)

  // Generate prefilled PDF if configured
  let prefilledStoragePath = null
  let sendPrefilledBytes = null

  if (hasPrefilledFields && template.storage_path) {
    try {
      const { data: pdfBlob } = await supabaseAdmin.storage
        .from('document-templates')
        .download(template.storage_path)

      if (pdfBlob) {
        const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer())
        await applyPrefillToPdf(pdfDoc, template.fields || [], prefillConfig, leadData)
        sendPrefilledBytes = await pdfDoc.save()
      }
    } catch (err) {
      console.error('brochure send-contract prefill error:', err)
    }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 60)

  // Create document_send record
  const { data: send, error: sendError } = await supabaseAdmin
    .from('document_sends')
    .insert({
      template_id: template.id,
      signer_name: signerName,
      signer_email: lead.email,
      prefill_data: leadData,
      expires_at: expiresAt.toISOString(),
      sent_by: user.id,
      status: 'pending',
      prefill_mode: sendPrefilledBytes ? 'prefilled' : 'blank',
      prefilled_field_ids: sendPrefilledBytes
        ? Object.keys(prefillConfig).filter(k => prefillConfig[k]?.source)
        : [],
    })
    .select('id, token')
    .single()

  if (sendError || !send) {
    console.error('brochure send-contract insert error:', sendError)
    return res.status(500).json({ error: 'Versendung konnte nicht erstellt werden' })
  }

  // Upload prefilled PDF
  if (sendPrefilledBytes) {
    try {
      prefilledStoragePath = `prefilled/${send.id}/prefilled.pdf`
      const { error: uploadError } = await supabaseAdmin.storage
        .from('signed-documents')
        .upload(prefilledStoragePath, sendPrefilledBytes, {
          contentType: 'application/pdf',
          upsert: false,
        })
      if (!uploadError) {
        await supabaseAdmin.from('document_sends')
          .update({ prefilled_storage_path: prefilledStoragePath })
          .eq('id', send.id)
      }
    } catch (err) {
      console.error('brochure send-contract prefilled upload error:', err)
    }
  }

  // Audit log
  await supabaseAdmin.from('document_audit_log').insert({
    document_send_id: send.id,
    event_type: 'created',
    metadata: { source: 'brochure_auto_send', brochure_request_id: requestId },
  })

  // Update lead: mark contract sent
  await supabaseAdmin.from('brochure_requests').update({
    contract_send_id: send.id,
    contract_sent_at: new Date().toISOString(),
  }).eq('id', requestId)

  const signerUrl = `${PLATFORM_URL}/dokument/${send.token}`

  // Send email
  if (lead.email && process.env.RESEND_API_KEY) {
    try {
      await sendContractEmail({ signerName, signerEmail: lead.email, signerUrl })
    } catch (err) {
      console.error('brochure send-contract email error:', err)
    }
  }

  return res.json({ success: true, sendId: send.id, signerUrl })
}
