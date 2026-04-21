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
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try {
    await requireAdmin(token)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { templateId } = req.body || {}
  if (!templateId) return res.status(400).json({ error: 'templateId ist erforderlich' })

  // Check for active sends (not revoked or expired)
  const { count, error: countError } = await supabaseAdmin
    .from('document_sends')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)
    .not('status', 'in', '("revoked","expired")')

  if (countError) {
    console.error('dokumente/delete count error:', countError)
    return res.status(500).json({ error: 'Fehler beim Prüfen aktiver Versendungen' })
  }

  if (count && count > 0) {
    return res.status(400).json({
      error: `Dieses Template hat ${count} aktive Versendung(en). Bitte zuerst alle aktiven Versendungen widerrufen.`,
    })
  }

  const { error: updateError } = await supabaseAdmin
    .from('document_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', templateId)

  if (updateError) {
    console.error('dokumente/delete update error:', updateError)
    return res.status(500).json({ error: 'Template konnte nicht deaktiviert werden' })
  }

  return res.json({ success: true })
})