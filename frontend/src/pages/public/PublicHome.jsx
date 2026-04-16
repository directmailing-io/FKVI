import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowRight, Users, Clock, Star, Lock, ChevronDown, ChevronUp, Phone, Mail, CheckCircle2 } from 'lucide-react'
import { RECOGNITION_LABELS } from '@/lib/utils'

// ─── Matching Funnel ─────────────────────────────────────────────────────────
const FUNNEL_DATA = {
  fk: {
    stages: [
      { num: '01', title: 'Persönliches Erstgespräch', sub: 'Motivation, Ziele & Berufserfahrung', w: 100,
        bg: '#EEF2FF', fg: '#3730a3',
        detail: 'Warum Pflege? Warum Deutschland? Wir verstehen die Person hinter dem Lebenslauf – ihre Antriebe, Erfahrung und Erwartungen an den nächsten Karriereschritt.',
        tags: ['Motivation', 'Berufsziele', 'Erfahrung'] },
      { num: '02', title: 'Regionale Präferenzanalyse', sub: 'Herkunft, Wunschregion & Einrichtungstyp', w: 85,
        bg: '#E0F2FE', fg: '#0c4a6e',
        detail: 'Stadt oder Land? Großklinik oder Pflegeeinrichtung? Wer in einer Kleinstadt aufgewachsen ist, fühlt sich in einer ländlichen Einrichtung eher zuhause.',
        tags: ['Herkunft', 'Wunschregion', 'Kliniktyp'] },
      { num: '03', title: 'Soziale Ankerpunkte', sub: 'Familie, Freunde & Community in Deutschland', w: 70,
        bg: '#CCFBF1', fg: '#134e4a',
        detail: 'Bestehende Kontakte in Deutschland reduzieren Heimweh und beschleunigen die Integration. Wir vermitteln bevorzugt in der Nähe sozialer Ankerpunkte.',
        tags: ['Familie', 'Community', 'Nähe'] },
      { num: '04', title: 'Kulturelle Passung', sub: 'Werte, Arbeitsweise & Teamdynamik', w: 58,
        bg: '#FEF9C3', fg: '#713f12',
        detail: 'Jedes Team tickt anders. Wir gleichen Persönlichkeit und Kommunikationsstil mit der Einrichtungskultur ab – für ein harmonisches Miteinander vom ersten Tag.',
        tags: ['Teamkultur', 'Kommunikation', 'Werte'] },
      { num: '05', title: 'Fachliche Qualifikation', sub: 'B2-Zertifikat & Berufsanerkennung', w: 44,
        bg: '#FEE2E2', fg: '#7f1d1d',
        detail: 'Erst wenn die persönliche Passung stimmt, prüfen wir: Sprachniveau (mind. B2), Berufsanerkennung und fachspezifische Erfahrung auf der Zielstation.',
        tags: ['B2-Zertifikat', 'Anerkennung', 'Fachkompetenz'] },
      { num: '06', title: 'Platzierung & Begleitung', sub: '+ 12 Monate Begleitung & Garantie', w: 32,
        bg: '#1a3a5c', fg: '#ffffff',
        detail: 'Die Fachkraft startet – und wir bleiben dran. Regelmäßige Check-ins, Konfliktmediation und Integrationsbegleitung über 12 Monate. Inklusive Ersatzgarantie.',
        tags: ['Onboarding', 'Check-ins', 'Garantie'] },
    ],
    resultTitle: 'Perfekte Passung. Langfristiger Verbleib.',
    resultSub: 'Unsere Fachkräfte bleiben – weil sie dort ankommen, wo sie hingehören.',
  },
  az: {
    stages: [
      { num: '01', title: 'Persönliches Erstgespräch', sub: 'Motivation, Lernbereitschaft & Zukunftswunsch', w: 100,
        bg: '#EEF2FF', fg: '#3730a3',
        detail: 'Warum möchte die Person in die Pflege? Was erwartet sie von einer Ausbildung in Deutschland? Wir verstehen die Motivation und die Reife des Bewerbers.',
        tags: ['Motivation', 'Lernbereitschaft', 'Zukunftsvision'] },
      { num: '02', title: 'Regionale Präferenzanalyse', sub: 'Herkunft, Wunschregion & Ausbildungsbetrieb', w: 85,
        bg: '#E0F2FE', fg: '#0c4a6e',
        detail: 'Stadt oder Land? Großes Haus oder kleine Einrichtung? Gerade für junge Menschen ist die richtige Umgebung entscheidend für einen erfolgreichen Ausbildungsstart.',
        tags: ['Herkunft', 'Wunschregion', 'Betriebsgröße'] },
      { num: '03', title: 'Soziale Ankerpunkte', sub: 'Familie, Freunde & Betreuungsnetz', w: 70,
        bg: '#CCFBF1', fg: '#134e4a',
        detail: 'Gibt es Kontakte in Deutschland? Gerade bei jüngeren Azubis ist ein soziales Netz besonders wichtig. Wir vermitteln in der Nähe bestehender Ankerpunkte.',
        tags: ['Familie', 'Betreuung', 'Nähe'] },
      { num: '04', title: 'Kulturelle Passung', sub: 'Persönlichkeit, Teamfähigkeit & Betreuungskapazität', w: 58,
        bg: '#FEF9C3', fg: '#713f12',
        detail: 'Der Ausbildungsbetrieb muss nicht nur fachlich, sondern auch menschlich passen. Hat das Team Kapazität für Anleitung? Passt die Teamdynamik?',
        tags: ['Teamfähigkeit', 'Anleitung', 'Betreuung'] },
      { num: '05', title: 'Schulische Voraussetzungen', sub: 'Sprachpotenzial (B1+), Schulabschluss & Eignung', w: 44,
        bg: '#FEE2E2', fg: '#7f1d1d',
        detail: 'Für den Ausbildungsstart reicht oft B1 – entscheidend ist das Lernpotenzial. Wir prüfen schulische Voraussetzungen, Sprachentwicklung und Ausbildungseignung.',
        tags: ['B1-Sprachniveau', 'Schulabschluss', 'Lernpotenzial'] },
      { num: '06', title: 'Ausbildungsstart', sub: '+ Begleitung über die gesamte Ausbildung', w: 32,
        bg: '#1a3a5c', fg: '#ffffff',
        detail: 'Der Azubi startet die Ausbildung – und wir begleiten den gesamten Weg: Onboarding, regelmäßige Check-ins und Unterstützung bei Herausforderungen im Alltag.',
        tags: ['Onboarding', 'Ausbildungsbegleitung', 'Check-ins'] },
    ],
    resultTitle: 'Der richtige Start. Die richtige Einrichtung.',
    resultSub: 'Unsere Azubis bleiben – weil Ausbildung und Umfeld von Anfang an zusammenpassen.',
  },
}

