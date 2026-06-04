import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import CvDocument from '@/components/matching/CvDocument'
import { Loader2, AlertCircle } from 'lucide-react'

export default function CvAdminPage() {
  const { profileId } = useParams()
  const [searchParams] = useSearchParams()
  const sig  = searchParams.get('sig')
  const mode = searchParams.get('mode') || 'censored'

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profileId || !sig) {
      setError('Ungültiger Link')
      setLoading(false)
      return
    }
    fetch(`/api/public/cv-admin?profileId=${encodeURIComponent(profileId)}&sig=${encodeURIComponent(sig)}&mode=${encodeURIComponent(mode)}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) { setError(data.error || 'Ungültiger Link'); return }
        setProfile(data.profile)
      })
      .catch(() => setError('Verbindungsfehler. Bitte erneut versuchen.'))
      .finally(() => setLoading(false))
  }, [profileId, sig, mode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
          <h1 className="text-lg font-semibold text-gray-700">Lebenslauf nicht verfügbar</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; margin: 0; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>
      <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white">
        <div className="mx-auto shadow-xl print:shadow-none" style={{ maxWidth: 794 }}>
          <CvDocument profile={profile} showRealName={mode === 'full'} />
        </div>
      </div>
    </>
  )
}
