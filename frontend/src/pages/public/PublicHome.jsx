import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Phone, ChevronDown, ChevronUp, Lock, Clock, Star, Users, ArrowRight, Play, CheckCircle2 } from 'lucide-react'
import { RECOGNITION_LABELS } from '@/lib/utils'

// ─── Data ─────────────────────────────────────────────────────────────────────
const FUNNEL_DATA = {
  fk: {
    stages: [
      { num:'01', title:'Persönliches Erstgespräch', sub:'Motivation, Ziele & Berufserfahrung', w:100, bg:'#EEF2FF', fg:'#3730a3', detail:'Warum Pflege? Warum Deutschland? Wir verstehen die Person hinter dem Lebenslauf – ihre Antriebe, Erfahrung und Erwartungen an den nächsten Karriereschritt.', tags:['Motivation','Berufsziele','Erfahrung'] },
      { num:'02', title:'Regionale Präferenzanalyse', sub:'Herkunft, Wunschregion & Einrichtungstyp', w:85, bg:'#E0F2FE', fg:'#0c4a6e', detail:'Stadt oder Land? Großklinik oder Pflegeeinrichtung? Wer in einer Kleinstadt aufgewachsen ist, fühlt sich in einer ländlichen Einrichtung eher zuhause.', tags:['Herkunft','Wunschregion','Kliniktyp'] },
      { num:'03', title:'Soziale Ankerpunkte', sub:'Familie, Freunde & Community in Deutschland', w:70, bg:'#CCFBF1', fg:'#134e4a', detail:'Bestehende Kontakte in Deutschland reduzieren Heimweh und beschleunigen die Integration. Wir vermitteln bevorzugt in der Nähe sozialer Ankerpunkte.', tags:['Familie','Community','Nähe'] },
      { num:'04', title:'Kulturelle Passung', sub:'Werte, Arbeitsweise & Teamdynamik', w:58, bg:'#FEF9C3', fg:'#713f12', detail:'Jedes Team tickt anders. Wir gleichen Persönlichkeit und Kommunikationsstil mit der Einrichtungskultur ab – für ein harmonisches Miteinander vom ersten Tag.', tags:['Teamkultur','Kommunikation','Werte'] },
      { num:'05', title:'Fachliche Qualifikation', sub:'B2-Zertifikat & Berufsanerkennung', w:44, bg:'#FEE2E2', fg:'#7f1d1d', detail:'Erst wenn die persönliche Passung stimmt, prüfen wir: Sprachniveau (mind. B2), Berufsanerkennung und fachspezifische Erfahrung auf der Zielstation.', tags:['B2-Zertifikat','Anerkennung','Fachkompetenz'] },
      { num:'06', title:'Platzierung & 12 Monate Begleitung', sub:'Inklusive Ersatzgarantie', w:32, bg:'#1a3a5c', fg:'#ffffff', detail:'Die Fachkraft startet – und wir bleiben dran. Regelmäßige Check-ins, Konfliktmediation und Integrationsbegleitung über 12 Monate. Inklusive Ersatzgarantie.', tags:['Onboarding','Check-ins','Garantie'] },
    ],
    resultTitle: 'Perfekte Passung. Langfristiger Verbleib.',
    resultSub: 'Unsere Fachkräfte bleiben – weil sie dort ankommen, wo sie hingehören.',
  },
  az: {
    stages: [
      { num:'01', title:'Persönliches Erstgespräch', sub:'Motivation, Lernbereitschaft & Zukunftswunsch', w:100, bg:'#EEF2FF', fg:'#3730a3', detail:'Warum möchte die Person in die Pflege? Was erwartet sie von einer Ausbildung in Deutschland? Wir verstehen Motivation und Reife des Bewerbers.', tags:['Motivation','Lernbereitschaft','Zukunftsvision'] },
      { num:'02', title:'Regionale Präferenzanalyse', sub:'Herkunft, Wunschregion & Ausbildungsbetrieb', w:85, bg:'#E0F2FE', fg:'#0c4a6e', detail:'Stadt oder Land? Gerade für junge Menschen ist die richtige Umgebung entscheidend für einen erfolgreichen Ausbildungsstart.', tags:['Herkunft','Wunschregion','Betriebsgröße'] },
      { num:'03', title:'Soziale Ankerpunkte', sub:'Familie, Freunde & Betreuungsnetz', w:70, bg:'#CCFBF1', fg:'#134e4a', detail:'Gerade bei jüngeren Azubis ist ein soziales Netz besonders wichtig. Wir vermitteln in der Nähe bestehender Ankerpunkte.', tags:['Familie','Betreuung','Nähe'] },
      { num:'04', title:'Kulturelle Passung', sub:'Persönlichkeit, Teamfähigkeit & Betreuungskapazität', w:58, bg:'#FEF9C3', fg:'#713f12', detail:'Hat das Team Kapazität für Anleitung? Passt die Teamdynamik? Der Ausbildungsbetrieb muss menschlich und fachlich passen.', tags:['Teamfähigkeit','Anleitung','Betreuung'] },
      { num:'05', title:'Schulische Voraussetzungen', sub:'Sprachpotenzial (B1+), Schulabschluss & Eignung', w:44, bg:'#FEE2E2', fg:'#7f1d1d', detail:'Für den Ausbildungsstart reicht oft B1 – entscheidend ist das Lernpotenzial. Wir prüfen schulische Voraussetzungen und Ausbildungseignung.', tags:['B1-Sprachniveau','Schulabschluss','Lernpotenzial'] },
      { num:'06', title:'Ausbildungsstart & Begleitung', sub:'Über die gesamte Ausbildung', w:32, bg:'#1a3a5c', fg:'#ffffff', detail:'Der Azubi startet – und wir begleiten den gesamten Weg: Onboarding, regelmäßige Check-ins und Unterstützung bei Herausforderungen.', tags:['Onboarding','Ausbildungsbegleitung','Check-ins'] },
    ],
    resultTitle: 'Der richtige Start. Die richtige Einrichtung.',
    resultSub: 'Unsere Azubis bleiben – weil Ausbildung und Umfeld von Anfang an zusammenpassen.',
  },
}

