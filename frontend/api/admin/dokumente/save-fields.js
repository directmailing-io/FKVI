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
  try {
    await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { templateId, fields } = req.body || {}
  if (!templateId) return res.status(400).json({ error: 'templateId ist erforderlich' })
  if (!Array.isArray(fields)) return res.status(400).json({ error: 'fields muss ein Array sein' })

  const { error: updateError } = await supabaseAdmin
    .from('document_templates')
    .update({
      fields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)

  if (updateError) {
    console.error('dokumente/save-fields error:', updateError)
    return res.status(500).json({ error: 'Felder konnten nicht gespeichert werden' })
  }

  return res.json({ success: true })
})