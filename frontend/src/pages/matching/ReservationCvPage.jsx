import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import CvDocument from '@/components/matching/CvDocument'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, Loader2, AlertCircle } from 'lucide-react'

export default function ReservationCvPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const [profile, setProfile] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      const token = s?.access_token
      if (!token) { setError('Nicht angemeldet.'); setLoading(false); return }

      try {
        const res = await fetch(`/api/matching/reservation-cv?reservationId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler beim Laden')
        setProfile(data.profile)
        setDocuments(data.documents || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
        <h1 className="text-lg font-semibold text-gray-700">Lebenslauf nicht verfügbar</h1>
        <p className="text-sm text-gray-500">{error}</p>
        <Button variant="outline" size="sm" onClick={() => navigate(`/matching/reserviert/${id}`)}>
          ← Zurück
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate(`/matching/reserviert/${id}`)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Statustracker
        </button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Drucken / PDF
        </Button>
      </div>

      {/* CV */}
      <div className="py-8 print:py-0 flex justify-center">
        <div className="shadow-md print:shadow-none overflow-hidden rounded-sm">
          <CvDocument profile={profile} documents={documents} showRealName />
        </div>
      </div>
    </div>
  )
}
