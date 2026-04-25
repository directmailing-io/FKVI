import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2, FileDown, ChevronDown } from 'lucide-react'

const LANG_META = {
  de: { flag: '🇩🇪', label: 'Deutsch' },
  en: { flag: '🇬🇧', label: 'English' },
  fr: { flag: '🇫🇷', label: 'Français' },
  ar: { flag: '🇸🇦', label: 'عربي' },
  vi: { flag: '🇻🇳', label: 'Tiếng Việt' },
}

const UI_T = {
  de: {
    dir: 'ltr',
    loading: 'Broschüre wird geladen...',
    errorTitle: 'Link ungültig oder abgelaufen',
    newRequest: 'Neue Anfrage stellen',
    switchLang: 'Sprache wechseln',
    readQuestion: 'Hast du die Broschüre vollständig gelesen und verstanden?',
    readSubtext: 'Nach deiner Bestätigung erhältst du den Vermittlungsvertrag innerhalb von 7 Tagen.',
    confirmBtn: 'Ja, ich habe sie gelesen und verstanden',
    saving: 'Wird gespeichert...',
    confirmedTitle: 'Lesebestätigung eingegangen',
    confirmedSubtext: 'Du erhältst den Vermittlungsvertrag innerhalb von 7 Tagen per E-Mail.',
    downloadPdf: 'PDF herunterladen',
  },
  en: {
    dir: 'ltr',
    loading: 'Loading brochure...',
    errorTitle: 'Link invalid or expired',
    newRequest: 'Submit new request',
    switchLang: 'Switch language',
    readQuestion: 'Have you fully read and understood the brochure?',
    readSubtext: 'After your confirmation, you will receive the placement contract within 7 days.',
    confirmBtn: 'Yes, I have read and understood it',
    saving: 'Saving...',
    confirmedTitle: 'Reading confirmation received',
    confirmedSubtext: 'You will receive the placement contract within 7 days by email.',
    downloadPdf: 'Download PDF',
  },
  fr: {
    dir: 'ltr',
    loading: 'Chargement de la brochure...',
    errorTitle: 'Lien invalide ou expiré',
    newRequest: 'Nouvelle demande',
    switchLang: 'Changer de langue',
    readQuestion: 'Avez-vous entièrement lu et compris la brochure ?',
    readSubtext: 'Après votre confirmation, vous recevrez le contrat de placement sous 7 jours.',
    confirmBtn: "Oui, je l'ai lue et comprise",
    saving: 'Enregistrement...',
    confirmedTitle: 'Confirmation de lecture reçue',
    confirmedSubtext: 'Vous recevrez le contrat de placement sous 7 jours par e-mail.',
    downloadPdf: 'Télécharger le PDF',
  },
  ar: {
    dir: 'rtl',
    loading: 'جارٍ تحميل الكتيب...',
    errorTitle: 'الرابط غير صالح أو منتهي الصلاحية',
    newRequest: 'تقديم طلب جديد',
    switchLang: 'تغيير اللغة',
    readQuestion: 'هل قرأت الكتيب بالكامل وفهمته؟',
    readSubtext: 'بعد تأكيدك، ستحصل على عقد التوظيف خلال 7 أيام.',
    confirmBtn: 'نعم، لقد قرأته وفهمته',
    saving: 'جارٍ الحفظ...',
    confirmedTitle: 'تم استلام تأكيد القراءة',
    confirmedSubtext: 'ستحصل على عقد التوظيف خلال 7 أيام عبر البريد الإلكتروني.',
    downloadPdf: 'تحميل PDF',
  },
  vi: {
    dir: 'ltr',
    loading: 'Đang tải tài liệu...',
    errorTitle: 'Liên kết không hợp lệ hoặc đã hết hạn',
    newRequest: 'Gửi yêu cầu mới',
    switchLang: 'Đổi ngôn ngữ',
    readQuestion: 'Bạn đã đọc và hiểu đầy đủ tài liệu chưa?',
    readSubtext: 'Sau khi xác nhận, bạn sẽ nhận được hợp đồng môi giới trong vòng 7 ngày.',
    confirmBtn: 'Vâng, tôi đã đọc và hiểu',
    saving: 'Đang lưu...',
    confirmedTitle: 'Đã nhận xác nhận đã đọc',
    confirmedSubtext: 'Bạn sẽ nhận được hợp đồng môi giới trong vòng 7 ngày qua email.',
    downloadPdf: 'Tải xuống PDF',
  },
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
  const dropdownRef = useRef(null)

  // Close dropdown on outside click (avoids z-index overlay issues)
  useEffect(() => {
    if (!langDropdownOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [langDropdownOpen])

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

  const t = UI_T[activeLang] || UI_T.de

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-4">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
        <h1 className="text-lg font-semibold text-gray-700">{t.errorTitle}</h1>
        <p className="text-sm text-gray-500">{error}</p>
        <Link to="/downloads">
          <button className="mt-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            {t.newRequest}
          </button>
        </Link>
      </div>
    </div>
  )

  const { request, available_languages } = pageData
  const currentLangMeta = LANG_META[activeLang] || LANG_META.de
  const availableLangsForSwitcher = available_languages?.filter(l => l !== activeLang) || []

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir={t.dir} style={{ paddingBottom: '72px' }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI" className="h-[52px] w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            {/* Language switcher */}
            {available_languages && available_languages.length > 1 && (
              <div className="relative" ref={dropdownRef}>
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
                      <p className="text-xs text-gray-400 font-medium">{t.switchLang}</p>
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
              <p className="text-sm text-gray-400">{t.loading}</p>
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
                  <p className="font-semibold text-green-800 text-sm leading-tight">{t.confirmedTitle}</p>
                  <p className="text-gray-400 text-xs">{t.confirmedSubtext}</p>
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
                  <span className="hidden sm:inline">{t.downloadPdf}</span>
                </a>
              )}
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{t.readQuestion}</p>
                <p className="text-xs text-gray-400 leading-tight mt-0.5">{t.readSubtext}</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                {confirming ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{t.saving}</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" />{t.confirmBtn}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
