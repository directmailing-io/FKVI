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

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  const admin = await requireAdmin(token)
  if (!admin) return res.status(401).json({ error: 'Nicht autorisiert' })

  const { data: templates, error } = await supabaseAdmin
    .from('document_templates')
    .select('id, name, storage_path, label')
    .order('name', { ascending: true })

  if (error) return res.status(500).json({ error: 'Vorlagen konnten nicht geladen werden' })

  // Generate 90-day signed URLs for each template
  const result = await Promise.all(
    (templates || []).map(async (t) => {
      const { data } = await supabaseAdmin.storage
        .from('document-templates')
        .createSignedUrl(t.storage_path, 60 * 60 * 24 * 90) // 90 days
      return {
        id: t.id,
        name: t.name,
        label: t.label,
        url: data?.signedUrl || null,
      }
    })
  )

  return res.json({ templates: result.filter(t => t.url) })
})
