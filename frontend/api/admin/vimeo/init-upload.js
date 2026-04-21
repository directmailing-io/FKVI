import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Prefer a pre-generated Personal Access Token (VIMEO_ACCESS_TOKEN).
// Fall back to client_credentials grant only if PAT is not set.
async function getVimeoToken() {
  if (process.env.VIMEO_ACCESS_TOKEN) {
    return process.env.VIMEO_ACCESS_TOKEN
  }

  const credentials = Buffer.from(
    `${process.env.VIMEO_CLIENT_ID}:${process.env.VIMEO_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://api.vimeo.com/oauth/authorize/client', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
    body: JSON.stringify({ grant_type: 'client_credentials', scope: 'public private upload' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'Vimeo OAuth failed')
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify admin session
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!adminCheck) return res.status(403).json({ error: 'Nur für Admins' })

  const { profileId, fileName, fileSize } = req.body
  if (!profileId || !fileSize) return res.status(400).json({ error: 'profileId und fileSize erforderlich' })

  try {
    const accessToken = await getVimeoToken()

    // Create a Vimeo upload using the TUS protocol
    const vimeoRes = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size: fileSize,
        },
        name: fileName || 'FKVI Fachkraft Video',
        privacy: { view: 'anybody', embed: 'public' },
      }),
    })

    const vimeoData = await vimeoRes.json()
    if (!vimeoRes.ok) throw new Error(vimeoData.error || `Vimeo error ${vimeoRes.status}`)

    const videoUri = vimeoData.uri // e.g. /videos/123456789
    const videoId = videoUri.split('/').pop()
    const uploadLink = vimeoData.upload.upload_link
    const embedUrl = `https://player.vimeo.com/video/${videoId}`

    res.json({ uploadLink, videoId, embedUrl, videoUri })
  } catch (err) {
    console.error('Vimeo init-upload error:', err)
    res.status(500).json({ error: err.message })
  }
}
