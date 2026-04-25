// Vercel cron: runs daily at 08:00 UTC
// Finds all leads where confirmed_at + 7 days <= now and no contract sent yet,
// then sends the contract automatically.
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLATFORM_URL = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'

async function applyPrefillToPdf(pdfDoc, templateFields, prefillConfig, leadData) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  for (const field of templateFields) {
    if (field.type === 'signature' || field.type === 'checkbox') continue
    const cfg = prefillConfig[field.id]
    if (!cfg?.source) continue
    const value = String(leadData[cfg.source] || '')
    if (!value) continue
    const pageIndex = (field.page || 1) - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue
    const page = pages[pageIndex]
    const { width: pw, height: ph } = page.getSize()
    const absX = (field.x / 100) * pw
    const absH = (field.height / 100) * ph
    const absY = ph - (field.y / 100) * ph - absH
    const absW = (field.width / 100) * pw
    const maxFs = Math.min(10, absH * 0.65)
    const tw = font.widthOfTextAtSize(value, maxFs)
    const fs = tw > absW - 4 ? Math.max(4, maxFs * ((absW - 4) / tw)) : maxFs
    page.drawText(value, { x: absX + 2, y: absY + (absH - fs) / 2, size: fs, font, color: rgb(0, 0, 0), maxWidth: absW - 4 })
  }
}

const CONTRACT_COPY = {
  de: { subject: 'Dein Vermittlungsvertrag – Fachkraft Vermittlung International', greeting: (n) => `Hallo ${n},`, body: 'du hast die FKVI-Informationsbroschüre vollständig gelesen. Hier ist dein persönlicher Vermittlungsvertrag.', btn: 'Vertrag unterschreiben' },
  en: { subject: 'Your placement contract – Fachkraft Vermittlung International', greeting: (n) => `Hello ${n},`, body: 'You have fully read the FKVI information brochure. Here is your personal placement contract.', btn: 'Sign contract' },
  fr: { subject: 'Votre contrat de placement – Fachkraft Vermittlung International', greeting: (n) => `Bonjour ${n},`, body: 'Vous avez entièrement lu la brochure FKVI. Voici votre contrat de placement personnel.', btn: 'Signer le contrat' },
  ar: { subject: 'عقد التوظيف الخاص بك – Fachkraft Vermittlung International', greeting: (n) => `مرحباً ${n}،`, body: 'لقد قرأت كتيب معلومات FKVI بالكامل. إليك عقد التوظيف الشخصي.', btn: 'توقيع العقد' },
  vi: { subject: 'Hợp đồng môi giới của bạn – Fachkraft Vermittlung International', greeting: (n) => `Xin chào ${n},`, body: 'Bạn đã đọc đầy đủ tài liệu FKVI. Đây là hợp đồng môi giới cá nhân của bạn.', btn: 'Ký hợp đồng' },
}

