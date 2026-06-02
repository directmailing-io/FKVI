import { createClient } from '@supabase/supabase-js'
import { withHandler } from '../../_lib/withHandler.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin(token) {
  if (!token) throw { status: 401, message: 'Unauthorized' }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw { status: 401, message: 'Unauthorized' }
  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).single()
  if (!admin) throw { status: 403, message: 'Forbidden' }
  return user
}

const EMPTY_VALUES = () => ({ fachkraft: {}, unternehmen: {}, fkvi: {}, _submitted: [] })

const STORAGE_URL = () => `${process.env.VITE_SUPABASE_URL}/storage/v1/object/document-templates`
const SERVICE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY

// Storage path for values: entity-scoped when entity key provided
function valuesPath(id, entity) {
  return entity ? `filled/${id}/${entity}/values.json` : `filled/${id}/values.json`
}

async function loadValues(id, entity) {
  const res = await fetch(`${STORAGE_URL()}/${valuesPath(id, entity)}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY()}` },
  })
  if (!res.ok) return EMPTY_VALUES()
  try {
    const text = await res.text()
    return { ...EMPTY_VALUES(), ...JSON.parse(text) }
  } catch (_) {
    return EMPTY_VALUES()
  }
}

async function saveValues(id, entity, allValues) {
  const res = await fetch(`${STORAGE_URL()}/${valuesPath(id, entity)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY()}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: JSON.stringify(allValues),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Upload fehlgeschlagen')
    throw new Error(msg)
  }
}

export default withHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  try { await requireAdmin(token) } catch (e) { return res.status(e.status || 401).json({ error: e.message }) }

  const { id, entity } = req.query
  if (!id) return res.status(400).json({ error: 'id fehlt' })

  // Sanitize entity key (allow alphanumeric, hyphens, underscores only)
  const entityKey = entity?.match(/^[a-zA-Z0-9_-]+$/) ? entity : null

  if (req.method === 'GET') {
    const values = await loadValues(id, entityKey)
    return res.json({ values })
  }

  if (req.method === 'PUT') {
    const { role, values: roleValues, prefill } = req.body || {}
    if (!role) return res.status(400).json({ error: 'role fehlt' })
    const allValues = await loadValues(id, entityKey)
    allValues[role] = roleValues || {}
    // Only mark as submitted when NOT a prefill (prefill = admin pre-populating, not final submit)
    if (!prefill) {
      if (!Array.isArray(allValues._submitted)) allValues._submitted = []
      if (!allValues._submitted.includes(role)) allValues._submitted.push(role)
    }
    await saveValues(id, entityKey, allValues)
    return res.json({ values: allValues })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
