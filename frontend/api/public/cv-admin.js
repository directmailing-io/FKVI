import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateCvSig(profileId, mode) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`cv-admin:${profileId}:${mode}`)
    .digest('hex')
    .slice(0, 48)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { profileId, sig, mode = 'censored' } = req.query
  if (!profileId || !sig) return res.status(400).json({ error: 'Ungültige Parameter' })

  if (sig !== generateCvSig(profileId, mode)) {
    return res.status(403).json({ error: 'Ungültige Signatur' })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error || !profile) return res.status(404).json({ error: 'Profil nicht gefunden' })

  res.json({ profile, mode })
}
