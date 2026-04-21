import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) throw { status: 401, message: 'Unauthorized' }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw { status: 401, message: 'Unauthorized' }
  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) throw { status: 403, message: 'Forbidden' }
  return user
}

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try {
    await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { templateId } = req.query
  if (!templateId) return res.status(400).json({ error: 'templateId ist erforderlich' })

  const { data: template, error: fetchError } = await supabaseAdmin
    .from('document_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (fetchError || !template) {
    return res.status(404).json({ error: 'Template nicht gefunden' })
  }

  // Generate 1-hour signed download URL
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('document-templates')
    .createSignedUrl(template.storage_path, 3600)

  if (signedError || !signedData) {
    console.error('dokumente/get signed URL error:', signedError)
    return res.status(500).json({ error: 'Download-URL konnte nicht erstellt werden' })
  }

  return res.json({
    template,
    pdfSignedUrl: signedData.signedUrl,
  })
})