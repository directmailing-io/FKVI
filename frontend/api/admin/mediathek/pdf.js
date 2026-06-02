import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
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

export const config = { api: { responseLimit: false } }

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) { return res.status(e.status || 401).json({ error: e.message }) }

  const { id, entity } = req.query
  if (!id) return res.status(400).json({ error: 'id fehlt' })

  const { data: tpl, error: tplErr } = await supabaseAdmin
    .from('document_templates')
    .select('storage_path, file_name')
    .eq('id', id)
    .single()

  if (tplErr || !tpl) return res.status(404).json({ error: 'Vorlage nicht gefunden' })

  // Sanitize entity key and build filled PDF path
  const entityKey = typeof entity === 'string' && entity.match(/^[a-zA-Z0-9_-]+$/) ? entity : null
  const filledPath = entityKey
    ? `filled/${id}/${entityKey}/current.pdf`
    : `filled/${id}/current.pdf`

  // When ?original=1 is passed, always serve the original PDF (skip filled version)
  let blob = null
  if (req.query.original !== '1') {
    const { data: filledBlob } = await supabaseAdmin.storage
      .from('document-templates')
      .download(filledPath)


    if (filledBlob) {
      // Validate: only use filled PDF if it is NOT encrypted.
      // Broken filled PDFs (created with ignoreEncryption) still carry the
      // encryption dictionary and cause "No password given" in pdfjs.
      try {
        const testBytes = await filledBlob.arrayBuffer()
        const doc = await PDFDocument.load(testBytes) // throws on encrypted PDFs
        if (!doc.isEncrypted) {
          blob = new Blob([testBytes])
        }
        // else: encrypted → fall through to serve original
      } catch (_) {
        // Load failed (encrypted / corrupted) → fall through to serve original
      }
    }
  }

  if (!blob) {
    const { data: originalBlob, error: dlErr } = await supabaseAdmin.storage
      .from('document-templates')
      .download(tpl.storage_path)
    if (dlErr || !originalBlob) return res.status(404).json({ error: 'PDF nicht gefunden' })
    blob = originalBlob
  }

  const bytes = await blob.arrayBuffer()

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.status(200).end(Buffer.from(bytes))
})
