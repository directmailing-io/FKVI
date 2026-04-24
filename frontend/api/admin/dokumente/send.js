import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
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

async function sendEmail({ signerName, signerEmail, signerUrl, message }) {
  const htmlBody = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a3a5c;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Fachkraft Vermittlung International</h1>
              <p style="margin:8px 0 0;color:#a8c4e0;font-size:14px;">Dokument unterzeichnen</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">Hallo ${signerName},</p>
              <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
                Sie wurden gebeten, ein Dokument zu unterzeichnen.
              </p>
              ${message ? `<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;padding:16px;background:#f0f4f8;border-left:4px solid #1a3a5c;border-radius:4px;">${message}</p>` : ''}
              <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6;">
                Bitte klicken Sie auf den folgenden Button, um das Dokument anzuzeigen und zu unterzeichnen:
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#0ea5a0;border-radius:6px;">
                    <a href="${signerUrl}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                      Dokument unterzeichnen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#888;font-size:13px;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="margin:0;color:#1a3a5c;font-size:13px;word-break:break-all;">
                <a href="${signerUrl}" style="color:#1a3a5c;">${signerUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f0f4f8;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#999;font-size:12px;text-align:center;">
                Diese E-Mail wurde automatisch von Fachkraft Vermittlung International GmbH &amp; Co. KG gesendet. Bitte nicht auf diese E-Mail antworten.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fachkraft Vermittlung International <noreply@fkvi-plattform.de>',
      to: [signerEmail],
      subject: 'Dokument unterzeichnen – Fachkraft Vermittlung International',
      html: htmlBody,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Resend email error:', err)
  }
}

