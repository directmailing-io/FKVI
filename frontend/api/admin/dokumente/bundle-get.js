import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'token ist erforderlich' })

  // Load bundle
  const { data: bundle, error: bundleErr } = await supabaseAdmin
    .from('document_bundles')
    .select('id, token, title, message, expires_at, created_at')
    .eq('token', token)
    .single()

  if (bundleErr || !bundle) return res.status(404).json({ error: 'Paket nicht gefunden' })

  if (new Date(bundle.expires_at) < new Date())
    return res.status(410).json({ error: 'Dieses Paket ist abgelaufen.' })

  // Load sends with template names
  const { data: sends, error: sendsErr } = await supabaseAdmin
    .from('document_sends')
    .select('id, token, status, signed_at, created_at, signer_name, document_templates(name)')
    .eq('bundle_id', bundle.id)
    .order('created_at')

  if (sendsErr) {
    console.error('bundle-get sends error:', sendsErr)
    return res.status(500).json({ error: 'Fehler beim Laden der Dokumente' })
  }

  const documents = (sends || []).map(s => ({
    id: s.id,
    token: s.token,
    templateName: s.document_templates?.name || 'Dokument',
    status: s.status,
    signedAt: s.signed_at,
    signerName: s.signer_name,
  }))

  return res.json({
    bundle: {
      id: bundle.id,
      token: bundle.token,
      title: bundle.title,
      message: bundle.message,
      expiresAt: bundle.expires_at,
    },
    documents,
  })
})
