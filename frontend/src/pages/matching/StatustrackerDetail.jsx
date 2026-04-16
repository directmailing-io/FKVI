import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { PROCESS_STATUS_LABELS, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft, User, CheckCircle2, ChevronRight, Clock,
  Globe, FileText, Award, Stethoscope, Languages, MapPin, ExternalLink,
  Baby, Car, Heart, Briefcase, BookOpen
} from 'lucide-react'

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
              active ? 'text-fkvi-blue font-semibold' :
              'text-gray-400 text-xs'
            }>{label}</span>
            {active && <ChevronRight className="h-3 w-3 text-fkvi-blue ml-auto" />}
          </div>
        )
      })}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{value}</span>
    </div>
  )
}

export default function StatustrackerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { companyId } = useAuthStore()

  const [reservation, setReservation] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState([])

  const fetchData = async () => {
    if (!companyId) return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const [{ data: res }, { data: hist }] = await Promise.all([
      supabase
        .from('reservations')
        .select(`
          id, process_status, created_at, updated_at,
          profiles (
            id, first_name, last_name, gender, age, nationality, marital_status,
            children_count, has_drivers_license, profile_image_url, vimeo_video_url,
            nursing_education, education_duration, graduation_year, german_recognition,
            education_notes, specializations, additional_qualifications,
            total_experience_years, germany_experience_years, experience_areas,
            language_skills, work_time_preference, state_preferences, nationwide,
            preferred_facility_types, fkvi_competency_proof
          )
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .single(),
      supabase
        .from('process_status_history')
        .select('*')
        .eq('reservation_id', id)
        .order('created_at', { ascending: false }),
    ])
    // Always update reservation — null means it was deleted (decoupled)
    setReservation(res || null)
    if (res && token) {
      // Fetch documents via API (service role) to bypass potential RLS restrictions
      try {
        const docsRes = await fetch(`/api/matching/profile-documents?reservationId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (docsRes.ok) {
          const { documents: docs } = await docsRes.json()
          setDocuments(docs || [])
        } else {
          setDocuments([])
        }
      } catch {
        setDocuments([])
      }
    } else {
      setDocuments([])
    }
    setHistory(hist || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id, companyId])

  // Polling fallback: guarantees updates even if realtime broadcast fails
  useEffect(() => {
    if (!id || !companyId) return
    const interval = setInterval(fetchData, 4000)
    return () => clearInterval(interval)
  }, [id, companyId])

  // Realtime: subscribe to "reservation-updates" broadcast channel.
  // Server broadcasts to topic "realtime:reservation-updates" via HTTP API,
  // which the supabase-js client maps to channel name "reservation-updates".
  // Filter by reservationId in payload — no RLS needed for broadcast.
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel('reservation-updates')
      .on('broadcast', { event: 'status_update' }, ({ payload }) => {
        if (String(payload?.reservationId) === String(id)) fetchData()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reservations',
        filter: `id=eq.${id}`,
      }, () => fetchData())
      .subscribe((status, err) => {
        if (err) console.error('Realtime subscribe error (detail):', err)
      })
    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) return (
    <div className="space-y-4 max-w-5xl">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )

  if (!reservation) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Kandidat nicht gefunden.</p>
      <button onClick={() => navigate('/matching/reserviert')} className="mt-4 text-fkvi-blue text-sm hover:underline">
        ← Zurück zur Übersicht
      </button>
    </div>
  )

  const p = reservation.profiles
  const step = reservation.process_status
  const pct = Math.round((step / 11) * 100)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/matching/reserviert')}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              {`${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Kandidat'}
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {[p?.nursing_education, p?.nationality].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          onClick={() => navigate(`/matching/reserviert/${id}/lebenslauf`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-fkvi-blue/30 bg-fkvi-blue/5 text-fkvi-blue text-sm font-medium hover:bg-fkvi-blue hover:text-white transition-colors shrink-0"
        >
          <BookOpen className="h-4 w-4" />
          Lebenslauf
        </button>
      </div>

      {/* Abgeschlossen-Banner — nur wenn Step 11 erreicht */}
      {step === 11 && (
        <div className="bg-emerald-600 rounded-xl p-6 text-center text-white shadow-sm">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-200" />
          <p className="text-xl font-bold">Vermittlung abgeschlossen!</p>
          <p className="text-emerald-200 text-sm mt-1">
            {`${p?.first_name || ''} ${p?.last_name || ''}`.trim()} hat erfolgreich den Arbeitsstart erreicht.
          </p>
        </div>
      )}

      {/* Progress bar — nur wenn noch nicht abgeschlossen */}
      {step < 11 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold text-gray-700">{PROCESS_STATUS_LABELS[step]}</span>
            <span className="text-gray-400 font-medium">Schritt {step}/11 · {pct} %</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-700 bg-fkvi-blue"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Full profile */}
        <div className="lg:col-span-2 space-y-5">

          {/* Photo + basic info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex gap-5">
              <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                {p?.profile_image_url
                  ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                  : <User className="h-10 w-10 text-gray-300" />}
              </div>
              <div className="flex-1 space-y-1.5">
                <h2 className="text-lg font-bold text-gray-900">
                  {`${p?.first_name || ''} ${p?.last_name || ''}`.trim()}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {p?.gender && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.gender}</span>}
                  {p?.age && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.age} Jahre</span>}
                  {p?.nationality && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.nationality}</span>}
                  {p?.marital_status && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"><Heart className="h-2.5 w-2.5 inline mr-0.5" />{p.marital_status}</span>}
                  {(p?.children_count > 0) && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"><Baby className="h-2.5 w-2.5 inline mr-0.5" />{p.children_count} {p.children_count === 1 ? 'Kind' : 'Kinder'}</span>}
                  {p?.has_drivers_license && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"><Car className="h-2.5 w-2.5 inline mr-0.5" />Führerschein</span>}
                  {p?.fkvi_competency_proof && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">✓ FKVI Kompetenznachweis</span>}
                </div>
              </div>
            </div>

            {p?.vimeo_video_url && (
              <div className="mt-5">
                <div className="rounded-xl overflow-hidden aspect-video bg-black">
                  <iframe
                    src={p.vimeo_video_url}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-gray-400" />Ausbildung
            </h3>
            <div className="space-y-2">
              <InfoRow label="Abschluss" value={p?.nursing_education} />
              <InfoRow label="Dauer" value={p?.education_duration} />
              <InfoRow label="Abschlussjahr" value={p?.graduation_year ? String(p.graduation_year) : null} />
              <InfoRow label="Anerkennung (DE)"
                value={
                  p?.german_recognition === 'anerkannt' ? '✓ Anerkannt' :
                  p?.german_recognition === 'in_bearbeitung' ? '⏳ In Bearbeitung' :
                  p?.german_recognition === 'nicht_beantragt' ? 'Noch nicht beantragt' :
                  p?.german_recognition === 'abgelehnt' ? 'Abgelehnt' :
                  p?.german_recognition
                }
              />
              {p?.education_notes && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mt-2">{p.education_notes}</p>
              )}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <Stethoscope className="h-4 w-4 text-gray-400" />Erfahrung
            </h3>
            <div className="space-y-2">
              <InfoRow label="Gesamterfahrung" value={p?.total_experience_years ? `${p.total_experience_years} Jahre` : null} />
              <InfoRow label="Erfahrung in DE" value={p?.germany_experience_years ? `${p.germany_experience_years} Jahre` : null} />
            </div>
            {(p?.specializations || []).length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Spezialisierungen</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.specializations.map(s => (
                    <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {(p?.additional_qualifications || []).length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Zusatzqualifikationen</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.additional_qualifications.map(q => (
                    <span key={q} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">{q}</span>
                  ))}
                </div>
              </div>
            )}
            {(p?.experience_areas || []).length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Erfahrungsbereiche</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.experience_areas.map(a => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Languages */}
          {(p?.language_skills || []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Languages className="h-4 w-4 text-gray-400" />Sprachkenntnisse
              </h3>
              <div className="space-y-2">
                {p.language_skills.map((lang, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{lang.language}</span>
                    <span className="text-xs font-semibold bg-fkvi-blue/10 text-fkvi-blue px-2.5 py-1 rounded-full">{lang.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />Präferenzen
            </h3>
            <div className="space-y-2">
              <InfoRow label="Arbeitszeit" value={p?.work_time_preference} />
              <InfoRow label="Bundesländer"
                value={p?.nationwide ? 'Deutschlandweit' : (p?.state_preferences || []).join(', ')}
              />
              {(p?.preferred_facility_types || []).length > 0 && (
                <div className="flex gap-3">
                  <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">Einrichtungstypen</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.preferred_facility_types.map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-400" />
                Dokumente
                <span className="ml-1 text-xs font-normal text-gray-400">({documents.length})</span>
              </h3>
              <div className="space-y-2">
                {documents.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-fkvi-blue/30 hover:bg-fkvi-blue/5 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-fkvi-blue/10">
                      <FileText className="h-4 w-4 text-fkvi-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.title || 'Dokument'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.doc_type && <span className="text-xs text-gray-400">{doc.doc_type}</span>}
                        {doc.description && <span className="text-xs text-gray-400 truncate">{doc.doc_type ? `· ${doc.description}` : doc.description}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-fkvi-blue font-medium flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Öffnen <ExternalLink className="h-3 w-3" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Process tracker + History */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-8 space-y-5">
            {/* Current step / Abgeschlossen */}
            {step === 11 ? (
              <div className="bg-emerald-600 rounded-xl p-4 text-white text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-200" />
                <p className="font-bold text-base">Abgeschlossen</p>
                <p className="text-emerald-200 text-xs mt-0.5">Alle 11 Schritte abgeschlossen</p>
              </div>
            ) : (
              <div className="bg-fkvi-blue rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Aktueller Schritt</p>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                    </span>
                    Live
                  </span>
                </div>
                <p className="text-2xl font-bold">{step}/11</p>
                <p className="text-sm mt-0.5 opacity-90">{PROCESS_STATUS_LABELS[step]}</p>
                <div className="mt-3 bg-white/20 rounded-full h-1.5">
                  <div className="bg-white h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <ProcessTracker currentStatus={step} />

            <Separator />

            {/* History */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Clock className="h-3.5 w-3.5" />Verlauf
              </p>
              {history.length === 0 ? (
                <p className="text-xs text-gray-400">Noch kein Verlauf.</p>
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
                          {entry.old_status ? `Schritt ${entry.old_status} → ${entry.new_status}` : `Start: Schritt ${entry.new_status}`}
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
              <p>Reserviert: {formatDateTime(reservation.created_at)}</p>
              <p>Aktualisiert: {formatDateTime(reservation.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
