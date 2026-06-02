import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ArrowLeft, FileText, Loader2, AlertCircle, FileEdit, PenLine, RefreshCw, X, ChevronRight, Type, AlignLeft, Search, Zap } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

const ROLES = [
  { value: 'fachkraft',   label: 'Fachkraft',   color: '#3b82f6', bg: '#eff6ff', ring: '#bfdbfe' },
  { value: 'unternehmen', label: 'Unternehmen', color: '#10b981', bg: '#f0fdf4', ring: '#a7f3d0' },
  { value: 'fkvi',        label: 'FKVI',         color: '#8b5cf6', bg: '#f5f3ff', ring: '#ddd6fe' },
]
const getRole = (v) => ROLES.find(r => r.value === v) || ROLES[2]

// ── Pre-Fill Drawer ────────────────────────────────────────────────────────────

function PreFillDrawer({ open, role, entity, fields, values, onValuesChange, onClose, onOpenDirect, onSaveAndOpen, saving }) {
  const roleInfo = getRole(role)
  const myFields = fields.filter(f => (f.role || 'fkvi') === role)
  const textFields = myFields.filter(f => f.type !== 'signature')
  const sigFields = myFields.filter(f => f.type === 'signature')

  if (!open) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: 9998, backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 flex flex-col bg-white shadow-2xl"
        style={{ zIndex: 9999, width: 380, borderLeft: '1px solid #e5e7eb' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: roleInfo.ring, background: roleInfo.bg }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-none"
              style={{ background: roleInfo.color }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: roleInfo.color }}>
                {entity?.name ?? `${roleInfo.label} vorausfüllen`}
              </p>
              {entity && (
                <p className="text-xs mt-0.5" style={{ color: roleInfo.color, opacity: 0.65 }}>
                  {roleInfo.label} · vorausfüllen
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: roleInfo.color }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {textFields.length === 0 && sigFields.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">
              Keine Felder für diese Rolle vorhanden.
            </p>
          )}

          {textFields.map(field => (
            <div key={field.id} className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                {field.type === 'multiline'
                  ? <AlignLeft className="w-3.5 h-3.5 text-purple-400" />
                  : <Type className="w-3.5 h-3.5 text-blue-400" />
                }
                {field.label || field.id}
                {field.required && <span className="text-red-400">*</span>}
                {field.autoFill && (
                  <span className="flex items-center gap-0.5 text-amber-500" title={`Auto: ${field.autoFill}`}>
                    <Zap className="w-3 h-3" />
                  </span>
                )}
              </label>
              {field.type === 'multiline' ? (
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 resize-none"
                  style={{ '--tw-ring-color': roleInfo.ring }}
                  placeholder="Vorausfüllen…"
                  value={values[field.id] || ''}
                  onChange={e => onValuesChange({ ...values, [field.id]: e.target.value })}
                />
              ) : (
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': roleInfo.ring }}
                  placeholder="Vorausfüllen…"
                  value={values[field.id] || ''}
                  onChange={e => onValuesChange({ ...values, [field.id]: e.target.value })}
                />
              )}
            </div>
          ))}

          {sigFields.length > 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-2.5">
              <PenLine className="w-4 h-4 text-amber-400 flex-none mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-600">
                  {sigFields.length === 1 ? 'Unterschrift' : `${sigFields.length} Unterschriften`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Wird beim Ausfüllen ergänzt
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2.5">
          <button
            onClick={onSaveAndOpen}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: roleInfo.color }}
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>Speichern & Öffnen <ChevronRight className="w-4 h-4" /></>
            }
          </button>
          <button
            onClick={onOpenDirect}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Ohne Vorausfüllen öffnen
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Entity Select Modal ───────────────────────────────────────────────────────

