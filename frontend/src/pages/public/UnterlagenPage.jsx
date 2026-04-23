import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, FileText, ExternalLink, CheckCircle2, Lock, AlertCircle } from 'lucide-react'

const DOC_TYPE_LABELS = {
  lebenslauf:    'Lebenslauf',
  reisepass:     'Reisepass',
  zeugnis:       'Zeugnis',
  urkunde:       'Urkunde',
  anerkennung:   'Anerkennungsbescheid',
  sprachzeugnis: 'Sprachzertifikat',
  andere:        'Sonstiges',
}

export default function UnterlagenPage() {
  const { token } = useParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/company-docs/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Abrufen')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatExpiry = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-16 px-4">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1a3a5c] rounded-2xl mb-4 shadow-lg">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">FKVI Unterlagen</h1>
        <p className="text-gray-500 text-sm mt-1">Fachkräfte Vermittlung International</p>
      </div>

      <div className="w-full max-w-md">
        {!result ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-[#1a3a5c]" />
              <h2 className="text-lg font-semibold text-gray-900">Zugang verifizieren</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Dieser Link ist ausschließlich für Ihr Unternehmen bestimmt. Bitte geben Sie Ihre E-Mail-Adresse ein, um die Unterlagen abzurufen.
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  required
                  autoFocus
                  className="h-11"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-11 bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white font-semibold"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird geprüft...</>
                  : 'Unterlagen abrufen'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <h2 className="text-lg font-semibold text-gray-900">Verifizierung erfolgreich</h2>
              </div>
              {result.companyName && (
                <p className="text-sm text-gray-500">Unterlagen für: <strong>{result.companyName}</strong></p>
              )}
              {result.expiresAt && (
                <p className="text-xs text-gray-400 mt-1">Zugang gültig bis {formatExpiry(result.expiresAt)}</p>
              )}
            </div>

            {/* Documents table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Verfügbare Dokumente ({result.documents.length})</h3>
              </div>

              {result.documents.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Keine Dokumente verfügbar.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {result.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-4">
                      <div className="w-9 h-9 rounded-lg bg-[#1a3a5c]/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#1a3a5c]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{doc.title}</p>
                        {doc.doc_type && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                          </p>
                        )}
                      </div>
                      {doc.link ? (
                        <a
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a3a5c] hover:text-[#1a3a5c]/80 bg-[#1a3a5c]/10 hover:bg-[#1a3a5c]/15 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Öffnen
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs text-gray-400">Kein Link</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 px-4">
              Aus Datenschutzgründen sind diese Dokumente ausschließlich für Ihr Unternehmen bestimmt und nicht an Dritte weiterzugeben.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
