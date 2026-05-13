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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { profileId } = req.query
  if (!profileId) return res.status(400).json({ error: 'profileId erforderlich' })

  const { data: sends, error } = await supabaseAdmin
    .from('document_sends')
    .select('id, signed_at, signer_name, signed_storage_path, document_templates(name)')
    .eq('profile_id', profileId)
    .in('status', ['submitted', 'signed'])
    .not('signed_storage_path', 'is', null)
    .order('signed_at', { ascending: false })

  if (error) {
    console.error('signed-docs error:', error)
    return res.status(500).json({ error: error.message })
  }

  const docs = await Promise.all((sends || []).map(async s => {
    const { data: urlData } = await supabaseAdmin.storage
      .from('signed-documents')
      .createSignedUrl(s.signed_storage_path, 60 * 60 * 24) // 24h

    return {
      id: s.id,
      title: `${s.document_templates?.name || 'Dokument'} (signiert)`,
      templateName: s.document_templates?.name || 'Dokument',
      signerName: s.signer_name,
      signedAt: s.signed_at,
      url: urlData?.signedUrl || null,
    }
  }))

  return res.json({ docs: docs.filter(d => d.url) })
})
