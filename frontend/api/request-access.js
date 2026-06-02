import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { first_name, last_name, email, phone, company_name, address, postal_code, city } = req.body || {}

  if (!first_name?.trim())   return res.status(400).json({ error: 'Vorname ist erforderlich.' })
  if (!last_name?.trim())    return res.status(400).json({ error: 'Nachname ist erforderlich.' })
  if (!email?.trim())        return res.status(400).json({ error: 'E-Mail-Adresse ist erforderlich.' })
  if (!phone?.trim())        return res.status(400).json({ error: 'Telefonnummer ist erforderlich.' })
  if (!address?.trim())      return res.status(400).json({ error: 'Straße & Hausnummer ist erforderlich.' })
  if (!postal_code?.trim())  return res.status(400).json({ error: 'PLZ ist erforderlich.' })
  if (!city?.trim())         return res.status(400).json({ error: 'Ort ist erforderlich.' })

  const normalizedEmail = email.trim().toLowerCase()

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('companies')
    .select('id, status')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'approved') return res.status(400).json({ error: 'already_approved' })
    if (existing.status === 'pending') {
      // Retroactively link any brochure_requests with this email to the existing company
      await supabaseAdmin
        .from('brochure_requests')
        .update({ company_id: existing.id })
        .eq('email', normalizedEmail)
        .is('company_id', null)
      return res.status(400).json({ error: 'already_pending' })
    }
  }

  const displayName = company_name?.trim()
    || `${first_name.trim()} ${last_name.trim()}`

  const { data: newCompany, error } = await supabaseAdmin.from('companies').insert({
    first_name:   first_name.trim(),
    last_name:    last_name.trim(),
    email:        normalizedEmail,
    phone:        phone.trim(),
    company_name: displayName,
    status:       'pending',
    company_type: 'lead',
    ...(address?.trim()     && { address:     address.trim() }),
    ...(postal_code?.trim() && { postal_code: postal_code.trim() }),
    ...(city?.trim()        && { city:        city.trim() }),
  }).select('id').single()

  if (error) return res.status(500).json({ error: error.message })

  // Retroactively link any brochure_requests with this email
  if (newCompany?.id) {
    await supabaseAdmin
      .from('brochure_requests')
      .update({ company_id: newCompany.id })
      .eq('email', normalizedEmail)
      .is('company_id', null)
  }

  res.json({ success: true })
}
