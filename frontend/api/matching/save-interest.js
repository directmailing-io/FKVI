import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { profile_ids } = req.body
  if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
    return res.status(400).json({ error: 'profile_ids fehlt oder leer' })
  }

  // Find the company for this user
  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies')
    .select('id, notes_list')
    .eq('user_id', user.id)
    .single()

  if (cErr || !company) return res.status(404).json({ error: 'Unternehmen nicht gefunden' })

  const currentNotes = Array.isArray(company.notes_list) ? company.notes_list : []
  const newNote = {
    id: crypto.randomUUID(),
    type: 'interest_booking',
    profile_ids,
    created_at: new Date().toISOString(),
    author: 'Unternehmen',
  }

  const { error: uErr } = await supabaseAdmin
    .from('companies')
    .update({ notes_list: [newNote, ...currentNotes] })
    .eq('id', company.id)

  if (uErr) return res.status(500).json({ error: uErr.message })

  return res.status(200).json({ success: true })
}
