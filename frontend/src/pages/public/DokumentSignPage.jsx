import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'

import { CheckCircle2, AlertCircle, FileText, Loader2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SignatureCanvas from '@/components/SignatureCanvas'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// ─── PDF viewer ───────────────────────────────────────────────────────────────

function PdfViewer({ pdfUrl }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!pdfUrl) { setLoading(false); setError(true); return }
    let cancelled = false
    setLoading(true)
    setError(null)

    pdfjsLib.getDocument({ url: pdfUrl }).promise
      .then(async (pdf) => {
        if (cancelled) return
        const canvases = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.style.display = 'block'
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          if (cancelled) return
          canvases.push(canvas)
        }
        if (containerRef.current && !cancelled) {
          containerRef.current.innerHTML = ''
          canvases.forEach((canvas, i) => {
            const wrap = document.createElement('div')
            wrap.style.marginBottom = i < canvases.length - 1 ? '12px' : '0'
            wrap.style.borderRadius = '8px'
            wrap.style.overflow = 'hidden'
            wrap.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)'
            wrap.appendChild(canvas)
            containerRef.current.appendChild(wrap)
          })
        }
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })

    return () => { cancelled = true }
  }, [pdfUrl])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
      <Loader2 className="h-7 w-7 animate-spin" />
      <span className="text-sm">Dokument wird geladen…</span>
    </div>
  )
  if (error) return (
    <div className="flex items-center justify-center h-32 gap-2 text-red-400 text-sm">
      <AlertCircle className="h-5 w-5 shrink-0" />
      PDF konnte nicht geladen werden.
    </div>
  )
  return <div ref={containerRef} className="w-full" />
}

// ─── Field renderer ───────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange }) {
  // New checkbox group format: field has options array
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

  // Date
  if (field.type === 'date') {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="h-12 text-base"
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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [fieldValues, setFieldValues] = useState({})
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
        // Initialize field values — use prefillKey to map profile data
        const initial = {}
        ;(pageData.fields || []).forEach(f => {
          if (f.prefillKey && pageData.prefillData?.[f.prefillKey] !== undefined) {
            initial[f.id] = pageData.prefillData[f.prefillKey]
          } else {
            initial[f.id] = f.type === 'checkbox' && f.multiple ? [] : ''
          }
        })
        setFieldValues(initial)
        if (pdfData.signedUrl) {
          setPdfUrl(pdfData.signedUrl)
        } else {
          setPdfUrl(null) // triggers error in PdfViewer
        }
      })
      .catch(() => setError('Dokument konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [token])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!signatureDataUrl || submitting) return
    setSubmitting(true)
    try {
      const blob = await fetch(signatureDataUrl).then(r => r.blob())
      const urlRes = await fetch('/api/dokument/signature-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const { signedUrl, signaturePath } = await urlRes.json()
      if (!signedUrl) throw new Error('Upload-URL nicht verfügbar.')
      const putRes = await fetch(signedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/png' } })
      if (!putRes.ok) throw new Error('Signatur konnte nicht hochgeladen werden.')
      const submitRes = await fetch('/api/dokument/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fieldValues, signaturePath }),
      })
      const submitData = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitData.error || 'Einreichung fehlgeschlagen.')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const setFieldValue = (id, val) => setFieldValues(prev => ({ ...prev, [id]: val }))

  // Fields that need input (not signature)
  const inputFields = (data?.fields || []).filter(f => f.type !== 'signature')
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
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-500 text-left space-y-1">
          <p className="font-semibold text-gray-700">Ihre Ansprechperson bei FKVI:</p>
          <p>Fachkraft Vermittlung International GmbH</p>
          <a href="mailto:info@fkvi.de" className="text-[#0d9488] underline underline-offset-2">
            info@fkvi.de
          </a>
        </div>
      </div>
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
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-screen-xl mx-auto w-full">

        {/* ── LEFT: PDF ── */}
        <div className="lg:flex-1 lg:min-w-0 lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] lg:overflow-y-auto bg-gray-100 p-4 lg:p-6">
          {pdfUrl ? (
            <PdfViewer pdfUrl={pdfUrl} />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-300">
              <FileText className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* ── RIGHT: Form + Signature + Submit ── */}
        <div className="lg:w-[460px] lg:shrink-0 bg-white lg:border-l lg:border-gray-200 flex flex-col lg:h-[calc(100vh-56px)] lg:sticky lg:top-14">

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7">

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

            {/* Non-fatal error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Input fields */}
            {hasInputFields && (
              <div className="space-y-5">
                {inputFields.map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      {field.label || field.type}
                      {field.required !== false && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <FieldInput
                      field={field}
                      value={fieldValues[field.id]}
                      onChange={val => setFieldValue(field.id, val)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Signature section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-[#0d9488]" />
                <span className="text-base font-bold text-gray-800">Ihre Unterschrift</span>
              </div>
              <p className="text-sm text-gray-400">
                Unterschreiben Sie mit dem Finger oder der Maus im Feld unten.
              </p>
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
                <SignatureCanvas
                  onSignatureChange={setSignatureDataUrl}
                  disabled={submitting}
                />
              </div>
              {!signatureDataUrl && (
                <p className="text-xs text-center text-gray-400">
                  Noch keine Unterschrift — bitte im Feld oben unterzeichnen
                </p>
              )}
            </div>

            {/* Bottom padding for mobile */}
            <div className="h-2 lg:hidden" />
          </div>

          {/* ── Sticky submit button ── */}
          <div className="shrink-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            <button
              onClick={handleSubmit}
              disabled={!signatureDataUrl || submitting}
              className={`
                w-full h-16 rounded-2xl text-xl font-bold transition-all
                flex items-center justify-center gap-3
                ${signatureDataUrl && !submitting
                  ? 'bg-[#0d9488] hover:bg-[#0d9488]/90 text-white shadow-lg shadow-[#0d9488]/25 scale-[1.01] active:scale-100'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Wird eingereicht…
                </>
              ) : (
                <>
                  <CheckCircle2 className={`h-6 w-6 ${signatureDataUrl ? 'text-white' : 'text-gray-300'}`} />
                  Absenden
                </>
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">
              Mit dem Absenden bestätigen Sie Ihre Unterschrift und stimmen dem Dokument zu.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
