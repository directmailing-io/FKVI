import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VALID_LANGS = ['de', 'en', 'fr', 'ar', 'vi']

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const lang = VALID_LANGS.includes(req.query.lang) ? req.query.lang : 'de'

  // Get latest brochure version for requested language
  const { data: version } = await supabaseAdmin
    .from('brochure_versions')
    .select('id, storage_path, file_name')
    .eq('language', lang)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  if (!version?.storage_path) {
    // Fallback to German
    const { data: fallback } = await supabaseAdmin
      .from('brochure_versions')
      .select('id, storage_path, file_name')
      .eq('language', 'de')
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
    if (!fallback?.storage_path) return res.status(404).json({ error: 'Broschüre nicht verfügbar' })
    const { data: signed } = await supabaseAdmin.storage.from('brochures').createSignedUrl(fallback.storage_path, 3600)
    if (!signed?.signedUrl) return res.status(500).json({ error: 'Download-Link konnte nicht erstellt werden' })
    return res.redirect(302, signed.signedUrl)
  }

  const { data: signed, error } = await supabaseAdmin.storage.from('brochures').createSignedUrl(version.storage_path, 3600)

  if (error || !signed?.signedUrl) {
    return res.status(500).json({ error: 'Download-Link konnte nicht erstellt werden' })
  }

  return res.redirect(302, signed.signedUrl)
}
