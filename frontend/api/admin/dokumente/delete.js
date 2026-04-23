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

  const { templateId, force } = req.body || {}
  if (!templateId) return res.status(400).json({ error: 'templateId ist erforderlich' })

  // Check for active sends (not revoked or expired)
  const { data: activeSends, count, error: countError } = await supabaseAdmin
    .from('document_sends')
    .select('id', { count: 'exact' })
    .eq('template_id', templateId)
    .not('status', 'in', '("revoked","expired","signed","submitted")')

  if (countError) {
    console.error('dokumente/delete count error:', countError)
    return res.status(500).json({ error: 'Fehler beim Prüfen aktiver Versendungen' })
  }

  if (count && count > 0) {
    if (!force) {
      // Return count so frontend can show confirmation
      return res.status(400).json({
        error: `Dieses Template hat ${count} aktive Versendung(en).`,
        activeSendCount: count,
        requiresForce: true,
      })
    }
    // force=true: revoke all active sends first
    const ids = (activeSends || []).map(s => s.id)
    if (ids.length > 0) {
      await supabaseAdmin
        .from('document_sends')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .in('id', ids)
    }
  }

  // Also soft-delete all sends for this template (mark revoked)
  await supabaseAdmin
    .from('document_sends')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('template_id', templateId)
    .not('status', 'in', '("revoked","signed","submitted")')

  // Soft-delete the template
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