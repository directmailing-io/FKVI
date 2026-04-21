import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: 'token ist erforderlich' })

  const { data: send, error: sendError } = await supabaseAdmin
    .from('document_sends')
    .select('id, status, expires_at')
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

  const signaturePath = `signatures/${send.id}/${Date.now()}.png`

  const { data, error: urlError } = await supabaseAdmin.storage
    .from('signature-images')
    .createSignedUploadUrl(signaturePath)

  if (urlError || !data) {
    console.error('dokument/signature-upload-url error:', urlError)
    return res.status(500).json({ error: 'Upload-URL konnte nicht erstellt werden' })
  }

  return res.json({
    signedUrl: data.signedUrl,
    signaturePath,
    token: data.token,
  })
})