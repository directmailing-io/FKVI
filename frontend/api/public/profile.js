import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'ID erforderlich' })

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !profile) {
    return res.status(404).json({ error: 'Profil nicht gefunden oder nicht veröffentlicht' })
  }

  res.json({ profile })
}
