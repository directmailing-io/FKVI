import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const baseUrl = process.env.FRONTEND_URL || ''

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f7fa;color:#374151}
.card{background:#fff;border-radius:12px;padding:48px 40px;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
h1{color:#1e3a5f;margin:0 0 12px}p{color:#6b7280;line-height:1.6}</style></head>
<body><div class="card">${body}</div></body></html>`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query

  if (!token) {
    return res.status(400).send(htmlPage('Link ungültig', '<h1>Link ungültig</h1><p>Der Bestätigungslink ist ungültig oder unvollständig.</p>'))
  }

  // Find request by opt_in_token
  const { data: request, error } = await supabaseAdmin
    .from('brochure_requests')
    .select('id, first_name, last_name, company_name, email, phone, email_confirmed_at, access_token, brochure_version_id, company_id')
    .eq('opt_in_token', token)
    .single()

  if (error || !request) {
    return res.status(404).send(htmlPage('Link ungültig', '<h1>Link ungültig</h1><p>Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet. Bitte fordern Sie einen neuen Link an.</p>'))
  }

  // Already confirmed — redirect directly
  if (request.email_confirmed_at && request.access_token) {
    return res.redirect(302, `${baseUrl}/downloads/zugang/${request.access_token}`)
  }

  // Generate access token and confirm email
  const accessToken = randomUUID()
  const now = new Date().toISOString()

  const { error: updateError } = await supabaseAdmin
    .from('brochure_requests')
    .update({
      email_confirmed_at: now,
      access_token: accessToken,
    })
    .eq('id', request.id)

  if (updateError) {
    console.error('brochure/confirm update error:', updateError)
    return res.status(500).send(htmlPage('Fehler', '<h1>Interner Fehler</h1><p>Bei der Bestätigung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.</p>'))
  }

  // Upsert company in CRM
  let companyId = request.company_id

  if (!companyId) {
    // Check if a company with this email already exists
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('email', request.email)
      .single()

    if (existingCompany) {
      companyId = existingCompany.id
    } else {
      // Insert new company
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          company_name: request.company_name || `${request.first_name} ${request.last_name}`,
          first_name: request.first_name,
          last_name: request.last_name,
          email: request.email,
          phone: request.phone,
          status: 'pending',
          crm_type: 'lead',
          source: 'brochure_download',
        })
        .select('id')
        .single()

      if (!companyError && newCompany) {
        companyId = newCompany.id
      } else {
        console.error('brochure/confirm company insert error:', companyError)
      }
    }

    // Update brochure_request with company_id
    if (companyId) {
      await supabaseAdmin
        .from('brochure_requests')
        .update({ company_id: companyId })
        .eq('id', request.id)
    }
  }

  return res.redirect(302, `${baseUrl}/downloads/zugang/${accessToken}`)
}
