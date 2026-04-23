import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token, email } = req.body || {}
  if (!token) return res.status(400).json({ error: 'token ist erforderlich' })
  if (!email) return res.status(400).json({ error: 'email ist erforderlich' })

  const { data: link, error: fetchError } = await supabaseAdmin
    .from('company_document_links')
    .select('*')
    .eq('token', token)
    .single()

  if (fetchError || !link) return res.status(404).json({ error: 'Link nicht gefunden' })

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Dieser Link ist abgelaufen' })
  }

  // Verify email (case-insensitive)
  if (link.company_email.toLowerCase() !== email.trim().toLowerCase()) {
    return res.status(403).json({ error: 'E-Mail-Adresse stimmt nicht überein' })
  }

  // Mark first access
  if (!link.first_accessed_at) {
    await supabaseAdmin
      .from('company_document_links')
      .update({ first_accessed_at: new Date().toISOString() })
      .eq('token', token)
  }

  return res.json({
    success: true,
    companyName: link.company_name,
    documents: link.documents || [],
    expiresAt: link.expires_at,
  })
})
