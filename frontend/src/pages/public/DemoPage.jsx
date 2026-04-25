import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import ProfileCard from '@/components/matching/ProfileCard'
import ProfileDetailModal from '@/components/matching/ProfileDetailModal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search, Activity, Lock, SlidersHorizontal,
  EyeOff, ArrowRight, CheckCircle2, Loader2, X, Menu,
  User, Briefcase, GraduationCap, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALL_SPECIALIZATION_FIELDS, getProfileSpecializations } from '@/lib/profileOptions'
import { Badge } from '@/components/ui/badge'

// ─── Hardcoded dummy profiles (fake data — safe to expose in DOM) ────────────
// These are used for the blurred preview. No real IDs, no working CV links.
const DUMMY_PROFILES = [
  {
    id: '__demo_a',
    gender: 'Weiblich', age: 31, nationality: 'Marokko',
    german_recognition: 'anerkannt',
    total_experience_years: 8, germany_experience_years: 2,
    work_time_preference: 'Vollzeit',
    nursing_education: 'B. Sc. Nursing',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Intensivpflege', 'Onkologie', 'Geriatrie'],
    profile_image_url: '/demo/nurse-1.png', vimeo_video_url: null,
  },
  {
    id: '__demo_b',
    gender: 'Weiblich', age: 27, nationality: 'Indien',
    german_recognition: 'in_bearbeitung',
    total_experience_years: 5, germany_experience_years: null,
    work_time_preference: 'Vollzeit',
    nursing_education: 'General Nursing (B. Sc.)',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Geriatrie', 'Demenzpflege'],
    profile_image_url: '/demo/nurse-2.png', vimeo_video_url: null,
  },
  {
    id: '__demo_c',
    gender: 'Männlich', age: 34, nationality: 'Pakistan',
    german_recognition: 'anerkannt',
    total_experience_years: 10, germany_experience_years: 4,
    work_time_preference: 'Vollzeit',
    nursing_education: 'Registered Nurse (RN)',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Palliativpflege', 'Wundmanagement', 'Altenpflege'],
    profile_image_url: '/demo/nurse-3.png', vimeo_video_url: null,
  },
]

// ─── Dummy profile card (non-interactive, no navigation) ────────────────────
const RECOGNITION_LABELS = {
  anerkannt: 'Anerkennung erteilt',
  in_bearbeitung: 'Anerkennung läuft',
}

