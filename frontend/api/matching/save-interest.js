import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { profile_ids, company_id } = req.body
  if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
    return res.status(400).json({ error: 'profile_ids fehlt oder leer' })
  }
  if (!company_id) {
    return res.status(400).json({ error: 'company_id fehlt' })
  }

  // Look up company by ID and verify the user owns it
  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies')
    .select('id, notes_list, user_id')
    .eq('id', company_id)
    .single()

  if (cErr || !company) {
    return res.status(404).json({ error: 'Unternehmen nicht gefunden', detail: cErr?.message })
  }

  // Verify ownership — user_id on companies must match the auth user
  if (company.user_id !== user.id) {
    return res.status(403).json({ error: 'Keine Berechtigung' })
  }

  const currentNotes = Array.isArray(company.notes_list) ? company.notes_list : []
  const newNote = {
    id: randomUUID(),
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
