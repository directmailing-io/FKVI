import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLATFORM_URL = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'

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

    const absX = (field.x / 100) * pageWidth
    const absH = (field.height / 100) * pageHeight
    const absY = pageHeight - (field.y / 100) * pageHeight - absH
    const absW = (field.width / 100) * pageWidth

    const value = String(resolvedValues[field.id] || '')
    if (!value) continue

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

async function bakePrefilledPdf(sendId, templateId, prefillData, prefillFieldIds) {
  try {
    const { data: template, error: tplError } = await supabaseAdmin
      .from('document_templates')
      .select('storage_path, fields')
      .eq('id', templateId)
      .single()

    if (tplError || !template) return null

    const templateFields = template.fields || []

    // Build resolved values map
    const resolvedValues = {}
    for (const field of templateFields) {
      if (field.type === 'signature' || field.type === 'checkbox') continue
      let value = null
      if (field.prefillKey && prefillData[field.prefillKey] !== undefined) {
        value = prefillData[field.prefillKey]
      } else if (prefillData[field.id] !== undefined) {
        value = prefillData[field.id]
      }
      if (value !== null && value !== '') {
        resolvedValues[field.id] = String(value)
      }
    }

    const fieldIdsToBake = prefillFieldIds.filter(id => resolvedValues[id] !== undefined)
    if (fieldIdsToBake.length === 0) return null

    const { data: pdfBlob, error: pdfError } = await supabaseAdmin.storage
      .from('document-templates')
      .download(template.storage_path)

    if (pdfError || !pdfBlob) return null

    const templateBytes = await pdfBlob.arrayBuffer()
    const pdfDoc = await PDFDocument.load(templateBytes)

    await applyPrefillToPdf(pdfDoc, templateFields, fieldIdsToBake, resolvedValues)

    const prefilledBytes = await pdfDoc.save()
    const storagePath = `prefilled/${sendId}/prefilled.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('signed-documents')
      .upload(storagePath, prefilledBytes, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      console.error('bundle-create prefilled upload error:', uploadError)
      return null
    }

    return storagePath
  } catch (err) {
    console.error('bundle-create bakePrefilledPdf error:', err)
    return null
  }
}

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
  let user
  try { user = await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const {
    templateIds,           // legacy: plain array of templateIds
    docsList,              // new: [{type:'template'|'view', templateId?, sendMode?, prefillMode?, prefillData?, prefillFieldIds?, sourceUrl?, sourceTitle?}]
    signerName,
    signerEmail,
    profileId,
    companyId,
    prefillData = {},
    title,
    message,
    expiresInDays = 30,
    attachments = [],
    recipientType = 'fachkraft',
    skipEmail = false,
  } = req.body || {}

  // Normalize to docsList
  const normalizedDocs = docsList || (templateIds || []).map(id => ({ type: 'template', templateId: id }))

  if (normalizedDocs.length === 0 && (!attachments || attachments.length === 0))
    return res.status(400).json({ error: 'Mindestens ein Dokument ist erforderlich' })
  if (!signerName)
    return res.status(400).json({ error: 'signerName ist erforderlich' })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Create bundle record
  const { data: bundle, error: bundleErr } = await supabaseAdmin
    .from('document_bundles')
    .insert({
      title: title || null,
      message: message || null,
      profile_id: profileId || null,
      company_id: companyId || null,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
      attachments: Array.isArray(attachments) ? attachments : [],
    })
    .select('id, token')
    .single()

  if (bundleErr || !bundle) {
    console.error('bundle-create bundle insert error:', bundleErr)
    return res.status(500).json({ error: `Paket konnte nicht erstellt werden: ${bundleErr?.message || bundleErr?.code || 'Unbekannter Fehler'}` })
  }

  // Create one document_send per doc entry
  const sends = []
  for (const doc of normalizedDocs) {
    let insertRow

    if (doc.type === 'forward') {
      // Forward: use FK's signed PDF as base, company fills their fields
      const { data: sourceSend, error: srcErr } = await supabaseAdmin
        .from('document_sends')
        .select('id, template_id, signed_storage_path, signer_name')
        .eq('id', doc.sourceSendId)
        .single()

      if (srcErr || !sourceSend || !sourceSend.signed_storage_path) {
        console.error('bundle-create forward: source send not found or not yet signed', doc.sourceSendId)
        continue
      }

      insertRow = {
        template_id: sourceSend.template_id,
        profile_id: profileId || null,
        company_id: companyId || null,
        signer_name: signerName,
        signer_email: signerEmail || null,
        prefill_data: {},
        prefilled_field_ids: [],
        prefill_mode: 'prefilled',
        prefilled_storage_path: sourceSend.signed_storage_path,
        parent_send_id: sourceSend.id,
        expires_at: expiresAt.toISOString(),
        sent_by: user.id,
        status: 'pending',
        bundle_id: bundle.id,
        recipient_type: 'unternehmen',
        send_mode: 'sign',
      }
    } else if (doc.type === 'view') {
      insertRow = {
        template_id: null,
        profile_id: profileId || null,
        company_id: companyId || null,
        signer_name: signerName,
        signer_email: signerEmail || null,
        prefill_data: {},
        expires_at: expiresAt.toISOString(),
        sent_by: user.id,
        status: 'pending',
        prefill_mode: 'blank',
        prefilled_field_ids: [],
        bundle_id: bundle.id,
        recipient_type: recipientType,
        send_mode: 'view',
        source_url: doc.sourceUrl || null,
      }
    } else {
      insertRow = {
        template_id: doc.templateId,
        profile_id: profileId || null,
        company_id: companyId || null,
        signer_name: signerName,
        signer_email: signerEmail || null,
        prefill_data: doc.prefillData || prefillData || {},
        expires_at: expiresAt.toISOString(),
        sent_by: user.id,
        status: 'pending',
        prefill_mode: doc.prefillMode || 'blank',
        prefilled_field_ids: doc.prefillFieldIds || [],
        bundle_id: bundle.id,
        recipient_type: recipientType,
        send_mode: doc.sendMode || 'sign',
      }
    }

    const { data: send, error: sendErr } = await supabaseAdmin
      .from('document_sends')
      .insert(insertRow)
      .select('id, token')
      .single()

    if (sendErr || !send) {
      console.error('bundle-create send insert error:', sendErr)
    } else {
      // Bake pre-filled values into PDF for template docs with prefill data
      if (doc.type === 'template' && doc.prefillMode === 'prefilled' && (doc.prefillFieldIds || []).length > 0) {
        const storagePath = await bakePrefilledPdf(
          send.id,
          doc.templateId,
          doc.prefillData || prefillData || {},
          doc.prefillFieldIds
        )
        if (storagePath) {
          await supabaseAdmin
            .from('document_sends')
            .update({ prefilled_storage_path: storagePath })
            .eq('id', send.id)
        }
      }
      sends.push(send)
    }
  }

  if (sends.length === 0 && attachments.length === 0)
    return res.status(500).json({ error: 'Kein Dokument konnte erstellt werden' })

  // Audit log for each send
  for (const send of sends) {
    try {
      await supabaseAdmin.from('document_audit_log').insert({
        document_send_id: send.id,
        event_type: 'created',
        metadata: { bundle_id: bundle.id },
      })
    } catch {} // ignore audit log errors
  }

  const bundleUrl = `${PLATFORM_URL}/bundle/${bundle.token}`

  return res.json({
    bundleId: bundle.id,
    bundleToken: bundle.token,
    bundleUrl,
    sendCount: sends.length,
  })
})