function DummyCard({ profile }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="h-20 bg-gradient-to-br from-fkvi-blue/10 via-fkvi-teal/5 to-transparent shrink-0" />

      {/* Avatar — blurred so person is hinted but not identifiable */}
      <div className="relative -mt-14 flex flex-col items-center">
        <div className="w-28 h-28 rounded-full p-[3px] shadow-md"
          style={{ background: 'linear-gradient(135deg, #0d9488, #1a3a5c)' }}>
          <div className="w-full h-full rounded-full overflow-hidden bg-fkvi-blue/10">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt=""
                draggable={false}
                className="w-full h-full object-cover object-top"
                style={{
                  filter: 'blur(6px) brightness(0.92)',
                  transform: 'scale(1.15)',   /* hide blur edge artifacts */
                  transformOrigin: 'top center',
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-10 w-10 text-fkvi-blue/30" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-800/80 backdrop-blur-sm rounded-full px-2 py-0.5 mt-[-10px]">
          <EyeOff className="h-2.5 w-2.5 text-white/70" />
          <span className="text-[9px] text-white/80 font-medium tracking-wide">Anonymisiert</span>
        </div>
      </div>

      <div className="pt-3 pb-4 px-4 flex flex-col flex-1 gap-2.5">
        <div className="text-center">
          <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1 mb-0.5">
            <span className="blur-sm select-none font-medium text-gray-600 text-xs">Vorname Nachname</span>
            <span className="text-[9px] bg-gray-100 text-gray-400 rounded px-1">anon.</span>
          </p>
          <p className="font-semibold text-gray-900 text-sm">
            {profile.gender}{profile.age ? `, ${profile.age} J.` : ''}
          </p>
          <p className="text-xs text-gray-500">{profile.nationality}</p>
        </div>

        {profile.german_recognition && (
          <div className="flex justify-center">
            <Badge
              variant={profile.german_recognition === 'anerkannt' ? 'success' : 'warning'}
              className="text-[10px]"
            >
              {RECOGNITION_LABELS[profile.german_recognition]}
            </Badge>
          </div>
        )}

        <div className="space-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
          {profile.total_experience_years && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3 w-3 shrink-0 text-fkvi-teal" />
              <span>{profile.total_experience_years} Jahre Erfahrung
                {profile.germany_experience_years && (
                  <span className="text-gray-400"> ({profile.germany_experience_years} J. in DE)</span>
                )}
              </span>
            </div>
          )}
          {profile.work_time_preference && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0 text-fkvi-teal" />
              <span>{profile.work_time_preference}</span>
            </div>
          )}
          {profile.nursing_education && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3 shrink-0 text-fkvi-teal" />
              <span className="truncate">{profile.nursing_education}</span>
            </div>
          )}
        </div>

        {getProfileSpecializations(profile).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {getProfileSpecializations(profile).slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 bg-fkvi-blue/8 text-fkvi-blue rounded-full text-[10px] font-medium">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Registration Modal ──────────────────────────────────────────────────────

function RegisterModal({ open, onClose }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', company_name: '', email: '', phone: '',
    address: '', postal_code: '', city: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.error === 'already_pending') {
          setError('Eine Anfrage mit dieser E-Mail wurde bereits gesendet. Wir melden uns in Kürze.')
        } else if (data.error === 'already_approved') {
          setError('Konto bereits aktiviert. Bitte melden Sie sich direkt an.')
        } else {
          setError(data.error || 'Fehler. Bitte erneut versuchen.')
        }
        return
      }
      setSuccess(true)
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setForm({ first_name: '', last_name: '', company_name: '', email: '', phone: '', address: '', postal_code: '', city: '' })
      setSuccess(false)
      setError('')
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Anfrage gesendet!</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs mx-auto">
              Wir prüfen Ihre Anfrage und senden Ihnen innerhalb von 24 Stunden die Zugangsdaten zu.
            </p>
            <Button onClick={handleClose} className="w-full">Schließen</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Kostenlosen Zugang anfragen</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Erhalten Sie Zugang zu allen Fachkräfteprofilen auf der FKVI Matching-Plattform.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="r_fn" className="text-xs font-medium">Vorname *</Label>
                  <Input id="r_fn" value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="Max" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="r_ln" className="text-xs font-medium">Nachname *</Label>
                  <Input id="r_ln" value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="Mustermann" required className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="r_co" className="text-xs font-medium">Einrichtung / Unternehmen</Label>
                <Input id="r_co" value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Pflegezentrum GmbH" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="r_em" className="text-xs font-medium">E-Mail-Adresse *</Label>
                <Input id="r_em" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="max@pflegezentrum.de" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="r_ph" className="text-xs font-medium">Telefonnummer *</Label>
                <Input id="r_ph" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+49 123 456789" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="r_addr" className="text-xs font-medium">Straße &amp; Hausnummer *</Label>
                <Input id="r_addr" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Musterstraße 12" required className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="r_plz" className="text-xs font-medium">PLZ *</Label>
                  <Input id="r_plz" value={form.postal_code}
                    onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                    placeholder="12345" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="r_city" className="text-xs font-medium">Ort *</Label>
                  <Input id="r_city" value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Frankfurt am Main" required className="mt-1" />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wird gesendet…</>
                  : <>Zugang anfragen <ArrowRight className="h-4 w-4 ml-1.5" /></>
                }
              </Button>
              <p className="text-[11px] text-gray-400 text-center">
                Kostenlos · Kein Abo · Persönliche Beratung inklusive
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailProfile, setDetailProfile] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('profiles')
          .select(`
            id, gender, age, nationality, marital_status, children_count, has_drivers_license,
            state_preferences, nationwide, work_time_preference,
            profile_image_url, vimeo_video_url, vimeo_video_id,
            nursing_education, education_duration, graduation_year, german_recognition, education_notes,
            additional_qualifications,
            total_experience_years, germany_experience_years, experience_areas,
            language_skills, fkvi_competency_proof,
            ${ALL_SPECIALIZATION_FIELDS.join(', ')}
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3)
        setProfiles(data || [])
      } catch {
        setProfiles([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const openRegister = () => setRegisterOpen(true)

  const SidebarContent = () => (
    <>
      <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-gray-100 relative">
        <button
          className="lg:hidden text-gray-400 hover:text-gray-600 absolute top-4 right-4"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        <img src="/logo.svg" alt="FKVI" className="w-40 h-40 object-contain" style={{ mixBlendMode: 'multiply' }} />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-amber-600 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          Demo-Modus
        </span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-fkvi-blue/10 text-fkvi-blue">
          <Search className="h-4 w-4 shrink-0" />
          Matching-Plattform
          <ArrowRight className="h-3 w-3 ml-auto" />
        </div>
        <button
          onClick={openRegister}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-50 hover:text-gray-400 transition-colors group"
        >
          <Activity className="h-4 w-4 shrink-0" />
          Statustracker
          <Lock className="h-3 w-3 ml-auto opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <p className="text-[11px] font-semibold text-amber-800 mb-0.5">Demo-Zugang</p>
          <p className="text-[11px] text-amber-700 leading-snug">
            Weitere Fachkräfte im Vollzugang
          </p>
        </div>
        <Button
          onClick={openRegister}
          size="sm"
          className="w-full bg-fkvi-teal hover:bg-fkvi-teal/90 text-white text-xs gap-1.5"
        >
          <Lock className="h-3 w-3" />Vollzugang anfragen
        </Button>
        <Link
          to="/matching/login"
          className="block text-center text-[11px] text-gray-400 hover:text-fkvi-blue transition-colors"
        >
          Bereits registriert? Anmelden →
        </Link>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col",
        "transform transition-transform duration-200 ease-in-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Menu className="h-6 w-6" />
          </button>
          <img src="/logo.svg" alt="FKVI" className="h-10 w-auto" style={{ mixBlendMode: 'multiply' }} />
          <span className="ml-auto inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            Demo
          </span>
        </header>

        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-hidden">

          {/* ── Welcome banner ───────────────────────────────────────── */}
          {!bannerDismissed && (
            <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
              <button
                onClick={() => setBannerDismissed(true)}
                className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
              >×</button>
              <h2 className="font-bold text-base mb-3">Willkommen auf der Demo-Version</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <p className="font-semibold mb-0.5">Profile entdecken</p>
                    <p className="text-white/65 text-xs leading-relaxed">
                      Sehen Sie ausgewählte, anonymisierte Fachkraft-Profile – inklusive Lebenslauf und Vorstellungsvideo.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="font-semibold mb-0.5 flex items-center gap-1">
                      <Lock className="h-3 w-3" />Alle Profile freischalten
                    </p>
                    <p className="text-white/65 text-xs leading-relaxed">
                      Filter, Vormerken und alle weiteren Fachkräfte sind im Vollzugang verfügbar.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="font-semibold mb-0.5">Kandidaten reservieren</p>
                    <p className="text-white/65 text-xs leading-relaxed">
                      Nach Freischaltung: Fachkräfte vormerken, Termine buchen und exklusiv reservieren.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10 flex-wrap">
                <EyeOff className="h-3.5 w-3.5 text-white/50 shrink-0" />
                <p className="text-xs text-white/50">Alle Namen und Kontaktdaten sind anonymisiert.</p>
                <Button size="sm" onClick={openRegister}
                  className="ml-auto bg-fkvi-teal hover:bg-fkvi-teal/90 text-white text-xs gap-1.5 h-7 shrink-0">
                  <Lock className="h-3 w-3" />Vollzugang anfragen
                </Button>
              </div>
            </div>
          )}

          {/* ── Page header ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900">Matching-Plattform</h1>
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Demo
                </span>
              </div>
              <p className="text-gray-500 mt-0.5 text-sm">
                {loading ? 'Lädt…' : 'Ausgewählte Fachkräfte · Demo-Vorschau'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openRegister}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-400 hover:text-gray-500 hover:bg-gray-50 transition-colors"
                title="Filter nur im Vollzugang"
              >
                <SlidersHorizontal className="h-4 w-4" />Filter
                <Lock className="h-3 w-3 opacity-40" />
              </button>
              <Button onClick={openRegister} variant="teal" size="sm" className="gap-1.5">
                <Lock className="h-3.5 w-3.5" />Vollzugang anfragen
              </Button>
            </div>
          </div>

          {/* ── Real profile cards ───────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <Skeleton className="h-44 rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-8 w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {profiles.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isDemo={true}
                  onRegister={openRegister}
                  isFavorite={false}
                  onToggleFavorite={openRegister}
                  onViewDetail={(p) => { setDetailProfile(p); setDetailOpen(true) }}
                />
              ))}
            </div>
          )}

          {/* ── Gradient peek zone ───────────────────────────────────── */}
          {!loading && (
            <div className="relative -mx-6 lg:-mx-8 px-6 lg:px-8">

              {/*
                The dummy cards render in a normal grid. The parent clips them
                to a fixed height so only their tops are visible. A gradient
                overlay fades them into the page background. The CTA floats
                centrally over the gradient. No counts anywhere in the DOM.
              */}
              <div
                className="overflow-hidden"
                style={{ maxHeight: '190px' }}
                aria-hidden="true"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pointer-events-none select-none">
                  {DUMMY_PROFILES.map(p => (
                    <DummyCard key={p.id} profile={p} />
                  ))}
                </div>
              </div>

              {/*
                Gradient overlay — starts transparent, becomes fully opaque.
                Positioned to cover the peek cards from the very top, so even
                removing it in DevTools only reveals dummy data.
                The CTA button lives inside this overlay.
              */}
              <div
                className="absolute inset-x-0 top-0 flex flex-col items-center justify-end pb-10"
                style={{
                  height: '190px',
                  /* Kicks in hard from the very top — avatar is hinted but not readable */
                  background: 'linear-gradient(to bottom, rgba(249,250,251,0.12) 0%, rgba(249,250,251,0.45) 18%, rgba(249,250,251,0.80) 38%, rgba(249,250,251,0.96) 56%, rgb(249,250,251) 70%)',
                }}
              >
                {/* The dominant CTA */}
                <button
                  onClick={openRegister}
                  className={cn(
                    "inline-flex items-center gap-2.5 rounded-2xl font-bold text-white shadow-2xl",
                    "bg-fkvi-teal hover:bg-fkvi-teal/90 active:scale-[0.98]",
                    "transition-all duration-150",
                    // Responsive sizing
                    "px-6 py-3 text-sm sm:px-8 sm:py-3.5 sm:text-base lg:px-10 lg:py-4 lg:text-lg",
                  )}
                  style={{ boxShadow: '0 8px 32px rgba(13,148,136,0.35), 0 2px 8px rgba(0,0,0,0.12)' }}
                >
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Vollzugang anfragen
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                </button>
              </div>

              {/* Login link — sits below the gradient, in solid background */}
              <div className="flex items-center justify-center pt-4 pb-2">
                <Link
                  to="/matching/login"
                  className="text-sm text-gray-400 hover:text-fkvi-blue transition-colors"
                >
                  Bereits registriert? Anmelden →
                </Link>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <ProfileDetailModal
        profile={detailProfile}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        isFavorite={false}
        onToggleFavorite={() => {}}
        isDemo={true}
        onRegister={() => { setDetailOpen(false); setTimeout(openRegister, 200) }}
      />

      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}
