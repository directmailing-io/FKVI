import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'token fehlt' })

  const { data, error } = await supabaseAdmin
    .from('doc_bundles')
    .select('id, title, entity_name, entity_type, files, recipient_name, created_at')
    .eq('token', token)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Link ungültig oder abgelaufen' })

  return res.json(data)
})
