import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Building2, Shield, MapPin, Clock, Star, Lock } from 'lucide-react'
import { RECOGNITION_LABELS } from '@/lib/utils'

// ─── Anonymized public profile card ──────────────────────────────────────────
function PublicProfileCard({ profile, index }) {
  const initials = `FK${String(index + 1).padStart(3, '0')}`
  const age = profile.age ? `${profile.age} J.` : null
  const specs = (profile.specializations || []).slice(0, 2)
  const recognition = profile.german_recognition ? RECOGNITION_LABELS?.[profile.german_recognition] : null
  const exp = profile.total_experience_years ? `${profile.total_experience_years} J. Erfahrung` : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      {/* Image area */}
      <div className="relative h-44 bg-gradient-to-br from-fkvi-blue/10 to-fkvi-blue/5 flex items-center justify-center overflow-hidden">
        {profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt="Fachkraft"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-fkvi-blue/20 flex items-center justify-center">
            <Users className="h-8 w-8 text-fkvi-blue/50" />
          </div>
        )}
        {/* Overlay badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-semibold text-fkvi-blue">
          {initials}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Blurred name placeholder */}
        <div className="space-y-1">
          <div className="h-5 w-32 rounded bg-gray-200 blur-sm select-none" aria-hidden="true" />
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {[profile.nationality, age].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Key facts */}
        <div className="flex flex-wrap gap-1.5">
          {specs.map(s => (
            <span key={s} className="text-xs bg-fkvi-blue/8 text-fkvi-blue px-2 py-0.5 rounded-full font-medium">{s}</span>
          ))}
          {exp && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" />{exp}
            </span>
          )}
        </div>

        {recognition && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400" />
            Anerkennung: {recognition}
          </p>
        )}

        {/* CTA */}
        <Link to="/kontakt" className="block">
          <button className="w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 hover:bg-fkvi-blue hover:text-white hover:border-fkvi-blue transition-all group-hover:bg-fkvi-blue group-hover:text-white group-hover:border-fkvi-blue">
            <Lock className="h-3.5 w-3.5" />
            Vollprofil freischalten
          </button>
        </Link>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PublicHome() {
  const [profiles, setProfiles] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select(`
        id, age, nationality, profile_image_url,
        specializations, total_experience_years,
        german_recognition, preferred_facility_types
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setProfiles(data || [])
        setProfilesLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-fkvi-blue text-xl">FKVI</span>
          <div className="flex items-center gap-3">
            <Link to="/matching/login">
              <Button variant="outline" size="sm">Unternehmens-Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            Fachkräfte aus dem Ausland.<br />
            <span className="text-fkvi-blue">Professionell vermittelt.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto">
            FKVI vermittelt qualifizierte Pflege- und Fachkräfte aus dem Ausland an deutsche Unternehmen –
            sorgfältig geprüft und begleitet.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/kontakt">
              <Button size="lg">
                Jetzt Zugang anfragen <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/matching/login">
              <Button variant="outline" size="lg">Bereits registriert? Anmelden</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Users, title: 'Geprüfte Profile', desc: 'Alle Fachkräfte werden sorgfältig von FKVI geprüft und begleitet.' },
            { icon: Building2, title: 'Persönliches Matching', desc: 'Finden Sie die passende Fachkraft für Ihre Einrichtung.' },
            { icon: Shield, title: 'Vollständige Begleitung', desc: 'Von der Auswahl bis zum Arbeitsstart – FKVI begleitet den gesamten Prozess.' },
          ].map(f => (
            <div key={f.title} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-fkvi-blue/10 mb-4">
                <f.icon className="h-6 w-6 text-fkvi-blue" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Public Profiles */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Aktuelle Fachkräfte</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Ein Einblick in unser Kandidatenportfolio. Namen und Kontaktdaten sind nur für freigeschaltete Unternehmen sichtbar.
            </p>
          </div>

          {profilesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aktuell keine Profile verfügbar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile, i) => (
                <PublicProfileCard key={profile.id} profile={profile} index={i} />
              ))}
            </div>
          )}

          {profiles.length > 0 && (
            <div className="mt-10 text-center">
              <div className="inline-flex items-center gap-2 bg-fkvi-blue/5 border border-fkvi-blue/20 rounded-full px-5 py-2.5 mb-6">
                <Lock className="h-4 w-4 text-fkvi-blue" />
                <span className="text-sm text-fkvi-blue font-medium">
                  Vollständige Profile und Kontaktdaten nur für geprüfte Unternehmen
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/kontakt">
                  <Button size="lg">
                    Zugang anfragen <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/matching/login">
                  <Button variant="outline" size="lg">Bereits registriert</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Interesse an unseren Fachkräften?</h2>
          <p className="text-gray-500 mb-6">Registrieren Sie sich und erhalten Sie nach Prüfung Zugang zur Matching-Plattform.</p>
          <Link to="/kontakt">
            <Button size="lg">Zugang anfragen</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <span>© 2024 FKVI – Fachkraft Vermittlung International</span>
          <div className="flex gap-4">
            <Link to="/admin/login" className="hover:text-gray-600">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
