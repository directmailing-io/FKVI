import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token erforderlich' })

  const { data: shareToken, error } = await supabaseAdmin
    .from('cv_share_tokens')
    .select('id, profile_id, expires_at, profiles(*)')
    .eq('token', token)
    .single()

  if (error || !shareToken) {
    return res.status(404).json({ error: 'Link ungültig oder nicht gefunden' })
  }

  // Check expiry server-side — no client bypass possible
  if (new Date(shareToken.expires_at) < new Date()) {
    return res.status(410).json({
      error: 'Dieser Link ist abgelaufen.',
      expiredAt: shareToken.expires_at,
    })
  }

  const profile = shareToken.profiles
  if (!profile || profile.status !== 'published') {
    return res.status(404).json({ error: 'Profil nicht mehr verfügbar' })
  }

  res.json({
    profile,
    expiresAt: shareToken.expires_at,
  })
}
