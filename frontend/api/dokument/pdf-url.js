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

  const { data: send, error: sendError } = await supabaseAdmin
    .from('document_sends')
    .select('id, status, expires_at, template_id')
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

  const { data: template, error: tplError } = await supabaseAdmin
    .from('document_templates')
    .select('storage_path')
    .eq('id', send.template_id)
    .single()

  if (tplError || !template) {
    return res.status(404).json({ error: 'Template nicht gefunden' })
  }

  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('document-templates')
    .createSignedUrl(template.storage_path, 3600)

  if (signedError || !signedData) {
    console.error('dokument/pdf-url signed URL error:', signedError)
    return res.status(500).json({ error: 'PDF-URL konnte nicht erstellt werden' })
  }

  return res.json({ signedUrl: signedData.signedUrl })
})