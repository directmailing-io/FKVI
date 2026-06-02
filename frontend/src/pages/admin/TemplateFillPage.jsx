import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Save, Loader2, PenLine, X, FileText, Type, AlignLeft, CheckCircle2, Zap } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

const ROLES = [
  { value: 'fachkraft',   label: 'Fachkraft',   color: '#3b82f6', bg: '#eff6ff' },
  { value: 'unternehmen', label: 'Unternehmen', color: '#10b981', bg: '#f0fdf4' },
  { value: 'fkvi',        label: 'FKVI',         color: '#8b5cf6', bg: '#f5f3ff' },
]
const getRole = (v) => ROLES.find(r => r.value === v) || ROLES[2]

const TYPE_META = {
  text:      { Icon: Type,      color: '#3b82f6' },
  multiline: { Icon: AlignLeft, color: '#8b5cf6' },
  signature: { Icon: PenLine,   color: '#f59e0b' },
}

// ── Signature Modal ───────────────────────────────────────────────────────────

function SignatureModal({ onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches?.[0] || e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1e293b'
    ctx.lineTo(pos.x, pos.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
    setHasStrokes(true)
  }

  const endDraw = (e) => { e?.preventDefault(); setDrawing(false) }

  const clear = () => {
    canvasRef.current.getContext('2d').clearRect(0, 0, 456, 180)
    setHasStrokes(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[500px] space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">Unterschrift</p>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="relative rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50">
          <canvas
            ref={canvasRef} width={456} height={180}
            style={{ display: 'block', touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-300 text-sm">Hier unterschreiben</p>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300 mx-8 mb-8" />
        </div>
        <div className="flex gap-2">
          <button onClick={clear} className="flex-1 py-2.5 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">Löschen</button>
          <button onClick={() => onConfirm(canvasRef.current.toDataURL('image/png'))} disabled={!hasStrokes} className="flex-1 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-40">OK</button>
        </div>
      </div>
    </div>
  )
}

// ── AutoScaleText ─────────────────────────────────────────────────────────────

function AutoScaleText({ value, multiline, style }) {
  const containerRef = useRef(null)
  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    if (!containerRef.current || !value) return
    const el = containerRef.current
    const maxW = el.clientWidth - 4
    const maxH = el.clientHeight - 4
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!multiline) {
      let fs = 16
      while (fs > 5) { ctx.font = `${fs}px system-ui`; if (ctx.measureText(value).width <= maxW) break; fs -= 0.5 }
      setFontSize(fs)
    } else {
      let fs = 14
      while (fs > 5) {
        ctx.font = `${fs}px system-ui`
        const lh = fs * 1.35; const words = value.split(' '); let lines = 1, lw = 0
        for (const w of words) { const ww = ctx.measureText(w + ' ').width; if (lw + ww > maxW) { lines++; lw = ww } else lw += ww }
        if (lines * lh <= maxH) break
        fs -= 0.5
      }
      setFontSize(fs)
    }
  }, [value, multiline])

  return (
    <div ref={containerRef} style={{ ...style, fontSize, lineHeight: multiline ? 1.35 : 1, wordBreak: multiline ? 'break-word' : 'normal', whiteSpace: multiline ? 'pre-wrap' : 'nowrap', overflow: 'hidden', display: 'flex', alignItems: multiline ? 'flex-start' : 'center' }}>
      {value}
    </div>
  )
}

// ── Main Fill Page ────────────────────────────────────────────────────────────

export default function TemplateFillPage() {
  const { id, role: roleParam } = useParams()
  const role = roleParam || 'fkvi'
  const roleInfo = getRole(role)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const entityKey = searchParams.get('entity') || ''   // e.g. 'profile-abc123'
  const entityName = searchParams.get('ename') || ''   // e.g. 'Max Mustermann'
  const { session } = useAuthStore()
  const token = session?.access_token

  const entityParam = entityKey ? `&entity=${encodeURIComponent(entityKey)}` : ''

  const [template, setTemplate] = useState(null)
  const [fields, setFields] = useState([])
  const [values, setValues] = useState({})       // current role's text values
  const [signatures, setSignatures] = useState({}) // current role's signature dataURLs
  const [allValues, setAllValues] = useState({ fachkraft: {}, unternehmen: {}, fkvi: {} })
  const [numPages, setNumPages] = useState(0)
  const [pdfState, setPdfState] = useState('loading')
  const [saving, setSaving] = useState(false)
  const [sigModal, setSigModal] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [entityAutoFillData, setEntityAutoFillData] = useState(null)

  const canvasRefs = useRef([])
  const pdfDocRef = useRef(null)   // display PDF (current.pdf if available)
  const origPdfRef = useRef(null)  // original PDF (always), used for save
  const authHeaders = { Authorization: `Bearer ${token}` }

  // Load template + fields
  useEffect(() => {
    fetch(`/api/admin/mediathek/get?id=${id}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.template) { setTemplate(d.template); setFields(d.template.fields || []) }
      })
  }, [id])

  // Load existing filled values (+ auto-fill from entity data)
  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const [fillRes, entityRes] = await Promise.all([
          fetch(`/api/admin/mediathek/fill-values?id=${id}${entityParam}`, { headers: authHeaders }).then(r => r.json()),
          entityKey ? fetch(`/api/admin/mediathek/entity-data?entity=${encodeURIComponent(entityKey)}`, { headers: authHeaders }).then(r => r.json()).catch(() => ({})) : Promise.resolve({}),
        ])
        if (!fillRes.values) return
        setAllValues(fillRes.values)
        const submitted = Array.isArray(fillRes.values._submitted) ? fillRes.values._submitted : []
        setIsSubmitted(submitted.includes(role))
        const roleData = fillRes.values[role] || {}
        const initVals = {}, initSigs = {}
        for (const [fid, val] of Object.entries(roleData)) {
          if (typeof val === 'string' && val.startsWith('data:image')) initSigs[fid] = val
          else initVals[fid] = val
        }
        // Apply auto-fill from entity profile for unfilled fields
        // (fields will be available once template loads, so we wait for it below)
        if (entityRes?.data) {
          // Store entity data so we can apply after fields load
          setEntityAutoFillData(entityRes.data)
        }
        setValues(initVals)
        setSignatures(initSigs)
      } catch (_) {}
    }
    load()
  }, [id, role, token])

  // Apply entity auto-fill once both fields and entity data are loaded
  useEffect(() => {
    if (!entityAutoFillData || fields.length === 0) return
    setValues(prev => {
      const updated = { ...prev }
      for (const field of fields) {
        if ((field.role || 'fkvi') === role && field.autoFill && field.type !== 'signature') {
          // Only apply if not already filled
          if (!updated[field.id]) {
            const val = entityAutoFillData[field.autoFill]
            if (val != null && val !== '') updated[field.id] = String(val)
          }
        }
      }
      return updated
    })
  }, [entityAutoFillData, fields, role])

  // Load + render display PDF (current.pdf if available, else original)
  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        const pdfOpts = {
          password: '',
          onPassword: (cb) => cb(''),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        }

        // Load original in background for save operation
        fetch(`/api/admin/mediathek/pdf?id=${id}&original=1`, { headers: authHeaders })
          .then(r => r.arrayBuffer())
          .then(async buf => {
            if (cancelled) return
            const pdf = await pdfjsLib.getDocument({ data: buf, ...pdfOpts }).promise
            origPdfRef.current = pdf
          })
          .catch(() => {})

        // Load display PDF (shows entity-specific current.pdf if available, else original)
        const response = await fetch(`/api/admin/mediathek/pdf?id=${id}${entityParam}&t=${Date.now()}`, { headers: authHeaders })
        const buf = await response.arrayBuffer()
        if (cancelled) return

        const pdf = await pdfjsLib.getDocument({ data: buf.slice(0), ...pdfOpts }).promise
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

  // Render pages
  useEffect(() => {
    if (pdfState !== 'rendering' || !pdfDocRef.current) return
    let cancelled = false
    const renderAll = async () => {
      const pdf = pdfDocRef.current
      const maxWidth = Math.min(window.innerWidth * 0.55, 780)
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) break
        const page = await pdf.getPage(i)
        const canvas = canvasRefs.current[i - 1]
        if (!canvas) continue
        const vp = page.getViewport({ scale: 1 })
        const scale = maxWidth / vp.width
        const scaled = page.getViewport({ scale })
        canvas.width = scaled.width; canvas.height = scaled.height
        canvas.style.width = `${scaled.width}px`; canvas.style.height = `${scaled.height}px`
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise
      }
      if (!cancelled) setPdfState('done')
    }
    renderAll()
    return () => { cancelled = true }
  }, [pdfState, numPages])

  const myFields = fields.filter(f => (f.role || 'fkvi') === role)
  const otherFields = fields.filter(f => (f.role || 'fkvi') !== role)

  const handleSave = async () => {
    if (!pdfDocRef.current || pdfState !== 'done') return
    setSaving(true)
    try {
      // 1. Merge current role values + signatures
      const roleValues = {
        ...values,
        ...Object.fromEntries(Object.entries(signatures).map(([k, v]) => [k, v]))
      }

      // 2. Save to fill-values API
      const saveRes = await fetch(`/api/admin/mediathek/fill-values?id=${id}${entityParam}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, values: roleValues }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error)
      const updatedAllValues = saveData.values

      // 3. Generate combined PDF
      // Use pdfDocRef (current.pdf with all previous fills) as bitmap base,
      // then draw only THIS role's new fields on top. This preserves previously
      // baked content from other roles even if their fill-values are empty.
      const pdf = pdfDocRef.current
      const newDoc = await PDFDocument.create()
      const helvetica = await newDoc.embedFont(StandardFonts.Helvetica)

      for (let i = 0; i < numPages; i++) {
        const page = await pdf.getPage(i + 1)
        const vp = page.getViewport({ scale: 1 })
        const pw = vp.width, ph = vp.height

        // Render page at 2x quality (includes all previously baked fills)
        const offCanvas = document.createElement('canvas')
        const scaledVp = page.getViewport({ scale: 2 })
        offCanvas.width = scaledVp.width; offCanvas.height = scaledVp.height
        await page.render({ canvasContext: offCanvas.getContext('2d'), viewport: scaledVp }).promise

        const pngBytes = Uint8Array.from(atob(offCanvas.toDataURL('image/png').split(',')[1]), c => c.charCodeAt(0))
        const pageImg = await newDoc.embedPng(pngBytes)
        const newPage = newDoc.addPage([pw, ph])
        newPage.drawImage(pageImg, { x: 0, y: 0, width: pw, height: ph })

        // Draw only THIS role's fields on top (others already baked into bitmap)
        for (const field of fields.filter(f => f.page === i && (f.role || 'fkvi') === role)) {
          const fieldValue = updatedAllValues[role]?.[field.id]
          if (!fieldValue) continue

          const fx = (field.x / 100) * pw
          const fh = (field.height / 100) * ph
          const fy = ph - ((field.y / 100) * ph) - fh
          const fw = (field.width / 100) * pw
          const padding = 3

          if (field.type === 'signature') {
            try {
              const sigBytes = Uint8Array.from(atob(fieldValue.split(',')[1]), c => c.charCodeAt(0))
              const sigImg = await newDoc.embedPng(sigBytes)
              newPage.drawImage(sigImg, { x: fx, y: fy, width: fw, height: fh })
            } catch (_) {}
          } else {
            if (field.type !== 'multiline') {
              let fs = 14
              while (fs > 4 && helvetica.widthOfTextAtSize(fieldValue, fs) > fw - padding * 2) fs -= 0.5
              const textH = helvetica.heightAtSize(fs)
              newPage.drawText(fieldValue, { x: fx + padding, y: fy + (fh - textH) / 2 + 1, size: fs, font: helvetica, color: rgb(0, 0, 0), maxWidth: fw - padding * 2 })
            } else {
              let fs = 12
              const lh = (s) => s * 1.35
              const wrap = (text, s) => {
                const words = text.split(' '); const lines = []; let line = ''
                for (const w of words) {
                  const test = line ? `${line} ${w}` : w
                  if (helvetica.widthOfTextAtSize(test, s) <= fw - padding * 2) line = test
                  else { if (line) lines.push(line); line = w }
                }
                if (line) lines.push(line); return lines
              }
              while (fs > 4 && wrap(fieldValue, fs).length * lh(fs) > fh - padding * 2) fs -= 0.5
              const lines = wrap(fieldValue, fs)
              const startY = fy + fh - padding - fs
              lines.forEach((l, idx) => {
                newPage.drawText(l, { x: fx + padding, y: startY - idx * lh(fs), size: fs, font: helvetica, color: rgb(0, 0, 0) })
              })
            }
          }
        }
      }

      // 4. Upload combined PDF directly to Supabase via signed URL
      //    (avoids Vercel's ~1MB body size limit for large PDFs)
      const filledBytes = await newDoc.save()

      const urlRes = await fetch(`/api/admin/mediathek/fill-url`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: id, entity: entityKey || undefined }),
      })
      const urlData = await urlRes.json().catch(() => ({}))
      if (!urlRes.ok) throw new Error(urlData.error || 'Upload-URL konnte nicht erstellt werden')
      if (!urlData.uploadUrl) throw new Error('Keine Upload-URL erhalten')

      const pdfBlob = new Blob([filledBytes], { type: 'application/pdf' })
      const uploadRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfBlob,
      })
      if (!uploadRes.ok) throw new Error('Upload fehlgeschlagen')

      toast({ title: 'Gespeichert', description: `${roleInfo.label}-Felder gespeichert. Vorschau wird aktualisiert…` })
      // Small delay to allow storage CDN to propagate before showing preview
      await new Promise(r => setTimeout(r, 1500))
      navigate(`/admin/mediathek/${id}?updated=${Date.now()}`)

    } catch (err) {
      console.error(err)
      toast({ title: 'Fehler beim Speichern', description: err.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top bar */}
      <div className="flex-none sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/admin/mediathek/${id}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />Zurück
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-sm text-gray-900 flex-1 truncate">{template?.name || '…'}</span>
          {/* Role / entity badge */}
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: roleInfo.bg, color: roleInfo.color }}>
            {entityName ? `${entityName}` : roleInfo.label}
          </span>
          {entityName && (
            <span className="text-xs text-gray-400">{roleInfo.label}</span>
          )}
          {isSubmitted ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50">
              <CheckCircle2 className="w-4 h-4" />Erledigt
            </span>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || pdfState !== 'done'}
              className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: roleInfo.color }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* Left: PDF + overlays */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-8 py-8">
          {pdfState === 'loading' && (
            <div className="flex items-center justify-center py-32 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /><span className="text-sm">Lade PDF…</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-5">
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} style={{ position: 'relative', lineHeight: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                <canvas ref={el => { canvasRefs.current[i] = el }} style={{ display: 'block' }} />

                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

                  {/* Editable overlays: this role's fields */}
                  {myFields.filter(f => f.page === i).map(field => {
                    const value = values[field.id] || ''
                    const sigDataUrl = signatures[field.id]
                    return (
                      <div
                        key={field.id}
                        style={{
                          position: 'absolute',
                          left: `${field.x}%`, top: `${field.y}%`,
                          width: `${field.width}%`, height: `${field.height}%`,
                          border: `1.5px solid ${roleInfo.color}66`,
                          background: value || sigDataUrl ? 'transparent' : `${roleInfo.color}0a`,
                          borderRadius: 2, boxSizing: 'border-box', overflow: 'hidden',
                          pointerEvents: 'none',
                        }}
                      >
                        {field.type === 'signature' && sigDataUrl && (
                          <img src={sigDataUrl} alt="sig" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        )}
                        {field.type !== 'signature' && value && (
                          <AutoScaleText
                            value={value}
                            multiline={field.type === 'multiline'}
                            style={{ width: '100%', height: '100%', padding: '2px 4px', color: '#1e293b', fontFamily: 'system-ui, sans-serif' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form panel */}
        <div className="flex-none w-80 xl:w-96 bg-white border-l border-gray-100 overflow-y-auto flex flex-col">
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: roleInfo.color }} />
              <p className="font-semibold text-gray-900 text-sm">{roleInfo.label} — {myFields.length} Felder</p>
            </div>
            <p className="text-xs text-gray-400">Werte eintragen — live in der PDF sichtbar</p>
          </div>

          {isSubmitted ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Bereits ausgefüllt</p>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Die {roleInfo.label}-Felder wurden bereits ausgefüllt und können nicht mehr geändert werden.
                </p>
              </div>
              <div className="w-full mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs text-emerald-700 font-medium">{myFields.length} {myFields.length === 1 ? 'Feld' : 'Felder'} ausgefüllt</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 p-5 space-y-5">
                {myFields.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <p className="text-sm text-gray-400">Keine Felder für {roleInfo.label}.</p>
                    <button onClick={() => navigate(`/admin/mediathek/${id}/edit`)} className="text-xs text-blue-500 hover:underline">
                      Im Editor Felder anlegen →
                    </button>
                  </div>
                )}

                {myFields.map(field => {
                  const meta = TYPE_META[field.type] || TYPE_META.text
                  const Icon = meta.Icon
                  return (
                    <div key={field.id} className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <Icon className="w-3.5 h-3.5" style={{ color: roleInfo.color }} />
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                        {field.autoFill && <Zap className="w-3 h-3 text-amber-400" title="Automatisch vorausgefüllt" />}
                      </label>

                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={values[field.id] || ''}
                          onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                          placeholder={field.label}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                          style={{ '--tw-ring-color': roleInfo.color }}
                        />
                      )}

                      {field.type === 'multiline' && (
                        <textarea
                          value={values[field.id] || ''}
                          onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                          placeholder={field.label}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50 hover:bg-white transition-colors resize-none"
                        />
                      )}

                      {field.type === 'signature' && (
                        <div className="space-y-2">
                          {signatures[field.id] ? (
                            <div className="relative rounded-xl border border-amber-200 bg-amber-50 p-2 h-20 flex items-center justify-center">
                              <img src={signatures[field.id]} alt="Unterschrift" className="max-h-full max-w-full object-contain" />
                              <button
                                onClick={() => setSignatures(s => { const n = { ...s }; delete n[field.id]; return n })}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-red-50"
                              >
                                <X className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSigModal(field.id)}
                              className="w-full py-4 border-2 border-dashed border-amber-200 rounded-xl text-xs text-amber-600 font-medium hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                            >
                              <PenLine className="w-4 h-4" />
                              Jetzt unterschreiben
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {myFields.length > 0 && (
                <div className="p-5 border-t border-gray-50">
                  <button
                    onClick={handleSave}
                    disabled={saving || pdfState !== 'done'}
                    className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: roleInfo.color }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Speichern & Vorschau aktualisieren
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {sigModal && (
        <SignatureModal
          onConfirm={(dataUrl) => { setSignatures(s => ({ ...s, [sigModal]: dataUrl })); setSigModal(null) }}
          onCancel={() => setSigModal(null)}
        />
      )}
    </div>
  )
}
