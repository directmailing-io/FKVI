import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLATFORM_URL = process.env.VITE_PLATFORM_URL || 'https://frontend-nu-two-69.vercel.app'

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  let user
  try { user = await requireAdmin(token) } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const {
    templateIds,
    signerName,
    profileId,
    companyId,
    prefillData = {},
    title,
    message,
    expiresInDays = 30,
  } = req.body || {}

  if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0)
    return res.status(400).json({ error: 'templateIds ist erforderlich' })
  if (!signerName)
    return res.status(400).json({ error: 'signerName ist erforderlich' })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Create bundle record
  const { data: bundle, error: bundleErr } = await supabaseAdmin
    .from('document_bundles')
    .insert({
      title: title || null,
      message: message || null,
      profile_id: profileId || null,
      company_id: companyId || null,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token')
    .single()

  if (bundleErr || !bundle) {
    console.error('bundle-create bundle insert error:', bundleErr)
    return res.status(500).json({ error: `Paket konnte nicht erstellt werden: ${bundleErr?.message || bundleErr?.code || 'Unbekannter Fehler'}` })
  }

  // Create one document_send per template
  const sends = []
  for (const templateId of templateIds) {
    const { data: send, error: sendErr } = await supabaseAdmin
      .from('document_sends')
      .insert({
        template_id: templateId,
        profile_id: profileId || null,
        company_id: companyId || null,
        signer_name: signerName,
        signer_email: null,
        prefill_data: prefillData,
        expires_at: expiresAt.toISOString(),
        sent_by: user.id,
        status: 'pending',
        prefill_mode: 'blank',
        prefilled_field_ids: [],
        bundle_id: bundle.id,
      })
      .select('id, token')
      .single()

    if (sendErr || !send) {
      console.error('bundle-create send insert error:', sendErr)
      // Continue with other templates even if one fails
    } else {
      sends.push(send)
    }
  }

  if (sends.length === 0)
    return res.status(500).json({ error: 'Kein Dokument konnte erstellt werden' })

  // Audit log for each send
  for (const send of sends) {
    await supabaseAdmin.from('document_audit_log').insert({
      document_send_id: send.id,
      event_type: 'created',
      metadata: { bundle_id: bundle.id },
    }).catch(() => {})
  }

  const bundleUrl = `${PLATFORM_URL}/bundle/${bundle.token}`

  return res.json({
    bundleId: bundle.id,
    bundleToken: bundle.token,
    bundleUrl,
    sendCount: sends.length,
  })
})
