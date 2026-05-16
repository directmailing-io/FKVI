/**
 * POST /api/admin/dokumente/job-create
 *
 * Erstellt einen Document-Job mit einem document_send pro Partei.
 * Dieser Endpunkt ersetzt die komplexe send.js + bundle-create.js Logik
 * für Vorlagen-basierte Multi-Party-Dokumente.
 *
 * Body:
 *   templateId: UUID               – Pflicht
 *   profileId?: UUID               – FK-Profil (wenn FK beteiligt)
 *   companyId?: UUID               – Unternehmen (wenn UN beteiligt)
 *   parties: string[]              – ['fachkraft'] | ['unternehmen'] | ['fachkraft','unternehmen']
 *   adminFieldValues?: object      – { [fieldId]: value } — vom Admin befüllte Felder
 *                                    Admin-Signaturen als data:image/... data URLs
 *   signerNames?: object           – { fachkraft?: string, unternehmen?: string }
 *   signerEmails?: object          – { fachkraft?: string, unternehmen?: string }
 *   expiresInDays?: number         – Standard: 30
 *   title?: string                 – Job-Titel (Standard: Vorlagen-Name)
 *
 * Response:
 *   { jobId, sends: [{ recipientType, sendId, token, signerUrl }] }
 */

import { createClient } from '@supabase/supabase-js'
import { PDFDocument, PDFName, rgb, StandardFonts } from 'pdf-lib'
import { withHandler } from '../../_lib/withHandler.js'

function removeAcroForm(pdfDoc) {
  try {
    if (pdfDoc.catalog.has(PDFName.of('AcroForm'))) {
      pdfDoc.catalog.delete(PDFName.of('AcroForm'))
    }
  } catch (_) {}
}

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

/**
 * Bäckt Admin-Prefill-Werte in das Template-PDF ein und gibt die Bytes zurück.
 * Gibt null zurück, wenn keine Werte vorhanden sind.
 */
