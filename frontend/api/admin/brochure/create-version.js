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

  const { fileName, storagePath, versionNumber, notes } = req.body || {}

  if (!fileName || !storagePath || !versionNumber) {
    return res.status(400).json({ error: 'fileName, storagePath und versionNumber sind erforderlich' })
  }

  const { data: version, error: insertError } = await supabaseAdmin
    .from('brochure_versions')
    .insert({
      version_number: versionNumber,
      file_name: fileName,
      storage_path: storagePath,
      notes: notes || null,
      uploaded_by: user.email,
    })
    .select()
    .single()

  if (insertError || !version) {
    console.error('admin/brochure/create-version insert error:', insertError)
    return res.status(500).json({ error: 'Version konnte nicht gespeichert werden' })
  }

  return res.json({ version })
}
