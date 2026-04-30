import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, FileText, Clock, ChevronRight, Loader2, Package, Paperclip, ExternalLink } from 'lucide-react'

const DOC_TYPE_LABELS = {
  lebenslauf: 'Lebenslauf', reisepass: 'Reisepass', zeugnis: 'Zeugnis',
  urkunde: 'Urkunde', anerkennung: 'Anerkennung', sprachzeugnis: 'Sprachnachweis', andere: 'Sonstiges',
}

function StatusBadge({ status }) {
  if (status === 'submitted' || status === 'signed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Unterzeichnet
      </span>
    )
  }
  if (status === 'opened') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
        <Clock className="h-3.5 w-3.5" />
        Geöffnet
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
      <Clock className="h-3.5 w-3.5" />
      Ausstehend
    </span>
  )
}

export default function BundlePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/admin/dokumente/bundle-get?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Paket konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a3a5c]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Paket nicht verfügbar</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const { bundle, documents, attachments = [] } = data
  const fillDocs = documents.filter(d => d.sendMode !== 'view')
  const viewDocs = documents.filter(d => d.sendMode === 'view')
  const signedCount = fillDocs.filter(d => d.status === 'submitted' || d.status === 'signed').length
  const total = fillDocs.length
  const allDone = total === 0 || signedCount === total
  const progress = total > 0 ? Math.round((signedCount / total) * 100) : 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a3a5c] text-white">
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest font-medium">Fachkraft Vermittlung International</p>
              <h1 className="text-lg font-bold leading-tight">
                {bundle.title || 'Dokument-Paket'}
              </h1>
            </div>
          </div>

          {bundle.message && (
            <p className="text-white/70 text-sm leading-relaxed mb-4">{bundle.message}</p>
          )}

          {/* Progress */}
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white/80">
                {allDone ? 'Alles erledigt!' : `${signedCount} von ${total} ${total === 1 ? 'Dokument' : 'Dokumenten'} unterzeichnet`}
              </span>
              <span className="text-sm font-bold text-white">{progress}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: allDone ? '#22c55e' : '#0ea5a0' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Document cards */}
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {allDone && total > 0 && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Alle Dokumente unterzeichnet!</p>
              <p className="text-green-600 text-xs mt-0.5">Vielen Dank – alles ist eingegangen.</p>
            </div>
          </div>
        )}

        {/* Section: Docs to fill/sign */}
        {fillDocs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Zum Ausfüllen &amp; Unterzeichnen</p>
            {fillDocs.map((doc, idx) => {
              const isDone = doc.status === 'submitted' || doc.status === 'signed'
              return (
                <div key={doc.id} className={`bg-white rounded-xl border transition-all ${isDone ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:border-[#1a3a5c]/30 hover:shadow-sm'}`}>
                  <div className="p-4 flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isDone ? 'bg-green-500 text-white' : 'bg-[#1a3a5c]/10 text-[#1a3a5c]'}`}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${isDone ? 'text-gray-500 line-through decoration-green-400' : 'text-gray-900'}`}>{doc.templateName}</p>
                      <div className="mt-1"><StatusBadge status={doc.status} /></div>
                    </div>
                    {isDone ? (
                      <span className="text-xs text-green-600 font-medium shrink-0">Erledigt ✓</span>
                    ) : (
                      <button onClick={() => navigate(`/dokument/${doc.token}?bundle=${token}`)}
                        className="flex items-center gap-1.5 bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0">
                        Ausfüllen <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Section: View-only docs */}
        {viewDocs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Zum Ansehen</p>
            {viewDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 hover:border-[#1a3a5c]/30 hover:shadow-sm transition-all">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{doc.templateName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Zum Ansehen</p>
                  </div>
                  <button onClick={() => navigate(`/dokument/${doc.token}`)}
                    className="flex items-center gap-1.5 border border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0">
                    Ansehen <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section: Attachments (view only) */}
        {attachments.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" />Beiliegende Dokumente
            </p>
            {attachments.map((att) => (
              <div key={att.id} className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{att.title}</p>
                    {(att.doc_type || att.profile_name) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[DOC_TYPE_LABELS[att.doc_type] || att.doc_type, att.profile_name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {att.url ? (
                    <a href={att.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#1a3a5c] hover:text-[#1a3a5c]/80 text-sm font-semibold shrink-0">
                      Öffnen <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">Kein Link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-4">
          Fachkraft Vermittlung International GmbH &amp; Co. KG
        </p>
      </div>
    </div>
  )
}
