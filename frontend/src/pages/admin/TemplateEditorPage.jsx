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
  Type,
  CheckSquare,
  PenLine,
  Calendar,
  Fingerprint,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Plus,
} from 'lucide-react'

// ─── pdf.js worker ───────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function getFieldCfg(type) {
  return FIELD_TYPE_MAP[type] || FIELD_TYPES[0]
}

// ─── FieldOverlay ──────────────────────────────────────────────────────────────

function FieldOverlay({ field, isSelected, onClick, onDelete }) {
  const cfg = getFieldCfg(field.type)
  const Icon = cfg.icon

  const style = {
    left:   `${field.x}%`,
    top:    `${field.y}%`,
    width:  `${field.width}%`,
    height: `${field.height}%`,
  }

  const isCheckbox = field.type === 'checkbox'

  return (
    <div
      style={style}
      onClick={(e) => { e.stopPropagation(); onClick(field.id) }}
      className={`absolute cursor-pointer border-2 rounded overflow-hidden select-none transition-all ${cfg.border} ${cfg.bg} ${cfg.text} ${isSelected ? `ring-2 ${cfg.ring} ring-offset-1` : 'opacity-80 hover:opacity-100'}`}
    >
      {isCheckbox ? (
        /* Checkbox group: show group name + options list */
        <div className="w-full h-full flex flex-col p-1">
          <div className="flex items-center gap-1 shrink-0">
            <Icon className="h-2.5 w-2.5 shrink-0 opacity-60" />
            <span className="text-[9px] font-semibold truncate leading-none">
              {field.label || 'Gruppe'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden mt-0.5 space-y-0.5">
            {(field.options || []).slice(0, 5).map(opt => (
              <div key={opt.id} className="flex items-center gap-1">
                <div className={`w-2 h-2 border rounded-sm shrink-0 ${field.multiple ? '' : 'rounded-full'} ${cfg.border}`} />
                <span className="text-[8px] truncate leading-none">{opt.label}</span>
              </div>
            ))}
            {(field.options?.length || 0) > 5 && (
              <span className="text-[7px] opacity-60">+{field.options.length - 5} weitere</span>
            )}
            {(!field.options || field.options.length === 0) && (
              <span className="text-[8px] opacity-50 italic">Keine Optionen</span>
            )}
          </div>
        </div>
      ) : (
        /* Normal field: icon + label centered */
        <div className="w-full h-full flex items-center justify-center gap-1 px-1">
          <Icon className="h-3 w-3 shrink-0 opacity-60" />
          {field.label && (
            <span className="text-[10px] font-medium truncate leading-none max-w-[80%]">{field.label}</span>
          )}
        </div>
      )}

      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-10"
          title="Feld löschen"
        >
          <span className="text-[10px] font-bold leading-none">×</span>
        </button>
      )}
    </div>
  )
}

// ─── FieldProperties ──────────────────────────────────────────────────────────