async function sendEmail({ signerName, signerEmail, signerUrl, lang = 'de' }) {
  const copy = CONTRACT_COPY[lang] || CONTRACT_COPY.de
  const html = `<!DOCTYPE html><html lang="${lang}"><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a3a5c;padding:32px 40px;"><h1 style="margin:0;color:#fff;font-size:22px;">Fachkraft Vermittlung International</h1></td></tr>
  <tr><td style="padding:40px;">
    <p style="color:#333;font-size:16px;">${copy.greeting(signerName)}</p>
    <p style="color:#555;font-size:15px;line-height:1.6;">${copy.body}</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr><td style="background:#0ea5a0;border-radius:6px;">
        <a href="${signerUrl}" style="display:inline-block;padding:14px 36px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">${copy.btn}</a>
      </td></tr>
    </table>
    <p style="color:#888;font-size:12px;word-break:break-all;"><a href="${signerUrl}" style="color:#1a3a5c;">${signerUrl}</a></p>
  </td></tr>
  </table></td></tr></table></body></html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Fachkraft Vermittlung International <noreply@fkvi-plattform.de>',
      to: [signerEmail],
      subject: copy.subject,
      html,
    }),
  })
}

async function sendContractToLead(lead, settings, template) {
  const signerName = `${lead.first_name} ${lead.last_name}`
  const leadData = {
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone || '',
    full_name: signerName,
  }
  const prefillConfig = settings.prefill_config || {}

  // Generate prefilled PDF
  let prefilledBytes = null
  if (template.storage_path && Object.values(prefillConfig).some(c => c?.source)) {
    try {
      const { data: blob } = await supabaseAdmin.storage.from('document-templates').download(template.storage_path)
      if (blob) {
        const pdfDoc = await PDFDocument.load(await blob.arrayBuffer())
        await applyPrefillToPdf(pdfDoc, template.fields || [], prefillConfig, leadData)
        prefilledBytes = await pdfDoc.save()
      }
    } catch (err) { console.error('cron prefill error:', err) }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 60)

  const { data: send, error: sendErr } = await supabaseAdmin
    .from('document_sends')
    .insert({
      template_id: template.id,
      signer_name: signerName,
      signer_email: lead.email,
      prefill_data: leadData,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      prefill_mode: prefilledBytes ? 'prefilled' : 'blank',
      prefilled_field_ids: prefilledBytes
        ? Object.keys(prefillConfig).filter(k => prefillConfig[k]?.source)
        : [],
    })
    .select('id, token')
    .single()

  if (sendErr || !send) throw new Error(sendErr?.message || 'send insert failed')

  if (prefilledBytes) {
    const path = `prefilled/${send.id}/prefilled.pdf`
    const { error: upErr } = await supabaseAdmin.storage
      .from('signed-documents')
      .upload(path, prefilledBytes, { contentType: 'application/pdf', upsert: false })
    if (!upErr) await supabaseAdmin.from('document_sends').update({ prefilled_storage_path: path }).eq('id', send.id)
  }

  await supabaseAdmin.from('document_audit_log').insert({
    document_send_id: send.id,
    event_type: 'created',
    metadata: { source: 'brochure_cron', brochure_request_id: lead.id },
  })

  await supabaseAdmin.from('brochure_requests').update({
    contract_send_id: send.id,
    contract_sent_at: new Date().toISOString(),
  }).eq('id', lead.id)

  const signerUrl = `${PLATFORM_URL}/dokument/${send.token}`
  if (lead.email && process.env.RESEND_API_KEY) {
    await sendEmail({ signerName, signerEmail: lead.email, signerUrl, lang: lead.language || 'de' })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: settings } = await supabaseAdmin
    .from('brochure_settings')
    .select('contract_template_id, prefill_config')
    .eq('id', 1)
    .single()

  if (!settings?.contract_template_id) {
    return res.json({ processed: 0, message: 'Keine Vertragsvorlage konfiguriert' })
  }

  const { data: template } = await supabaseAdmin
    .from('document_templates')
    .select('id, name, storage_path, fields')
    .eq('id', settings.contract_template_id)
    .single()

  if (!template) return res.json({ processed: 0, message: 'Vertragsvorlage nicht gefunden' })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: dueConfirmations } = await supabaseAdmin
    .from('brochure_confirmations')
    .select('request_id')
    .lte('confirmed_at', sevenDaysAgo)

  if (!dueConfirmations?.length) {
    return res.json({ processed: 0, message: 'Keine fälligen Leads' })
  }

  const { data: dueLeads } = await supabaseAdmin
    .from('brochure_requests')
    .select('id, first_name, last_name, email, phone, language')
    .in('id', dueConfirmations.map(c => c.request_id))
    .is('contract_sent_at', null)
    .not('email_confirmed_at', 'is', null)

  if (!dueLeads?.length) return res.json({ processed: 0, message: 'Keine unbearbeiteten fälligen Leads' })

  let processed = 0
  let errors = 0
  for (const lead of dueLeads) {
    try {
      await sendContractToLead(lead, settings, template)
      processed++
    } catch (err) {
      console.error(`cron: lead ${lead.id} failed:`, err)
      errors++
    }
  }

  return res.json({ processed, errors, total: dueLeads.length })
}