async function bakeAdminPrefill(templateFields, storagePath, adminFieldValues) {
  // Werte auflösen: field.id → Wert (oder data URL für Signaturen)
  const resolvedValues = {}
  for (const field of templateFields) {
    if (field.type === 'checkbox') continue

    // Admin-Signatur als data URL
    if (field.type === 'signature') {
      if (field.audience === 'admin') {
        const dataUrl = adminFieldValues[field.id]
        if (dataUrl?.startsWith('data:image/')) resolvedValues[field.id] = dataUrl
      }
      continue
    }

    // Text/Date/Initials: erst nach field.id, dann nach prefillKey
    let value = adminFieldValues[field.id]
    if ((value === undefined || value === '') && field.prefillKey) {
      value = adminFieldValues[field.prefillKey]
    }
    if (value !== undefined && value !== null && String(value).trim()) {
      resolvedValues[field.id] = String(value).trim()
    }
  }

  if (Object.keys(resolvedValues).length === 0) return null

  const { data: pdfBlob, error } = await supabaseAdmin.storage
    .from('document-templates')
    .download(storagePath)
  if (error || !pdfBlob) return null

  const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer(), { ignoreEncryption: true })
  removeAcroForm(pdfDoc)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const field of templateFields) {
    const value = resolvedValues[field.id]
    if (!value) continue

    const pageIndex = (field.page || 1) - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const absX = (field.x / 100) * pageWidth
    const absH = (field.height / 100) * pageHeight
    const absY = pageHeight - (field.y / 100) * pageHeight - absH
    const absW = (field.width / 100) * pageWidth

    if (field.type === 'signature') {
      try {
        const base64 = value.split(',')[1]
        const imgBytes = Buffer.from(base64, 'base64')
        const img = value.startsWith('data:image/png')
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes)
        page.drawImage(img, { x: absX, y: absY, width: absW, height: absH })
      } catch (imgErr) {
        console.error('job-create bakeAdminPrefill: Signatur-Einbettung fehlgeschlagen', imgErr)
      }
      continue
    }

    const strVal = String(value)
    const maxFontSize = absH * 0.72
    const availWidth = absW - 4
    const textWidth = font.widthOfTextAtSize(strVal, maxFontSize)
    const fontSize = textWidth > availWidth
      ? Math.max(4, maxFontSize * (availWidth / textWidth))
      : maxFontSize

    page.drawText(strVal, {
      x: absX + 2,
      y: absY + (absH - fontSize) / 2,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: availWidth,
    })
  }

  return await pdfDoc.save()
}

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try { user = await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const {
    templateId,
    profileId,
    companyId,
    parties = [],
    adminFieldValues = {},
    signerNames = {},
    signerEmails = {},
    expiresInDays = 30,
    title,
  } = req.body || {}

  if (!templateId) return res.status(400).json({ error: 'templateId ist erforderlich' })
  if (!Array.isArray(parties) || parties.length === 0) {
    return res.status(400).json({ error: 'Mindestens eine Partei (parties) ist erforderlich' })
  }

  // Vorlage laden
  const { data: template, error: tplError } = await supabaseAdmin
    .from('document_templates')
    .select('id, name, storage_path, fields, template_type')
    .eq('id', templateId)
    .single()

  if (tplError || !template) return res.status(404).json({ error: 'Vorlage nicht gefunden' })

  const templateFields = template.fields || []
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Admin-Signaturen aus DB-Daten herausfiltern (werden in PDF eingebettet, nicht gespeichert)
  const adminFieldValuesForDb = Object.fromEntries(
    Object.entries(adminFieldValues).filter(([, v]) =>
      typeof v !== 'string' || !v.startsWith('data:image/')
    )
  )

  // Job anlegen
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('document_jobs')
    .insert({
      template_id: templateId,
      created_by: user.id,
      title: title || template.name,
      profile_id: profileId || null,
      company_id: companyId || null,
      parties,
      admin_field_values: adminFieldValuesForDb,
      fachkraft_status:  parties.includes('fachkraft')  ? 'pending' : 'not_required',
      unternehmen_status: parties.includes('unternehmen') ? 'pending' : 'not_required',
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (jobErr || !job) {
    console.error('job-create: Job-Insert fehlgeschlagen', jobErr)
    return res.status(500).json({ error: `Job konnte nicht erstellt werden: ${jobErr?.message || 'Unbekannter Fehler'}` })
  }

  // Admin-Prefills in Base-PDF einbetten (falls vorhanden)
  let basePdfPath = null
  const hasAdminValues = Object.keys(adminFieldValues).length > 0

  if (hasAdminValues) {
    try {
      const bakedBytes = await bakeAdminPrefill(templateFields, template.storage_path, adminFieldValues)
      if (bakedBytes) {
        basePdfPath = `jobs/${job.id}/base.pdf`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('signed-documents')
          .upload(basePdfPath, bakedBytes, { contentType: 'application/pdf', upsert: true })
        if (uploadErr) {
          console.error('job-create: Base-PDF-Upload fehlgeschlagen', uploadErr)
          basePdfPath = null
        } else {
          await supabaseAdmin
            .from('document_jobs')
            .update({ base_pdf_path: basePdfPath, current_pdf_path: basePdfPath, updated_at: new Date().toISOString() })
            .eq('id', job.id)
        }
      }
    } catch (bakeErr) {
      console.error('job-create: bakeAdminPrefill fehlgeschlagen', bakeErr)
    }
  }

  // Document_Send pro Partei anlegen
  const sends = []
  for (const party of parties) {
    const name = signerNames[party]?.trim() || (party === 'fachkraft' ? 'Fachkraft' : 'Unternehmen')
    const email = signerEmails[party]?.trim() || null

    // Only set the ID relevant to this party to avoid duplicates in per-entity document lists
    const sendProfileId = party === 'fachkraft' ? (profileId || null) : null
    const sendCompanyId = party === 'unternehmen' ? (companyId || null) : null

    // Only include field values relevant to this party (+ admin/vermittlung fields)
    // so the signer never sees pre-filled values meant for the other party
    const partyRelevantAudiences = new Set(['admin', 'vermittlung', party])
    const partyPrefillData = Object.fromEntries(
      Object.entries(adminFieldValuesForDb).filter(([fieldId]) => {
        const field = templateFields.find(f => f.id === fieldId)
        if (!field) return false
        const audience = field.audience || 'fachkraft'
        return partyRelevantAudiences.has(audience)
      })
    )

    const { data: send, error: sendErr } = await supabaseAdmin
      .from('document_sends')
      .insert({
        template_id: templateId,
        job_id: job.id,
        profile_id: sendProfileId,
        company_id: sendCompanyId,
        signer_name: name,
        signer_email: email,
        prefill_data: partyPrefillData,
        prefilled_storage_path: basePdfPath,
        prefill_mode: basePdfPath ? 'prefilled' : 'blank',
        prefilled_field_ids: Object.keys(partyPrefillData),
        expires_at: expiresAt.toISOString(),
        sent_by: user.id,
        status: 'pending',
        recipient_type: party,
        send_mode: 'sign',
      })
      .select('id, token')
      .single()

    if (sendErr || !send) {
      console.error(`job-create: Send-Insert für Partei "${party}" fehlgeschlagen`, sendErr)
      continue
    }

    // Partei-Status auf 'sent' aktualisieren
    const statusField = party === 'fachkraft' ? 'fachkraft_status' : 'unternehmen_status'
    await supabaseAdmin
      .from('document_jobs')
      .update({ [statusField]: 'sent', status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', job.id)

    // Audit-Log (fire and forget)
    supabaseAdmin.from('document_audit_log').insert({
      document_send_id: send.id,
      event_type: 'created',
      metadata: { job_id: job.id, party },
    }).then(() => {}, () => {})

    sends.push({
      recipientType: party,
      sendId: send.id,
      token: send.token,
      signerUrl: `${PLATFORM_URL}/dokument/${send.token}`,
      signerName: name,
      signerEmail: email,
    })
  }

  if (sends.length === 0) {
    return res.status(500).json({ error: 'Kein Send konnte erstellt werden' })
  }

  return res.json({ jobId: job.id, sends })
})
