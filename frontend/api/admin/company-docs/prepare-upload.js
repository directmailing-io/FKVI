import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin.from('admin_users').select('id').eq('user_id', user.id).single()
  return data ? user : null
}

// POST { filename: string } → { uploadUrl, storagePath, downloadUrl }
// Creates a presigned upload URL in the document-templates bucket under zusage-temp/
// and a 90-day download URL. The admin uploads the file directly from the browser.
export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  const admin = await requireAdmin(token)
  if (!admin) return res.status(401).json({ error: 'Nicht autorisiert' })

  const { filename } = req.body || {}
  if (!filename?.trim()) return res.status(400).json({ error: 'filename ist erforderlich' })

  const sanitized = filename.replace(/[^a-zA-Z0-9._\-äöüÄÖÜß ]/g, '_').trim()
  const storagePath = `zusage-temp/${Date.now()}-${sanitized}`

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('document-templates')
    .createSignedUploadUrl(storagePath)

  if (uploadError || !uploadData) {
    console.error('prepare-upload error:', uploadError)
    return res.status(500).json({ error: 'Upload-URL konnte nicht erstellt werden' })
  }

  const { data: downloadData, error: dlError } = await supabaseAdmin.storage
    .from('document-templates')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 90) // 90 days

  if (dlError || !downloadData) {
    return res.status(500).json({ error: 'Download-URL konnte nicht erstellt werden' })
  }

  return res.json({
    uploadUrl: uploadData.signedUrl,
    storagePath,
    downloadUrl: downloadData.signedUrl,
  })
})
