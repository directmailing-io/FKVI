import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'

import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Type, CheckSquare, PenLine, Calendar, Fingerprint,
  Trash2, Save, ChevronLeft, ChevronRight, Loader2,
  ArrowLeft, AlertCircle, Plus, CheckCircle2, MapPin,
} from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { key: 'text',      label: 'Text',        icon: Type,        color: 'blue',   border: 'border-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-400'   },
  { key: 'checkbox',  label: 'Checkbox',    icon: CheckSquare, color: 'orange', border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-400' },
  { key: 'signature', label: 'Unterschrift', icon: PenLine,    color: 'purple', border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-400' },
  { key: 'date',      label: 'Datum',       icon: Calendar,    color: 'green',  border: 'border-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-400'  },
  { key: 'initials',  label: 'Initialen',   icon: Fingerprint, color: 'pink',   border: 'border-pink-500',   bg: 'bg-pink-50',   text: 'text-pink-700',   ring: 'ring-pink-400'   },
]

const FIELD_TYPE_MAP = Object.fromEntries(FIELD_TYPES.map(t => [t.key, t]))

const PREFILL_OPTIONS = [
  { value: '',                    label: 'Kein' },
  { value: 'profile.first_name',  label: 'Vorname (Fachkraft)' },
  { value: 'profile.last_name',   label: 'Nachname (Fachkraft)' },
  { value: 'profile.nationality', label: 'Nationalität' },
  { value: 'profile.education',   label: 'Ausbildung' },
  { value: 'today',               label: 'Heutiges Datum' },
  { value: 'signer.name',         label: 'Unterzeichner Name' },
]

function getFieldCfg(type) { return FIELD_TYPE_MAP[type] || FIELD_TYPES[0] }

// ─── FieldOverlay ──────────────────────────────────────────────────────────────

function FieldOverlay({ field, isSelected, onClick, onDelete }) {
  const cfg = getFieldCfg(field.type)
  const Icon = cfg.icon

  const style = {
    position: 'absolute',
    left: `${field.x}%`, top: `${field.y}%`,
    width: `${field.width}%`, height: `${field.height}%`,
    userSelect: 'none',
  }

  if (field.type === 'checkbox') {
    return (
      <div
        style={style}
        onClick={e => { e.stopPropagation(); onClick(field.id) }}
        className={`cursor-pointer border-2 border-dashed rounded transition-all ${
          isSelected ? 'border-orange-500 bg-orange-50/40' : 'border-orange-300 bg-orange-50/10 hover:bg-orange-50/30'
        }`}
      >
        <div className="absolute -top-4 left-0 flex items-center gap-1 bg-white rounded px-1 border border-orange-200">
          <Icon className="h-2.5 w-2.5 text-orange-500 shrink-0" />
          <span className="text-[9px] font-semibold text-orange-600 whitespace-nowrap max-w-[120px] truncate">
            {field.label || 'Checkbox-Gruppe'}
          </span>
        </div>
        {isSelected && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(field.id) }}
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-10 text-[10px] font-bold"
          >×</button>
        )}
      </div>
    )
  }

  return (
    <div
      style={style}
      onClick={e => { e.stopPropagation(); onClick(field.id) }}
      className={`cursor-pointer border-2 rounded overflow-hidden transition-all ${cfg.border} ${cfg.bg} ${cfg.text} ${
        isSelected ? `ring-2 ${cfg.ring} ring-offset-1` : 'opacity-80 hover:opacity-100'
      }`}
    >
      <div className="w-full h-full flex items-center justify-center gap-1 px-1">
        <Icon className="h-3 w-3 shrink-0 opacity-60" />
        {field.label && <span className="text-[10px] font-medium truncate leading-none max-w-[80%]">{field.label}</span>}
      </div>
      {isSelected && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(field.id) }}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-10 text-[10px] font-bold"
        >×</button>
      )}
    </div>
  )
}

// ─── OptionMarker ─────────────────────────────────────────────────────────────

