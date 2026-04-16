import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify admin
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { fileName, notes } = req.body || {}

  if (!fileName) return res.status(400).json({ error: 'fileName fehlt' })

  // Get next version number
  const { data: maxRow } = await supabaseAdmin
    .from('brochure_versions')
    .select('version_number')
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = maxRow ? maxRow.version_number + 1 : 1

  // Sanitize fileName for storage path
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `v${nextVersion}/${Date.now()}-${sanitized}`

  // Create signed upload URL
  const { data, error: uploadError } = await supabaseAdmin.storage
    .from('brochures')
    .createSignedUploadUrl(storagePath)

  if (uploadError || !data) {
    console.error('admin/brochure/upload-url error:', uploadError)
    return res.status(500).json({ error: 'Upload-URL konnte nicht erstellt werden' })
  }

  return res.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
    versionNumber: nextVersion,
  })
}
