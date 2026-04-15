import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PROCESS_STATUS_LABELS, formatDateTime } from '@/lib/utils'
import { BookMarked, User, CheckCircle2, Clock, ChevronRight } from 'lucide-react'

const STATUS_STEPS = Object.entries(PROCESS_STATUS_LABELS)

function ProcessTracker({ currentStatus }) {
  return (
    <div className="space-y-1">
      {STATUS_STEPS.map(([step, label]) => {
        const num = parseInt(step)
        const done = num < currentStatus
        const active = num === currentStatus
        const upcoming = num > currentStatus
        return (
          <div key={step} className={`flex items-center gap-2 py-1 text-sm ${
            done ? 'text-gray-400' : active ? 'text-gray-900 font-medium' : 'text-gray-300'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
              done ? 'bg-green-500 text-white' :
              active ? 'bg-fkvi-blue text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {done ? '✓' : num}
            </div>
            <span className={active ? 'text-fkvi-blue' : ''}>{label}</span>
            {active && <ChevronRight className="h-3 w-3 text-fkvi-blue ml-auto" />}
          </div>
        )
      })}
    </div>
  )
}

export default function ReservedProfiles() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const { companyId } = useAuthStore()

  useEffect(() => {
    fetchReservations()
  }, [companyId])

  const fetchReservations = async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('reservations')
      .select(`
        id, process_status, created_at, updated_at,
        profiles (
          id, gender, age, nationality, profile_image_url,
          nursing_education, specializations, total_experience_years,
          german_recognition, vimeo_video_url
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setReservations(data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meine Kandidaten</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {reservations.length === 0
            ? 'Noch keine Kandidaten reserviert'
            : `${reservations.length} ${reservations.length === 1 ? 'Kandidat' : 'Kandidaten'} in Vermittlung`}
        </p>
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
        <div className="flex gap-6">
          {/* List */}
          <div className="flex-1 space-y-4">
            {reservations.map(res => {
              const p = res.profiles
              if (!p) return null
              const isSelected = selected?.id === res.id

              return (
                <div
                  key={res.id}
                  onClick={() => setSelected(isSelected ? null : res)}
                  className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-sm ${
                    isSelected ? 'border-fkvi-blue shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.profile_image_url ? (
                        <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {p.gender}{p.age ? `, ${p.age} J.` : ''}
                          </p>
                          <p className="text-sm text-gray-500">{p.nationality}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold text-fkvi-blue">Schritt {res.process_status}/11</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {PROCESS_STATUS_LABELS[res.process_status]}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-fkvi-blue rounded-full h-1.5 transition-all"
                            style={{ width: `${(res.process_status / 11) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>Start</span>
                          <span>Abschluss</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 sticky top-8">
                <div>
                  <h3 className="font-semibold text-gray-900">Vermittlungsprozess</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Aktueller Schritt: {selected.process_status} von 11
                  </p>
                </div>

                <div className="bg-fkvi-blue/5 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-fkvi-blue uppercase tracking-wide">Aktuell</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {PROCESS_STATUS_LABELS[selected.process_status]}
                  </p>
                </div>

                <Separator />

                <ProcessTracker currentStatus={selected.process_status} />

                <Separator />

                <div className="text-xs text-gray-400 space-y-1">
                  <p>Reserviert: {formatDateTime(selected.created_at)}</p>
                  <p>Letzte Aktualisierung: {formatDateTime(selected.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