// Draw pre-fill values into a PDF document (text/date/initials only, no signatures)
async function applyPrefillToPdf(pdfDoc, templateFields, prefillFieldIds, resolvedValues) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const field of templateFields) {
    if (!prefillFieldIds.includes(field.id)) continue
    if (field.type === 'signature' || field.type === 'checkbox') continue

    const pageIndex = (field.page || 1) - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { width: pageWidth, height: pageHeight } = page.getSize()

    // pdf-lib origin is bottom-left; convert percent coords (top-left origin) to absolute
    const absX = (field.x / 100) * pageWidth
    const absH = (field.height / 100) * pageHeight
    const absY = pageHeight - (field.y / 100) * pageHeight - absH
    const absW = (field.width / 100) * pageWidth

    const value = String(resolvedValues[field.id] || '')
    if (!value) continue

    if (field.type === 'text' || field.type === 'date') {
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
    } else if (field.type === 'initials') {
      const fontSize = Math.min(10, absH * 0.65)
      page.drawText(value, {
        x: absX + 2,
        y: absY + (absH - fontSize) / 2,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        maxWidth: absW - 4,
      })
    }
  }
}

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try {
    user = await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const {
    templateId,
    profileId,
    companyId,
    signerName,
    signerEmail,
    message,
    prefillData,
    expiresInDays = 30,
    prefillMode = 'blank',
    prefillFieldIds: requestedPrefillFieldIds,
  } = req.body || {}

  if (!templateId) return res.status(400).json({ error: 'templateId ist erforderlich' })
  if (!signerName) return res.status(400).json({ error: 'signerName ist erforderlich' })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // --- Prefilled PDF generation ---
  let prefilledStoragePath = null
  let finalPrefillFieldIds = []

  if (prefillMode === 'prefilled') {
    try {
      // Load template to get storage_path and fields
      const { data: template, error: tplError } = await supabaseAdmin
        .from('document_templates')
        .select('storage_path, fields')
        .eq('id', templateId)
        .single()

      if (tplError || !template) {
        return res.status(404).json({ error: 'Vorlage nicht gefunden' })
      }

      const templateFields = template.fields || []
      const mergedPrefillData = prefillData || {}

      // Resolve which fields to prefill
      // Build a resolved values map: field.id → actual string value
      const resolvedValues = {}
      for (const field of templateFields) {
        if (field.type === 'signature' || field.type === 'checkbox') continue
        let value = null
        if (field.prefillKey && mergedPrefillData[field.prefillKey] !== undefined) {
          value = mergedPrefillData[field.prefillKey]
        } else if (mergedPrefillData[field.id] !== undefined) {
          value = mergedPrefillData[field.id]
        }
        if (value !== null && value !== '') {
          resolvedValues[field.id] = String(value)
        }
      }

      // Determine which field IDs to actually prefill
      if (requestedPrefillFieldIds && Array.isArray(requestedPrefillFieldIds)) {
        // Admin explicitly selected a subset — only use those that have values
        finalPrefillFieldIds = requestedPrefillFieldIds.filter(id => resolvedValues[id] !== undefined)
      } else {
        // Default: all fields that have resolvable values
        finalPrefillFieldIds = Object.keys(resolvedValues)
      }

      if (finalPrefillFieldIds.length > 0) {
        // Download template PDF
        const { data: pdfBlob, error: pdfError } = await supabaseAdmin.storage
          .from('document-templates')
          .download(template.storage_path)

        if (pdfError || !pdfBlob) {
          console.error('dokumente/send prefill PDF download error:', pdfError)
          return res.status(500).json({ error: 'Vorlage-PDF konnte nicht geladen werden' })
        }

        const templateBytes = await pdfBlob.arrayBuffer()
        const pdfDoc = await PDFDocument.load(templateBytes)

        await applyPrefillToPdf(pdfDoc, templateFields, finalPrefillFieldIds, resolvedValues)

        const prefilledBytes = await pdfDoc.save()

        // We need the sendId first — insert the record, then upload and update
        // So we'll do a two-step: insert without path, then upload + update
        // (handled below after insert)

        // Temporary: store bytes for upload after insert
        req._prefilledBytes = prefilledBytes
      }
    } catch (prefillErr) {
      console.error('dokumente/send prefill generation error:', prefillErr)
      // Non-fatal: fall back to blank mode
      finalPrefillFieldIds = []
    }
  }

  const { data: send, error: insertError } = await supabaseAdmin
    .from('document_sends')
    .insert({
      template_id: templateId,
      profile_id: profileId || null,
      company_id: companyId || null,
      signer_name: signerName,
      signer_email: signerEmail || null,
      message: message || null,
      prefill_data: prefillData || {},
      expires_at: expiresAt.toISOString(),
      sent_by: user.id,
      status: 'pending',
      prefill_mode: prefillMode === 'prefilled' && finalPrefillFieldIds.length > 0 ? 'prefilled' : 'blank',
      prefilled_field_ids: finalPrefillFieldIds.length > 0 ? finalPrefillFieldIds : [],
    })
    .select('id, token')
    .single()

  if (insertError || !send) {
    console.error('dokumente/send insert error:', insertError)
    return res.status(500).json({ error: 'Versendung konnte nicht erstellt werden' })
  }

  // Upload prefilled PDF now that we have the sendId
  if (req._prefilledBytes && finalPrefillFieldIds.length > 0) {
    try {
      prefilledStoragePath = `prefilled/${send.id}/prefilled.pdf`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('signed-documents')
        .upload(prefilledStoragePath, req._prefilledBytes, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('dokumente/send prefilled upload error:', uploadError)
        prefilledStoragePath = null
      } else {
        // Update the record with the storage path
        await supabaseAdmin
          .from('document_sends')
          .update({ prefilled_storage_path: prefilledStoragePath })
          .eq('id', send.id)
      }
    } catch (uploadErr) {
      console.error('dokumente/send prefilled upload exception:', uploadErr)
      prefilledStoragePath = null
    }
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null
  const userAgent = req.headers['user-agent'] || null

  // Insert audit log
  await supabaseAdmin.from('document_audit_log').insert({
    document_send_id: send.id,
    event_type: 'created',
    ip_address: ip,
    user_agent: userAgent,
    metadata: null,
  })

  const signerUrl = `${PLATFORM_URL}/dokument/${send.token}`

  // Send email if signerEmail and RESEND_API_KEY are set
  if (signerEmail && process.env.RESEND_API_KEY) {
    try {
      await sendEmail({ signerName, signerEmail, signerUrl, message })
    } catch (emailErr) {
      console.error('dokumente/send email error:', emailErr)
      // Don't fail the request if email fails
    }
  }

  return res.json({
    sendId: send.id,
    token: send.token,
    signerUrl,
  })
})