function MatchingFunnel() {
  const [mode, setMode] = useState('fk')
  const [openIdx, setOpenIdx] = useState(-1)
  const d = FUNNEL_DATA[mode]

  const toggle = (i) => setOpenIdx(openIdx === i ? -1 : i)

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full border border-gray-200 overflow-hidden bg-white">
          {[{ key: 'fk', label: 'Fachkräfte' }, { key: 'az', label: 'Azubis' }].map(t => (
            <button key={t.key} onClick={() => { setMode(t.key); setOpenIdx(-1) }}
              className={`px-6 py-2.5 text-sm font-medium transition-all ${
                mode === t.key ? 'bg-fkvi-blue text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Funnel stages */}
      <div className="flex flex-col items-center gap-1 max-w-2xl mx-auto">
        {d.stages.map((s, i) => (
          <div key={i} className="w-full flex flex-col items-center gap-1">
            {/* Stage bar */}
            <button
              onClick={() => toggle(i)}
              className="relative flex items-center justify-between px-5 py-4 rounded-xl text-left transition-transform hover:scale-[1.015] w-full"
              style={{ width: `${s.w}%`, background: s.bg, color: s.fg }}
            >
              <div>
                <div className="text-xs font-bold opacity-60 mb-0.5">{s.num}</div>
                <div className="font-semibold text-sm">{s.title}</div>
                <div className="text-xs opacity-65 mt-0.5">{s.sub}</div>
              </div>
              <div className="shrink-0 ml-3 opacity-50">
                {openIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {/* Detail panel */}
            {openIdx === i && (
              <div className="w-full max-w-lg bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-sm text-gray-600 leading-relaxed">
                <p className="mb-3">{s.detail}</p>
                <div className="flex flex-wrap gap-2">
                  {s.tags.map(t => (
                    <span key={t} className="text-xs font-medium px-3 py-1 rounded-full bg-fkvi-blue/8 text-fkvi-blue">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Arrow */}
            {i < d.stages.length - 1 && (
              <div className="text-gray-300 text-xs py-0.5">▼</div>
            )}
          </div>
        ))}
      </div>

      {/* Result */}
      <div className="mt-10 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-fkvi-teal/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-6 w-6 text-fkvi-teal" />
        </div>
        <h3 className="text-xl font-bold text-fkvi-blue mb-2">{d.resultTitle}</h3>
        <p className="text-sm text-gray-500">{d.resultSub}</p>
      </div>
    </div>
  )
}

// ─── Anonymized profile card ──────────────────────────────────────────────────
function PublicProfileCard({ profile, index }) {
  const initials = `FK${String(index + 1).padStart(3, '0')}`
  const age = profile.age ? `${profile.age} J.` : null
  const specs = (profile.specializations || []).slice(0, 2)
  const recognition = profile.german_recognition ? RECOGNITION_LABELS?.[profile.german_recognition] : null
  const exp = profile.total_experience_years ? `${profile.total_experience_years} J. Erfahrung` : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="relative h-44 bg-gradient-to-br from-fkvi-blue/10 to-fkvi-blue/5 flex items-center justify-center overflow-hidden">
        {profile.profile_image_url ? (
          <img src={profile.profile_image_url} alt="Fachkraft" className="w-full h-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-fkvi-blue/20 flex items-center justify-center">
            <Users className="h-8 w-8 text-fkvi-blue/50" />
          </div>
        )}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-semibold text-fkvi-blue">
          {initials}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="h-5 w-32 rounded bg-gray-200 blur-sm select-none" aria-hidden="true" />
          <p className="text-xs text-gray-400">{[profile.nationality, age].filter(Boolean).join(' · ')}</p>
        </div>
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
            <Star className="h-3 w-3 text-amber-400" />Anerkennung: {recognition}
          </p>
        )}
        <Link to="/beratung" className="block">
          <button className="w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 hover:bg-fkvi-blue hover:text-white hover:border-fkvi-blue transition-all group-hover:bg-fkvi-blue group-hover:text-white group-hover:border-fkvi-blue">
            <Lock className="h-3.5 w-3.5" />Vollprofil freischalten
          </button>
        </Link>
      </div>
    </div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-fkvi-blue transition-colors">
        <span className="font-semibold text-gray-800 text-sm">{question}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-fkvi-teal" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
      </button>
      {open && <p className="pb-5 text-sm text-gray-500 leading-relaxed">{answer}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PublicHome() {
  const [profiles, setProfiles] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const funnelRef = useRef(null)

  useEffect(() => {
    supabase.from('profiles')
      .select('id, age, nationality, profile_image_url, specializations, total_experience_years, german_recognition, preferred_facility_types')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { setProfiles(data || []); setProfilesLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="overflow-hidden flex items-center" style={{ height: 72 }}>
            <img src="/logo.svg" alt="FKVI" style={{ height: 192, marginTop: -56, mixBlendMode: 'multiply' }} />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => funnelRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-600 hover:text-fkvi-blue font-medium transition-colors">
              Unser Matching
            </button>
            <Link to="/downloads" className="text-gray-600 hover:text-fkvi-blue font-medium transition-colors">
              Downloads
            </Link>
            <Link to="/matching/login" className="text-gray-500 hover:text-fkvi-blue transition-colors">
              Unternehmens-Login
            </Link>
            <Link to="/beratung" className="bg-fkvi-blue text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fkvi-blue/90 transition-colors">
              Beratung anfragen
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-fkvi-blue pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-white/20">
            ⚡ Neue Pflegefachkräfte in 2–3 Monaten
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Qualifiziertes Pflegepersonal<br />
            <span className="text-fkvi-teal-light">aus dem Ausland – ohne Aufwand.</span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Wenn Bewerbungen ausbleiben, das Team überlastet ist und Sie selbst wieder ans Patientenbett müssen –
            dann ist es Zeit für eine andere Lösung. Wir helfen Ihnen, langfristig passende Pflegefachkräfte zu gewinnen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/beratung"
              className="inline-flex items-center justify-center gap-2 bg-fkvi-teal text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-fkvi-teal/90 transition-all shadow-lg shadow-fkvi-teal/30">
              Jetzt kostenlos Beratung anfragen <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/matching/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/20 transition-all">
              Bereits registriert? Anmelden
            </Link>
          </div>
          {/* Trust strip */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/60">
            {['✓ Alles aus einer Hand', '✓ Kein Bewerbungsaufwand für Sie', '✓ 12 Monate Begleitung & Garantie'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Urgency banner ───────────────────────────────────────────────────── */}
      <div className="bg-amber-50 border-b border-amber-200 py-3 px-4 text-center">
        <p className="text-sm text-amber-800">
          <strong>Hinweis:</strong> Aufgrund der hohen Nachfrage können wir nur eine begrenzte Zahl an Einrichtungen gleichzeitig betreuen.
          {' '}<Link to="/beratung" className="underline font-semibold hover:text-amber-900">Jetzt Termin sichern →</Link>
        </p>
      </div>

      {/* ── What leaders want ────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue mb-4">
              Stabile Teams. Planbare Abläufe.<br />Endlich wieder Zeit zum Führen.
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Fast alle Führungskräfte haben den gleichen Wunsch: Ein starkes Team, das bleibt.
              Keine Notlösungen mehr. Keine ständige Personal-Feuerwehr.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '📋', title: 'Überblick haben', desc: 'Einfach wieder den Überblick haben. Schichten planen, Urlaube koordinieren und den Betrieb mit klarem Kopf steuern.' },
              { icon: '⏰', title: 'Zeit für Führung', desc: 'Wertvolle Zeit für Führungsaufgaben gewinnen. Sich auf Strategie, Qualität und Teamführung konzentrieren.' },
              { icon: '🤝', title: 'Starkes Team', desc: 'Ein starkes Team, das zusammenhält. Motivierte Pflegekräfte, die sich integrieren und langfristig mitziehen.' },
            ].map(item => (
              <div key={item.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <span className="text-3xl mb-4 block">{item.icon}</span>
                <h3 className="font-bold text-fkvi-blue mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">Das Problem</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Aber stattdessen kämpfen Sie Tag für Tag mit denselben Problemen
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Kaum Bewerbungen aus dem Inland. Fachkräfte gehen in Rente. Neue Mitarbeiter springen nach kurzer Zeit wieder ab.
              Die Fachkraftquote gerät in Gefahr, Belegungsstopps drohen.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Keine Bewerber trotz zahlreicher Ausschreibungen',
              'Team dauerhaft überlastet und kurz vor dem Burnout',
              'Fachkraftquote in Gefahr – Belegungsstopp droht',
              'Neue Mitarbeiter springen nach wenigen Monaten ab',
              'Führungskraft muss selbst wieder ans Patientenbett',
              'Zu spät geplant – jetzt steht man mit dem Rücken zur Wand',
            ].map(p => (
              <div key={p} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-red-100">
                <span className="text-red-400 mt-0.5 shrink-0 text-lg">✗</span>
                <span className="text-sm text-gray-700">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-fkvi-teal/10 text-fkvi-teal text-xs font-semibold px-3 py-1.5 rounded-full mb-4">Die Lösung</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue mb-4">
              Erfahrene Pflegefachkräfte, die bleiben<br />und Ihr Team stärken
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Die vermittelten Fachkräfte verfügen in der Regel über 4 bis 8 Jahre Berufserfahrung,
              sprechen mindestens B1-Deutsch und möchten langfristig in Deutschland arbeiten.
            </p>
          </div>

          {/* 5 Steps */}
          <div className="relative">
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-100 hidden md:block" />
            <div className="space-y-6">
              {[
                { n: '01', title: 'Erstgespräch', desc: 'Sie sprechen mit uns über Ihre aktuelle Lage, Ihre Wünsche und Anforderungen. Danach wissen Sie genau, welche Optionen realistisch sind.', icon: '💬' },
                { n: '02', title: 'Passende Fachkräfte finden', desc: 'Sie bekommen gezielt passende Vorschläge von Kandidaten, die fachlich, sprachlich und menschlich zu Ihnen passen.', icon: '🔍' },
                { n: '03', title: 'Wir übernehmen die Bürokratie', desc: 'Alle Formulare, Anträge und Termine übernehmen wir. Sie sparen Zeit, Papierkram und Behördengänge.', icon: '📋' },
                { n: '04', title: 'Integration von Anfang an', desc: 'Wir bereiten Ihre Pflegekraft noch im Ausland auf das Leben in Deutschland vor – und kümmern uns um Wohnung, Konto und Co.', icon: '🏠' },
                { n: '05', title: 'Betreuung, die bleibt', desc: 'Nach der Ankunft begleiten wir persönlich und stehen bei Fragen jederzeit zur Verfügung – für einen starken Start und langfristige Bindung.', icon: '✅' },
              ].map((step, i) => (
                <div key={step.n} className="relative flex gap-6 items-start">
                  <div className="relative z-10 w-12 h-12 rounded-full bg-fkvi-blue flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                    {step.n}
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 flex-1 border border-gray-100">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{step.icon}</span>
                      <div>
                        <h3 className="font-bold text-fkvi-blue mb-1">{step.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link to="/beratung" className="inline-flex items-center gap-2 bg-fkvi-blue text-white px-8 py-4 rounded-xl font-bold hover:bg-fkvi-blue/90 transition-all">
              Jetzt kostenloses Erstgespräch buchen <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Matching Funnel ──────────────────────────────────────────────────── */}
      <section ref={funnelRef} className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-fkvi-blue/8 text-fkvi-blue text-xs font-semibold px-3 py-1.5 rounded-full mb-4">Unser Matching-Filter</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue mb-4">6 Stufen bis zur perfekten Passung</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Jede Stufe filtert gezielt – damit am Ende nur Fachkräfte und Azubis vermittelt werden,
              die wirklich passen und langfristig bleiben.
            </p>
          </div>
          <MatchingFunnel />
          <div className="mt-12 text-center">
            <Link to="/beratung" className="inline-flex items-center gap-2 bg-fkvi-teal text-white px-8 py-4 rounded-xl font-bold hover:bg-fkvi-teal/90 transition-all">
              Beratungsgespräch vereinbaren <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Profiles ─────────────────────────────────────────────────────────── */}
      {(profilesLoading || profiles.length > 0) && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-fkvi-blue">Aktuelle Fachkräfte</h2>
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((profile, i) => (
                  <PublicProfileCard key={profile.id} profile={profile} index={i} />
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <div className="inline-flex items-center gap-2 bg-fkvi-blue/5 border border-fkvi-blue/20 rounded-full px-5 py-2.5 mb-6">
                <Lock className="h-4 w-4 text-fkvi-blue" />
                <span className="text-sm text-fkvi-blue font-medium">Vollständige Profile nur für geprüfte Unternehmen</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/beratung">
                  <button className="inline-flex items-center gap-2 bg-fkvi-blue text-white px-6 py-3 rounded-xl font-semibold hover:bg-fkvi-blue/90 transition-all">
                    Zugang anfragen <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link to="/matching/login">
                  <button className="inline-flex items-center gap-2 border border-fkvi-blue/30 text-fkvi-blue px-6 py-3 rounded-xl font-semibold hover:bg-fkvi-blue/5 transition-all">
                    Bereits registriert
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonial ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-fkvi-blue">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-6 opacity-50">"</div>
          <blockquote className="text-xl text-white/90 font-medium leading-relaxed mb-8">
            Ich bin sehr zufrieden, weil alle Azubis einfach die Einreise geschafft haben. Sie haben für uns einen
            nicht unerheblichen Teil der behördlichen Arbeit, unter anderem auch in Marokko selbst vor Ort, erledigt.
          </blockquote>
          <div className="text-white/60 text-sm">
            <strong className="text-white">Alfred Schaub</strong> · Seniorenresidenzen Lerchenhof
          </div>
          <div className="flex justify-center gap-1 mt-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-fkvi-blue">Häufige Fragen</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6">
            {[
              { q: 'Warum internationale Pflegekräfte?', a: 'Der Fachkräftemangel im Inland ist längst Realität. Wer heute nicht international denkt, steht morgen ohne Personal da. Die vermittelten Pflegekräfte bringen Erfahrung und Motivation mit. Sie wollen langfristig bleiben und sorgen so für echte Stabilität im Team.' },
              { q: 'Leasing oder Direktvermittlung – was ist besser?', a: 'Leasing ist oft nur eine kurzfristige Lösung mit hohen Kosten und wechselndem Personal. Wir setzen bewusst auf Direktvermittlung. Die Pflegekräfte werden direkt bei Ihnen angestellt und möchten sich langfristig ein neues Leben aufbauen – das gibt Ihnen verlässliche Personalplanung und mehr Stabilität.' },
              { q: 'Wie ist das mit Sprache und Qualifikation?', a: 'Alle vermittelten Pflegekräfte sprechen mindestens B1-Deutsch, oft B2. Das ist offiziell geprüft. Sie bringen 4 bis 8 Jahre Berufserfahrung mit und wissen, worauf es in der deutschen Pflege ankommt.' },
              { q: 'Dauert das Verfahren lange?', a: 'Nein. Durch klare Prozesse und das beschleunigte Fachkräfteverfahren ist die Einreise oft in 2 bis 3 Monaten möglich. Wir kümmern uns um alles – Sie müssen nichts organisieren.' },
              { q: 'Wo findet die Beratung statt?', a: 'Wir sitzen in Frankfurt und begleiten Einrichtungen aus ganz Deutschland. Die Beratung läuft telefonisch oder digital – individuell und mit klarem Fokus auf Ihre Situation.' },
            ].map(item => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue mb-4">
            Stoppen Sie den Dauerstress.<br />Jetzt qualifiziertes Personal sichern.
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Pflegeeinrichtungen, die frühzeitig planen, haben heute schon das Personal, das anderen noch fehlt.
            In einem kostenlosen Beratungsgespräch zeigen wir Ihnen, wie Sie schnell und planbar neue Pflegefachkräfte gewinnen.
          </p>
          <Link to="/beratung"
            className="inline-flex items-center gap-2 bg-fkvi-blue text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-fkvi-blue/90 transition-all shadow-lg">
            Jetzt kostenlos Beratung anfragen <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
            <a href="tel:+491605562142" className="flex items-center gap-2 hover:text-fkvi-blue transition-colors">
              <Phone className="h-4 w-4" />+49 160 5562142
            </a>
            <a href="mailto:info@fachkraft-vermittlung.de" className="flex items-center gap-2 hover:text-fkvi-blue transition-colors">
              <Mail className="h-4 w-4" />info@fachkraft-vermittlung.de
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-fkvi-blue border-t border-white/10 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="overflow-hidden flex items-center mb-3" style={{ height: 60 }}>
                <img src="/logo.svg" alt="FKVI" style={{ height: 160, marginTop: -46, filter: 'brightness(0) invert(1)' }} />
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                FKVI – Fachkraft Vermittlung International GmbH & Co. KG<br />
                Ammelburgstraße 34, 60320 Frankfurt am Main
              </p>
            </div>
            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Navigation</p>
              <div className="space-y-2">
                {[
                  { label: 'Unser Matching', action: () => funnelRef.current?.scrollIntoView({ behavior: 'smooth' }) },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className="block text-white/60 text-sm hover:text-white transition-colors">{item.label}</button>
                ))}
                <Link to="/downloads" className="block text-white/60 text-sm hover:text-white transition-colors">Downloads</Link>
                <Link to="/beratung" className="block text-white/60 text-sm hover:text-white transition-colors">Beratung anfragen</Link>
                <Link to="/matching/login" className="block text-white/60 text-sm hover:text-white transition-colors">Unternehmens-Login</Link>
              </div>
            </div>
            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Kontakt</p>
              <div className="space-y-2">
                <a href="tel:+491605562142" className="flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors">
                  <Phone className="h-3.5 w-3.5" />+49 160 5562142
                </a>
                <a href="mailto:info@fachkraft-vermittlung.de" className="flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors">
                  <Mail className="h-3.5 w-3.5" />info@fachkraft-vermittlung.de
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex items-center justify-between text-xs text-white/30">
            <span>© 2025 FKVI – Fachkraft Vermittlung International</span>
            <Link to="/admin/login" className="hover:text-white/60 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
