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

// POST { storagePath } → { downloadUrl }
// Called AFTER file has been uploaded to generate a signed download URL
export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try {
    await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { storagePath } = req.body || {}
  if (!storagePath) return res.status(400).json({ error: 'storagePath ist erforderlich' })

  // 10-year signed URL (file must exist at this point)
  const { data, error } = await supabaseAdmin.storage
    .from('signed-documents')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)

  if (error || !data) {
    console.error('profile-docs/resolve-url error:', error)
    return res.status(500).json({ error: 'Download-URL konnte nicht erstellt werden' })
  }

  return res.json({ downloadUrl: data.signedUrl })
})
