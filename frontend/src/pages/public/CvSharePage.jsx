import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import CvDocument from '@/components/matching/CvDocument'
import { Loader2, AlertCircle, Clock } from 'lucide-react'

export default function CvSharePage() {
  const { token } = useParams()
  const [profile, setProfile] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    fetch(`/api/public/cv-share?token=${token}`)
      .then(async r => {
        const data = await r.json()
        if (r.status === 410) { setExpired(true); return }
        if (!r.ok) { setError(data.error || 'Link ungültig'); return }
        setProfile(data.profile)
        setExpiresAt(data.expiresAt)
      })
      .catch(() => setError('Verbindungsfehler. Bitte versuchen Sie es erneut.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    )
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Link abgelaufen</h1>
          <p className="text-sm text-gray-500">
            Dieser Lebenslauf-Link war 7 Tage gültig und ist nun abgelaufen.
            Bitte fordern Sie einen neuen Link beim Absender an.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
          <h1 className="text-lg font-semibold text-gray-700">Link ungültig</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const expiryStr = expiresAt
    ? new Date(expiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      {/* Expiry notice */}
      {expiryStr && (
        <div className="no-print bg-amber-50 border-b border-amber-200 py-2 px-4 text-center">
          <p className="text-xs text-amber-700">
            <Clock className="h-3 w-3 inline mr-1" />
            Dieser Link ist bis zum <strong>{expiryStr}</strong> gültig · Vertrauliches FKVI-Dokument
          </p>
        </div>
      )}

      <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white">
        <div className="mx-auto shadow-xl print:shadow-none" style={{ maxWidth: 794 }}>
          <CvDocument profile={profile} expiresAt={expiresAt} />
        </div>
      </div>
    </>
  )
}
