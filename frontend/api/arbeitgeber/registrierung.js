import { notifyOffice } from '../_lib/email.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { einrichtung, ansprechperson, email, telefon } = req.body || {}

  if (!einrichtung || !ansprechperson || !email || !telefon) {
    return res.status(400).json({ error: 'Bitte alle Pflichtfelder ausfüllen.' })
  }

  await notifyOffice('Neue Arbeitgeber-Registrierungsanfrage', [
    ['Einrichtung / Unternehmen', einrichtung],
    ['Ansprechperson', ansprechperson],
    ['E-Mail', email],
    ['Telefon', telefon],
  ])

  return res.json({ success: true })
}
