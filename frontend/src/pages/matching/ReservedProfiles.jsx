import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { PROCESS_STATUS_LABELS } from '@/lib/utils'
import { BookMarked, User, ChevronRight, CheckCircle2 } from 'lucide-react'

export default function ReservedProfiles() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const { companyId } = useAuthStore()
  const navigate = useNavigate()

  const fetchReservations = async () => {
    if (!companyId) { setLoading(false); return }
    try {
      const { data } = await supabase
        .from('reservations')
        .select(`
          id, process_status, created_at, updated_at,
          profiles ( id, first_name, last_name, gender, age, nationality, profile_image_url, nursing_education )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      setReservations(data || [])
    } catch {
      setReservations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReservations() }, [companyId])

  // Polling fallback: guarantees updates even if realtime broadcast fails
  useEffect(() => {
    if (!companyId) return
    const interval = setInterval(fetchReservations, 4000)
    return () => clearInterval(interval)
  }, [companyId])

  // Realtime: subscribe to "reservation-updates" broadcast channel.
  // Server broadcasts to topic "realtime:reservation-updates" via HTTP API,
  // which the supabase-js client maps to channel name "reservation-updates".
  useEffect(() => {
    if (!companyId) return
    const channel = supabase
      .channel('reservation-updates')
      .on('broadcast', { event: 'status_update' }, ({ payload }) => {
        if (String(payload?.companyId) === String(companyId)) fetchReservations()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reservations',
        filter: `company_id=eq.${companyId}`,
      }, () => fetchReservations())
      .subscribe((status, err) => {
        if (err) console.error('Realtime subscribe error (list):', err)
      })
    return () => { supabase.removeChannel(channel) }
  }, [companyId])

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Statustracker
            <span className="flex items-center gap-1 text-sm font-semibold text-green-600">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              Live
            </span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {reservations.length === 0
              ? 'Noch keine Kandidaten in Vermittlung'
              : `${reservations.length} ${reservations.length === 1 ? 'Kandidat' : 'Kandidaten'} in Vermittlung`}
          </p>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <BookMarked className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-1">Noch keine Kandidaten</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Sobald FKVI Profile für Sie reserviert, erscheinen diese hier mit dem aktuellen Prozessstatus.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map(res => {
            const p = res.profiles
            if (!p) return null
            const step = res.process_status
            const pct = Math.round((step / 11) * 100)

            const isDone = step === 11
            return (
              <div
                key={res.id}
                onClick={() => navigate(`/matching/reserviert/${res.id}`)}
                className={`rounded-xl border p-5 cursor-pointer transition-all group ${
                  isDone
                    ? 'bg-emerald-50 border-emerald-200 hover:shadow-md hover:border-emerald-400'
                    : 'bg-white border-gray-200 hover:shadow-md hover:border-fkvi-blue/30'
                }`}
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${isDone ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    {p.profile_image_url
                      ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                      : isDone
                        ? <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        : <User className="h-6 w-6 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">
                          {`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Fachkraft'}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {[p.nursing_education, p.nationality, p.age ? `${p.age} J.` : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isDone ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />Abgeschlossen
                          </span>
                        ) : (
                          <>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              step >= 8 ? 'bg-purple-100 text-purple-700' :
                              step >= 5 ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              Schritt {step}/11
                            </span>
                            <p className="text-xs text-gray-400 mt-1">{PROCESS_STATUS_LABELS[step]}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${step === 11 ? 'bg-green-500' : 'bg-fkvi-blue'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{pct} %</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-fkvi-blue transition-colors shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
