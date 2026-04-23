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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try {
    user = await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { fileName, name, description, label } = req.body || {}
  if (!fileName || !name) return res.status(400).json({ error: 'fileName und name sind erforderlich' })

  const validLabels = ['fachkraft', 'unternehmen', 'beide']
  const safeLabel = validLabels.includes(label) ? label : 'beide'

  // Pre-create document_templates row
  const { data: template, error: insertError } = await supabaseAdmin
    .from('document_templates')
    .insert({
      name,
      description: description || null,
      label: safeLabel,
      storage_path: 'placeholder',
      file_name: fileName,
      is_active: false,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !template) {
    console.error('dokumente/upload-url insert error:', insertError)
    return res.status(500).json({ error: 'Template konnte nicht erstellt werden' })
  }

  const templateId = template.id
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `templates/${templateId}/${Date.now()}-${sanitized}`

  // Update storage_path now that we have the real path
  await supabaseAdmin
    .from('document_templates')
    .update({ storage_path: storagePath })
    .eq('id', templateId)

  const { data, error: urlError } = await supabaseAdmin.storage
    .from('document-templates')
    .createSignedUploadUrl(storagePath)

  if (urlError || !data) {
    console.error('dokumente/upload-url signed URL error:', urlError)
    return res.status(500).json({ error: 'Upload-URL konnte nicht erstellt werden' })
  }

  return res.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
    templateId,
  })
})