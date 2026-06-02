import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Save, Loader2, Type, AlignLeft, PenLine, Trash2, FileEdit, Pencil, Star, Zap } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '@/lib/utils'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

const FIELD_TYPES = [
  { value: 'text',      label: 'Einzeiliger Text',  Icon: Type,      color: '#3b82f6', bg: '#eff6ff' },
  { value: 'multiline', label: 'Mehrzeiliger Text', Icon: AlignLeft, color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'signature', label: 'Unterschrift',      Icon: PenLine,   color: '#f59e0b', bg: '#fffbeb' },
]

function getType(value) { return FIELD_TYPES.find(t => t.value === value) || FIELD_TYPES[0] }

const ROLES = [
  { value: 'fachkraft',  label: 'Fachkraft',   color: '#3b82f6', bg: '#eff6ff' },
  { value: 'unternehmen', label: 'Unternehmen', color: '#10b981', bg: '#f0fdf4' },
  { value: 'fkvi',       label: 'FKVI',         color: '#8b5cf6', bg: '#f5f3ff' },
]
function getRole(value) { return ROLES.find(r => r.value === value) || ROLES[2] }

const PROFILE_AUTO_FILL_PROPS = [
  { value: 'first_name',     label: 'Vorname' },
  { value: 'last_name',      label: 'Nachname' },
  { value: 'birth_date',     label: 'Geburtsdatum' },
  { value: 'nationality',    label: 'Nationalität' },
  { value: 'marital_status', label: 'Familienstand' },
  { value: 'phone',          label: 'Telefon' },
  { value: 'city',           label: 'Stadt' },
  { value: 'address',        label: 'Adresse' },
  { value: 'postal_code',    label: 'PLZ' },
  { value: 'email',          label: 'E-Mail' },
  { value: 'gender',         label: 'Geschlecht' },
]

const COMPANY_AUTO_FILL_PROPS = [
  { value: 'company_name', label: 'Unternehmensname' },
  { value: 'email',        label: 'E-Mail' },
  { value: 'address',      label: 'Adresse' },
  { value: 'postal_code',  label: 'PLZ' },
  { value: 'city',         label: 'Stadt' },
  { value: 'website_url',  label: 'Webseite' },
  { value: 'phone',        label: 'Telefon' },
]

function getAutoFillProps(role) {
  if (role === 'fachkraft') return PROFILE_AUTO_FILL_PROPS
  if (role === 'unternehmen') return COMPANY_AUTO_FILL_PROPS
  return null
}

// ── Resize handle positions ───────────────────────────────────────────────────

const RESIZE_HANDLES = [
  { id: 'nw', cursor: 'nw-resize', style: { top: -4,         left: -4 } },
  { id: 'n',  cursor: 'n-resize',  style: { top: -4,         left: '50%', transform: 'translateX(-50%)' } },
  { id: 'ne', cursor: 'ne-resize', style: { top: -4,         right: -4 } },
  { id: 'e',  cursor: 'e-resize',  style: { top: '50%',      right: -4, transform: 'translateY(-50%)' } },
  { id: 'se', cursor: 'se-resize', style: { bottom: -4,      right: -4 } },
  { id: 's',  cursor: 's-resize',  style: { bottom: -4,      left: '50%', transform: 'translateX(-50%)' } },
  { id: 'sw', cursor: 'sw-resize', style: { bottom: -4,      left: -4 } },
  { id: 'w',  cursor: 'w-resize',  style: { top: '50%',      left: -4, transform: 'translateY(-50%)' } },
]

// ── Field overlay box shown on PDF ───────────────────────────────────────────

