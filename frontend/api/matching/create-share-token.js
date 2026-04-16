import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { profileId } = req.body
  if (!profileId) return res.status(400).json({ error: 'profileId erforderlich' })

  // Only allow published profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, status')
    .eq('id', profileId)
    .eq('status', 'published')
    .single()

  if (!profile) return res.status(404).json({ error: 'Profil nicht gefunden oder nicht veröffentlicht' })

  // Get company of the user (optional — for audit trail)
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Clean up expired tokens for this profile (lightweight maintenance)
  await supabaseAdmin
    .from('cv_share_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())

  // Generate cryptographically secure token (64-char hex = 256 bits entropy)
  const shareToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin
    .from('cv_share_tokens')
    .insert({
      profile_id:  profileId,
      token:       shareToken,
      expires_at:  expiresAt,
      created_by:  company?.id || null,
    })

  if (error) return res.status(500).json({ error: error.message })

  const platformUrl = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'
  const shareUrl = `${platformUrl}/lebenslauf/share/${shareToken}`

  res.json({ shareUrl, expiresAt })
}
