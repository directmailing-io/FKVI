import express from 'express'
import { supabaseAdmin, supabasePublic } from '../lib/supabase.js'

const router = express.Router()

// POST /api/profiles/interest - company submits interest
router.post('/interest', async (req, res) => {
  const { profileIds, companyId, message } = req.body

  if (!profileIds?.length || !companyId) {
    return res.status(400).json({ error: 'Fehlende Felder' })
  }

  // Notify admin via socket
  if (req.io) {
    req.io.to('admin-room').emit('new-interest', { profileIds, companyId, message })
  }

  res.json({ success: true, message: 'Interessenbekundung wurde übermittelt' })
})

export default router