function FieldBox({ field, onDelete, onEdit, selected, onClick, onMoveStart, onResizeStart }) {
  const ft = getType(field.type)
  const rl = getRole(field.role || 'fkvi')
  const Icon = ft.Icon

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation()
        if (e.button !== 0) return
        onMoveStart?.(field, e)
      }}
      onClick={(e) => { e.stopPropagation(); onClick?.(field.id) }}
      style={{
        position: 'absolute',
        left: `${field.x}%`, top: `${field.y}%`,
        width: `${field.width}%`, height: `${field.height}%`,
        border: `2px solid ${rl.color}`,
        background: selected ? `${rl.color}22` : `${rl.color}11`,
        borderRadius: 3,
        cursor: onMoveStart ? 'grab' : 'pointer',
        boxSizing: 'border-box',
        display: 'flex', alignItems: 'flex-start', padding: '2px 4px', gap: 3,
        overflow: 'visible',
        transition: 'background 0.1s',
      }}
    >
      {/* Clipped label content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3, width: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
        <Icon style={{ width: 10, height: 10, color: rl.color, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 10, color: rl.color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2, flex: 1 }}>
          {field.label || '(kein Name)'}
          {field.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        </span>
        {field.autoFill && (
          <Zap style={{ width: 8, height: 8, color: rl.color, opacity: 0.8, flexShrink: 0, marginTop: 2 }} />
        )}
        <span style={{ fontSize: 8, color: rl.color, opacity: 0.7, flexShrink: 0, lineHeight: 1.2 }}>
          {rl.label}
        </span>
      </div>

      {selected && (
        <>
          {/* Action buttons */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(field) }}
            style={{
              position: 'absolute', top: -8, right: 12,
              width: 18, height: 18, borderRadius: '50%',
              background: rl.color, border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 2,
            }}
          >
            <Pencil style={{ width: 9, height: 9, color: 'white' }} />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
            style={{
              position: 'absolute', top: -8, right: -8,
              width: 18, height: 18, borderRadius: '50%',
              background: '#ef4444', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 2,
            }}
          >
            <Trash2 style={{ width: 9, height: 9, color: 'white' }} />
          </button>

          {/* Resize handles */}
          {RESIZE_HANDLES.map(h => (
            <div
              key={h.id}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onResizeStart?.(field, h.id, e)
              }}
              style={{
                position: 'absolute',
                width: 8, height: 8,
                background: 'white',
                border: `2px solid ${rl.color}`,
                borderRadius: 2,
                cursor: h.cursor,
                zIndex: 2,
                ...h.style,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

// ── Main Editor Page ──────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const token = session?.access_token

  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])
  const [numPages, setNumPages] = useState(0)
  const [pdfState, setPdfState] = useState('loading') // loading | rendering | done | error
  const [saving, setSaving] = useState(false)

  const [drawType, setDrawType] = useState('text')
  const [drawMode, setDrawMode] = useState(false)
  const [drawState, setDrawState] = useState(null) // { page, startX, startY, currentX, currentY }
  const [pendingField, setPendingField] = useState(null)
  const [editingField, setEditingField] = useState(null) // field being edited
  const [pendingLabel, setPendingLabel] = useState('')
  const [pendingRole, setPendingRole] = useState('fkvi')
  const [pendingRequired, setPendingRequired] = useState(false)
  const [pendingAutoFill, setPendingAutoFill] = useState(null)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [manipState, setManipState] = useState(null) // { type: 'move'|handle, fieldId, page, startX, startY, origField }
  const manipRef = useRef(null) // always-current ref for use inside global handlers

  const canvasRefs = useRef([])
  const overlayRefs = useRef([])
  const pdfDocRef = useRef(null)
  const labelInputRef = useRef(null)

  const authHeaders = { Authorization: `Bearer ${token}` }

  // Load template metadata + fields
  useEffect(() => {
    fetch(`/api/admin/mediathek/get?id=${id}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.template) {
          setTemplate(d.template)
          setFields(d.template.fields || [])
        }
      })
  }, [id])

  // Load + render PDF
  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        const pdf = await pdfjsLib.getDocument({
          url: `/api/admin/mediathek/pdf?id=${id}`,
          httpHeaders: authHeaders,
          withCredentials: false,
          password: '',
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        }).promise
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setPdfState('rendering')
      } catch (err) {
        if (!cancelled) setPdfState('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, token])

  useEffect(() => {
    if (pdfState !== 'rendering' || !pdfDocRef.current) return
    let cancelled = false
    const renderAll = async () => {
      const pdf = pdfDocRef.current
      const maxWidth = Math.min(window.innerWidth - 80, 900)
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
      if (!cancelled) setPdfState('done')
    }
    renderAll()
    return () => { cancelled = true }
  }, [pdfState, numPages])

  // Keyboard: Escape cancels drawing / deselects
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setDrawMode(false); setDrawState(null); setPendingField(null); setEditingField(null); setSelectedFieldId(null) }
      if (e.key === 'Delete' && selectedFieldId) deleteField(selectedFieldId)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedFieldId])

  // Sync manipulation ref (allows global handlers to see latest state)
  useEffect(() => { manipRef.current = manipState }, [manipState])

  // Global drag/resize handlers (mounted once, always read from ref)
  useEffect(() => {
    const onMove = (e) => {
      const ms = manipRef.current
      if (!ms) return
      const overlay = overlayRefs.current[ms.page]
      if (!overlay) return
      const rect = overlay.getBoundingClientRect()
      const cx = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const cy = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
      const dx = cx - ms.startX
      const dy = cy - ms.startY
      const o = ms.origField
      const MIN = 1.5

      let patch
      if (ms.type === 'move') {
        patch = {
          x: Math.max(0, Math.min(100 - o.width,  o.x + dx)),
          y: Math.max(0, Math.min(100 - o.height, o.y + dy)),
        }
      } else {
        const h = ms.type
        const re = o.x + o.width   // fixed right edge (for w-side handles)
        const be = o.y + o.height  // fixed bottom edge (for n-side handles)
        let nx = o.x, ny = o.y, nw = o.width, nh = o.height
        if (h.includes('w')) { nx = Math.max(0, Math.min(re - MIN, o.x + dx)); nw = re - nx }
        if (h.includes('e')) { nw = Math.max(MIN, Math.min(100 - o.x, o.width + dx)) }
        if (h.includes('n')) { ny = Math.max(0, Math.min(be - MIN, o.y + dy)); nh = be - ny }
        if (h.includes('s')) { nh = Math.max(MIN, Math.min(100 - o.y, o.height + dy)) }
        patch = { x: nx, y: ny, width: nw, height: nh }
      }
      setFields(prev => prev.map(f => f.id === ms.fieldId ? { ...f, ...patch } : f))
    }
    const onUp = () => {
      if (!manipRef.current) return
      manipRef.current = null
      setManipState(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // Focus label input when pending field or edit dialog appears
  useEffect(() => {
    if (pendingField) {
      setPendingLabel('')
      setPendingRole('fkvi')
      setPendingRequired(false)
      setPendingAutoFill(null)
      setTimeout(() => labelInputRef.current?.focus(), 50)
    }
  }, [pendingField])

  useEffect(() => {
    if (editingField) {
      setPendingLabel(editingField.label || '')
      setPendingRole(editingField.role || 'fkvi')
      setPendingRequired(editingField.required || false)
      setPendingAutoFill(editingField.autoFill || null)
      setTimeout(() => labelInputRef.current?.focus(), 50)
    }
  }, [editingField])

  const getOverlayPct = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    }
  }

  const getPctFromMouseEvent = (field, e) => {
    const overlay = overlayRefs.current[field.page]
    if (!overlay) return { x: 0, y: 0 }
    const rect = overlay.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const startMove = (field, e) => {
    if (drawMode) return
    e.preventDefault()
    setSelectedFieldId(field.id)
    const { x, y } = getPctFromMouseEvent(field, e)
    const ms = { type: 'move', fieldId: field.id, page: field.page, startX: x, startY: y, origField: { ...field } }
    manipRef.current = ms
    setManipState(ms)
  }

  const startResize = (field, handleId, e) => {
    e.preventDefault()
    const { x, y } = getPctFromMouseEvent(field, e)
    const ms = { type: handleId, fieldId: field.id, page: field.page, startX: x, startY: y, origField: { ...field } }
    manipRef.current = ms
    setManipState(ms)
  }

  const handleMouseDown = (e, pageIdx) => {
    if (!drawMode) { setSelectedFieldId(null); return }
    e.preventDefault()
    const { x, y } = getOverlayPct(e)
    setDrawState({ page: pageIdx, startX: x, startY: y, currentX: x, currentY: y })
  }

  const handleMouseMove = (e, pageIdx) => {
    if (!drawState || drawState.page !== pageIdx) return
    e.preventDefault()
    const { x, y } = getOverlayPct(e)
    setDrawState(s => ({ ...s, currentX: x, currentY: y }))
  }

  const handleMouseUp = (e, pageIdx) => {
    if (!drawState || drawState.page !== pageIdx) return
    e.preventDefault()
    const { startX, startY, currentX, currentY } = drawState
    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)
    setDrawState(null)
    if (width < 2 || height < 1) return
    setPendingField({ id: crypto.randomUUID(), type: drawType, page: pageIdx, x, y, width, height })
  }

  const confirmField = () => {
    if (!pendingField && !editingField) return
    const sourceField = pendingField || editingField
    const label = pendingLabel.trim() || getType(sourceField.type).label
    const autoFill = (pendingRole !== 'fkvi' && sourceField.type !== 'signature') ? (pendingAutoFill || null) : null
    const fieldData = { ...sourceField, label, role: pendingRole, required: pendingRequired, autoFill }
    if (editingField) {
      setFields(prev => prev.map(f => f.id === editingField.id ? fieldData : f))
      setEditingField(null)
    } else {
      setFields(prev => [...prev, fieldData])
      setPendingField(null)
    }
    setPendingLabel('')
    setPendingRequired(false)
    setPendingAutoFill(null)
  }

  const openEditDialog = (field) => {
    setSelectedFieldId(null)
    setEditingField({ ...field })
  }

  const closeDialog = () => {
    setPendingField(null)
    setEditingField(null)
    setPendingLabel('')
    setPendingRequired(false)
    setPendingAutoFill(null)
  }

  const deleteField = (fieldId) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
    setSelectedFieldId(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/mediathek/save-fields', {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Felder gespeichert' })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const drawPreviewRect = (drawState) => {
    if (!drawState) return null
    const x = Math.min(drawState.startX, drawState.currentX)
    const y = Math.min(drawState.startY, drawState.currentY)
    const w = Math.abs(drawState.currentX - drawState.startX)
    const h = Math.abs(drawState.currentY - drawState.startY)
    const ft = getType(drawType)
    return { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, border: `2px dashed ${ft.color}`, background: `${ft.color}18` }
  }

  const activeFt = getType(drawType)

  // Set global cursor during drag/resize to prevent flicker
  useEffect(() => {
    if (!manipState) { document.body.style.cursor = ''; return }
    document.body.style.cursor = manipState.type === 'move' ? 'grabbing' : `${manipState.type}-resize`
    return () => { document.body.style.cursor = '' }
  }, [manipState])

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => { if (!manipRef.current) setSelectedFieldId(null) }}>

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/admin/mediathek/${id}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />Zurück
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <FileEdit className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-sm text-gray-900 flex-1 truncate">{template?.name || '…'}</span>

          {/* Field type selector */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {FIELD_TYPES.map(ft => {
              const Icon = ft.Icon
              const active = drawType === ft.value && drawMode
              return (
                <button
                  key={ft.value}
                  onClick={() => { setDrawType(ft.value); setDrawMode(true); setSelectedFieldId(null) }}
                  title={ft.label}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    active
                      ? 'text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                  )}
                  style={active ? { background: ft.color } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{ft.label}</span>
                </button>
              )
            })}
          </div>

          {drawMode && (
            <button onClick={() => { setDrawMode(false); setDrawState(null) }} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100">
              ✕ Abbrechen
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-fkvi-blue text-white text-sm font-medium rounded-xl hover:bg-fkvi-blue/90 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>

      {/* Draw mode hint */}
      {drawMode && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 text-center">
          <p className="text-xs text-blue-600 font-medium">
            <span style={{ color: activeFt.color }}>● {activeFt.label}</span>
            {' '}— Klicke und ziehe auf der PDF, um ein Feld zu platzieren
          </p>
        </div>
      )}

      {/* PDF + overlay */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {pdfState === 'loading' && (
          <div className="flex items-center justify-center py-32 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /><span className="text-sm">Lade PDF…</span>
          </div>
        )}

        {numPages > 0 && (
          <div className="flex flex-col items-center gap-5">
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="relative"
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
                  borderRadius: 6, overflow: 'hidden', lineHeight: 0,
                }}
              >
                <canvas
                  ref={el => { canvasRefs.current[i] = el }}
                  style={{ display: 'block' }}
                />

                {/* Interactive overlay */}
                <div
                  ref={el => { overlayRefs.current[i] = el }}
                  style={{
                    position: 'absolute', inset: 0,
                    cursor: drawMode ? 'crosshair' : manipState ? (manipState.type === 'move' ? 'grabbing' : manipState.type + '-resize') : 'default',
                    userSelect: 'none',
                  }}
                  onMouseDown={e => handleMouseDown(e, i)}
                  onMouseMove={e => handleMouseMove(e, i)}
                  onMouseUp={e => handleMouseUp(e, i)}
                  onMouseLeave={e => { if (drawState?.page === i) handleMouseUp(e, i) }}
                >
                  {/* Drawing preview */}
                  {drawState?.page === i && drawPreviewRect(drawState) && (
                    <div style={{ position: 'absolute', borderRadius: 2, ...drawPreviewRect(drawState) }} />
                  )}

                  {/* Placed fields */}
                  {fields.filter(f => f.page === i).map(field => (
                    <FieldBox
                      key={field.id}
                      field={field}
                      selected={selectedFieldId === field.id}
                      onClick={(fid) => { if (!drawMode && !manipRef.current) setSelectedFieldId(fid) }}
                      onDelete={deleteField}
                      onEdit={openEditDialog}
                      onMoveStart={!drawMode ? startMove : null}
                      onResizeStart={!drawMode ? startResize : null}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {fields.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{fields.length} Felder</p>
            <div className="flex flex-wrap gap-2">
              {fields.map(f => {
                const ft = getType(f.type)
                const Icon = ft.Icon
                return (
                  <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: getRole(f.role || 'fkvi').bg, color: getRole(f.role || 'fkvi').color }}>
                    <Icon className="w-3 h-3" />
                    {f.label}
                    {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                    {f.autoFill && <Zap className="w-2.5 h-2.5" style={{ color: '#f59e0b' }} title={`Auto: ${f.autoFill}`} />}
                    <span className="opacity-60">({getRole(f.role || 'fkvi').label})</span>
                    <button onClick={() => openEditDialog(f)} className="ml-1 opacity-50 hover:opacity-100">
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={() => deleteField(f.id)} className="opacity-50 hover:opacity-100">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Label dialog (new field or edit) */}
      {(pendingField || editingField) && (() => {
        const dialogField = pendingField || editingField
        const isEditing = !!editingField
        const autoFillProps = getAutoFillProps(pendingRole)
        const canAutoFill = dialogField.type !== 'signature' && autoFillProps !== null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[340px] space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                {(() => { const ft = getType(dialogField.type); const Icon = ft.Icon; return <><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ft.bg }}><Icon className="w-4 h-4" style={{ color: ft.color }} /></div><div><p className="font-semibold text-gray-900 text-sm">{ft.label}</p><p className="text-xs text-gray-400">{isEditing ? 'Feld bearbeiten' : 'Feldbezeichnung eingeben'}</p></div></> })()}
              </div>

              <input
                ref={labelInputRef}
                value={pendingLabel}
                onChange={e => setPendingLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmField(); if (e.key === 'Escape') closeDialog() }}
                placeholder="z. B. Vorname, Unterschrift..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Field type selector (only for new fields) */}
              {!isEditing && (
                <div className="flex gap-2">
                  {FIELD_TYPES.map(ft => {
                    const Icon = ft.Icon
                    return (
                      <button
                        key={ft.value}
                        onClick={() => setPendingField(f => ({ ...f, type: ft.value }))}
                        className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all"
                        style={dialogField.type === ft.value ? { background: ft.color, color: 'white' } : { background: ft.bg, color: ft.color }}
                      >
                        <Icon className="w-4 h-4" />
                        {ft.label.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Role selector */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">Auszufüllen von</p>
                <div className="flex gap-2">
                  {ROLES.map(rl => (
                    <button
                      key={rl.value}
                      onClick={() => { setPendingRole(rl.value); setPendingAutoFill(null) }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={pendingRole === rl.value ? { background: rl.color, color: 'white' } : { background: rl.bg, color: rl.color }}
                    >
                      {rl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required toggle */}
              {dialogField.type !== 'signature' && (
                <div className="flex items-center justify-between py-0.5">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Pflichtfeld</p>
                    <p className="text-xs text-gray-400">Muss vom Empfänger ausgefüllt werden</p>
                  </div>
                  <button
                    onClick={() => setPendingRequired(r => !r)}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    style={{ background: pendingRequired ? '#3b82f6' : '#e5e7eb' }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                      style={{ transform: pendingRequired ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>
              )}

              {/* Auto-fill selector */}
              {canAutoFill && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <p className="text-xs font-medium text-gray-700">Automatisch vorausfüllen</p>
                  </div>
                  <select
                    value={pendingAutoFill || ''}
                    onChange={e => setPendingAutoFill(e.target.value || null)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                  >
                    <option value="">— Kein automatisches Ausfüllen —</option>
                    {autoFillProps.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={closeDialog} className="flex-1 py-2 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                  Abbrechen
                </button>
                <button onClick={confirmField} className="flex-1 py-2 text-sm font-medium text-white rounded-xl transition-colors" style={{ background: getType(dialogField.type).color }}>
                  {isEditing ? 'Speichern' : 'Hinzufügen'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
