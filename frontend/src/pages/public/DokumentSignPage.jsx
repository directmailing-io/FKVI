import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'

import { CheckCircle2, AlertCircle, Loader2, PenLine, FileText, ClipboardList, Eye, Download, Printer } from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SignatureCanvas from '@/components/SignatureCanvas'
import CvDocument from '@/components/matching/CvDocument'

// ─── PDF viewer with interactive checkbox overlays ──────────────────────────

function PdfViewer({ pdfUrl, fields, fieldValues, onToggle, prefilledFieldIds = [], prefilledFields = [], prefillData = {} }) {
  const renderTasksRef = useRef([])
  const canvasRefs = useRef([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageAspects, setPageAspects] = useState([])

  // ── Load PDF and extract page aspect ratios ──────────────────────────────
  useEffect(() => {
    if (!pdfUrl) { setLoading(false); setError('Kein Dokument verfügbar.'); return }
    renderTasksRef.current.forEach(t => t.cancel?.())
    renderTasksRef.current = []
    let active = true
    setLoading(true)
    setError(null)
    setPdfDoc(null)
    setPageAspects([])

    pdfjsLib.getDocument(pdfUrl).promise
      .then(async (doc) => {
        if (!active) return
        const aspects = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const vp = page.getViewport({ scale: 1 })
          aspects.push({ width: vp.width, height: vp.height })
        }
        if (active) {
          setPdfDoc(doc)
          setPageAspects(aspects)
          setLoading(false)
        }
      })
      .catch(err => {
        if (active) {
          console.error('PdfViewer:', err)
          setError('PDF konnte nicht geladen werden.')
          setLoading(false)
        }
      })

    return () => {
      active = false
      renderTasksRef.current.forEach(t => t.cancel?.())
      renderTasksRef.current = []
    }
  }, [pdfUrl])

  // ── Render canvases after page containers are mounted ────────────────────
  useEffect(() => {
    if (!pdfDoc || pageAspects.length === 0) return
    let active = true
    renderTasksRef.current.forEach(t => t.cancel?.())
    renderTasksRef.current = []

    ;(async () => {
      for (let i = 0; i < pdfDoc.numPages; i++) {
        if (!active) return
        const canvas = canvasRefs.current[i]
        if (!canvas || !pageAspects[i]) continue
        const aspect = pageAspects[i]
        const displayWidth = canvas.parentElement?.clientWidth || 800
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.round(displayWidth * dpr)
        canvas.height = Math.round(displayWidth * (aspect.height / aspect.width) * dpr)
        const page = await pdfDoc.getPage(i + 1)
        const scale = (displayWidth / aspect.width) * dpr
        const viewport = page.getViewport({ scale })
        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
        renderTasksRef.current.push(task)
        try { await task.promise } catch (e) {
          if (e?.name === 'RenderingCancelledException') return
          throw e
        }
      }
    })().catch(err => {
      if (err?.name !== 'RenderingCancelledException') console.error('PDF render error:', err)
    })

    return () => {
      active = false
      renderTasksRef.current.forEach(t => t.cancel?.())
      renderTasksRef.current = []
    }
  }, [pdfDoc, pageAspects])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
      <Loader2 className="h-7 w-7 animate-spin" />
      <span className="text-sm">Dokument wird geladen…</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-red-50 border border-red-200 p-8 text-center">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <div>
        <p className="font-semibold text-red-700">PDF nicht verfügbar</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
      </div>
    </div>
  )

  const checkboxFields = (fields || []).filter(f => f.type === 'checkbox' && Array.isArray(f.options))
  // Pre-filled text/date/initials fields with their resolved values for overlay rendering.
  // Use prefilledFields (includes admin-audience fields) + prefillData for value lookup.
  const prefilledTextFields = prefilledFields
    .filter(f => f.type === 'text' || f.type === 'date' || f.type === 'initials')
    .map(f => {
      const value = prefillData[f.prefillKey] ?? prefillData[f.id] ?? fieldValues?.[f.id] ?? ''
      return { ...f, resolvedValue: String(value) }
    })
    .filter(f => f.resolvedValue)

  return (
    <div className="w-full flex flex-col gap-4">
      {pageAspects.map((aspect, idx) => {
        const pageNum = idx + 1
        // Collect all positioned options on this page
        const pageOptions = checkboxFields.flatMap(field =>
          (field.options || [])
            .filter(opt => opt.page === pageNum && opt.x !== undefined)
            .map(opt => ({ ...opt, field }))
        )
        // Pre-filled text fields on this page
        const pageTextFields = prefilledTextFields.filter(f => (f.page || 1) === pageNum)

        return (
          <div
            key={idx}
            className="relative w-full bg-white shadow-md rounded-lg overflow-hidden"
            style={{ paddingBottom: `${(aspect.height / aspect.width) * 100}%`, containerType: 'size' }}
          >
            <canvas
              ref={el => { canvasRefs.current[idx] = el }}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />

            {/* Pre-filled text value overlays */}
            {pageTextFields.map(f => (
              <div
                key={f.id}
                style={{
                  position: 'absolute',
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  width: `${f.width}%`,
                  height: `${f.height}%`,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '0.3%',
                  paddingRight: '0.3%',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  // font-size: 65% of field height, using container query height unit
                  fontSize: `${f.height * 0.65}cqh`,
                  lineHeight: 1,
                  color: '#000',
                  whiteSpace: 'nowrap',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {f.resolvedValue}
                </span>
              </div>
            ))}

            {/* Interactive checkbox boxes overlaid on PDF */}
            {pageOptions.map(opt => {
              const field = opt.field
              const isMultiple = field.multiple === true
              const val = fieldValues?.[field.id]
              const selected = isMultiple
                ? (Array.isArray(val) ? val : []).includes(opt.id)
                : val === opt.id

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onToggle(field, opt.id)}
                  style={{
                    position: 'absolute',
                    left: `${opt.x}%`,
                    top: `${opt.y}%`,
                    width: `${opt.width}%`,
                    height: `${opt.height}%`,
                  }}
                  className={`border-2 transition-colors flex items-center justify-center bg-white/80 hover:bg-white
                    ${selected ? 'border-[#1a3a5c]' : 'border-gray-500 hover:border-[#1a3a5c]/60'}`}
                  title={opt.label || ''}
                >
                  {selected && (
                    <svg
                      viewBox="0 0 10 10"
                      style={{ position: 'absolute', inset: '10%' }}
                      fill="none"
                      stroke="#1a3a5c"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="1" y1="1" x2="9" y2="9" />
                      <line x1="9" y1="1" x2="1" y2="9" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field renderer (for non-positioned fields in sidebar) ───────────────────

function FieldInput({ field, value, onChange }) {
  // Checkbox group with options (no positions — fallback sidebar)
  if (field.type === 'checkbox' && Array.isArray(field.options) && field.options.length > 0) {
    const isMultiple = field.multiple === true
    const selected = isMultiple
      ? (Array.isArray(value) ? value : [])
      : value || ''

    const toggle = (optId) => {
      if (isMultiple) {
        const arr = Array.isArray(value) ? value : []
        onChange(arr.includes(optId) ? arr.filter(x => x !== optId) : [...arr, optId])
      } else {
        onChange(optId === selected ? '' : optId)
      }
    }

    return (
      <div className="space-y-2">
        {field.options.map(opt => {
          const active = isMultiple ? selected.includes(opt.id) : selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-all ${
                active
                  ? 'border-[#0d9488] bg-[#0d9488]/5 text-[#0d9488]'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 shrink-0 flex items-center justify-center border-2 ${
                  isMultiple ? 'rounded' : 'rounded-full'
                } ${active ? 'border-[#0d9488]' : 'border-gray-300'}`}>
                  {active && (
                    isMultiple
                      ? <div className="w-2.5 h-2.5 rounded-sm bg-[#0d9488]" />
                      : <div className="w-2.5 h-2.5 rounded-full bg-[#0d9488]" />
                  )}
                </div>
                {opt.label}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  // Date — German format DD.MM.YYYY
  if (field.type === 'date') {
    const handleDateInput = (e) => {
      // Auto-insert dots and limit to DD.MM.YYYY
      let v = e.target.value.replace(/[^\d.]/g, '')
      // Auto-add dots after day and month
      if (v.length === 2 && !v.includes('.')) v = v + '.'
      else if (v.length === 5 && v.split('.').length === 2) v = v + '.'
      if (v.length > 10) v = v.slice(0, 10)
      onChange(v)
    }
    return (
      <Input
        type="text"
        inputMode="numeric"
        placeholder="TT.MM.JJJJ"
        value={value || ''}
        onChange={handleDateInput}
        className="h-12 text-base"
        maxLength={10}
      />
    )
  }

  // Initials
  if (field.type === 'initials') {
    return (
      <Input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="z. B. M.M."
        maxLength={10}
        className="h-12 text-base"
      />
    )
  }

  // Default text
  return (
    <Input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="h-12 text-base"
    />
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DokumentSignPage() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bundleToken = searchParams.get('bundle')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [fieldValues, setFieldValues] = useState({})
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [mobileTab, setMobileTab] = useState('form') // 'form' | 'pdf'
  const [missingFields, setMissingFields] = useState([])
  const [markingRead, setMarkingRead] = useState(false)
  const [markedRead, setMarkedRead] = useState(false)
  const [cvData, setCvData] = useState(null) // { profile, documents } for CV sends
  const [downloadUrl, setDownloadUrl] = useState(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('Ungültiger Link.'); setLoading(false); return }
    Promise.all([
      fetch(`/api/dokument/page-data?token=${token}`).then(r => r.json()),
      fetch(`/api/dokument/pdf-url?token=${token}`).then(r => r.json()),
    ])
      .then(([pageData, pdfData]) => {
        if (pageData.error) { setError(pageData.error); return }
        setData(pageData)
        const initial = {}
        ;(pageData.fields || []).forEach(f => {
          if (f.prefillKey && pageData.prefillData?.[f.prefillKey] !== undefined) {
            initial[f.id] = pageData.prefillData[f.prefillKey]
          } else if (pageData.prefillData?.[f.id] !== undefined) {
            initial[f.id] = pageData.prefillData[f.id]
          } else {
            initial[f.id] = f.type === 'checkbox' && f.multiple ? [] : ''
          }
        })
        setFieldValues(initial)
        if (pdfData.signedUrl) setPdfUrl(pdfData.signedUrl)

        // If this is a CV send, load CV data
        if (pageData.sendMode === 'view' && pageData.sourceUrl?.startsWith('cv:')) {
          fetch(`/api/dokument/cv-data?token=${token}`)
            .then(r => r.json())
            .then(cvResult => { if (cvResult.profile) setCvData(cvResult) })
            .catch(() => {})
        }
      })
      .catch(() => setError('Dokument konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [token])

  // ── Toggle checkbox option (called from PDF overlay) ──────────────────────
  const handlePdfToggle = (field, optId) => {
    const isMultiple = field.multiple === true
    if (isMultiple) {
      const arr = Array.isArray(fieldValues[field.id]) ? fieldValues[field.id] : []
      setFieldValue(field.id, arr.includes(optId) ? arr.filter(x => x !== optId) : [...arr, optId])
    } else {
      setFieldValue(field.id, fieldValues[field.id] === optId ? '' : optId)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const hasSignatureField = (data?.fields || []).some(f => f.type === 'signature')

  const handleSubmit = async () => {
    if (submitting) return
    if (hasSignatureField && !signatureDataUrl) return

    // Validate required fields
    const missing = inputFields.filter(f => {
      if (f.required === false) return false
      const val = fieldValues[f.id]
      if (f.type === 'checkbox') {
        return f.multiple ? (!Array.isArray(val) || val.length === 0) : !val
      }
      return !val || String(val).trim() === ''
    })
    if (missing.length > 0) {
      setMissingFields(missing.map(f => f.id))
      return
    }
    setMissingFields([])

    setSubmitting(true)
    try {
      let signaturePath = null
      if (hasSignatureField && signatureDataUrl) {
        const blob = await fetch(signatureDataUrl).then(r => r.blob())
        const urlRes = await fetch('/api/dokument/signature-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const { signedUrl, signaturePath: uploadedPath } = await urlRes.json()
        if (!signedUrl) throw new Error('Upload-URL nicht verfügbar.')
        const putRes = await fetch(signedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/png' } })
        if (!putRes.ok) throw new Error('Signatur konnte nicht hochgeladen werden.')
        signaturePath = uploadedPath
      }
      const submitRes = await fetch('/api/dokument/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fieldValues, signaturePath }),
      })
      const submitData = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitData.error || 'Einreichung fehlgeschlagen.')
      if (submitData.downloadUrl) setDownloadUrl(submitData.downloadUrl)
      setSubmitted(true)
      // If part of a bundle, redirect back to bundle overview after short delay
      if (bundleToken) {
        setTimeout(() => navigate(`/bundle/${bundleToken}`), 2200)
      }
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const setFieldValue = (id, val) => setFieldValues(prev => ({ ...prev, [id]: val }))

  const prefilledFieldIds = data?.prefilledFieldIds || []
  const isPrefillMode = data?.prefillMode === 'prefilled' && prefilledFieldIds.length > 0

  // Sidebar: all non-signature fields, minus those already baked into the PDF
  const inputFields = (data?.fields || []).filter(
    f => f.type !== 'signature' && !prefilledFieldIds.includes(f.id)
  )
  const hasInputFields = inputFields.length > 0

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#1a3a5c] mx-auto" />
        <p className="text-gray-500 text-base">Dokument wird geladen…</p>
      </div>
    </div>
  )

  // ── Error (no data) ───────────────────────────────────────────────────────
  if (error && !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-red-100 shadow-lg p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-xl">Link ungültig</p>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
        <p className="text-sm text-gray-400">Bei Fragen wende dich an FKVI.</p>
      </div>
    </div>
  )

  // ── View-only: Gelesen bestätigen ─────────────────────────────────────────
  const handleMarkRead = async () => {
    setMarkingRead(true)
    try {
      const res = await fetch('/api/dokument/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) setMarkedRead(true)
    } catch {
      // ignore
    } finally {
      setMarkingRead(false)
    }
  }

  if (data?.sendMode === 'view') {
    if (markedRead || data?.alreadySigned) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#0d9488]/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-[#0d9488]" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-2xl">Empfang bestätigt</p>
            <p className="text-gray-500 mt-2 leading-relaxed">Vielen Dank! Der Erhalt des Dokuments wurde bestätigt.</p>
          </div>
          <p className="text-sm text-gray-400">Bei Fragen wende dich an FKVI.</p>
        </div>
      </div>
    )

    const docTitle = data?.templateName || data?.sourceTitle || 'Dokument'
    const docUrl = data?.sourceUrl || pdfUrl

    const isCv = data?.sourceUrl?.startsWith('cv:')

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {isCv && <style>{`@media print { .cv-no-print { display: none !important; } body { background: white !important; } @page { margin: 10mm; size: A4; } }`}</style>}
        <header className="cv-no-print bg-white border-b border-gray-200 shrink-0 z-20">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <span className="font-black text-[#1a3a5c] text-xl tracking-tight shrink-0">FKVI</span>
            {docTitle && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500 text-sm truncate">{docTitle}</span>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isCv && (
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1a3a5c] text-white hover:bg-[#1a3a5c]/90 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />Als PDF speichern
                </button>
              )}
              <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <Eye className="h-3 w-3" />Zur Ansicht
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6 gap-4">
          {data?.signerName && (
            <p className="cv-no-print text-sm text-gray-500">für: <strong>{data.signerName}</strong></p>
          )}
          {data?.message && (
            <div className="cv-no-print rounded-xl bg-[#1a3a5c]/5 border border-[#1a3a5c]/15 p-4">
              <p className="text-gray-700 text-sm leading-relaxed">{data.message}</p>
            </div>
          )}

          {data?.sourceUrl?.startsWith('cv:') ? (
            cvData?.profile ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
                <div className="mx-auto" style={{ maxWidth: 794 }}>
                  <CvDocument profile={cvData.profile} showRealName={true} documents={cvData.documents || []} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200 min-h-[40vh]">
                <div className="text-center text-gray-400 space-y-2">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-300" />
                  <p className="text-sm">Lebenslauf wird geladen…</p>
                </div>
              </div>
            )
          ) : docUrl ? (
            docUrl.startsWith('http') && !pdfUrl ? (
              <iframe
                src={docUrl}
                className="flex-1 min-h-[60vh] rounded-xl border border-gray-200 bg-white w-full"
                title={docTitle}
              />
            ) : (
              <div className="flex-1 min-h-[60vh]">
                <PdfViewer pdfUrl={pdfUrl || docUrl} fields={[]} fieldValues={{}} onToggle={() => {}} />
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200 min-h-[40vh]">
              <div className="text-center text-gray-400 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-gray-200" />
                <p className="text-sm">Dokument wird geladen…</p>
              </div>
            </div>
          )}
        </div>

        <div className="cv-no-print shrink-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button
            onClick={handleMarkRead}
            disabled={markingRead}
            className="w-full h-14 rounded-2xl text-lg font-bold bg-[#0d9488] hover:bg-[#0d9488]/90 text-white flex items-center justify-center gap-3 transition-all"
          >
            {markingRead
              ? <><Loader2 className="h-5 w-5 animate-spin" />Wird bestätigt…</>
              : <><CheckCircle2 className="h-5 w-5" />Empfang bestätigen</>}
          </button>
          <p className="text-xs text-center text-gray-400 mt-2">
            Mit dem Klick bestätigst du, dass du das Dokument gesehen hast.
          </p>
        </div>
      </div>
    )
  }

  // ── Already signed ────────────────────────────────────────────────────────
  if (data?.alreadySigned) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-green-100 shadow-lg p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-xl">Bereits unterzeichnet</p>
          <p className="text-gray-500 mt-2">Dieses Dokument wurde bereits unterzeichnet. Vielen Dank!</p>
        </div>
        <p className="text-sm text-gray-400">Bei Fragen wende dich an FKVI.</p>
      </div>
    </div>
  )

  // ── Success ───────────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-[#0d9488]/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-12 w-12 text-[#0d9488]" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-3xl">Vielen Dank!</p>
          <p className="text-gray-500 mt-3 text-lg leading-relaxed">
            Ihr Dokument wurde erfolgreich unterzeichnet und eingereicht.
          </p>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white font-semibold text-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Unterzeichnetes Dokument herunterladen
          </a>
        )}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-500 text-left space-y-1">
          <p className="font-semibold text-gray-700">Ihre Ansprechperson bei FKVI:</p>
          <p>Fachkraft Vermittlung International GmbH &amp; Co. KG</p>
          <a href="mailto:info@fkvi.de" className="text-[#0d9488] underline underline-offset-2">
            info@fkvi.de
          </a>
        </div>
      </div>
    </div>
  )

  // Compute whether all required fields + signature are filled
  const allRequiredFilled = (hasSignatureField ? !!signatureDataUrl : true) && inputFields.every(f => {
    if (f.required === false) return true
    const val = fieldValues[f.id]
    if (f.type === 'checkbox') return f.multiple ? (Array.isArray(val) && val.length > 0) : !!val
    return val && String(val).trim() !== ''
  })

  const handleBottomButton = () => {
    if (submitting) return
    if (allRequiredFilled) {
      handleSubmit()
    } else {
      // Switch to form tab and highlight missing fields
      setMobileTab('form')
      const missing = inputFields.filter(f => {
        if (f.required === false) return false
        const val = fieldValues[f.id]
        if (f.type === 'checkbox') return f.multiple ? (!Array.isArray(val) || val.length === 0) : !val
        return !val || String(val).trim() === ''
      })
      if (missing.length > 0) setMissingFields(missing.map(f => f.id))
    }
  }

  // ── Shared form content ────────────────────────────────────────────────────
  const formContent = (
    <div className="px-5 py-6 space-y-7">
      {/* Doc info */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{data?.templateName}</h1>
        {data?.signerName && (
          <p className="text-sm text-gray-400 mt-1">für: <span className="font-medium text-gray-600">{data.signerName}</span></p>
        )}
      </div>

      {/* Admin message */}
      {data?.message && (
        <div className="rounded-xl bg-[#1a3a5c]/5 border border-[#1a3a5c]/15 p-4">
          <p className="text-gray-700 text-sm leading-relaxed">{data.message}</p>
        </div>
      )}

      {/* Forwarded banner */}
      {data?.isForwarded && (
        <div className="rounded-xl bg-green-50 border border-green-100 p-3.5 flex items-start gap-2.5">
          <svg className="h-4 w-4 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-700 leading-snug">
            <span className="font-semibold">Dieses Dokument wurde bereits teilweise ausgefüllt.</span>
            {' '}Bitte füllen Sie die noch offenen Felder aus und unterzeichnen Sie.
          </p>
        </div>
      )}

      {/* Prefill info banner */}
      {isPrefillMode && !data?.isForwarded && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 flex items-start gap-2.5">
          <svg className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700 leading-snug">
            <span className="font-semibold">{prefilledFieldIds.length} {prefilledFieldIds.length === 1 ? 'Feld wurde' : 'Felder wurden'} bereits ausgefüllt</span>
            {' '}und sind direkt im Dokument eingetragen.
          </p>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {missingFields.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-sm">Bitte füllen Sie alle Pflichtfelder aus.</p>
        </div>
      )}

      {/* Input fields */}
      {hasInputFields && (
        <div className="space-y-5">
          {inputFields.map(field => (
            <div key={field.id} className="space-y-2">
              <Label className={`text-sm font-semibold ${missingFields.includes(field.id) ? 'text-red-600' : 'text-gray-700'}`}>
                {field.label || field.type}
                {field.required !== false && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div className={missingFields.includes(field.id) ? 'ring-2 ring-red-300 rounded-xl' : ''}>
                <FieldInput
                  field={field}
                  value={fieldValues[field.id]}
                  onChange={val => {
                    setFieldValue(field.id, val)
                    if (missingFields.includes(field.id)) {
                      setMissingFields(prev => prev.filter(id => id !== field.id))
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signature — only if template has signature fields */}
      {hasSignatureField && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-[#0d9488]" />
            <span className="text-base font-bold text-gray-800">Ihre Unterschrift</span>
          </div>
          <p className="text-sm text-gray-400">
            Unterschreiben Sie mit dem Finger oder der Maus im Feld unten.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
            <SignatureCanvas onSignatureChange={setSignatureDataUrl} disabled={submitting} />
          </div>
          {!signatureDataUrl && (
            <p className="text-xs text-center text-gray-400">
              Noch keine Unterschrift — bitte im Feld oben unterzeichnen
            </p>
          )}
        </div>
      )}
    </div>
  )

  // ── Shared bottom action button ────────────────────────────────────────────
  const bottomButton = (
    <div className="shrink-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <button
        onClick={allRequiredFilled ? handleSubmit : handleBottomButton}
        disabled={submitting}
        className={`
          w-full h-16 rounded-2xl text-xl font-bold transition-all
          flex items-center justify-center gap-3
          ${allRequiredFilled && !submitting
            ? 'bg-[#0d9488] hover:bg-[#0d9488]/90 text-white shadow-lg shadow-[#0d9488]/25 active:scale-100'
            : submitting
              ? 'bg-[#0d9488] text-white cursor-not-allowed'
              : 'bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white active:scale-100'
          }
        `}
      >
        {submitting ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            Wird eingereicht…
          </>
        ) : allRequiredFilled ? (
          <>
            <CheckCircle2 className="h-6 w-6" />
            ABSENDEN
          </>
        ) : (
          <>
            <ClipboardList className="h-6 w-6" />
            AUSFÜLLEN
          </>
        )}
      </button>
      {allRequiredFilled && !submitting && (
        <p className="text-xs text-center text-gray-400 mt-2">
          {hasSignatureField
            ? 'Mit dem Absenden bestätigen Sie Ihre Unterschrift und stimmen dem Dokument zu.'
            : 'Mit dem Absenden bestätigen Sie Ihre Angaben und stimmen dem Dokument zu.'}
        </p>
      )}
    </div>
  )

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <span className="font-black text-[#1a3a5c] text-xl tracking-tight shrink-0">FKVI</span>
          {data?.templateName && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 text-sm truncate">{data.templateName}</span>
            </>
          )}
          {data?.recipientType && (
            <span className={`ml-auto shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              data.recipientType === 'unternehmen'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {data.recipientType === 'unternehmen' ? 'Unternehmen' : 'Fachkraft'}
            </span>
          )}
        </div>
      </header>

      {/* ══ MOBILE: Tab layout ══════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col flex-1 bg-white" style={{ height: 'calc(100vh - 56px)' }}>

        {/* Tab bar */}
        <div className="shrink-0 flex border-b border-gray-200 bg-white z-10">
          {[
            { id: 'form', label: 'Formular', icon: ClipboardList },
            { id: 'pdf',  label: 'Dokument', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                mobileTab === id
                  ? 'border-[#1a3a5c] text-[#1a3a5c]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {mobileTab === 'form' ? (
            formContent
          ) : (
            <div className="p-4 bg-gray-100 min-h-full">
              <PdfViewer
                pdfUrl={pdfUrl}
                fields={data?.fields}
                fieldValues={fieldValues}
                onToggle={handlePdfToggle}
                prefilledFieldIds={prefilledFieldIds}
                prefilledFields={data?.prefilledFields}
                prefillData={data?.prefillData}
              />
            </div>
          )}
        </div>

        {/* Sticky bottom button — always visible */}
        {bottomButton}
      </div>

      {/* ══ DESKTOP: Two-column layout ══════════════════════════════════════ */}
      <div className="hidden lg:flex flex-1 flex-row max-w-screen-xl mx-auto w-full">

        {/* PDF — left */}
        <div className="flex-1 min-w-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto bg-gray-100 p-6">
          <PdfViewer
            pdfUrl={pdfUrl}
            fields={data?.fields}
            fieldValues={fieldValues}
            onToggle={handlePdfToggle}
          />
        </div>

        {/* Form — right */}
        <div className="w-[460px] shrink-0 bg-white border-l border-gray-200 flex flex-col h-[calc(100vh-56px)] sticky top-14">
          <div className="flex-1 overflow-y-auto">
            {formContent}
          </div>
          {bottomButton}
        </div>
      </div>
    </div>
  )
}