function EntitySelectModal({ open, role, token, onSelect, onSkip, onClose }) {
  const roleInfo = getRole(role)
  const [query, setQuery] = useState('')
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open || !token) return
    let cancelled = false
    setLoading(true)
    const delay = query ? 200 : 0
    const timer = setTimeout(async () => {
      try {
        const type = role === 'unternehmen' ? 'unternehmen' : 'fachkraft'
        const res = await fetch(
          `/api/admin/mediathek/entity-search?type=${type}&q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const d = await res.json()
        if (!cancelled) setEntities(d.entities || [])
      } catch (_) {}
      if (!cancelled) setLoading(false)
    }, delay)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, open, role, token])

  if (!open) return null

  const label = role === 'fachkraft' ? 'Fachkraft auswählen' : 'Unternehmen auswählen'
  const placeholder = role === 'fachkraft' ? 'Name suchen…' : 'Firmenname suchen…'

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/30" style={{ zIndex: 9998 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999, pointerEvents: 'none' }}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
          style={{ maxWidth: 440, maxHeight: '80vh', pointerEvents: 'auto' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b flex-none"
            style={{ borderColor: roleInfo.ring, background: roleInfo.bg }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: roleInfo.color }} />
              <p className="font-semibold text-sm" style={{ color: roleInfo.color }}>{label}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10">
              <X className="w-4 h-4" style={{ color: roleInfo.color }} />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100 flex-none">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : entities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                {query ? 'Keine Ergebnisse' : 'Keine Einträge vorhanden'}
              </p>
            ) : (
              <div>
                {entities.map(entity => (
                  <button
                    key={entity.key}
                    onClick={() => onSelect(entity)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    {entity.imageUrl ? (
                      <img src={entity.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-none" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: roleInfo.color }}
                      >
                        {entity.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{entity.name}</p>
                      {entity.subtitle && (
                        <p className="text-xs text-gray-400 truncate">{entity.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-none" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 flex-none">
            <button
              onClick={onSkip}
              className="w-full text-sm text-gray-400 hover:text-gray-700 py-1.5 transition-colors"
            >
              Ohne Zuordnung weiter
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplatePreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justUpdated = !!searchParams.get('updated')
  const { session } = useAuthStore()
  const token = session?.access_token

  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])
  const fieldsRef = useRef([]) // always-current, safe to read inside async callbacks
  const [numPages, setNumPages] = useState(0)
  const [loadState, setLoadState] = useState('loading') // loading | rendering | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [loadKey, setLoadKey] = useState(() => Date.now())
  const canvasRefs = useRef([])
  const pdfDocRef = useRef(null)

  // Entity selection
  const [entityModalRole, setEntityModalRole] = useState(null) // null = closed
  // Drawer state
  const [drawerRole, setDrawerRole] = useState(null) // null = closed
  const [drawerEntity, setDrawerEntity] = useState(null) // {key, name} | null
  const [drawerValues, setDrawerValues] = useState({})
  const [drawerSaving, setDrawerSaving] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}` }

  // Load template + fields
  useEffect(() => {
    if (!token) return
    fetch(`/api/admin/mediathek/get?id=${id}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.template) {
          setTemplate(d.template)
          const f = d.template.fields || []
          fieldsRef.current = f
          setFields(f)
        }
      })
      .catch(() => {})
  }, [id, token])

  // Called after entity selected (or skipped): opens the pre-fill drawer
  const openDrawer = async (role, entity) => {
    setDrawerRole(role)
    setDrawerEntity(entity || null)
    setDrawerValues({})

    // Fetch existing saved values and (optionally) entity profile data in parallel
    const entityParam = entity?.key ? `&entity=${encodeURIComponent(entity.key)}` : ''
    const [fillRes, entityRes] = await Promise.all([
      fetch(`/api/admin/mediathek/fill-values?id=${id}${entityParam}`, { headers: authHeaders }).then(r => r.json()).catch(() => ({})),
      entity?.key ? fetch(`/api/admin/mediathek/entity-data?entity=${encodeURIComponent(entity.key)}`, { headers: authHeaders }).then(r => r.json()).catch(() => ({})) : Promise.resolve({}),
    ])

    const merged = {}

    // Apply auto-fill from entity profile data for fields of this role
    // Use fieldsRef.current to avoid stale closure after await
    if (entityRes.data) {
      for (const field of fieldsRef.current) {
        if ((field.role || 'fkvi') === role && field.autoFill && field.type !== 'signature') {
          const val = entityRes.data[field.autoFill]
          if (val != null && val !== '') merged[field.id] = String(val)
        }
      }
    }

    // Overlay with any manually saved values (saved values override auto-fill)
    if (fillRes.values?.[role]) {
      for (const [k, v] of Object.entries(fillRes.values[role])) {
        if (typeof v === 'string' && !v.startsWith('data:image')) merged[k] = v
      }
    }

    setDrawerValues(merged)
  }

  // Role button click: entity selection first (for fachkraft/unternehmen), direct drawer for fkvi
  const handleRoleClick = (roleValue) => {
    if (roleValue === 'fkvi') {
      openDrawer(roleValue, null)
    } else {
      setEntityModalRole(roleValue)
    }
  }

  const buildFillUrl = (role, entity) => {
    const params = new URLSearchParams()
    if (entity?.key) params.set('entity', entity.key)
    if (entity?.name) params.set('ename', entity.name)
    const qs = params.toString()
    return `/admin/mediathek/${id}/fill/${role}${qs ? '?' + qs : ''}`
  }

  const handleSaveAndOpen = async () => {
    setDrawerSaving(true)
    try {
      const entityParam = drawerEntity?.key ? `&entity=${encodeURIComponent(drawerEntity.key)}` : ''
      await fetch(`/api/admin/mediathek/fill-values?id=${id}${entityParam}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: drawerRole, values: drawerValues, prefill: true }),
      })
    } catch (_) {}
    setDrawerSaving(false)
    navigate(buildFillUrl(drawerRole, drawerEntity))
  }

  const reloadPdf = () => {
    setLoadKey(Date.now())
    setLoadState('loading')
    setNumPages(0)
    canvasRefs.current = []
    pdfDocRef.current = null
    setRefreshing(true)
  }

  // If navigated from a save, auto-reload once after 2s to pick up CDN-propagated PDF
  useEffect(() => {
    if (!justUpdated) return
    const timer = setTimeout(() => reloadPdf(), 2000)
    return () => clearTimeout(timer)
  }, [justUpdated])

  // Load + render PDF
  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      try {
        setLoadState('loading')
        const pdf = await pdfjsLib.getDocument({
          url: `/api/admin/mediathek/pdf?id=${id}&t=${loadKey}`,
          httpHeaders: { Authorization: `Bearer ${token}` },
          withCredentials: false,
          password: '',
          // Automatically try empty password for owner-restricted PDFs
          onPassword: (updatePassword) => updatePassword(''),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        }).promise
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setLoadState('rendering')
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'PDF konnte nicht geladen werden')
          setLoadState('error')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [id, token, loadKey])

  // Render pages
  useEffect(() => {
    if (loadState !== 'rendering' || !pdfDocRef.current) return
    let cancelled = false

    const renderAll = async () => {
      const pdf = pdfDocRef.current
      const maxWidth = Math.min(window.innerWidth - 64, 860)

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) break
        const page = await pdf.getPage(i)
        const canvas = canvasRefs.current[i - 1]
        if (!canvas) continue
        const vp = page.getViewport({ scale: 1 })
        const scale = maxWidth / vp.width
        const scaled = page.getViewport({ scale })
        canvas.width = scaled.width
        canvas.height = scaled.height
        canvas.style.width = `${scaled.width}px`
        canvas.style.height = `${scaled.height}px`
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise
      }
      if (!cancelled) setLoadState('done')
    }

    renderAll()
    return () => { cancelled = true }
  }, [loadState, numPages])

  const displayName = template?.name || template?.file_name?.replace(/\.pdf$/i, '') || 'Vorlage'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/mediathek')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center flex-none">
              <FileText className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="font-medium text-gray-900 text-sm truncate">{displayName}</span>
            {numPages > 0 && (
              <span className="text-xs text-gray-400 flex-none">
                · {numPages} {numPages === 1 ? 'Seite' : 'Seiten'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={reloadPdf}
              title="Vorschau aktualisieren"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing && loadState !== 'done' ? 'animate-spin' : ''}`} />
            </button>
            {ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => handleRoleClick(r.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ color: r.color, background: r.bg }}
              >
                <PenLine className="w-3.5 h-3.5" />{r.label}
              </button>
            ))}
            <button
              onClick={() => navigate(`/admin/mediathek/${id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <FileEdit className="w-3.5 h-3.5" />Felder bearbeiten
            </button>
          </div>
        </div>
      </div>

      {/* Update banner */}
      {justUpdated && loadState !== 'done' && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 flex items-center gap-2 text-xs text-blue-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-none" />
          Vorschau wird mit den neuen Angaben aktualisiert…
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">

        {loadState === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-32 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-sm">PDF wird geladen…</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="flex flex-col items-center gap-3 py-32 text-gray-400">
            <AlertCircle className="w-10 h-10 text-red-300" />
            <p className="text-sm text-gray-500">{errorMsg}</p>
            <button
              onClick={() => navigate('/admin/mediathek')}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              Zurück zur Übersicht
            </button>
          </div>
        )}

        {numPages > 0 && (
          <div className="flex flex-col items-center gap-5">
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                className="relative bg-white"
                style={{
                  borderRadius: 6,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  lineHeight: 0,
                }}
              >
                <canvas
                  ref={el => { canvasRefs.current[i] = el }}
                  style={{ display: 'block', maxWidth: '100%' }}
                />
                {loadState !== 'done' && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-gray-50"
                    style={{ minWidth: 200, minHeight: 280 }}
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {loadState === 'done' && (
              <p className="text-xs text-gray-400 py-4">
                {numPages} {numPages === 1 ? 'Seite' : 'Seiten'}
              </p>
            )}
          </div>
        )}

      </div>

      {/* Entity selection modal */}
      <EntitySelectModal
        open={!!entityModalRole}
        role={entityModalRole || 'fachkraft'}
        token={token}
        onSelect={entity => { const role = entityModalRole; setEntityModalRole(null); openDrawer(role, entity) }}
        onSkip={() => { const role = entityModalRole; setEntityModalRole(null); openDrawer(role, null) }}
        onClose={() => setEntityModalRole(null)}
      />

      {/* Pre-fill drawer */}
      <PreFillDrawer
        open={!!drawerRole}
        role={drawerRole || 'fkvi'}
        entity={drawerEntity}
        fields={fields}
        values={drawerValues}
        onValuesChange={setDrawerValues}
        onClose={() => setDrawerRole(null)}
        onOpenDirect={() => navigate(buildFillUrl(drawerRole, drawerEntity))}
        onSaveAndOpen={handleSaveAndOpen}
        saving={drawerSaving}
      />
    </div>
  )
}
