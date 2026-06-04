import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLATFORM_URL = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'

export function generateCvSig(profileId, mode) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`cv-admin:${profileId}:${mode}`)
    .digest('hex')
    .slice(0, 48)
}

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!adminCheck) return res.status(403).json({ error: 'Nur für Admins' })

  const { profileId } = req.query
  if (!profileId) return res.status(400).json({ error: 'profileId fehlt' })

  const sigFull     = generateCvSig(profileId, 'full')
  const sigCensored = generateCvSig(profileId, 'censored')

  return res.json({
    urlFull:     `${PLATFORM_URL}/cv-admin/${profileId}?mode=full&sig=${sigFull}`,
    urlCensored: `${PLATFORM_URL}/cv-admin/${profileId}?mode=censored&sig=${sigCensored}`,
  })
})
