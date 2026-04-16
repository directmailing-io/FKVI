import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { PROCESS_STATUS_LABELS, formatDateTime } from '@/lib/utils'
import { BookMarked, User, CheckCircle2, ChevronRight, Clock } from 'lucide-react'

const STATUS_STEPS = Object.entries(PROCESS_STATUS_LABELS)

function ProcessTracker({ currentStatus }) {
  return (
    <div className="space-y-0.5">
      {STATUS_STEPS.map(([step, label]) => {
        const num = parseInt(step)
        const done = num < currentStatus
        const active = num === currentStatus
        return (
          <div key={step} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-sm ${active ? 'bg-fkvi-blue/5' : ''}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
              done ? 'bg-green-500 text-white' :
              active ? 'bg-fkvi-blue text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {done ? '✓' : num}
            </div>
            <span className={
              done ? 'text-gray-400 line-through text-xs' :
              active ? 'text-fkvi-blue font-semibold text-sm' :
              'text-gray-400 text-xs'
            }>{label}</span>
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
  const [history, setHistory] = useState([])
  const { companyId } = useAuthStore()

  const fetchReservations = async () => {
    if (!companyId) { setLoading(false); return }
    try {
      const { data } = await supabase
        .from('reservations')
        .select(`
          id, process_status, created_at, updated_at,
          profiles (
            id, first_name, last_name, gender, age, nationality, marital_status,
            children_count, has_drivers_license, profile_image_url,
            nursing_education, education_duration, graduation_year, german_recognition,
            specializations, additional_qualifications, total_experience_years,
            germany_experience_years, experience_areas, language_skills,
            work_time_preference, state_preferences, nationwide,
            preferred_facility_types, vimeo_video_url, fkvi_competency_proof
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      setReservations(data || [])
      // Update selected if open
      if (selected) {
        const updated = (data || []).find(r => r.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch {
      setReservations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservations()
  }, [companyId])

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return
    const channel = supabase
      .channel(`reservations-${companyId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reservations',
        filter: `company_id=eq.${companyId}`,
      }, () => {
        fetchReservations()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [companyId])

  const handleSelect = async (res) => {
    if (selected?.id === res.id) {
      setSelected(null)
      setHistory([])
      return
    }
    setSelected(res)
    const { data } = await supabase
      .from('process_status_history')
      .select('*')
      .eq('reservation_id', res.id)
      .order('created_at', { ascending: false })
    setHistory(data || [])
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
          <div className="flex-1 space-y-4 min-w-0">
            {reservations.map(res => {
              const p = res.profiles
              if (!p) return null
              const isSelected = selected?.id === res.id

              return (
                <div
                  key={res.id}
                  onClick={() => handleSelect(res)}
                  className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-sm ${
                    isSelected ? 'border-fkvi-blue shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.profile_image_url
                        ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                        : <User className="h-7 w-7 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-900 text-base">
                            {`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Fachkraft'}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {[p.gender, p.age ? `${p.age} J.` : null, p.nationality].filter(Boolean).join(' · ')}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.nursing_education}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            res.process_status === 11 ? 'bg-green-100 text-green-700' :
                            res.process_status >= 8 ? 'bg-purple-100 text-purple-700' :
                            res.process_status >= 5 ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            Schritt {res.process_status}/11
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {PROCESS_STATUS_LABELS[res.process_status]}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`rounded-full h-1.5 transition-all duration-700 ${
                              res.process_status === 11 ? 'bg-green-500' : 'bg-fkvi-blue'
                            }`}
                            style={{ width: `${(res.process_status / 11) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>Start</span>
                          <span>{Math.round((res.process_status / 11) * 100)} %</span>
                          <span>Abschluss</span>
                        </div>
                      </div>

                      {/* Quick info pills */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.total_experience_years && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {p.total_experience_years} J. Erfahrung
                          </span>
                        )}
                        {p.german_recognition && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {p.german_recognition === 'anerkannt' ? '🇩🇪 Anerkannt' :
                             p.german_recognition === 'in_bearbeitung' ? '⏳ Anerkennung läuft' :
                             p.german_recognition}
                          </span>
                        )}
                        {(p.specializations || []).slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-80 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 sticky top-8">
                {/* Current step highlight */}
                <div className="bg-fkvi-blue rounded-xl p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Aktueller Schritt</p>
                  <p className="text-2xl font-bold mt-1">{selected.process_status}/11</p>
                  <p className="text-sm mt-0.5 opacity-90">{PROCESS_STATUS_LABELS[selected.process_status]}</p>
                  <div className="mt-3 bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${(selected.process_status / 11) * 100}%` }}
                    />
                  </div>
                </div>

                <ProcessTracker currentStatus={selected.process_status} />

                <Separator />

                {/* History */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <Clock className="h-3.5 w-3.5" />Verlauf
                  </p>
                  {history.length === 0 ? (
                    <p className="text-xs text-gray-400">Noch kein Verlauf vorhanden.</p>
                  ) : (
                    <div>
                      {history.map((entry, i) => (
                        <div key={entry.id} className="flex gap-3 text-xs">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-fkvi-blue mt-1.5 shrink-0" />
                            {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                          </div>
                          <div className="pb-3">
                            <p className="font-semibold text-gray-800">
                              {entry.old_status
                                ? `Schritt ${entry.old_status} → ${entry.new_status}`
                                : `Start: Schritt ${entry.new_status}`}
                            </p>
                            <p className="text-gray-500">{PROCESS_STATUS_LABELS[entry.new_status]}</p>
                            <p className="text-gray-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Reserviert: {formatDateTime(selected.created_at)}</p>
                  <p>Zuletzt aktualisiert: {formatDateTime(selected.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
