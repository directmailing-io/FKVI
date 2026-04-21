import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: admin } = await supabaseAdmin.from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { versionId } = req.query
  if (!versionId) return res.status(400).json({ error: 'versionId fehlt' })

  const { data: version, error: vErr } = await supabaseAdmin
    .from('brochure_versions')
    .select('storage_path, file_name')
    .eq('id', versionId)
    .single()

  if (vErr || !version) return res.status(404).json({ error: 'Version nicht gefunden' })

  const { data, error: urlErr } = await supabaseAdmin.storage
    .from('brochures')
    .createSignedUrl(version.storage_path, 3600) // 1 hour

  if (urlErr || !data) return res.status(500).json({ error: 'URL konnte nicht erstellt werden' })

  return res.json({ url: data.signedUrl, fileName: version.file_name })
}
