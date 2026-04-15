import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

const router = express.Router()

// POST /api/companies/register - public company registration
router.post('/register', async (req, res) => {
  const { company_name, first_name, last_name, phone, email } = req.body

  if (!company_name || !email) {
    return res.status(400).json({ error: 'Firmenname und E-Mail sind Pflichtfelder' })
  }

  // Check if email already exists
  const { data: existing } = await supabaseAdmin
    .from('companies')
    .select('id, status')
    .eq('email', email)
    .single()

  if (existing) {
    if (existing.status === 'approved') {
      return res.status(409).json({ error: 'Diese E-Mail ist bereits registriert und freigeschaltet.' })
    }
    return res.status(409).json({ error: 'Eine Anfrage mit dieser E-Mail existiert bereits.' })
  }

  const { data, error } = await supabaseAdmin
    .from('companies')
    .insert({ company_name, first_name, last_name, phone, email })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Notify admin
  if (req.io) {
    req.io.to('admin-room').emit('new-company-request', { company: data })
  }

  res.json({ success: true, message: 'Ihre Anfrage wurde erfolgreich eingereicht. Wir melden uns zeitnah bei Ihnen.' })
})

export default router
