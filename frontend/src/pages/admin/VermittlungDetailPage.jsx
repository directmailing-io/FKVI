import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PROCESS_STATUS_LABELS, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft, User, Building2, Mail, Phone, CheckCircle2,
  Circle, Loader2, AlertTriangle, Send, Clock, ChevronRight,
  ExternalLink
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Steps that trigger an automatic email to the company
const EMAIL_TRIGGER_STEPS = new Set([2, 8, 9])

// ─── Step dot ─────────────────────────────────────────────────────────────────
function StepDot({ step, current }) {
  const done   = step < current
  const active = step === current
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
      done   ? 'bg-green-500 text-white shadow-sm' :
      active ? 'bg-fkvi-blue text-white shadow-md ring-4 ring-fkvi-blue/20' :
               'bg-gray-100 text-gray-400'
    }`}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : step}
    </div>
  )
}

// ─── Process step row ─────────────────────────────────────────────────────────
function StepRow({ step, label, current }) {
  const done   = step < current
  const active = step === current
  const future = step > current
  const hasEmail = EMAIL_TRIGGER_STEPS.has(step)

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
      active ? 'bg-fkvi-blue/5' : 'hover:bg-gray-50'
    }`}>
      <StepDot step={step} current={current} />
      <span className={`flex-1 text-sm leading-tight ${
        done ? 'text-gray-400 line-through' : active ? 'text-fkvi-blue font-semibold' : 'text-gray-500'
      }`}>
        {label}
      </span>
      {hasEmail && (
        <span title="E-Mail wird automatisch ausgelöst"
          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${
            done || active ? 'border-blue-200 text-blue-500 bg-blue-50' : 'border-gray-200 text-gray-300'
          }`}>
          ✉
        </span>
      )}
      {active && <ChevronRight className="h-3.5 w-3.5 text-fkvi-blue shrink-0" />}
    </div>
  )
}

// ─── History entry ────────────────────────────────────────────────────────────
function HistoryEntry({ entry }) {
  return (
    <div className="flex gap-3 text-sm">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-fkvi-blue mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>
      <div className="pb-4 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-gray-800">
            {entry.old_status ? `Schritt ${entry.old_status} → ${entry.new_status}` : `Start: Schritt ${entry.new_status}`}
          </span>
          <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
          {EMAIL_TRIGGER_STEPS.has(entry.new_status) && (
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded">E-Mail gesendet</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{PROCESS_STATUS_LABELS[entry.new_status]}</p>
        {entry.notes && (
          <p className="text-xs text-gray-400 mt-1 italic bg-gray-50 rounded px-2 py-1">{entry.notes}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VermittlungDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const [reservation, setReservation] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [note, setNote] = useState('')
  const [stopDialog, setStopDialog] = useState(false)
  const [stopping, setStopping] = useState(false)

  useEffect(() => { fetchData() }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resRes, histRes] = await Promise.all([
        supabase
          .from('reservations')
          .select(`
            id, process_status, created_at, updated_at,
            profile_id, company_id,
            profiles (
              id, first_name, last_name, gender, age, nationality,
              profile_image_url, nursing_education, specializations,
              total_experience_years, german_recognition
            ),
            companies (
              id, company_name, email, phone, first_name, last_name, city
            )
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('process_status_history')
          .select('*')
          .eq('reservation_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (resRes.data) setReservation(resRes.data)
      setHistory(histRes.data || [])
    } catch {
      // reservation will remain null, showing "not found" state
    } finally {
      setLoading(false)
    }
  }

  const handleAdvance = async () => {
    if (!reservation) return
    const newStatus = reservation.process_status + 1
    if (newStatus > 11) return
    setAdvancing(true)
    try {
      const res = await fetch('/api/admin/update-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ reservationId: id, newStatus, notes: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const emailSent = EMAIL_TRIGGER_STEPS.has(newStatus)
      toast({
        title: `Weiter zu Schritt ${newStatus}`,
        description: emailSent
          ? `${PROCESS_STATUS_LABELS[newStatus]} — E-Mail wurde automatisch an das Unternehmen gesendet.`
          : PROCESS_STATUS_LABELS[newStatus],
        variant: 'success',
      })
      setNote('')
      await fetchData()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setAdvancing(false)
    }
  }

  const handleBack = async () => {
    if (!reservation || reservation.process_status <= 1) return
    const newStatus = reservation.process_status - 1
    setAdvancing(true)
    try {
      const res = await fetch('/api/admin/update-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ reservationId: id, newStatus, notes: `Schritt zurückgesetzt. ${note.trim()}`.trim() }),
      })
      if (!res.ok) throw new Error()
      toast({ title: `Zurück zu Schritt ${newStatus}`, description: PROCESS_STATUS_LABELS[newStatus] })
      setNote('')
      await fetchData()
    } catch {
      toast({ title: 'Fehler', description: 'Zurücksetzen fehlgeschlagen.', variant: 'destructive' })
    } finally {
      setAdvancing(false)
    }
  }

  const handleStop = async () => {
    setStopping(true)
    try {
      // Set profile back to published
      await supabase.from('profiles').update({ status: 'published' }).eq('id', reservation.profile_id)
      // Delete reservation
      await supabase.from('process_status_history').delete().eq('reservation_id', id)
      await supabase.from('reservations').delete().eq('id', id)
      toast({ title: 'Vermittlung beendet', description: 'Das Profil ist wieder als verfügbar markiert.' })
      navigate('/admin/vermittlungen')
    } catch {
      toast({ title: 'Fehler', description: 'Beenden fehlgeschlagen.', variant: 'destructive' })
    } finally {
      setStopping(false)
    }
  }

  if (loading) return (
    <div className="space-y-4 max-w-5xl">
      <Skeleton className="h-8 w-64" />
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
      <p className="text-gray-500">Vermittlung nicht gefunden.</p>
      <Button variant="outline" onClick={() => navigate('/admin/vermittlungen')} className="mt-4">
        Zurück zur Übersicht
      </Button>
    </div>
  )

  const p = reservation.profiles
  const c = reservation.companies
  const step = reservation.process_status
  const isDone = step === 11
  const nextStep = step + 1
  const nextEmailTrigger = EMAIL_TRIGGER_STEPS.has(nextStep)
  const pct = Math.round((step / 11) * 100)

  return (
    <>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/vermittlungen')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.gender || 'Fachkraft' : '—'}
              {' '}<span className="text-gray-400 font-normal">→</span>{' '}
              {c?.company_name || '—'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Gestartet: {formatDateTime(reservation.created_at)} · Schritt {step}/11
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStopDialog(true)}
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Vermittlung beenden
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold text-gray-700">{PROCESS_STATUS_LABELS[step]}</span>
            <span className="text-gray-400">{pct} %</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${isDone ? 'bg-green-500' : 'bg-fkvi-blue'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isDone && (
            <div className="mt-3 flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle2 className="h-4 w-4" />Vermittlung erfolgreich abgeschlossen!
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Info + History ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Profil + Firma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Profil */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />Fachkraft
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                    {p?.profile_image_url
                      ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                      : <User className="h-5 w-5 text-gray-300" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.gender || '—' : '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {[p?.nationality, p?.age ? `${p.age} J.` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {p?.nursing_education && <p>🎓 {p.nursing_education}</p>}
                  {p?.total_experience_years && <p>⏱ {p.total_experience_years} Jahre Erfahrung</p>}
                  {(p?.specializations || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.specializations.slice(0, 3).map(s => (
                        <span key={s} className="bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                {p?.id && (
                  <Link to={`/admin/fachkraefte/${p.id}`}
                    className="text-xs text-fkvi-blue hover:underline flex items-center gap-1">
                    Profil öffnen <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {/* Unternehmen */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400" />Unternehmen
                </h3>
                <div>
                  <p className="font-semibold text-gray-900">{c?.company_name || '—'}</p>
                  <p className="text-xs text-gray-400">{c?.city || ''}</p>
                </div>
                <div className="text-xs text-gray-500 space-y-2">
                  {(c?.first_name || c?.last_name) && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gray-300" />
                      {c.first_name} {c.last_name}
                    </div>
                  )}
                  {c?.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-fkvi-blue hover:underline">
                      <Mail className="h-3.5 w-3.5" />{c.email}
                    </a>
                  )}
                  {c?.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-300" />{c.phone}
                    </div>
                  )}
                </div>
                {c?.id && (
                  <Link to={`/admin/crm/${c.id}`}
                    className="text-xs text-fkvi-blue hover:underline flex items-center gap-1">
                    CRM-Eintrag <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Prozesshistorie */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />Prozesshistorie
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400">Noch keine Einträge.</p>
              ) : (
                <div>
                  {history.map(entry => (
                    <HistoryEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: 11-Step Tracker + Actions ───────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Prozessschritte</h3>

              <div className="space-y-0.5 mb-5">
                {Object.entries(PROCESS_STATUS_LABELS).map(([s, label]) => (
                  <StepRow key={s} step={Number(s)} label={label} current={step} />
                ))}
              </div>

              {!isDone && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {/* Note */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Notiz (optional)</label>
                    <Textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Anmerkung zum nächsten Schritt..."
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>

                  {/* Email hint */}
                  {nextEmailTrigger && (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                      <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Bei Schritt {nextStep} wird automatisch eine E-Mail an {c?.email || 'das Unternehmen'} gesendet.</span>
                    </div>
                  )}

                  {/* Advance button */}
                  <Button
                    onClick={handleAdvance}
                    disabled={advancing}
                    className="w-full"
                  >
                    {advancing
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird gespeichert...</>
                      : <>Weiter zu Schritt {nextStep} →</>}
                  </Button>

                  {/* Back button */}
                  {step > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      disabled={advancing}
                      className="w-full text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ← Zurück zu Schritt {step - 1}
                    </Button>
                  )}
                </div>
              )}

              {isDone && (
                <div className="border-t border-gray-100 pt-4 text-center">
                  <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />Abgeschlossen
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stop confirmation */}
      <Dialog open={stopDialog} onOpenChange={setStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />Vermittlung beenden?
            </DialogTitle>
            <DialogDescription>
              Die Vermittlung von <strong>{p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'dieser Fachkraft'}</strong> an{' '}
              <strong>{c?.company_name}</strong> wird beendet. Das Profil wird wieder als verfügbar markiert.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleStop} disabled={stopping}>
              {stopping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
              Vermittlung beenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
