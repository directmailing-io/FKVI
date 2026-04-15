import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendApprovalEmail } from '../lib/resend.js'
import { generatePassword } from '../lib/utils.js'

const router = express.Router()

// Verify admin middleware
async function requireAdmin(req, res, next) {
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('user_id', req.user.id)
    .single()

  if (!data) return res.status(403).json({ error: 'Nur für Admins' })
  next()
}

// GET /api/admin/companies - all companies/leads
router.get('/companies', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error })
  res.json(data)
})

// POST /api/admin/companies/:id/approve - approve company
router.post('/companies/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params

  // Get company
  const { data: company, error: cErr } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (cErr || !company) return res.status(404).json({ error: 'Unternehmen nicht gefunden' })
  if (company.status === 'approved') return res.status(400).json({ error: 'Bereits freigeschaltet' })

  const tempPassword = generatePassword()

  // Create auth user
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: company.email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authErr) return res.status(500).json({ error: authErr.message })

  // Update company
  await supabaseAdmin
    .from('companies')
    .update({
      status: 'approved',
      user_id: authUser.user.id,
      approved_at: new Date().toISOString(),
      approved_by: req.user.id,
    })
    .eq('id', id)

  // Send approval email
  await sendApprovalEmail({ company, tempPassword })

  // Notify via socket
  if (req.io) {
    req.io.to('admin-room').emit('company-approved', { companyId: id })
  }

  res.json({ success: true, message: 'Unternehmen freigeschaltet' })
})

// POST /api/admin/companies/:id/reject
router.post('/companies/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  await supabaseAdmin
    .from('companies')
    .update({ status: 'rejected', internal_notes: reason })
    .eq('id', id)

  res.json({ success: true })
})

// DELETE /api/admin/companies/:id
router.delete('/companies/:id', requireAdmin, async (req, res) => {
  const { id } = req.params

  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('user_id')
    .eq('id', id)
    .single()

  if (company?.user_id) {
    await supabaseAdmin.auth.admin.deleteUser(company.user_id)
  }

  await supabaseAdmin.from('companies').delete().eq('id', id)
  res.json({ success: true })
})

// POST /api/admin/reservations - reserve profile for company
router.post('/reservations', requireAdmin, async (req, res) => {
  const { profileId, companyId } = req.body

  // Set profile to reserved
  await supabaseAdmin
    .from('profiles')
    .update({ status: 'reserved' })
    .eq('id', profileId)

  // Create reservation
  const { data: reservation, error } = await supabaseAdmin
    .from('reservations')
    .insert({ profile_id: profileId, company_id: companyId, reserved_by: req.user.id })
    .select()
    .single()

  if (error) return res.status(500).json({ error })

  // Notify company
  if (req.io) {
    req.io.to(`company-${companyId}`).emit('profile-reserved', { profileId, reservation })
  }

  res.json({ success: true, reservation })
})

// PATCH /api/admin/reservations/:id/status - update process status
router.patch('/reservations/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { newStatus, notes } = req.body

  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .select('*, companies(*)')
    .eq('id', id)
    .single()

  if (!reservation) return res.status(404).json({ error: 'Nicht gefunden' })

  const oldStatus = reservation.process_status

  await supabaseAdmin
    .from('reservations')
    .update({ process_status: newStatus })
    .eq('id', id)

  await supabaseAdmin
    .from('process_status_history')
    .insert({
      reservation_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: req.user.id,
      notes,
    })

  // Send email for trigger statuses
  const { sendStatusUpdateEmail } = await import('../lib/resend.js')
  await sendStatusUpdateEmail({
    company: reservation.companies,
    profileRef: `Profil #${reservation.profile_id.slice(0, 8)}`,
    newStatus,
  })

  // Notify company via socket
  if (req.io) {
    req.io.to(`company-${reservation.company_id}`).emit('status-updated', {
      reservationId: id,
      newStatus,
    })
  }

  res.json({ success: true })
})

export default router
