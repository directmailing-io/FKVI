import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: admin } = await supabaseAdmin.from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { versionId } = req.body
  if (!versionId) return res.status(400).json({ error: 'versionId fehlt' })

  // Load the version
  const { data: version, error: vErr } = await supabaseAdmin
    .from('brochure_versions')
    .select('*')
    .eq('id', versionId)
    .single()

  if (vErr || !version) return res.status(404).json({ error: 'Version nicht gefunden' })

  // Prevent deleting the latest version
  const { data: latest } = await supabaseAdmin
    .from('brochure_versions')
    .select('id')
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  if (latest?.id === versionId) {
    return res.status(400).json({ error: 'Die aktuelle Version kann nicht gelöscht werden. Laden Sie zuerst eine neue Version hoch.' })
  }

  // Delete from storage
  if (version.storage_path) {
    const { error: storageErr } = await supabaseAdmin.storage
      .from('brochures')
      .remove([version.storage_path])
    if (storageErr) {
      console.error('brochure/delete-version storage error:', storageErr)
      // Continue — file might already be gone
    }
  }

  // Delete DB record
  const { error: dbErr } = await supabaseAdmin
    .from('brochure_versions')
    .delete()
    .eq('id', versionId)

  if (dbErr) return res.status(500).json({ error: dbErr.message })

  return res.json({ success: true })
}
