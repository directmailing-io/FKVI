import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query

  if (!token) return res.status(400).json({ error: 'Token fehlt' })

  // Find request by access_token — email must be confirmed
  const { data: request, error } = await supabaseAdmin
    .from('brochure_requests')
    .select('id, email_confirmed_at, brochure_version_id')
    .eq('access_token', token)
    .single()

  if (error || !request) {
    return res.status(404).json({ error: 'Zugangslink nicht gefunden' })
  }

  if (!request.email_confirmed_at) {
    return res.status(403).json({ error: 'E-Mail nicht bestätigt' })
  }

  // Resolve brochure version (linked to request or fall back to latest)
  let versionId = request.brochure_version_id
  let storagePath = null
  let versionNumber = null
  let fileName = null

  if (versionId) {
    const { data: v } = await supabaseAdmin
      .from('brochure_versions')
      .select('id, version_number, file_name, storage_path')
      .eq('id', versionId)
      .single()
    if (v) {
      storagePath = v.storage_path
      versionNumber = v.version_number
      fileName = v.file_name
    }
  }

  if (!storagePath) {
    const { data: v } = await supabaseAdmin
      .from('brochure_versions')
      .select('id, version_number, file_name, storage_path')
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
    if (v) {
      versionId = v.id
      storagePath = v.storage_path
      versionNumber = v.version_number
      fileName = v.file_name
    }
  }

  if (!storagePath) {
    return res.status(404).json({ error: 'Keine Broschüre verfügbar' })
  }

  // Log access
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
  const userAgent = req.headers['user-agent'] || null

  await supabaseAdmin.from('brochure_access_log').insert({
    request_id: request.id,
    brochure_version_id: versionId,
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  // Generate signed download URL (1 hour)
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('brochures')
    .createSignedUrl(storagePath, 3600)

  if (signedError || !signedData?.signedUrl) {
    console.error('brochure/download signed URL error:', signedError)
    return res.status(500).json({ error: 'Download-Link konnte nicht erstellt werden' })
  }

  return res.json({
    signedUrl: signedData.signedUrl,
    version_number: versionNumber,
    file_name: fileName,
  })
}