function FieldProperties({ field, onChange, onDelete, autoFocusLabel }) {
  const labelInputRef = useRef(null)

  useEffect(() => {
    if (autoFocusLabel && labelInputRef.current) {
      setTimeout(() => labelInputRef.current?.focus(), 60)
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

      {/* Label / Group name */}
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
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              field.required ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Checkbox-specific: options + mode */}
      {field.type === 'checkbox' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Auswahlmodus</Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ ...field, multiple: false })}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  !field.multiple
                    ? 'bg-orange-50 border-orange-400 text-orange-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Einfachauswahl
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...field, multiple: true })}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  field.multiple
                    ? 'bg-orange-50 border-orange-400 text-orange-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Mehrfachauswahl
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Optionen</Label>
            <ul className="space-y-1">
              {(field.options || []).map((opt) => (
                <li key={opt.id} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 border border-gray-300 shrink-0 ${field.multiple ? 'rounded-sm' : 'rounded-full'}`} />
                  <Input
                    value={opt.label}
                    onChange={e => onChange({
                      ...field,
                      options: field.options.map(o =>
                        o.id === opt.id ? { ...o, label: e.target.value } : o
                      ),
                    })}
                    placeholder="Option..."
                    className="h-7 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...field,
                      options: field.options.filter(o => o.id !== opt.id),
                    })}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onChange({
                ...field,
                options: [...(field.options || []), { id: crypto.randomUUID(), label: '' }],
              })}
              className="w-full text-xs text-[#0d9488] border border-dashed border-[#0d9488]/40 rounded-lg py-1.5 hover:bg-[#0d9488]/5 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Option hinzufügen
            </button>
          </div>
        </>
      )}

      {/* Prefill (not for checkbox) */}
      {field.type !== 'checkbox' && (
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
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        Feld löschen
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()

  // Template & fields
  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])
  const [pdfUrl, setPdfUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // PDF rendering
  const [pdfDoc, setPdfDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pageRendering, setPageRendering] = useState(false)
  const [pageCanvasData, setPageCanvasData] = useState([]) // [{width, height}] per page

  // Canvas & overlay refs
  const canvasContainerRef = useRef(null)
  const canvasRefs = useRef([])
  const renderTasksRef = useRef([])

  // Interaction
  const [activeTool, setActiveTool] = useState(null)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [newlyPlacedFieldId, setNewlyPlacedFieldId] = useState(null)
  const [drawing, setDrawing] = useState(null)

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
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
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

      const dims = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 1.5 })
        dims.push({ width: Math.floor(vp.width), height: Math.floor(vp.height) })
      }
      setPageCanvasData(dims)
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        toast({ title: 'PDF-Fehler', description: 'Das PDF konnte nicht geladen werden.', variant: 'destructive' })
      }
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Render pages ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || pageCanvasData.length === 0) return
    renderAllPages()
  }, [pdfDoc, pageCanvasData])

  const renderAllPages = async () => {
    if (!pdfDoc) return
    setPageRendering(true)
    renderTasksRef.current.forEach(t => t.cancel?.())
    renderTasksRef.current = []

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const canvas = canvasRefs.current[i - 1]
        if (!canvas) continue
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')
        const task = page.render({ canvasContext: ctx, viewport })
        renderTasksRef.current.push(task)
        try {
          await task.promise
        } catch (e) {
          if (e?.name !== 'RenderingCancelledException') throw e
        }
      }
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        toast({ title: 'Render-Fehler', description: 'Seiten konnten nicht gerendert werden.', variant: 'destructive' })
      }
    } finally {
      setPageRendering(false)
    }
  }

  // ── Field placement helper ─────────────────────────────────────────────────
  const placeField = useCallback((type, page, x, y, width, height) => {
    const newField = {
      id: crypto.randomUUID(),
      type,
      page,
      x, y, width, height,
      label: '',
      required: false,
      prefillKey: '',
      // checkbox-specific
      options: type === 'checkbox' ? [] : undefined,
      multiple: type === 'checkbox' ? false : undefined,
    }
    setFields(prev => [...prev, newField])
    setSelectedFieldId(newField.id)
    setNewlyPlacedFieldId(newField.id)
    setActiveTool(null)
    return newField
  }, [])

  // ── Field operations ───────────────────────────────────────────────────────
  const updateField = (updated) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f))
  }

  const deleteField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id))
    if (selectedFieldId === id) setSelectedFieldId(null)
  }

  const selectedField = fields.find(f => f.id === selectedFieldId) || null

  // Clear newlyPlacedFieldId once label is focused/user has had a chance to enter it
  const handleLabelInteracted = () => setNewlyPlacedFieldId(null)

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/dokumente/save-fields', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({ templateId, fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen')
      toast({ title: 'Gespeichert', description: 'Felder wurden erfolgreich gespeichert.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler beim Speichern', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Page navigation ────────────────────────────────────────────────────────
  const scrollToPage = (page) => {
    setCurrentPage(page)
    canvasRefs.current[page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-gray-500">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm font-medium">{loadError}</p>
        <Button variant="outline" onClick={() => navigate('/admin/mediathek')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Mediathek
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
          <button
            onClick={() => navigate('/admin/mediathek')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold text-gray-900 text-sm truncate">
              {template?.name || 'Lade...'}
            </h1>
            <p className="text-xs text-gray-400 truncate">{template?.file_name || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {numPages > 1 && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden text-sm">
              <button
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs text-gray-600 whitespace-nowrap">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || isLoading}
            className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
          >
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Speichern...</>
              : <><Save className="h-3.5 w-3.5 mr-1.5" />Speichern</>
            }
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── PDF + overlay ── */}
        <div className="flex-1 overflow-y-auto bg-gray-200 relative" id="pdf-scroll-container">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-3 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">PDF wird geladen...</span>
            </div>
          ) : (
            <div className="relative inline-block min-w-full" ref={canvasContainerRef}>
              <div className="flex flex-col items-center gap-8 py-4 px-4">
                {pageCanvasData.map((dim, idx) => (
                  <div key={idx} className="relative shadow-lg mb-6" style={{ width: dim.width, height: dim.height }}>
                    <canvas
                      ref={el => { canvasRefs.current[idx] = el }}
                      style={{ display: 'block', width: dim.width, height: dim.height }}
                    />
                    {/* Page label */}
                    <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-400">
                      Seite {idx + 1}
                    </div>
                    {/* Per-page overlay */}
                    <div
                      style={{ position: 'absolute', inset: 0, cursor: activeTool ? 'crosshair' : 'default' }}
                      onMouseDown={e => {
                        if (!activeTool) return
                        e.preventDefault()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = ((e.clientX - rect.left) / rect.width) * 100
                        const y = ((e.clientY - rect.top) / rect.height) * 100
                        setDrawing({ startX: x, startY: y, currentX: x, currentY: y, page: idx + 1 })
                      }}
                      onMouseMove={e => {
                        if (!drawing || drawing.page !== idx + 1) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = ((e.clientX - rect.left) / rect.width) * 100
                        const y = ((e.clientY - rect.top) / rect.height) * 100
                        setDrawing(prev => ({ ...prev, currentX: x, currentY: y }))
                      }}
                      onMouseUp={e => {
                        if (!drawing || drawing.page !== idx + 1 || !activeTool) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        const posX = ((e.clientX - rect.left) / rect.width) * 100
                        const posY = ((e.clientY - rect.top) / rect.height) * 100

                        const fx = Math.min(drawing.startX, posX)
                        const fy = Math.min(drawing.startY, posY)
                        const fw = Math.abs(posX - drawing.startX)
                        const fh = Math.abs(posY - drawing.startY)

                        if (fw < 2 || fh < 2) {
                          // Click → default sizes
                          const dw = activeTool === 'checkbox' ? 20 : activeTool === 'signature' ? 25 : 18
                          const dh = activeTool === 'checkbox' ? 12 : activeTool === 'signature' ? 7 : 3.5
                          placeField(
                            activeTool, idx + 1,
                            Math.min(drawing.startX, 100 - dw),
                            Math.min(drawing.startY, 100 - dh),
                            dw, dh
                          )
                        } else {
                          placeField(activeTool, idx + 1, fx, fy, fw, fh)
                        }

                        setDrawing(null)
                        setCurrentPage(idx + 1)
                      }}
                      onClick={e => {
                        if (activeTool) return
                        if (e.target === e.currentTarget) setSelectedFieldId(null)
                      }}
                    >
                      {/* Rubber band */}
                      {drawing && drawing.page === idx + 1 && drawing.currentX !== undefined && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${Math.min(drawing.startX, drawing.currentX)}%`,
                            top: `${Math.min(drawing.startY, drawing.currentY)}%`,
                            width: `${Math.abs(drawing.currentX - drawing.startX)}%`,
                            height: `${Math.abs(drawing.currentY - drawing.startY)}%`,
                            pointerEvents: 'none',
                          }}
                          className="border-2 border-dashed border-[#1a3a5c] bg-[#1a3a5c]/10 rounded"
                        />
                      )}

                      {/* Fields on this page */}
                      {fields
                        .filter(f => f.page === idx + 1)
                        .map(field => (
                          <FieldOverlay
                            key={field.id}
                            field={field}
                            isSelected={selectedFieldId === field.id}
                            onClick={setSelectedFieldId}
                            onDelete={deleteField}
                          />
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>

              {pageRendering && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center pointer-events-none">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1a3a5c]" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-[280px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 p-4 space-y-5">

            {/* Tool selector */}
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
                      title={t.label}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                        isActive
                          ? `${t.bg} ${t.border} ${t.text}`
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {t.label}
                    </button>
                  )
                })}
              </div>
              {activeTool && (
                <p className="text-xs text-[#0d9488] mt-2 font-medium">
                  Klicke oder ziehe auf dem PDF, um ein Feld zu platzieren
                </p>
              )}
            </div>

            <Separator />

            {/* Field properties */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Eigenschaften</p>
              <FieldProperties
                field={selectedField}
                onChange={updateField}
                onDelete={deleteField}
                autoFocusLabel={newlyPlacedFieldId === selectedFieldId && !!newlyPlacedFieldId}
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
                    return (
                      <li key={f.id}>
                        <button
                          onClick={() => setSelectedFieldId(f.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all text-left ${
                            isSelected
                              ? `${cfg.bg} ${cfg.border} border`
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <span className="text-xs text-gray-400 w-4 shrink-0 text-right">{idx + 1}</span>
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.text}`} />
                          <span className="flex-1 truncate text-gray-700 text-xs">
                            {f.label || <span className="text-gray-400 italic">{cfg.label}</span>}
                          </span>
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
            <Button
              onClick={handleSave}
              disabled={saving || isLoading}
              className="w-full bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Speichern...</>
                : <><Save className="h-4 w-4 mr-2" />Speichern</>
              }
            </Button>
            <p className="text-xs text-gray-400 text-center mt-2">
              {fields.length} Feld{fields.length !== 1 ? 'er' : ''} definiert
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
