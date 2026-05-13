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

export default withHandler(async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { bundleId } = req.body || {}
  if (!bundleId) return res.status(400).json({ error: 'bundleId erforderlich' })

  // Delete all sends in this bundle first
  const { error: sendsErr } = await supabaseAdmin
    .from('document_sends')
    .delete()
    .eq('bundle_id', bundleId)

  if (sendsErr) {
    console.error('bundle-delete sends error:', sendsErr)
    return res.status(500).json({ error: sendsErr.message })
  }

  // Delete the bundle itself
  const { error: bundleErr } = await supabaseAdmin
    .from('document_bundles')
    .delete()
    .eq('id', bundleId)

  if (bundleErr) {
    console.error('bundle-delete bundle error:', bundleErr)
    return res.status(500).json({ error: bundleErr.message })
  }

  return res.json({ ok: true })
})
