import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2, FileDown, ChevronDown } from 'lucide-react'

const LANG_META = {
  de: { flag: '🇩🇪', label: 'Deutsch' },
  en: { flag: '🇬🇧', label: 'English' },
  fr: { flag: '🇫🇷', label: 'Français' },
  ar: { flag: '🇸🇦', label: 'عربي' },
  vi: { flag: '🇻🇳', label: 'Tiếng Việt' },
}

export default function BrochureAccessPage() {
  const { token } = useParams()

  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeLang, setActiveLang] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const [langDropdownOpen, setLangDropdownOpen] = useState(false)

  // Load page metadata
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/brochure/page-data?token=${token}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ungültiger Link')
        setPageData(data)
        setConfirmed(data.already_confirmed)
        setActiveLang(data.request?.language || 'de')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // Load PDF when activeLang changes
  useEffect(() => {
    if (!pageData || !activeLang) return
    const fetchPdf = async () => {
      setPdfLoading(true)
      setPdfUrl(null)
      try {
        const res = await fetch(`/api/brochure/download?token=${token}&lang=${activeLang}`)
        const data = await res.json()
        if (res.ok && data.signedUrl) setPdfUrl(data.signedUrl)
      } catch { /* silent */ }
      finally { setPdfLoading(false) }
    }
    fetchPdf()
  }, [pageData, token, activeLang])

  const handleConfirm = async () => {
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

  const switchLang = lang => {
    setActiveLang(lang)
    setLangDropdownOpen(false)
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
        <Link to="/downloads">
          <button className="mt-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Neue Anfrage stellen
          </button>
        </Link>
      </div>
    </div>
  )

  const { request, available_languages } = pageData
  const currentLangMeta = LANG_META[activeLang] || LANG_META.de
  const availableLangsForSwitcher = available_languages?.filter(l => l !== activeLang) || []

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ paddingBottom: '72px' }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI" className="h-[52px] w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            {/* Language switcher */}
            {available_languages && available_languages.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">{currentLangMeta.flag}</span>
                  <span className="hidden sm:inline">{currentLangMeta.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {langDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20 min-w-[160px]">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-400 font-medium">Sprache wechseln</p>
                    </div>
                    {/* Current language */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-teal-50">
                      <span className="text-base">{currentLangMeta.flag}</span>
                      <span className="text-sm text-teal-700 font-semibold">{currentLangMeta.label}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 ml-auto" />
                    </div>
                    {availableLangsForSwitcher.map(lang => {
                      const m = LANG_META[lang]
                      if (!m) return null
                      return (
                        <button
                          key={lang}
                          onClick={() => switchLang(lang)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="text-base">{m.flag}</span>
                          <span className="text-sm text-gray-700">{m.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="text-sm text-gray-500">
              {request.first_name} {request.last_name}
            </div>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="flex-1 relative">
        {pdfLoading || !pdfUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-400">Broschüre wird geladen...</p>
            </div>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            className="w-full border-0"
            style={{ height: 'calc(100vh - 14px - 72px)', display: 'block' }}
            title="FKVI Informationsbroschüre"
          />
        )}

        {/* Click-away close for lang dropdown */}
        {langDropdownOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setLangDropdownOpen(false)} />
        )}
      </div>

      {/* Sticky bottom bar — always visible */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200"
        style={{ background: '#fff', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between gap-4">
          {confirmed ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 text-sm leading-tight">Lesebestätigung eingegangen</p>
                  <p className="text-gray-400 text-xs">Du erhältst den Vermittlungsvertrag innerhalb von 7 Tagen per E-Mail.</p>
                </div>
              </div>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF herunterladen</span>
                </a>
              )}
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">Hast du die Broschüre vollständig gelesen?</p>
                <p className="text-xs text-gray-400 leading-tight mt-0.5">Nach deiner Bestätigung erhältst du den Vermittlungsvertrag innerhalb von 7 Tagen.</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                {confirming ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Wird gespeichert...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" />Ja, ich habe sie gelesen</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
