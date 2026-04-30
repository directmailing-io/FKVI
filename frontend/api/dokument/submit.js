import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { token, fieldValues = {}, signaturePath } = req.body || {}
    if (!token) return res.status(400).json({ error: 'token ist erforderlich' })

    // 1. Validate token
    const { data: send, error: sendError } = await supabaseAdmin
      .from('document_sends')
      .select(`
        id,
        status,
        expires_at,
        prefill_data,
        template_id,
        prefill_mode,
        prefilled_storage_path,
        parent_send_id,
        document_templates (
          storage_path,
          fields
        )
      `)
      .eq('token', token)
      .single()

    if (sendError || !send) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' })
    }

    if (send.status === 'revoked') {
      return res.status(410).json({ error: 'Dieses Dokument wurde widerrufen' })
    }

    if (send.expires_at && new Date(send.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Dieser Link ist abgelaufen' })
    }

    if (send.status === 'signed' || send.status === 'submitted') {
      return res.status(409).json({ error: 'Dieses Dokument wurde bereits unterzeichnet' })
    }

    if (send.status !== 'pending' && send.status !== 'opened') {
      return res.status(400).json({ error: 'Ungültiger Dokumentenstatus' })
    }

    // 2. Fetch template fields
    const tpl = send.document_templates || {}
    const templateFields = tpl.fields || []
    const storagePath = tpl.storage_path
    const prefillData = send.prefill_data || {}

    // Build resolved prefill map: field.id → actual value
    // prefillData may be keyed by prefillKey (e.g. 'profile.first_name') OR by field.id
    const resolvedPrefillMap = {}
    for (const field of templateFields) {
      if (field.prefillKey && prefillData[field.prefillKey] !== undefined) {
        resolvedPrefillMap[field.id] = prefillData[field.prefillKey]
      }
      if (prefillData[field.id] !== undefined) {
        resolvedPrefillMap[field.id] = prefillData[field.id]
      }
    }

    if (!storagePath && !send.prefilled_storage_path) {
      return res.status(500).json({ error: 'Kein Template-PDF gefunden' })
    }

    // 3. Download base PDF — prefer prefilled (FK-signed) if available (forward flow)
    let pdfBlob, pdfError
    if (send.prefill_mode === 'prefilled' && send.prefilled_storage_path) {
      ;({ data: pdfBlob, error: pdfError } = await supabaseAdmin.storage
        .from('signed-documents')
        .download(send.prefilled_storage_path))
    }
    // Fall back to original template (blank or prefill failed)
    if (!pdfBlob) {
      ;({ data: pdfBlob, error: pdfError } = await supabaseAdmin.storage
        .from('document-templates')
        .download(storagePath))
    }

    if (pdfError || !pdfBlob) {
      console.error('dokument/submit PDF download error:', pdfError)
      return res.status(500).json({ error: 'PDF konnte nicht geladen werden' })
    }

    const templateBytes = await pdfBlob.arrayBuffer()

    // 4. Download signature PNG (optional)
    let sigImageBytes = null
    if (signaturePath) {
      try {
        const { data: sigBlob, error: sigError } = await supabaseAdmin.storage
          .from('signature-images')
          .download(signaturePath)

        if (!sigError && sigBlob) {
          sigImageBytes = await sigBlob.arrayBuffer()
        }
      } catch (sigErr) {
        console.warn('dokument/submit signature download warning:', sigErr)
        // Signature is optional — continue without it
      }
    }

    // 5. Process PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(templateBytes)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    let sigImage = null
    if (sigImageBytes) {
      try {
        sigImage = await pdfDoc.embedPng(sigImageBytes)
      } catch (embedErr) {
        console.warn('dokument/submit PNG embed warning:', embedErr)
        // Try as JPEG if PNG fails
        try {
          sigImage = await pdfDoc.embedJpg(sigImageBytes)
        } catch (jpgErr) {
          console.warn('dokument/submit JPG embed also failed:', jpgErr)
        }
      }
    }

    const pages = pdfDoc.getPages()

    for (const field of templateFields) {
      const pageIndex = (field.page || 1) - 1
      if (pageIndex < 0 || pageIndex >= pages.length) continue

      const page = pages[pageIndex]
      const { width: pageWidth, height: pageHeight } = page.getSize()

      // pdf-lib origin is bottom-left; convert percent coords (top-left origin) to absolute
      const absX = (field.x / 100) * pageWidth
      const absH = (field.height / 100) * pageHeight
      const absY = pageHeight - (field.y / 100) * pageHeight - absH
      const absW = (field.width / 100) * pageWidth

      // Use submitted value if present; fall back to resolved prefill (supports prefillKey-based lookup)
      const value = fieldValues[field.id] !== undefined
        ? fieldValues[field.id]
        : (resolvedPrefillMap[field.id] !== undefined ? resolvedPrefillMap[field.id] : '')

      if (field.type === 'signature') {
        if (sigImage) {
          page.drawImage(sigImage, {
            x: absX,
            y: absY,
            width: absW,
            height: absH,
          })
        }
      } else if (field.type === 'text' || field.type === 'date') {
        const maxFontSize = Math.min(10, absH * 0.65)
        const textValue = String(value || '')
        if (textValue) {
          const availWidth = absW - 4
          // Auto-shrink font size so text fits within the field width
          const textWidth = font.widthOfTextAtSize(textValue, maxFontSize)
          const fontSize = textWidth > availWidth
            ? Math.max(4, maxFontSize * (availWidth / textWidth))
            : maxFontSize
          page.drawText(textValue, {
            x: absX + 2,
            y: absY + (absH - fontSize) / 2,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            maxWidth: availWidth,
          })
        }
      } else if (field.type === 'checkbox') {
        if (Array.isArray(field.options) && field.options.length > 0) {
          // New format: each option has its own position on the PDF
          const isMultiple = field.multiple === true
          const selectedIds = isMultiple
            ? (Array.isArray(value) ? value : [])
            : (value ? [value] : [])

          for (const opt of field.options) {
            if (!selectedIds.includes(opt.id)) continue
            if (opt.x === undefined || opt.page === undefined) continue

            const optPageIndex = opt.page - 1
            if (optPageIndex < 0 || optPageIndex >= pages.length) continue
            const optPage = pages[optPageIndex]
            const { width: optPageW, height: optPageH } = optPage.getSize()

            const ox = (opt.x / 100) * optPageW
            const oh = (opt.height / 100) * optPageH
            const ow = (opt.width / 100) * optPageW
            const oy = optPageH - (opt.y / 100) * optPageH - oh

            const pad = Math.min(ow, oh) * 0.12
            const thickness = Math.max(0.8, Math.min(ow, oh) * 0.1)

            // Draw X inside the box
            optPage.drawLine({
              start: { x: ox + pad, y: oy + oh - pad },
              end:   { x: ox + ow - pad, y: oy + pad },
              thickness, color: rgb(0, 0, 0),
            })
            optPage.drawLine({
              start: { x: ox + ow - pad, y: oy + oh - pad },
              end:   { x: ox + pad, y: oy + pad },
              thickness, color: rgb(0, 0, 0),
            })
          }
        } else {
          // Legacy boolean checkbox (no options)
          if (value === 'true' || value === true) {
            const thickness = Math.max(1, absH * 0.12)
            page.drawLine({
              start: { x: absX + absW * 0.1, y: absY + absH * 0.4 },
              end: { x: absX + absW * 0.35, y: absY + absH * 0.15 },
              thickness, color: rgb(0, 0, 0),
            })
            page.drawLine({
              start: { x: absX + absW * 0.35, y: absY + absH * 0.15 },
              end: { x: absX + absW * 0.9, y: absY + absH * 0.75 },
              thickness, color: rgb(0, 0, 0),
            })
          }
        }
      } else if (field.type === 'initials') {
        const fontSize = Math.min(10, absH * 0.65)
        const initialsValue = String(value || '')
        if (initialsValue) {
          page.drawText(initialsValue, {
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

    // 6. Save PDF
    const signedBytes = await pdfDoc.save()

    // 7. Upload to signed-documents
    const signedPath = `${send.id}/signed-${Date.now()}.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('signed-documents')
      .upload(signedPath, signedBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('dokument/submit upload error:', uploadError)
      return res.status(500).json({ error: 'Signiertes PDF konnte nicht gespeichert werden' })
    }

    // 8. Update document_sends
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('document_sends')
      .update({
        status: 'submitted',
        submitted_at: now,
        signed_at: now,
        signed_storage_path: signedPath,
        field_values: fieldValues || {},
        updated_at: now,
      })
      .eq('id', send.id)

    if (updateError) {
      console.error('dokument/submit status update error:', updateError)
      return res.status(500).json({ error: 'Status konnte nicht aktualisiert werden' })
    }

    // 8b. If this is a forwarded send, update the parent's signed_storage_path
    // so the FK also sees the final fully-signed PDF
    if (send.parent_send_id) {
      await supabaseAdmin
        .from('document_sends')
        .update({ signed_storage_path: signedPath, updated_at: now })
        .eq('id', send.parent_send_id)
    }

    // 9. Insert audit log
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null
    const userAgent = req.headers['user-agent'] || null

    await supabaseAdmin.from('document_audit_log').insert({
      document_send_id: send.id,
      event_type: 'submitted',
      ip_address: ip,
      user_agent: userAgent,
      metadata: null,
    })

    // 10. Delete signature image (fire and forget)
    if (signaturePath) {
      supabaseAdmin.storage
        .from('signature-images')
        .remove([signaturePath])
        .catch((err) => console.warn('dokument/submit signature cleanup warning:', err))
    }

    // 11. Generate signed URL for download
    let downloadUrl = null
    try {
      const { data: urlData } = await supabaseAdmin.storage
        .from('signed-documents')
        .createSignedUrl(signedPath, 3600)
      if (urlData) downloadUrl = urlData.signedUrl
    } catch {} // non-fatal

    return res.json({ success: true, downloadUrl })

  } catch (err) {
    console.error('dokument/submit unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Interner Serverfehler' })
  }
})