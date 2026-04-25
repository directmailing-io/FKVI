import { createClient } from '@supabase/supabase-js'

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

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { requestId } = req.body || {}
  if (!requestId) return res.status(400).json({ error: 'requestId fehlt' })

  // Verify lead exists
  const { data: lead, error: findError } = await supabaseAdmin
    .from('brochure_requests')
    .select('id, contract_send_id')
    .eq('id', requestId)
    .single()

  if (findError || !lead) return res.status(404).json({ error: 'Lead nicht gefunden' })

  // If they have a signed contract, refuse deletion
  if (lead.contract_send_id) {
    const { data: send } = await supabaseAdmin
      .from('document_sends')
      .select('status')
      .eq('id', lead.contract_send_id)
      .single()
    if (send?.status === 'signed') {
      return res.status(409).json({ error: 'Lead hat einen unterschriebenen Vertrag und kann nicht gelöscht werden.' })
    }
  }

  // Delete in order: access_log, confirmations, request
  await supabaseAdmin.from('brochure_access_log').delete().eq('request_id', requestId)
  await supabaseAdmin.from('brochure_confirmations').delete().eq('request_id', requestId)

  const { error: deleteError } = await supabaseAdmin
    .from('brochure_requests')
    .delete()
    .eq('id', requestId)

  if (deleteError) {
    console.error('brochure/delete-lead error:', deleteError)
    return res.status(500).json({ error: 'Lead konnte nicht gelöscht werden' })
  }

  return res.json({ success: true })
}
