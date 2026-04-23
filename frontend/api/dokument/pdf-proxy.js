import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'token ist erforderlich' })

  // Validate document_send
  const { data: send, error: sendError } = await supabaseAdmin
    .from('document_sends')
    .select('id, status, expires_at, template_id')
    .eq('token', token)
    .single()

  if (sendError || !send) return res.status(404).json({ error: 'Dokument nicht gefunden' })
  if (send.status === 'revoked') return res.status(410).json({ error: 'Dokument widerrufen' })
  if (send.expires_at && new Date(send.expires_at) < new Date()) return res.status(410).json({ error: 'Link abgelaufen' })

  // Get template storage path
  const { data: template, error: tplError } = await supabaseAdmin
    .from('document_templates')
    .select('storage_path')
    .eq('id', send.template_id)
    .single()

  if (tplError || !template) return res.status(404).json({ error: 'Template nicht gefunden' })

  // Download PDF from storage server-side
  const { data: fileData, error: dlError } = await supabaseAdmin.storage
    .from('document-templates')
    .download(template.storage_path)

  if (dlError || !fileData) {
    console.error('pdf-proxy download error:', dlError)
    return res.status(404).json({ error: 'PDF-Datei nicht gefunden. Bitte Template neu hochladen.' })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Length', buffer.length)
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.status(200).end(buffer)
})