function OptionMarker({ option, field, isGroupSelected, onClick }) {
  if (option.x === undefined || option.y === undefined) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: `${option.x}%`, top: `${option.y}%`,
        width: `${option.width}%`, height: `${option.height}%`,
        userSelect: 'none',
      }}
      onClick={e => { e.stopPropagation(); onClick(field.id) }}
      className={`cursor-pointer border-2 rounded flex items-center justify-center transition-all ${
        isGroupSelected ? 'border-orange-500 bg-orange-100' : 'border-orange-300 bg-orange-50 hover:bg-orange-100'
      }`}
      title={option.label}
    >
      <div className={`w-3/5 h-3/5 border-2 border-orange-400 bg-white ${field.multiple ? 'rounded-sm' : 'rounded-full'}`} />
      {option.label && (
        <span className="absolute -bottom-4 left-0 text-[8px] text-orange-600 whitespace-nowrap bg-white px-0.5 rounded">
          {option.label}
        </span>
      )}
    </div>
  )
}

// ─── FieldProperties ──────────────────────────────────────────────────────────

function FieldProperties({ field, onChange, onDelete, autoFocusLabel, onPlaceOption }) {
  const labelInputRef = useRef(null)

  useEffect(() => {
    if (autoFocusLabel && labelInputRef.current) {
      setTimeout(() => labelInputRef.current?.focus(), 80)
    }
  }, [autoFocusLabel, field?.id])

  if (!field) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>Kein Feld ausgewählt</p>
        <p className="text-xs mt-1">Klicke ein Feld an oder platziere ein neues</p>
      </div>
    )
  }

  const cfg = getFieldCfg(field.type)
  const Icon = cfg.icon

  const addOption = () => onChange({
    ...field,
    options: [...(field.options || []), { id: crypto.randomUUID(), label: '' }],
  })

  const updateOption = (optId, label) => onChange({
    ...field,
    options: (field.options || []).map(o => o.id === optId ? { ...o, label } : o),
  })

  const removeOption = (optId) => onChange({
    ...field,
    options: (field.options || []).filter(o => o.id !== optId),
  })

  const clearOptionPosition = (optId) => onChange({
    ...field,
    options: (field.options || []).map(o => {
      if (o.id !== optId) return o
      const { x, y, width, height, page, ...rest } = o
      return rest
    }),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded flex items-center justify-center ${cfg.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {field.type === 'checkbox' ? 'Checkbox-Gruppe' : `${cfg.label}-Feld`}
        </span>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">
          {field.type === 'checkbox' ? 'Gruppenname' : 'Beschriftung'}
        </Label>
        <Input
          ref={labelInputRef}
          value={field.label || ''}
          onChange={e => onChange({ ...field, label: e.target.value })}
          placeholder={field.type === 'checkbox' ? 'z. B. Geschlecht...' : 'Feldname...'}
          className="h-8 text-sm"
        />
      </div>

      {/* Pflichtfeld toggle */}
      <div className="flex items-center gap-3">
        <Label className="text-xs text-gray-500 flex-1">Pflichtfeld</Label>
        <button
          type="button"
          onClick={() => onChange({ ...field, required: !field.required })}
          className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none ${
            field.required ? 'bg-[#0d9488]' : 'bg-gray-200'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            field.required ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Checkbox: mode + options with positions */}
      {field.type === 'checkbox' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Auswahlmodus</Label>
            <div className="flex gap-1.5">
              {[{ val: false, label: 'Einfach' }, { val: true, label: 'Mehrfach' }].map(({ val, label }) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => onChange({ ...field, multiple: val })}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    field.multiple === val
                      ? 'bg-orange-50 border-orange-400 text-orange-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Optionen</Label>
            <ul className="space-y-2">
              {(field.options || []).map((opt) => (
                <li key={opt.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 border border-gray-300 shrink-0 ${field.multiple ? 'rounded-sm' : 'rounded-full'}`} />
                    <Input
                      value={opt.label || ''}
                      onChange={e => updateOption(opt.id, e.target.value)}
                      placeholder="Option..."
                      className="h-6 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none shrink-0"
                    >×</button>
                  </div>
                  {opt.x !== undefined ? (
                    <div className="flex items-center gap-1 text-[10px] text-green-600 pl-1">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Seite {opt.page}, positioniert</span>
                      <button
                        type="button"
                        onClick={() => clearOptionPosition(opt.id)}
                        className="ml-auto text-gray-400 hover:text-red-400 transition-colors"
                      >entfernen</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPlaceOption(field.id, opt.id, opt.label || 'Option')}
                      className="w-full text-[10px] text-[#0d9488] border border-dashed border-[#0d9488]/40 rounded py-1 hover:bg-[#0d9488]/5 transition-colors flex items-center justify-center gap-1 pl-4"
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      Position im Dokument markieren
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addOption}
              className="w-full text-xs text-[#0d9488] border border-dashed border-[#0d9488]/40 rounded-lg py-1.5 hover:bg-[#0d9488]/5 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" />Option hinzufügen
            </button>
          </div>
        </>
      )}

      {/* Prefill (not for checkbox) */}
      {field.type !== 'checkbox' && field.type !== 'signature' && (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Vorausfüllen mit</Label>
          <select
            value={field.prefillKey || ''}
            onChange={e => onChange({ ...field, prefillKey: e.target.value })}
            className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PREFILL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full text-red-500 border-red-200 hover:bg-red-50"
        onClick={() => onDelete(field.id)}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />Feld löschen
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])
  const [pdfUrl, setPdfUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // PDF state
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageAspects, setPageAspects] = useState([]) // [{width, height}] natural PDF dimensions
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pageRendering, setPageRendering] = useState(false)

  // Refs
  const canvasRefs = useRef([])
  const canvasContainerRef = useRef(null)
  const renderTasksRef = useRef([])
  const propertiesSectionRef = useRef(null)

  // Interaction
  const [activeTool, setActiveTool] = useState(null)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [newlyPlacedFieldId, setNewlyPlacedFieldId] = useState(null)
  const [drawing, setDrawing] = useState(null)
  // { startX, startY, currentX, currentY, pageIdx } — all in %
  const [placingOptionFor, setPlacingOptionFor] = useState(null)
  // { fieldId, optionId, label }

  // ── Load template ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!templateId || !session) return
    loadTemplate()
  }, [templateId, session])

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/dokumente/get?templateId=${templateId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Vorlage konnte nicht geladen werden')
      setTemplate(data.template)
      setFields(Array.isArray(data.template?.fields) ? data.template.fields : [])
      setPdfUrl(data.pdfSignedUrl)
    } catch (err) {
      setLoadError(err.message)
    }
  }

  // ── Load PDF ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfUrl) return
    loadPdf()
  }, [pdfUrl])

  const loadPdf = async () => {
    setPdfLoading(true)
    try {
      renderTasksRef.current.forEach(t => t.cancel?.())
      renderTasksRef.current = []

      const doc = await pdfjsLib.getDocument(pdfUrl).promise
      setPdfDoc(doc)
      setNumPages(doc.numPages)
      setCurrentPage(1)

      // Store natural (unscaled) page dimensions for responsive rendering
      const aspects = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 1 })
        aspects.push({ width: vp.width, height: vp.height })
      }
      setPageAspects(aspects)
    } catch {
      toast({ title: 'PDF-Fehler', description: 'Das PDF konnte nicht geladen werden.', variant: 'destructive' })
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Render pages ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || pageAspects.length === 0) return
    renderAllPages()
  }, [pdfDoc, pageAspects])

  const renderAllPages = async () => {
    if (!pdfDoc) return
    setPageRendering(true)
    renderTasksRef.current.forEach(t => t.cancel?.())
    renderTasksRef.current = []

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const canvas = canvasRefs.current[i - 1]
        if (!canvas) continue

        const aspect = pageAspects[i - 1]
        if (!aspect) continue

        // Use actual rendered canvas size (canvas fills its parent via position:absolute)
        const displayWidth = canvas.parentElement?.clientWidth || 800
        const displayHeight = Math.round(displayWidth * aspect.height / aspect.width)
        const dpr = window.devicePixelRatio || 1

        canvas.width = Math.round(displayWidth * dpr)
        canvas.height = Math.round(displayHeight * dpr)
        // CSS size is set via style to fill the parent (100%/100%)

        const page = await pdfDoc.getPage(i)
        const scale = (displayWidth / aspect.width) * dpr
        const viewport = page.getViewport({ scale })
        const ctx = canvas.getContext('2d')
        const task = page.render({ canvasContext: ctx, viewport })
        renderTasksRef.current.push(task)
        try { await task.promise }
        catch (e) { if (e?.name !== 'RenderingCancelledException') throw e }
      }
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        toast({ title: 'Render-Fehler', description: 'Seiten konnten nicht gerendert werden.', variant: 'destructive' })
      }
    } finally {
      setPageRendering(false)
    }
  }

  // ── Global mouse events for drawing ───────────────────────────────────────
  useEffect(() => {
    if (!drawing) return

    const getOverlayRect = (pageIdx) => {
      const overlay = document.querySelector(`[data-page-overlay="${pageIdx}"]`)
      return overlay ? overlay.getBoundingClientRect() : null
    }

    const getCoords = (clientX, clientY, pageIdx) => {
      const rect = getOverlayRect(pageIdx)
      if (!rect) return null
      return {
        x: Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)),
        y: Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)),
      }
    }

    const onMouseMove = (e) => {
      const coords = getCoords(e.clientX, e.clientY, drawing.pageIdx)
      if (!coords) return
      setDrawing(prev => prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null)
    }

    const onMouseUp = (e) => {
      if (!drawing) return

      const coords = getCoords(e.clientX, e.clientY, drawing.pageIdx)
      const endX = coords?.x ?? drawing.currentX
      const endY = coords?.y ?? drawing.currentY

      const fx = Math.min(drawing.startX, endX)
      const fy = Math.min(drawing.startY, endY)
      const fw = Math.abs(endX - drawing.startX)
      const fh = Math.abs(endY - drawing.startY)

      if (placingOptionFor) {
        // Assign position to an option
        const { fieldId, optionId } = placingOptionFor
        setFields(prev => prev.map(f => {
          if (f.id !== fieldId) return f
          return {
            ...f,
            options: (f.options || []).map(opt => {
              if (opt.id !== optionId) return opt
              return {
                ...opt,
                page: drawing.pageIdx + 1,
                x: fx, y: fy,
                width: Math.max(fw, 2),
                height: Math.max(fh, 1.5),
              }
            }),
          }
        }))
        setPlacingOptionFor(null)
      } else if (activeTool) {
        // Place a new field
        if (fw < 1 || fh < 0.5) {
          // Click → default sizes
          const dw = activeTool === 'signature' ? 30 : activeTool === 'checkbox' ? 25 : 20
          const dh = activeTool === 'signature' ? 8 : activeTool === 'checkbox' ? 18 : 4
          placeField(activeTool, drawing.pageIdx + 1,
            Math.min(drawing.startX, 100 - dw),
            Math.min(drawing.startY, 100 - dh),
            dw, dh)
        } else {
          placeField(activeTool, drawing.pageIdx + 1, fx, fy, fw, fh)
        }
        setActiveTool(null)
      }

      setDrawing(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [drawing, activeTool, placingOptionFor])

  // ── Field helpers ──────────────────────────────────────────────────────────
  const placeField = useCallback((type, page, x, y, width, height) => {
    const newField = {
      id: crypto.randomUUID(),
      type, page, x, y, width, height,
      label: '',
      required: false,
      prefillKey: '',
      ...(type === 'checkbox' ? { options: [], multiple: false } : {}),
    }
    setFields(prev => [...prev, newField])
    setSelectedFieldId(newField.id)
    setNewlyPlacedFieldId(newField.id)

    // Scroll sidebar to properties section
    setTimeout(() => {
      propertiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)

    return newField
  }, [])

  const updateField = (updated) => setFields(prev => prev.map(f => f.id === updated.id ? updated : f))
  const deleteField = (id) => { setFields(prev => prev.filter(f => f.id !== id)); if (selectedFieldId === id) setSelectedFieldId(null) }
  const selectedField = fields.find(f => f.id === selectedFieldId) || null

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/dokumente/save-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ templateId, fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen')
      toast({ title: 'Gespeichert', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler beim Speichern', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const scrollToPage = (page) => {
    setCurrentPage(page)
    const overlay = document.querySelector(`[data-page-overlay="${page - 1}"]`)
    overlay?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isDrawingMode = !!activeTool || !!placingOptionFor
  const cursor = isDrawingMode ? 'crosshair' : 'default'

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-gray-500">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm font-medium">{loadError}</p>
        <Button variant="outline" onClick={() => navigate('/admin/mediathek')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Zurück zur Mediathek
        </Button>
      </div>
    )
  }

  const isLoading = !template || pdfLoading

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/admin/mediathek')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold text-gray-900 text-sm truncate">{template?.name || 'Lade...'}</h1>
            <p className="text-xs text-gray-400 truncate">{template?.file_name || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {numPages > 1 && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden text-sm">
              <button onClick={() => scrollToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}
                className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs text-gray-600 whitespace-nowrap">{currentPage} / {numPages}</span>
              <button onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))} disabled={currentPage >= numPages}
                className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || isLoading} className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Speichern...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Speichern</>}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── PDF canvas area ── */}
        <div className="flex-1 overflow-y-auto bg-gray-200 relative" id="pdf-scroll-container">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-3 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm">PDF wird geladen...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-8 py-4 px-4" ref={canvasContainerRef}>
              {pageAspects.map((aspect, idx) => (
                <div key={idx} className="flex flex-col items-stretch">
                  {/* Aspect-ratio container — fills available width, height follows aspect */}
                  <div
                    className="relative shadow-lg w-full"
                    style={{ paddingBottom: `${(aspect.height / aspect.width) * 100}%` }}
                  >
                    {/* Canvas absolutely fills the padded container */}
                    <canvas
                      ref={el => { canvasRefs.current[idx] = el }}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    />

                    {/* Interaction overlay */}
                    <div
                      data-page-overlay={idx}
                      style={{ position: 'absolute', inset: 0, cursor }}
                      onMouseDown={e => {
                        if (!isDrawingMode) return
                        e.preventDefault()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = (e.clientX - rect.left) / rect.width * 100
                        const y = (e.clientY - rect.top) / rect.height * 100
                        setDrawing({ startX: x, startY: y, currentX: x, currentY: y, pageIdx: idx })
                      }}
                      onClick={e => {
                        if (isDrawingMode) return
                        if (e.target === e.currentTarget) setSelectedFieldId(null)
                      }}
                    >
                      {/* Rubber band preview */}
                      {drawing && drawing.pageIdx === idx && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${Math.min(drawing.startX, drawing.currentX)}%`,
                            top: `${Math.min(drawing.startY, drawing.currentY)}%`,
                            width: `${Math.abs(drawing.currentX - drawing.startX)}%`,
                            height: `${Math.abs(drawing.currentY - drawing.startY)}%`,
                            pointerEvents: 'none',
                          }}
                          className={`border-2 border-dashed rounded ${
                            placingOptionFor ? 'border-orange-500 bg-orange-500/10' : 'border-[#1a3a5c] bg-[#1a3a5c]/10'
                          }`}
                        />
                      )}

                      {/* Non-checkbox fields on this page */}
                      {fields
                        .filter(f => f.page === idx + 1 && f.type !== 'checkbox')
                        .map(field => (
                          <FieldOverlay
                            key={field.id}
                            field={field}
                            isSelected={selectedFieldId === field.id}
                            onClick={setSelectedFieldId}
                            onDelete={deleteField}
                          />
                        ))}

                      {/* Checkbox group bounding boxes on this page */}
                      {fields
                        .filter(f => f.page === idx + 1 && f.type === 'checkbox')
                        .map(field => (
                          <FieldOverlay
                            key={field.id}
                            field={field}
                            isSelected={selectedFieldId === field.id}
                            onClick={setSelectedFieldId}
                            onDelete={deleteField}
                          />
                        ))}

                      {/* Checkbox option markers positioned on this page */}
                      {fields
                        .filter(f => f.type === 'checkbox')
                        .flatMap(field =>
                          (field.options || [])
                            .filter(opt => opt.page === idx + 1 && opt.x !== undefined)
                            .map(opt => (
                              <OptionMarker
                                key={opt.id}
                                option={opt}
                                field={field}
                                isGroupSelected={selectedFieldId === field.id}
                                onClick={setSelectedFieldId}
                              />
                            ))
                        )}
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">Seite {idx + 1}</p>
                </div>
              ))}

              {pageRendering && (
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center pointer-events-none">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1a3a5c]" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-[280px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 p-4 space-y-4">

            {/* Option placement mode banner */}
            {placingOptionFor && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  Option positionieren
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Zeichne jetzt die Position für: <strong>{placingOptionFor.label || 'Option'}</strong>
                </p>
                <button
                  onClick={() => setPlacingOptionFor(null)}
                  className="mt-1.5 text-[10px] text-orange-500 hover:text-orange-700 underline"
                >
                  Abbrechen
                </button>
              </div>
            )}

            {/* Tool selector */}
            {!placingOptionFor && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Werkzeug</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIELD_TYPES.map(t => {
                    const Icon = t.icon
                    const isActive = activeTool === t.key
                    return (
                      <button
                        key={t.key}
                        onClick={() => setActiveTool(isActive ? null : t.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                          isActive ? `${t.bg} ${t.border} ${t.text}` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />{t.label}
                      </button>
                    )
                  })}
                </div>
                {activeTool && (
                  <p className="text-xs text-[#0d9488] mt-2 font-medium">
                    Klicke oder ziehe auf dem PDF
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Field properties */}
            <div ref={propertiesSectionRef}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Eigenschaften</p>
              <FieldProperties
                field={selectedField}
                onChange={updateField}
                onDelete={deleteField}
                autoFocusLabel={newlyPlacedFieldId === selectedFieldId && !!newlyPlacedFieldId}
                onPlaceOption={(fieldId, optionId, label) => {
                  setPlacingOptionFor({ fieldId, optionId, label })
                  setActiveTool(null)
                }}
              />
            </div>

            <Separator />

            {/* Field list */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Felder ({fields.length})
              </p>
              {fields.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Noch keine Felder platziert</p>
              ) : (
                <ul className="space-y-1">
                  {fields.map((f, idx) => {
                    const cfg = getFieldCfg(f.type)
                    const Icon = cfg.icon
                    const isSelected = selectedFieldId === f.id
                    const optCount = f.type === 'checkbox' ? (f.options || []).length : 0
                    const posCount = f.type === 'checkbox' ? (f.options || []).filter(o => o.x !== undefined).length : 0
                    return (
                      <li key={f.id}>
                        <button
                          onClick={() => {
                            setSelectedFieldId(f.id)
                            setNewlyPlacedFieldId(null)
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all text-left ${
                            isSelected ? `${cfg.bg} ${cfg.border} border` : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <span className="text-xs text-gray-400 w-4 shrink-0 text-right">{idx + 1}</span>
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.text}`} />
                          <span className="flex-1 truncate text-gray-700 text-xs">
                            {f.label || <span className="text-gray-400 italic">{cfg.label}</span>}
                          </span>
                          {f.type === 'checkbox' && optCount > 0 && (
                            <span className="text-[9px] text-gray-400 shrink-0">{posCount}/{optCount}</span>
                          )}
                          <span className="text-[10px] text-gray-400 shrink-0">S.{f.page}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="p-4 border-t border-gray-200 shrink-0">
            <Button onClick={handleSave} disabled={saving || isLoading} className="w-full bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Speichern...</> : <><Save className="h-4 w-4 mr-2" />Speichern</>}
            </Button>
            <p className="text-xs text-gray-400 text-center mt-2">{fields.length} Feld{fields.length !== 1 ? 'er' : ''} definiert</p>
          </div>
        </div>
      </div>
    </div>
  )
}
