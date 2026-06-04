import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, ExternalLink, FileText, ChevronRight, Download, ArrowRight } from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getFileType(url) {
  if (!url) return { label: 'Dokument', color: 'text-gray-500 bg-gray-100', emoji: '📄' }
  const lower = url.toLowerCase()
  if (lower.includes('.pdf') || lower.includes('pdf'))
    return { label: 'PDF', color: 'text-red-600 bg-red-50', emoji: '📕' }
  if (lower.includes('.doc') || lower.includes('word') || lower.includes('document'))
    return { label: 'Word', color: 'text-blue-600 bg-blue-50', emoji: '📘' }
  if (lower.includes('.xls') || lower.includes('sheet') || lower.includes('excel') || lower.includes('spreadsheet'))
    return { label: 'Tabelle', color: 'text-green-600 bg-green-50', emoji: '📗' }
  if (lower.includes('.ppt') || lower.includes('present'))
    return { label: 'Präsentation', color: 'text-orange-600 bg-orange-50', emoji: '📙' }
  if (lower.includes('drive.google') || lower.includes('docs.google'))
    return { label: 'Google Drive', color: 'text-blue-600 bg-blue-50', emoji: '📁' }
  if (lower.startsWith('http'))
    return { label: 'Link', color: 'text-teal-600 bg-teal-50', emoji: '🔗' }
  return { label: 'Dokument', color: 'text-gray-600 bg-gray-100', emoji: '📄' }
}

// ─── Document card ────────────────────────────────────────────────────────────
function DocCard({ file, index }) {
  const ft = getFileType(file.url)
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="group block bg-white rounded-2xl border border-gray-100 p-5 hover:border-teal-200 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
    >
      <div className="flex items-start gap-4">
        {/* File icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-teal-50 flex items-center justify-center transition-colors text-2xl leading-none">
          {ft.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${ft.color}`}>
                  {ft.label}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-base leading-snug group-hover:text-teal-700 transition-colors">
                {file.title}
              </h3>
              {file.description && (
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{file.description}</p>
              )}
            </div>
            <div className="shrink-0 p-2 rounded-xl bg-gray-50 group-hover:bg-teal-500 transition-all duration-200">
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DocBundlePage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/doc-bundle/view?token=${token}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Ungültiger Link')
        setData(json)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
    </div>
  )

  // Error
  if (error) return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-800">Link ungültig</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{error}</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
          Zur Startseite <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )

  const files = data?.files || []
  const recipientName = data?.recipient_name || ''
  const entityName = data?.entity_name || ''
  const greeting = recipientName ? `, ${recipientName}` : ''

  return (
    <div className="min-h-screen bg-[#f7f9fc]">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI" className="h-[46px] w-auto" />
          </Link>
          <span className="text-xs text-gray-400 font-medium hidden sm:block">Fachkraft Vermittlung International</span>
        </div>
      </header>

      {/* Hero section */}
      <div className="bg-gradient-to-b from-white to-[#f7f9fc] border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-[#1a3a5c] to-[#0d9488] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-900/10">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Hallo{greeting}! 👋
            </h1>
            <p className="text-gray-500 mt-3 text-base leading-relaxed max-w-md mx-auto">
              Wir haben {files.length === 1 ? 'ein Dokument' : `${files.length} Dokumente`} für dich zusammengestellt.
              {entityName && ` Im Rahmen deiner Zusammenarbeit mit FKVI.`}
            </p>
            <div className="inline-flex items-center gap-1.5 mt-4 text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              <span>Von Fachkraft Vermittlung International</span>
              {data?.created_at && <span>· {formatDate(data.created_at)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <main className="max-w-2xl mx-auto px-4 py-10">
        {files.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Dokumente in diesem Paket.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              {files.length} Dokument{files.length !== 1 ? 'e' : ''}
            </p>
            {files.map((file, i) => (
              <DocCard key={file.id || i} file={file} index={i} />
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-xs text-gray-400">
            Fragen zu den Unterlagen?{' '}
            <Link to="/kontakt" className="text-teal-600 hover:underline">Kontaktiere uns</Link>
          </p>
          <p className="text-xs text-gray-300">
            © {new Date().getFullYear()} Fachkraft Vermittlung International GmbH & Co. KG
          </p>
        </div>
      </main>

    </div>
  )
}
