import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2, Clock, FileDown, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BrochureAccessPage() {
  const { token } = useParams()

  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const [readChecked, setReadChecked] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // Load page metadata
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/brochure/page-data?token=${token}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ungültiger Link')
        setPageData(data)
        setConfirmed(data.already_confirmed)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // Fetch PDF signed URL once page data is loaded
  useEffect(() => {
    if (!pageData) return
    const fetchPdf = async () => {
      setPdfLoading(true)
      try {
        const res = await fetch(`/api/brochure/download?token=${token}`)
        const data = await res.json()
        if (res.ok && data.signedUrl) setPdfUrl(data.signedUrl)
      } catch { /* silent */ }
      finally { setPdfLoading(false) }
    }
    fetchPdf()
  }, [pageData, token])

  const handleConfirm = async () => {
    if (!readChecked) return
    setConfirming(true)
    try {
      const res = await fetch('/api/brochure/confirm-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) setConfirmed(true)
    } catch { /* silent */ }
    finally { setConfirming(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-4">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
        <h1 className="text-lg font-semibold text-gray-700">Link ungültig oder abgelaufen</h1>
        <p className="text-sm text-gray-500">{error}</p>
        <Link to="/downloads"><Button variant="outline" size="sm">Neue Anfrage stellen</Button></Link>
      </div>
    </div>
  )

  const { request, version } = pageData

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/"><img src="/logo.svg" alt="FKVI" className="h-12 w-auto" style={{ mixBlendMode: 'multiply' }} /></Link>
          <div className="text-sm text-gray-500">
            {request.first_name} {request.last_name}
            {request.company_name && <span className="text-gray-400"> · {request.company_name}</span>}
            {version && <span className="ml-3 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">v{version.version_number}</span>}
          </div>
        </div>
      </header>

      {/* PDF + Overlay area */}
      <div className="flex-1 flex flex-col relative" style={{ minHeight: 0 }}>

        {/* PDF Viewer */}
        <div className="flex-1 relative overflow-hidden">
          {pdfLoading || !pdfUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              style={{
                filter: confirmed ? 'none' : 'blur(12px)',
                transition: 'filter 0.6s ease',
                pointerEvents: confirmed ? 'auto' : 'none',
                minHeight: 'calc(100vh - 56px)',
              }}
              title="FKVI Broschüre"
            />
          )}

          {/* Blur overlay — only visible when not confirmed */}
          {!confirmed && (
            <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

                {/* Top bar */}
                <div className="bg-fkvi-blue px-6 py-4">
                  <h2 className="text-white font-bold text-lg">Lesebestätigung erforderlich</h2>
                  <p className="text-white/70 text-sm mt-0.5">
                    Bitte lesen Sie die Broschüre vollständig und bestätigen Sie dies.
                  </p>
                </div>

                <div className="p-6 space-y-5">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Nach Ihrer Bestätigung wird die Broschüre vollständig sichtbar und Sie erhalten
                    innerhalb von <strong>7 Tagen</strong> den Vermittlungsvertrag zugesendet.
                  </p>

                  {/* Confirmation checkbox */}
                  <div
                    onClick={() => setReadChecked(c => !c)}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                      readChecked
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-fkvi-blue/40'
                    }`}
                  >
                    {/* Custom checkbox */}
                    <div className={`mt-0.5 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                      readChecked ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'
                    }`}>
                      {readChecked && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        Ich bestätige hiermit, dass ich die FKVI-Broschüre vollständig gelesen habe.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Diese Bestätigung wird revisionssicher mit Zeitstempel gespeichert.
                      </p>
                    </div>
                  </div>

                  {/* Confirm button */}
                  <button
                    onClick={handleConfirm}
                    disabled={!readChecked || confirming}
                    className={`w-full h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      readChecked
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {confirming ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Wird bestätigt...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4" />Broschüre freischalten</>
                    )}
                  </button>

                  {!readChecked && (
                    <p className="text-center text-xs text-gray-400">
                      Aktivieren Sie die Checkbox, um fortzufahren.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar — shown after confirmation */}
        {confirmed && (
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Lesebestätigung eingegangen</span>
              <span className="text-gray-400 text-xs ml-1">· Sie erhalten den Vermittlungsvertrag innerhalb von 7 Tagen</span>
            </div>
            <a
              href={pdfUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-fkvi-blue hover:underline font-medium"
            >
              <FileDown className="h-4 w-4" />
              PDF herunterladen
            </a>
          </div>
        )}

      </div>
    </div>
  )
}
