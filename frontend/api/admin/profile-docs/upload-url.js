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

// POST { profileId, filename } → { uploadUrl, downloadUrl, storagePath }
export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try {
    await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { profileId, filename } = req.body || {}
  if (!profileId || !filename) return res.status(400).json({ error: 'profileId und filename sind erforderlich' })

  const sanitized = filename.replace(/[^a-zA-Z0-9._\-äöüÄÖÜß ]/g, '_').trim()
  const storagePath = `profile-docs/${profileId}/${Date.now()}-${sanitized}`

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('signed-documents')
    .createSignedUploadUrl(storagePath)

  if (uploadError || !uploadData) {
    console.error('profile-docs/upload-url error:', uploadError)
    return res.status(500).json({ error: 'Upload-URL konnte nicht erstellt werden' })
  }

  // 10-year download URL for permanent storage
  const { data: downloadData, error: dlError } = await supabaseAdmin.storage
    .from('signed-documents')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)

  if (dlError || !downloadData) {
    return res.status(500).json({ error: 'Download-URL konnte nicht erstellt werden' })
  }

  return res.json({
    uploadUrl: uploadData.signedUrl,
    storagePath,
    downloadUrl: downloadData.signedUrl,
  })
})
