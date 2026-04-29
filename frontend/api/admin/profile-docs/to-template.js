import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) throw { status: 401, message: 'Unauthorized' }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw { status: 401, message: 'Unauthorized' }
  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) throw { status: 403, message: 'Forbidden' }
  return user
}

// Extract storage path from a Supabase signed URL
function extractStoragePath(url) {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/sign\/signed-documents\/([^?]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// POST { sourceUrl, title } → { templateId }
// Copies the uploaded PDF from signed-documents → document-templates bucket
// and creates a document_templates row that can be used in TemplateEditorPage.
export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try {
    user = await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { sourceUrl, title } = req.body || {}
  if (!sourceUrl) return res.status(400).json({ error: 'sourceUrl ist erforderlich' })

  // Download the PDF bytes
  let pdfBytes
  const storagePath = extractStoragePath(sourceUrl)
  if (storagePath) {
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from('signed-documents')
      .download(storagePath)
    if (dlErr || !blob) {
      return res.status(500).json({ error: 'Datei konnte nicht heruntergeladen werden' })
    }
    pdfBytes = await blob.arrayBuffer()
  } else {
    // Fallback: fetch via HTTP (e.g. for external URLs)
    try {
      const r = await fetch(sourceUrl)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      pdfBytes = await r.arrayBuffer()
    } catch (err) {
      return res.status(500).json({ error: 'Datei konnte nicht heruntergeladen werden' })
    }
  }

  // Create template row first to get the ID
  const safeName = (title || 'Dokument').slice(0, 200)
  const { data: template, error: insertErr } = await supabaseAdmin
    .from('document_templates')
    .insert({
      name: safeName,
      description: null,
      label: 'fachkraft',
      storage_path: 'placeholder',
      file_name: `${safeName}.pdf`,
      is_active: true,
      created_by: user.id,
      fields: [],
    })
    .select('id')
    .single()

  if (insertErr || !template) {
    console.error('to-template insert error:', insertErr)
    return res.status(500).json({ error: 'Vorlage konnte nicht erstellt werden' })
  }

  const templateId = template.id
  const templateStoragePath = `from-profile/${templateId}/original.pdf`

  // Upload PDF to document-templates bucket
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('document-templates')
    .upload(templateStoragePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadErr) {
    // Clean up orphan row
    await supabaseAdmin.from('document_templates').delete().eq('id', templateId)
    console.error('to-template upload error:', uploadErr)
    return res.status(500).json({ error: 'Vorlage-PDF konnte nicht hochgeladen werden' })
  }

  // Update storage path
  await supabaseAdmin
    .from('document_templates')
    .update({ storage_path: templateStoragePath })
    .eq('id', templateId)

  return res.json({ templateId, templateStoragePath })
})
