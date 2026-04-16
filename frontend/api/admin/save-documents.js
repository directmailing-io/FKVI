import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token fehlt' })

  // Decode JWT to verify admin
  let userId
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    userId = payload.sub
    if (!userId) throw new Error('no sub')
  } catch {
    return res.status(401).json({ error: 'Ungültiger Token' })
  }

  // Verify user is an admin
  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!adminUser) {
    return res.status(403).json({ error: 'Kein Adminzugriff' })
  }

  const { profileId, documents } = req.body
  if (!profileId) return res.status(400).json({ error: 'profileId fehlt' })
  if (!Array.isArray(documents)) return res.status(400).json({ error: 'documents muss ein Array sein' })

  // Delete existing documents for this profile
  const { error: deleteError } = await supabaseAdmin
    .from('profile_documents')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) return res.status(500).json({ error: deleteError.message })

  // Insert new valid documents (must have a link)
  const validDocs = documents.filter(doc => doc.link?.trim())
  if (validDocs.length > 0) {
    const rows = validDocs.map((doc, i) => ({
      profile_id: profileId,
      title: doc.title || '',
      doc_type: doc.doc_type || null,
      description: doc.description || null,
      link: doc.link.trim(),
      is_internal: !!doc.is_internal,
      sort_order: i,
    }))

    let { error: insertError } = await supabaseAdmin.from('profile_documents').insert(rows)

    // Fallback: if is_internal column doesn't exist yet, retry without it
    if (insertError?.message?.includes('is_internal')) {
      const rowsWithout = rows.map(({ is_internal, ...rest }) => rest)
      const { error: retryError } = await supabaseAdmin.from('profile_documents').insert(rowsWithout)
      if (retryError) return res.status(500).json({ error: retryError.message })
    } else if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }
  }

  return res.status(200).json({ success: true, saved: validDocs.length })
}
