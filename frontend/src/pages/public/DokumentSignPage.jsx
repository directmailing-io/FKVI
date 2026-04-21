import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'

import { CheckCircle2, AlertCircle, FileText, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import SignatureCanvas from '@/components/SignatureCanvas'
import { formatDate } from '@/lib/utils'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Überprüfen' },
    { n: 2, label: 'Ausfüllen' },
    { n: 3, label: 'Unterschreiben' },
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1">
          <div className={`
            flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-all
            ${current === s.n
              ? 'bg-[#1a3a5c] border-[#1a3a5c] text-white'
              : current > s.n
                ? 'bg-[#0d9488] border-[#0d9488] text-white'
                : 'bg-white border-gray-200 text-gray-400'
            }
          `}>
            {current > s.n ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
          </div>
          <span className={`text-xs hidden sm:inline ${current === s.n ? 'text-[#1a3a5c] font-semibold' : 'text-gray-400'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 mx-0.5" />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── PDF renderer ─────────────────────────────────────────────────────────────

function PdfViewer({ pdfUrl, fields }) {
  const containerRef = useRef(null)
  const [pages, setPages] = useState([])   // array of { canvas, pageNum }
  const [loading, setPdfLoading] = useState(true)
  const [error, setPdfError] = useState(null)

  useEffect(() => {
    if (!pdfUrl) return
    let cancelled = false
    setPdfLoading(true)
    setPdfError(null)

    pdfjsLib.getDocument({ url: pdfUrl }).promise
      .then(async (pdf) => {
        if (cancelled) return
        const rendered = []
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
          rendered.push({ canvas, pageNum: i, vpWidth: viewport.width, vpHeight: viewport.height })
        }
        setPages(rendered)
        setPdfLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setPdfError('PDF konnte nicht geladen werden.')
          setPdfLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [pdfUrl])

  // Attach canvases to DOM
  useEffect(() => {
    const container = containerRef.current
    if (!container || pages.length === 0) return
    container.innerHTML = ''
    pages.forEach(({ canvas, pageNum, vpWidth, vpHeight }) => {
      const wrapper = document.createElement('div')
      wrapper.style.position = 'relative'
      wrapper.style.width = '100%'
      wrapper.style.marginBottom = '12px'
      wrapper.style.borderRadius = '8px'
      wrapper.style.overflow = 'hidden'
      wrapper.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
      wrapper.appendChild(canvas)

      // Field overlays for this page
      const pageFields = (fields || []).filter(f => (f.page || 1) === pageNum)
      pageFields.forEach(f => {
        const overlay = document.createElement('div')
        overlay.style.position = 'absolute'
        overlay.style.left = `${(f.x || 0) * 100}%`
        overlay.style.top = `${(f.y || 0) * 100}%`
        overlay.style.width = `${(f.width || 0.15) * 100}%`
        overlay.style.height = `${(f.height || 0.04) * 100}%`
        overlay.style.background = f.type === 'signature'
          ? 'rgba(13,148,136,0.18)'
          : 'rgba(26,58,92,0.12)'
        overlay.style.border = f.type === 'signature'
          ? '1.5px dashed #0d9488'
          : '1.5px dashed #1a3a5c'
        overlay.style.borderRadius = '4px'
        overlay.style.display = 'flex'
        overlay.style.alignItems = 'center'
        overlay.style.justifyContent = 'center'
        overlay.style.pointerEvents = 'none'
        const label = document.createElement('span')
        label.style.fontSize = '9px'
        label.style.color = f.type === 'signature' ? '#0d9488' : '#1a3a5c'
        label.style.fontWeight = '600'
        label.style.opacity = '0.8'
        label.style.padding = '2px 4px'
        label.style.maxWidth = '100%'
        label.style.overflow = 'hidden'
        label.style.textOverflow = 'ellipsis'
        label.style.whiteSpace = 'nowrap'
        label.textContent = f.label || f.type || ''
        overlay.appendChild(label)
        wrapper.appendChild(overlay)
      })

      container.appendChild(wrapper)
    })
  }, [pages, fields])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm">Dokument wird geladen…</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm py-6 justify-center">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error}
      </div>
    )
  }

  return <div ref={containerRef} className="w-full" />
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DokumentSignPage() {
  const { token } = useParams()

  // Core state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)           // page-data response
  const [pdfSignedUrl, setPdfSignedUrl] = useState(null)

  // Form
  const [fieldValues, setFieldValues] = useState({})
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)

  // Flow
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setError('Ungültiger Link. Kein Token gefunden.')
      setLoading(false)
      return
    }

    Promise.all([
      fetch(`/api/dokument/page-data?token=${token}`).then(r => r.json()),
      fetch(`/api/dokument/pdf-url?token=${token}`).then(r => r.json()),
    ])
      .then(([pageData, pdfData]) => {
        if (pageData.error) {
          setError(pageData.error)
        } else {
          setData(pageData)
          // Pre-fill field values from prefillData
          if (pageData.prefillData && pageData.fields) {
            const initial = {}
            pageData.fields.forEach(f => {
              if (pageData.prefillData[f.id] !== undefined) {
                initial[f.id] = pageData.prefillData[f.id]
              } else {
                initial[f.id] = ''
              }
            })
            setFieldValues(initial)
          }
        }
        if (pdfData.signedUrl) setPdfSignedUrl(pdfData.signedUrl)
      })
      .catch(() => setError('Dokument konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [token])

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!signatureDataUrl) return
    setSubmitting(true)
    try {
      // 1. Convert data URL to Blob
      const blob = await fetch(signatureDataUrl).then(r => r.blob())

      // 2. Get signed upload URL
      const urlRes = await fetch('/api/dokument/signature-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const { signedUrl, signaturePath } = await urlRes.json()
      if (!signedUrl) throw new Error('Upload-URL konnte nicht abgerufen werden.')

      // 3. PUT blob to storage
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/png' },
      })
      if (!putRes.ok) throw new Error('Signatur konnte nicht hochgeladen werden.')

      // 4. Submit
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
    } finally {
      setSubmitting(false)
    }
  }, [signatureDataUrl, token, fieldValues])

  // ── Derived ─────────────────────────────────────────────────────────────────

  // Fields excluding signature (for steps 2 & summary)
  const fillableFields = (data?.fields || []).filter(f => f.type !== 'signature')
  const signatureFields = (data?.fields || []).filter(f => f.type === 'signature')

  // Group checkbox fields by group_name
  const groupedFields = []
  const seenGroups = new Set()
  fillableFields.forEach(f => {
    if (f.type === 'checkbox' && f.group_name) {
      if (!seenGroups.has(f.group_name)) {
        seenGroups.add(f.group_name)
        groupedFields.push({
          isGroup: true,
          group_name: f.group_name,
          fields: fillableFields.filter(x => x.group_name === f.group_name),
        })
      }
    } else if (!f.group_name || f.type !== 'checkbox') {
      groupedFields.push({ isGroup: false, field: f })
    }
  })

  const setFieldValue = (id, value) =>
    setFieldValues(prev => ({ ...prev, [id]: value }))

  // ── Loading / Error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a3a5c] mx-auto" />
          <p className="text-gray-500 text-base">Dokument wird geladen…</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-100 shadow p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">Link ungültig</p>
            <p className="text-gray-500 text-base mt-1">{error}</p>
          </div>
          <p className="text-sm text-gray-400">
            Falls du Fragen hast, wende dich an deine Ansprechperson bei FKVI.
          </p>
        </div>
      </div>
    )
  }

  // Already signed state
  if (data?.alreadySigned || data?.status === 'signed' || data?.status === 'submitted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-green-100 shadow p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xl">Bereits unterzeichnet</p>
            <p className="text-gray-500 text-base mt-2">
              Dieses Dokument wurde bereits unterzeichnet. Vielen Dank!
            </p>
          </div>
          <p className="text-sm text-gray-400">Bei Fragen wende dich an FKVI.</p>
        </div>
      </div>
    )
  }

  // Submitted success
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-[#0d9488]/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-[#0d9488]" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-2xl">Vielen Dank!</p>
            <p className="text-gray-600 text-base mt-2 leading-relaxed">
              Ihr Dokument wurde erfolgreich unterzeichnet und eingereicht.
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-500 text-left space-y-1">
            <p className="font-semibold text-gray-700">Ihre Ansprechperson bei FKVI:</p>
            <p>Fachkraft Vermittlung International GmbH</p>
            <p>
              <a href="mailto:info@fkvi.de" className="text-[#0d9488] underline underline-offset-2">
                info@fkvi.de
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-black text-[#1a3a5c] text-xl tracking-tight shrink-0">FKVI</span>
            {data?.templateName && (
              <>
                <span className="text-gray-200">|</span>
                <span className="text-gray-600 text-sm truncate">{data.templateName}</span>
              </>
            )}
          </div>
          <StepIndicator current={step} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-16 space-y-6">

        {/* Signer meta */}
        {data?.signerName && (
          <div className="text-sm text-gray-500">
            Dokument für:{' '}
            <span className="font-semibold text-gray-800">{data.signerName}</span>
          </div>
        )}

        {/* Error banner (non-fatal) */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* ── STEP 1: Überprüfen ─────────────────────────────────────────── */}
        {step === 1 && (
          <div
            className="space-y-5"
            style={{ transition: 'opacity 0.25s', opacity: step === 1 ? 1 : 0 }}
          >
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {data?.templateName || 'Dokument prüfen'}
              </h1>
              <p className="text-base text-gray-500 mt-1">
                Bitte lesen Sie das Dokument sorgfältig durch.
              </p>
            </div>

            {/* Admin message */}
            {data?.message && (
              <div className="rounded-xl bg-[#0d9488]/8 border border-[#0d9488]/25 p-4 flex gap-3">
                <div className="w-1 rounded-full bg-[#0d9488] shrink-0" />
                <p className="text-gray-700 text-base leading-relaxed">{data.message}</p>
              </div>
            )}

            {/* Expiry */}
            {data?.expiresAt && (
              <p className="text-sm text-gray-400">
                Dieses Dokument ist gültig bis:{' '}
                <span className="font-medium text-gray-600">{formatDate(data.expiresAt)}</span>
              </p>
            )}

            {/* PDF viewer */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white p-2">
              {pdfSignedUrl ? (
                <PdfViewer pdfUrl={pdfSignedUrl} fields={data?.fields} />
              ) : (
                <div className="flex items-center justify-center py-16 text-gray-300">
                  <FileText className="h-10 w-10" />
                </div>
              )}
            </div>

            <Button
              className="w-full h-14 text-base font-semibold bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              onClick={() => setStep(fillableFields.length > 0 ? 2 : 3)}
            >
              Weiter zum Ausfüllen
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Ausfüllen ─────────────────────────────────────────── */}
        {step === 2 && (
          <div
            className="space-y-5"
            style={{ transition: 'opacity 0.25s', opacity: step === 2 ? 1 : 0 }}
          >
            <div>
              <h1 className="text-xl font-bold text-gray-900">Felder ausfüllen</h1>
              <p className="text-base text-gray-500 mt-1">
                Bitte füllen Sie alle erforderlichen Felder aus.
              </p>
            </div>

            <div className="space-y-4">
              {groupedFields.map((item, idx) => {
                if (item.isGroup) {
                  // Checkbox group → radio-button style cards
                  return (
                    <div key={item.group_name} className="space-y-2">
                      <Label className="text-base font-semibold text-gray-700">
                        {item.group_name}
                      </Label>
                      <div className="space-y-2">
                        {item.fields.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFieldValue(f.id, f.id)}
                            className={`
                              w-full text-left px-4 py-3.5 rounded-xl border-2 text-base font-medium
                              transition-all min-h-[52px]
                              ${fieldValues[f.id] === f.id
                                ? 'border-[#0d9488] bg-[#0d9488]/5 text-[#0d9488]'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center
                                ${fieldValues[f.id] === f.id
                                  ? 'border-[#0d9488]'
                                  : 'border-gray-300'
                                }
                              `}>
                                {fieldValues[f.id] === f.id && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#0d9488]" />
                                )}
                              </div>
                              {f.label || f.id}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }

                const f = item.field
                const isRequired = f.required !== false

                return (
                  <div key={f.id} className="space-y-2">
                    <Label htmlFor={`field-${f.id}`} className="text-base font-medium text-gray-700">
                      {f.label || f.id}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {f.type === 'date' ? (
                      <Input
                        id={`field-${f.id}`}
                        type="date"
                        value={fieldValues[f.id] || ''}
                        onChange={e => setFieldValue(f.id, e.target.value)}
                        className="h-12 text-base"
                      />
                    ) : f.type === 'initials' ? (
                      <Input
                        id={`field-${f.id}`}
                        type="text"
                        value={fieldValues[f.id] || ''}
                        onChange={e => setFieldValue(f.id, e.target.value)}
                        placeholder="z. B. M.M."
                        maxLength={10}
                        className="h-12 text-base"
                      />
                    ) : f.type === 'textarea' ? (
                      <Textarea
                        id={`field-${f.id}`}
                        value={fieldValues[f.id] || ''}
                        onChange={e => setFieldValue(f.id, e.target.value)}
                        rows={4}
                        className="text-base resize-none"
                      />
                    ) : (
                      <Input
                        id={`field-${f.id}`}
                        type="text"
                        value={fieldValues[f.id] || ''}
                        onChange={e => setFieldValue(f.id, e.target.value)}
                        className="h-12 text-base"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="h-12 text-base"
                onClick={() => setStep(1)}
              >
                Zurück
              </Button>
              <Button
                className="flex-1 h-12 text-base font-semibold bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                onClick={() => setStep(3)}
              >
                Weiter zur Unterschrift
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Unterschreiben ────────────────────────────────────── */}
        {step === 3 && (
          <div
            className="space-y-6"
            style={{ transition: 'opacity 0.25s', opacity: step === 3 ? 1 : 0 }}
          >
            <div>
              <h1 className="text-xl font-bold text-gray-900">Unterschreiben</h1>
              <p className="text-base text-gray-500 mt-1">
                Bitte unterschreiben Sie mit Ihrem Finger oder der Maus.
              </p>
            </div>

            {/* Signature area */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-base font-medium text-gray-700">Bitte unterschreiben Sie hier:</p>
              <SignatureCanvas
                onSignatureChange={setSignatureDataUrl}
                disabled={submitting}
              />
            </div>

            {/* Summary of filled fields */}
            {fillableFields.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Ausgefüllte Felder
                </p>
                <div className="space-y-2">
                  {fillableFields.map(f => (
                    <div key={f.id} className="flex gap-3 text-sm">
                      <span className="text-gray-400 shrink-0 w-32 truncate">{f.label || f.id}:</span>
                      <span className="text-gray-700 font-medium break-all">
                        {fieldValues[f.id] || <span className="text-gray-300 italic">—</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="h-12 text-base"
                onClick={() => setStep(fillableFields.length > 0 ? 2 : 1)}
                disabled={submitting}
              >
                Zurück
              </Button>
              <Button
                className="
                  flex-1 h-14 text-base font-bold
                  bg-[#0d9488] hover:bg-[#0d9488]/90
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={!signatureDataUrl || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Wird eingereicht…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Dokument unterzeichnen und einreichen
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Mit Ihrer Unterschrift bestätigen Sie die Richtigkeit der Angaben und stimmen dem Dokument zu.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
