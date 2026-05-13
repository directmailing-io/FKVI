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

  // Normalize umlauts and special chars so the storage path is safe in signed URLs
  const normalized = filename
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
  const sanitized = normalized.replace(/[^a-zA-Z0-9._\- ]/g, '_').trim().replace(/\s+/g, '_')
  const storagePath = `profile-docs/${profileId}/${Date.now()}-${sanitized}`

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('signed-documents')
    .createSignedUploadUrl(storagePath)

  if (uploadError || !uploadData) {
    console.error('profile-docs/upload-url error:', uploadError)
    return res.status(500).json({ error: 'Upload-URL konnte nicht erstellt werden' })
  }

  // Download URL is generated AFTER upload completes via /api/admin/profile-docs/resolve-url
  return res.json({
    uploadUrl: uploadData.signedUrl,
    storagePath,
  })
})
