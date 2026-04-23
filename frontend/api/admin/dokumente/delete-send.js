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

  const { sendId } = req.body || {}
  if (!sendId) return res.status(400).json({ error: 'sendId ist erforderlich' })

  // 1. Get the send record to find storage paths
  const { data: send, error: fetchError } = await supabaseAdmin
    .from('document_sends')
    .select('id, signed_storage_path, status')
    .eq('id', sendId)
    .single()

  if (fetchError || !send) {
    return res.status(404).json({ error: 'Versendung nicht gefunden' })
  }

  // 2. Delete signed PDF from storage (if it exists)
  if (send.signed_storage_path) {
    const { error: storageError } = await supabaseAdmin.storage
      .from('signed-documents')
      .remove([send.signed_storage_path])
    if (storageError) {
      console.warn('delete-send storage cleanup warning:', storageError)
      // Non-fatal — continue with DB deletion
    }
  }

  // 3. Delete audit log entries (FK without CASCADE)
  await supabaseAdmin
    .from('document_audit_log')
    .delete()
    .eq('document_send_id', sendId)

  // 4. Delete the send record
  const { error: deleteError } = await supabaseAdmin
    .from('document_sends')
    .delete()
    .eq('id', sendId)

  if (deleteError) {
    console.error('delete-send error:', deleteError)
    return res.status(500).json({ error: 'Versendung konnte nicht gelöscht werden' })
  }

  return res.json({ success: true })
})
