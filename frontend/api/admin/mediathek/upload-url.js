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

function sanitizePath(filename) {
  const dotIdx = filename.lastIndexOf('.')
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : '.pdf'
  const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename
  const clean = base
    .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60) || 'dokument'
  const uid = Math.random().toString(36).slice(2, 10)
  return `templates/${uid}_${clean}${ext}`
}

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) { return res.status(e.status || 401).json({ error: e.message }) }

  const { filename } = req.body || {}
  if (!filename) return res.status(400).json({ error: 'filename fehlt' })

  const storagePath = sanitizePath(filename)

  const { data, error } = await supabaseAdmin.storage
    .from('document-templates')
    .createSignedUploadUrl(storagePath)

  if (error) return res.status(500).json({ error: error.message })

  return res.json({ uploadUrl: data.signedUrl, storagePath, token: data.token })
})
