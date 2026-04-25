import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: admin } = await supabaseAdmin.from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { data, error } = await supabaseAdmin
    .from('brochure_versions')
    .select('*')
    .order('language', { ascending: true })
    .order('version_number', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const versions = data || []

  // Build per-language summary: latest version per language
  const LANGS = ['de', 'en', 'fr', 'ar', 'vi']
  const byLanguage = {}
  for (const lang of LANGS) {
    const langVersions = versions.filter(v => v.language === lang)
    byLanguage[lang] = {
      latest: langVersions[0] || null,
      history: langVersions,
    }
  }

  return res.status(200).json({ versions, byLanguage })
}