const ROI_TYPES = [
  { label: 'Pflegefachkraft (QN4)', savingsPerYear: 61200, amortMonths: 3.3 },
  { label: 'Pflegefachkraft (QN3)', savingsPerYear: 48000, amortMonths: 4.1 },
  { label: 'Pflegehilfskraft', savingsPerYear: 36000, amortMonths: 5.2 },
  { label: 'Stationsleitung', savingsPerYear: 72000, amortMonths: 2.8 },
]

// ─── Components ───────────────────────────────────────────────────────────────
function NavBar({ funnelRef, roiRef, prozessRef }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  const scroll = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white shadow-sm' : 'bg-white/95 backdrop-blur-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-fkvi-blue flex items-center justify-center text-white font-bold text-sm shrink-0">FK</div>
          <span className="font-bold text-fkvi-blue text-lg">FKVI</span>
        </div>

        {/* Nav links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
          <button onClick={() => scroll(funnelRef)} className="hover:text-fkvi-blue transition-colors">Leistungen</button>
          <button onClick={() => scroll(funnelRef)} className="hover:text-fkvi-blue transition-colors">Kompetenzpass</button>
          <button onClick={() => scroll(roiRef)} className="hover:text-fkvi-blue transition-colors">ROI-Rechner</button>
          <button onClick={() => scroll(prozessRef)} className="hover:text-fkvi-blue transition-colors">Prozess</button>
          <Link to="/downloads" className="hover:text-fkvi-blue transition-colors">Downloads</Link>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <a href="tel:+491605562142" className="hidden md:flex items-center gap-1.5 text-sm text-gray-600 hover:text-fkvi-blue transition-colors">
            <Phone className="h-4 w-4" />+49 160 5562142
          </a>
          <Link to="/beratung" className="bg-fkvi-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fkvi-blue/90 transition-colors whitespace-nowrap">
            Gespräch vereinbaren
          </Link>
        </div>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section className="pt-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 mb-6">
              <span className="text-green-600 font-semibold">✓</span> 98,1% Erfüllquote
              <span className="w-1 h-1 rounded-full bg-gray-300 mx-1" />
              <span className="text-green-600 font-semibold">✓</span> Pflegekräfte 2026
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-fkvi-blue leading-tight mb-6">
              Pflegekräfte finden.<br />
              Inklusive Wohnraum.<br />
              <span className="text-blue-500">In 4 Monaten vor Ort.</span>
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
              Nachhaltige Rekrutierung für Klinik & OP. Wir gehen zu 100% in Vorleistung
              und garantieren B2-Niveau sowie eine zuverlässige Begleitung.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link to="/beratung"
                className="inline-flex items-center justify-center gap-2 bg-fkvi-blue text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-fkvi-blue/90 transition-all shadow-lg shadow-fkvi-blue/20">
                Gespräch vereinbaren <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/matching/login"
                className="inline-flex items-center justify-center gap-2 border border-gray-200 text-fkvi-blue px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                Unternehmens-Login
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-8 border-t border-gray-100">
              {[
                { val: '98,2%', label: 'Erfolgsquote' },
                { val: '57', label: 'Fachkräfte' },
                { val: '4 Mo.', label: 'Ø bis vor Ort' },
                { val: '100%', label: 'Vorleistung' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-xl font-bold text-fkvi-blue">{s.val}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – YouTube embed placeholder */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-800 aspect-video">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
                title="FKVI – Ihr Partner für internationale Pflegekräfte"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">12 Monate Garantie</div>
                <div className="text-xs text-gray-400">Kostenloser Ersatz</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PartnersStrip() {
  return (
    <section className="py-10 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <p className="text-center text-xs font-semibold text-gray-400 tracking-widest uppercase mb-6">Vertrauensvolle Kooperationen mit</p>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
          {['Asklepios Klinik Langen', 'Klinikgruppe West', 'Pflegezentrum Nord', 'Seniorenresidenz Frankfurt'].map(name => (
            <div key={name} className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
              <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs">🏥</div>
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LeistungenSection() {
  const cards = [
    { icon: '🚐', title: '3 Tage Vor-Ort-Support', desc: 'Persönliche Abholung, Behördengänge und Begleitung in die neue Wohnung. Wir sichern den perfekten Start ab Tag 1.' },
    { icon: '👥', title: '90 Tage Mentoring', desc: 'Langfristige Integration statt Kurzschluss-Kündigung. Wir begleiten Fachkraft und Team intensiv durch die erste Phase.' },
    { icon: '💰', title: '100% Vorleistung', desc: 'Wir investieren vorab in Qualifikation (B2), Flug und Visum. Für Sie entsteht null finanzielles Risiko im Vorfeld.' },
    { icon: '✅', title: '12 Monate Garantie', desc: 'Sollte eine Fachkraft das Team verlassen, erhalten Sie kostenlosen Ersatz. Volle Planungssicherheit für Sie.' },
  ]
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-500 mb-3">Unsere Leistungen</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Warum Kliniken auf FKVI vertrauen</h2>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            Wir gehen weit über klassische Personalvermittlung hinaus. Unser ganzheitlicher Ansatz
            sichert nachhaltige Integration und langfristige Mitarbeiterbindung.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map(c => (
            <div key={c.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl mb-4">{c.icon}</div>
              <h3 className="font-bold text-fkvi-blue mb-2">{c.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function KompetenzpassSection({ funnelRef }) {
  const [mode, setMode] = useState('fk')
  const [openIdx, setOpenIdx] = useState(-1)
  const d = FUNNEL_DATA[mode]

  return (
    <section ref={funnelRef} className="py-20 px-4 sm:px-6 bg-fkvi-blue">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-300 mb-3">Kompetenzpass</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Unser Matching-Filter</h2>
          <p className="text-white/60 max-w-xl mx-auto">
            6 Stufen bis zur perfekten Passung. Jede Stufe filtert gezielt –
            damit nur Fachkräfte vermittelt werden, die wirklich passen und langfristig bleiben.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-white/10 p-1">
            {[{ key:'fk', label:'Fachkräfte' }, { key:'az', label:'Azubis' }].map(t => (
              <button key={t.key} onClick={() => { setMode(t.key); setOpenIdx(-1) }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${mode === t.key ? 'bg-white text-fkvi-blue shadow-sm' : 'text-white/70 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="flex flex-col items-center gap-1">
          {d.stages.map((s, i) => (
            <div key={i} className="w-full flex flex-col items-center gap-1">
              <button onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                className="relative flex items-center justify-between px-5 py-4 rounded-xl text-left transition-transform hover:scale-[1.015] w-full"
                style={{ width:`${s.w}%`, background:s.bg, color:s.fg }}>
                <div>
                  <div className="text-xs font-bold opacity-60 mb-0.5">{s.num}</div>
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-xs opacity-65 mt-0.5">{s.sub}</div>
                </div>
                <div className="shrink-0 ml-3 opacity-50">
                  {openIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              {openIdx === i && (
                <div className="w-full max-w-lg bg-white rounded-xl p-5 text-sm text-gray-600 leading-relaxed">
                  <p className="mb-3">{s.detail}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.tags.map(t => (
                      <span key={t} className="text-xs font-medium px-3 py-1 rounded-full bg-fkvi-blue/8 text-fkvi-blue">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {i < d.stages.length - 1 && <div className="text-white/30 text-xs py-0.5">▼</div>}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-6 w-6 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{d.resultTitle}</h3>
          <p className="text-sm text-white/60">{d.resultSub}</p>
        </div>
      </div>
    </section>
  )
}

function RoiRechner({ roiRef }) {
  const [typeIdx, setTypeIdx] = useState(0)
  const [stellen, setStellen] = useState(5)
  const type = ROI_TYPES[typeIdx]
  const savings = type.savingsPerYear * stellen
  const fmt = (n) => n.toLocaleString('de-DE') + ' €'

  return (
    <section ref={roiRef} className="py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl overflow-hidden shadow-xl border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-fkvi-blue to-blue-600 px-8 py-8 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-blue-200 mb-2">ROI-Rechner</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Vom Kostenblock zum Ertragsfaktor</h2>
            <p className="text-white/70 mt-2 text-sm">Berechnen Sie Ihre potenzielle Einsparung gegenüber Leasing-Modellen</p>
          </div>

          {/* Calculator */}
          <div className="bg-white p-8">
            <div className="grid sm:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-xs">i</span>
                  Fachbereich
                </label>
                <select value={typeIdx} onChange={e => setTypeIdx(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-fkvi-blue/20 appearance-none">
                  {ROI_TYPES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="text-blue-500">〜</span> Stellenanzahl
                  </span>
                  <span className="text-blue-500 font-bold text-lg">{stellen}</span>
                </label>
                <input type="range" min={1} max={30} value={stellen} onChange={e => setStellen(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>15</span><span>30</span></div>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-2">Potenzielle jährliche Budget-Entlastung gegenüber Leasing:</p>
              <div className="text-5xl font-bold text-green-500">{fmt(savings)}</div>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 rounded-r-xl p-4 mb-6">
              <p className="text-sm text-red-700">
                <strong>Hinweis:</strong> Vakanzkosten von 2.500 € – 5.000 € Umsatzverlust pro Monat je unbesetztem Bett sind hier noch nicht eingerechnet!
              </p>
            </div>

            <Link to="/beratung"
              className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 rounded-xl transition-colors text-sm">
              Individuelle Analyse als PDF anfordern
            </Link>

            <p className="text-center text-sm text-gray-500 mt-4">
              <strong>{type.label}:</strong> Amortisation der Investition in ca.{' '}
              <span className="text-blue-500 font-semibold">{type.amortMonths} Monaten.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function KundenstimmenSection({ profiles, profilesLoading }) {
  const testimonials = [
    { initial:'D', name:'Dr. med. Bernd Schmidt', role:'Geschäftsführer Klinikgruppe West', quote:'FKVI hat das Problem der Unterbringung für uns gelöst. Das ist der entscheidende Hebel für die erfolgreiche Integration.' },
    { initial:'S', name:'Sabine Müller', role:'Pflegedirektorin', quote:'Die Fachkräfte waren vom ersten Tag an einsatzbereit. Das 90-Tage-Mentoring hat uns und den neuen Mitarbeitern ab dem ersten Tag eine spürbare Entlastung gegeben.' },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-500 mb-3">Kundenstimmen</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Was unsere Partner sagen</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Erfahren Sie aus erster Hand, wie FKVI Kliniken und Pflegeeinrichtungen bei der Rekrutierung unterstützt.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-16">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Video placeholder */}
              <div className="relative bg-slate-600 aspect-video flex items-center justify-center cursor-pointer group">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Play className="h-7 w-7 text-white ml-1" />
                </div>
                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">Kundenstimme ansehen</div>
              </div>
              {/* Quote */}
              <div className="p-6">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_,j) => <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm italic leading-relaxed mb-4">„{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-fkvi-blue flex items-center justify-center text-white font-bold text-sm">{t.initial}</div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Anonymized Profiles */}
        <div className="text-center mb-10">
          <h3 className="text-2xl font-bold text-fkvi-blue">Aktuelle Fachkräfte im Pool</h3>
          <p className="text-gray-500 mt-2 max-w-lg mx-auto text-sm">
            Namen und Kontaktdaten sind nur für freigeschaltete Unternehmen sichtbar.
          </p>
        </div>
        {profilesLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_,i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-100" />
                <div className="p-4 space-y-3"><div className="h-4 bg-gray-100 rounded w-2/3" /><div className="h-8 bg-gray-100 rounded" /></div>
              </div>
            ))}
          </div>
        ) : profiles.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.slice(0,3).map((p,i) => <ProfileCard key={p.id} profile={p} index={i} />)}
          </div>
        ) : null}
        {profiles.length > 0 && (
          <div className="mt-8 text-center">
            <Link to="/beratung" className="inline-flex items-center gap-2 bg-fkvi-blue text-white px-6 py-3 rounded-xl font-semibold hover:bg-fkvi-blue/90 transition-all">
              Vollprofile freischalten <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function ProfileCard({ profile, index }) {
  const initials = `FK${String(index + 1).padStart(3, '0')}`
  const age = profile.age ? `${profile.age} J.` : null
  const specs = (profile.specializations || []).slice(0, 2)
  const exp = profile.total_experience_years ? `${profile.total_experience_years} J. Erfahrung` : null
  const recognition = profile.german_recognition ? RECOGNITION_LABELS?.[profile.german_recognition] : null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="relative h-44 bg-gradient-to-br from-fkvi-blue/10 to-fkvi-blue/5 flex items-center justify-center overflow-hidden">
        {profile.profile_image_url
          ? <img src={profile.profile_image_url} alt="Fachkraft" className="w-full h-full object-cover" />
          : <div className="w-16 h-16 rounded-full bg-fkvi-blue/20 flex items-center justify-center"><Users className="h-8 w-8 text-fkvi-blue/50" /></div>
        }
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-semibold text-fkvi-blue">{initials}</div>
      </div>
      <div className="p-4 space-y-3">
        <div><div className="h-5 w-32 rounded bg-gray-200 blur-sm select-none" /><p className="text-xs text-gray-400 mt-1">{[profile.nationality, age].filter(Boolean).join(' · ')}</p></div>
        <div className="flex flex-wrap gap-1.5">
          {specs.map(s => <span key={s} className="text-xs bg-fkvi-blue/8 text-fkvi-blue px-2 py-0.5 rounded-full font-medium">{s}</span>)}
          {exp && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" />{exp}</span>}
        </div>
        {recognition && <p className="text-xs text-gray-500 flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />Anerkennung: {recognition}</p>}
        <Link to="/beratung" className="block">
          <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 hover:bg-fkvi-blue hover:text-white hover:border-fkvi-blue transition-all group-hover:bg-fkvi-blue group-hover:text-white group-hover:border-fkvi-blue">
            <Lock className="h-3.5 w-3.5" />Vollprofil freischalten
          </button>
        </Link>
      </div>
    </div>
  )
}

function ProzessSection({ prozessRef }) {
  const steps = [
    { week:'Woche 0–2', title:'Matching', sub:'Videointerviews & Qualifikationsprüfung' },
    { week:'Woche 3–6', title:'Vertragsabschluss', sub:'Arbeitsvertrag & Unterlagen' },
    { week:'Woche 7–12', title:'Visumverfahren (§81a)', sub:'Behörden & Botschaft' },
    { week:'Woche 13–16', title:'Einreise & Onboarding', sub:'Wohnung, Konto, Anmeldung' },
    { week:'Monat 5–12', title:'Mentoring & Integration', sub:'90 Tage intensiv, dann Check-ins' },
  ]
  return (
    <section ref={prozessRef} className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-500 mb-3">Transparenz hergestellt</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Der FKVI Zeitstrahl (§81a)</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Transparenter Prozess von der ersten Kontaktaufnahme bis zur vollständigen Integration –
            rechtssicher und nachvollziehbar.
          </p>
        </div>

        <div className="relative">
          {/* Timeline bar */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-100 -translate-x-1/2 hidden md:block" />
          <div className="space-y-8">
            {steps.map((s, i) => (
              <div key={i} className={`relative flex items-center gap-6 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                {/* Content */}
                <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-semibold text-blue-500 mb-1">{s.week}</p>
                  <h3 className="font-bold text-fkvi-blue">{s.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{s.sub}</p>
                </div>
                {/* Circle */}
                <div className="relative z-10 w-10 h-10 rounded-full bg-fkvi-blue text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                  {i + 1}
                </div>
                {/* Spacer */}
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MotivationSection() {
  const values = [
    { icon:'❤️', title:'Menschlichkeit', desc:'Wir sehen Menschen, nicht Ressourcen.' },
    { icon:'🔒', title:'Verlässlichkeit', desc:'Klare Versprechen. Eingehaltene Zusagen.' },
    { icon:'🌍', title:'Integration', desc:'Nachhaltig. Nicht nur auf dem Papier.' },
  ]
  return (
    <section className="py-24 px-4 sm:px-6 bg-fkvi-blue">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-4xl mb-6">❤️</div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Unsere Motivation</h2>
        <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-4">
          Wir tun dies, weil wir selbst Söhne und Töchter sind. Unsere Eltern werden älter,
          und wir wollen sicherstellen, dass sie in stabilen und kompetenten Teams gepflegt werden.
        </p>
        <p className="text-white/40 italic text-lg mb-16">
          „Pflege ist keine Übergangslösung – sie ist das Fundament unserer Gesellschaft."
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {values.map(v => (
            <div key={v.title} className="bg-white/10 rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl mx-auto mb-4">{v.icon}</div>
              <h3 className="font-bold text-white mb-2">{v.title}</h3>
              <p className="text-sm text-white/60">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-blue-500 mb-4">Gesprächsanfragen</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue mb-4">
          Lassen Sie uns Ihren Business-Case besprechen
        </h2>
        <p className="text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Gemeinsam mit unserem Team erörtern wir, wie wir Ihre individuelle Situation lösen
          und nachhaltige Entlastung schaffen können.
        </p>
        <Link to="/beratung"
          className="inline-flex items-center gap-2 bg-fkvi-blue text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-fkvi-blue/90 transition-all shadow-lg shadow-fkvi-blue/20">
          Gespräch vereinbaren <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-400">
          <Phone className="h-4 w-4" />
          <a href="tel:+491605562142" className="hover:text-fkvi-blue transition-colors">+49 160 5562142</a>
        </div>
      </div>
    </section>
  )
}

function Footer({ funnelRef, roiRef, prozessRef }) {
  const scroll = (ref) => ref.current?.scrollIntoView({ behavior:'smooth' })
  return (
    <footer className="bg-fkvi-blue py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">FK</div>
              <span className="font-bold text-white">FKVI</span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              Fachkraft Vermittlung International<br />GmbH & Co. KG<br />
              Ammelburgstraße 34<br />60320 Frankfurt am Main
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Leistungen</p>
            <div className="space-y-2">
              <button onClick={() => scroll(funnelRef)} className="block text-white/60 text-sm hover:text-white transition-colors">Kompetenzpass</button>
              <button onClick={() => scroll(roiRef)} className="block text-white/60 text-sm hover:text-white transition-colors">ROI-Rechner</button>
              <button onClick={() => scroll(prozessRef)} className="block text-white/60 text-sm hover:text-white transition-colors">Prozess</button>
            </div>
          </div>
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Unternehmen</p>
            <div className="space-y-2">
              <Link to="/downloads" className="block text-white/60 text-sm hover:text-white transition-colors">Downloads</Link>
              <Link to="/matching/login" className="block text-white/60 text-sm hover:text-white transition-colors">Unternehmens-Login</Link>
              <Link to="/beratung" className="block text-white/60 text-sm hover:text-white transition-colors">Beratung anfragen</Link>
            </div>
          </div>
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Kontakt</p>
            <div className="space-y-2">
              <a href="tel:+491605562142" className="block text-white/60 text-sm hover:text-white transition-colors">+49 160 5562142</a>
              <a href="mailto:info@fachkraft-vermittlung.de" className="block text-white/60 text-sm hover:text-white transition-colors">info@fachkraft-vermittlung.de</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex items-center justify-between text-xs text-white/30">
          <span>© 2025 FKVI – Fachkraft Vermittlung International</span>
          <Link to="/admin/login" className="hover:text-white/60 transition-colors">Admin</Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PublicHome() {
  const [profiles, setProfiles] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const funnelRef = useRef(null)
  const roiRef = useRef(null)
  const prozessRef = useRef(null)

  useEffect(() => {
    supabase.from('profiles')
      .select('id,age,nationality,profile_image_url,specializations,total_experience_years,german_recognition')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { setProfiles(data || []); setProfilesLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <NavBar funnelRef={funnelRef} roiRef={roiRef} prozessRef={prozessRef} />
      <HeroSection />
      <PartnersStrip />
      <LeistungenSection />
      <KompetenzpassSection funnelRef={funnelRef} />
      <RoiRechner roiRef={roiRef} />
      <KundenstimmenSection profiles={profiles} profilesLoading={profilesLoading} />
      <ProzessSection prozessRef={prozessRef} />
      <MotivationSection />
      <CtaSection />
      <Footer funnelRef={funnelRef} roiRef={roiRef} prozessRef={prozessRef} />
    </div>
  )
}
