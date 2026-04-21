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

  const { data: templates, error: fetchError } = await supabaseAdmin
    .from('document_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('dokumente/list fetch error:', fetchError)
    return res.status(500).json({ error: 'Templates konnten nicht geladen werden' })
  }

  // For each template, count associated sends
  const templatesWithCounts = await Promise.all(
    (templates || []).map(async (tpl) => {
      const { count } = await supabaseAdmin
        .from('document_sends')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', tpl.id)

      return { ...tpl, sends_count: count || 0 }
    })
  )

  return res.json({ templates: templatesWithCounts })
})