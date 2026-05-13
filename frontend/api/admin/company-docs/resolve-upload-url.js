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

// POST { storagePath } → { downloadUrl }
// Called AFTER the browser has finished uploading via the presigned URL.
// Generates a 90-day signed download URL for the just-uploaded file.
export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  const admin = await requireAdmin(token)
  if (!admin) return res.status(401).json({ error: 'Nicht autorisiert' })

  const { storagePath } = req.body || {}
  if (!storagePath?.trim()) return res.status(400).json({ error: 'storagePath ist erforderlich' })

  const { data, error } = await supabaseAdmin.storage
    .from('document-templates')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 90) // 90 days

  if (error || !data) {
    console.error('company-docs/resolve-upload-url error:', error)
    return res.status(500).json({ error: 'Download-URL konnte nicht erstellt werden' })
  }

  return res.json({ downloadUrl: data.signedUrl })
})
