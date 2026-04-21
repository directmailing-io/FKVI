import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Phone, ChevronDown, ChevronUp, Lock, Clock, Star, Users, ArrowRight, Play, CheckCircle2, Info, X, Loader2, ShieldCheck, Building2 } from 'lucide-react'
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

const ERFUELLQUOTE_TOOLTIP = 'Anteil der Fachkräfte, die im Jahr 2025 ihr Anerkennungsverfahren durchliefen und weiterhin in einem festen Einstellungsverhältnis bei ihrem ursprünglichen Arbeitgeber stehen.'

const LOGO_PARTNERS = [
  { name: 'Asklepios Klinik', abbr: 'AK' },
  { name: 'Klinikgruppe West', abbr: 'KW' },
  { name: 'Pflegezentrum Nord', abbr: 'PN' },
  { name: 'Seniorenresidenz Frankfurt', abbr: 'SF' },
  { name: 'Caritas Pflege', abbr: 'CP' },
  { name: 'DRK Klinikum', abbr: 'DR' },
  { name: 'Helios Kliniken', abbr: 'HK' },
  { name: 'AWO Pflegedienst', abbr: 'AW' },
]

// ─── Components ───────────────────────────────────────────────────────────────
function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="Mehr Informationen"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 ml-1"
      >
        <Info className="w-2.5 h-2.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <span className="block w-72 bg-gray-900 text-white text-xs leading-relaxed rounded-xl px-4 py-3 shadow-2xl">
            <span className="block font-semibold text-green-400 mb-1">98,1% Erfüllquote</span>
            {text}
          </span>
          <span className="block w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </span>
      )}
    </span>
  )
}

function NavBar({ funnelRef, prozessRef }) {
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
              <span className="text-green-600 font-semibold">✓</span>
              98,1% Erfüllquote
              <InfoTooltip text={ERFUELLQUOTE_TOOLTIP} />
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

function LogoMarquee() {
  const logos = [...LOGO_PARTNERS, ...LOGO_PARTNERS]
  return (
    <section className="py-10 border-y border-gray-100 overflow-hidden">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
      `}</style>
      <p className="text-center text-xs font-semibold text-gray-400 tracking-widest uppercase mb-6">
        Vertrauensvolle Kooperationen mit
      </p>
      <div
        className="relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        <div className="marquee-track">
          {logos.map((logo, i) => (
            <div key={i} className="flex items-center gap-3 mx-8 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-fkvi-blue/8 border border-gray-100 flex items-center justify-center text-fkvi-blue font-bold text-xs shrink-0">
                {logo.abbr}
              </div>
              <span className="text-gray-500 font-semibold text-sm whitespace-nowrap">{logo.name}</span>
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

function ProfilesSection({ profiles, profilesLoading }) {
  const [modalOpen, setModalOpen] = useState(false)
  const visible = profiles.slice(0, 3)

  return (
    <>
      <AccessRequestModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-3">Aktueller Pool</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Fachkräfte verfügbar</h2>
            <p className="text-gray-400 mt-4 max-w-md mx-auto text-sm leading-relaxed">
              Vollständige Profile – Namen, Kontaktdaten und Dokumente – sind ausschließlich für freigeschaltete Partnereinrichtungen sichtbar.
            </p>
          </div>

          {profilesLoading ? (
            <div className="grid sm:grid-cols-3 gap-6">
              {[...Array(3)].map((_,i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-24 bg-gray-100" />
                  <div className="px-5 pt-12 pb-5 space-y-3">
                    <div className="h-4 bg-gray-100 rounded-full w-24 mx-auto" />
                    <div className="h-3 bg-gray-100 rounded-full w-16 mx-auto" />
                    <div className="h-px bg-gray-100 my-2" />
                    <div className="flex gap-2 justify-center">
                      <div className="h-6 w-20 bg-gray-100 rounded-full" />
                      <div className="h-6 w-24 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-9 bg-gray-100 rounded-xl mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="grid sm:grid-cols-3 gap-6">
              {visible.map((p, i) => (
                <ProfileCard key={p.id} profile={p} index={i} onRequestAccess={() => setModalOpen(true)} />
              ))}
            </div>
          ) : null}

          <div className="mt-10 text-center">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-fkvi-blue text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-fkvi-blue/90 transition-all shadow-lg shadow-fkvi-blue/20"
            >
              Vollprofile freischalten <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-gray-400 mt-3">Zugang nur für verifizierte Einrichtungen</p>
          </div>
        </div>
      </section>
    </>
  )
}

function KundenstimmenSection() {
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

        <div className="grid lg:grid-cols-2 gap-6">
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
      </div>
    </section>
  )
}

function AccessRequestModal({ open, onClose }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleClose = () => {
    if (loading) return
    setForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '' })
    setError('')
    setDone(false)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'already_approved') {
          setError('Diese E-Mail-Adresse ist bereits freigeschaltet. Bitte melden Sie sich direkt an.')
        } else if (data.error === 'already_pending') {
          setError('Wir haben bereits eine Anfrage mit dieser E-Mail-Adresse erhalten und werden uns bald bei Ihnen melden.')
        } else {
          setError(data.error || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
        }
        return
      }
      setDone(true)
    } catch {
      setError('Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-br from-fkvi-blue to-fkvi-blue/90 px-6 pt-7 pb-6 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Zugang beantragen</h2>
              <p className="text-white/60 text-xs">Matching-Plattform & Vollprofile</p>
            </div>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            Nach kurzer Prüfung schalten wir Ihren Zugang manuell frei und
            senden Ihnen einen Link zur Passwortvergabe.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {done ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">Anfrage eingegangen!</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Wir melden uns so schnell wie möglich bei <strong>{form.email}</strong> – in der Regel innerhalb von 24 Stunden.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl bg-fkvi-blue text-white text-sm font-semibold hover:bg-fkvi-blue/90 transition-colors"
              >
                Alles klar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Vorname <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="Max"
                    required
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Nachname <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="Mustermann"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                  />
                </div>
              </div>

              {/* Company (optional) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  Einrichtung / Unternehmen
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Muster Klinikum GmbH"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Telefonnummer <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+49 160 1234567"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">E-Mail-Adresse <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="max@klinikum.de"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-fkvi-blue text-white py-3 rounded-xl font-semibold text-sm hover:bg-fkvi-blue/90 disabled:opacity-60 transition-all"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Wird gesendet…</>
                  : <><ShieldCheck className="h-4 w-4" />Zugang beantragen</>
                }
              </button>

              <p className="text-center text-xs text-gray-400 leading-relaxed">
                Ihre Daten werden vertraulich behandelt und nur zur Zugangsprüfung verwendet.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ profile, index, onRequestAccess }) {
  const code = `FK${String(index + 1).padStart(3, '0')}`
  const age = profile.age ? `${profile.age} J.` : null
  const specs = (profile.specializations || []).slice(0, 3)
  const exp = profile.total_experience_years
  const recognition = profile.german_recognition ? RECOGNITION_LABELS?.[profile.german_recognition] : null

  const recColor = recognition === 'Anerkannt'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'

  return (
    <div className="group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">
      {/* Top gradient band */}
      <div className="h-24 bg-gradient-to-br from-fkvi-blue/8 via-fkvi-teal/5 to-transparent" />

      {/* Circular avatar — centered, overlapping the band */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <div
          className="w-24 h-24 rounded-full p-[3px] shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0d9488, #1a3a5c)' }}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
            {profile.profile_image_url
              ? <img src={profile.profile_image_url} alt="Fachkraft" className="w-full h-full object-cover object-top" />
              : (
                <div className="w-full h-full flex items-center justify-center bg-fkvi-blue/10">
                  <Users className="h-9 w-9 text-fkvi-blue/40" />
                </div>
              )
            }
          </div>
        </div>
        {/* ID badge below the circle */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-fkvi-blue text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap tracking-wide">
          {code}
        </div>
      </div>

      {/* Body */}
      <div className="pt-16 pb-5 px-5 flex flex-col flex-1 gap-3">

        {/* Blurred name + nationality */}
        <div className="text-center">
          <div className="inline-block h-4 w-28 rounded bg-gray-200 select-none mb-1.5" style={{ filter: 'blur(6px)' }} />
          <p className="text-xs text-gray-400">
            {[profile.nationality, age].filter(Boolean).join(' · ') || 'Internationale Fachkraft'}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Experience */}
        {exp && (
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-fkvi-teal shrink-0" />
            <span className="text-xs font-semibold text-gray-700">{exp} Jahre Berufserfahrung</span>
          </div>
        )}

        {/* Specialization tags */}
        {specs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {specs.map(s => (
              <span key={s} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-fkvi-blue/8 text-fkvi-blue border border-fkvi-blue/10">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Recognition */}
        {recognition && (
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${recColor}`}>
              <CheckCircle2 className="h-3 w-3" />
              {recognition}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* CTA */}
        <button
          onClick={onRequestAccess}
          className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-500 hover:bg-fkvi-blue hover:text-white hover:border-fkvi-blue group-hover:bg-fkvi-blue group-hover:text-white group-hover:border-fkvi-blue transition-all duration-200"
        >
          <Lock className="h-3.5 w-3.5" />
          Vollprofil freischalten
        </button>
      </div>

      {/* Teal accent line on hover */}
      <div className="h-0.5 bg-gradient-to-r from-fkvi-teal/0 via-fkvi-teal/60 to-fkvi-teal/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}

function UeberUnsSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left: Label + Heading + Image */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Über uns</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue leading-tight mb-8">
              Fachkraft Vermittlung:{' '}
              <span className="text-fkvi-teal">Ihre Personalstrategie</span>{' '}
              statt einfache Vermittlung
            </h2>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img
                src="https://cdn.prod.website-files.com/6848a984ab0e450784c73da6/69b3f813bf4740250d286673_U%CC%88ber%20FKVI.jpeg"
                alt="Das FKVI-Team"
                className="w-full object-cover"
              />
            </div>
          </div>

          {/* Right: Text content */}
          <div className="lg:pt-16">
            <p className="text-gray-600 leading-relaxed mb-5">
              Fachkraft Vermittlung ist entstanden, weil wir selbst erlebt haben, wie schwer
              es ist, gute Pflegekräfte nach Deutschland zu holen. Heute setzen wir genau das um.
            </p>
            <p className="text-gray-600 leading-relaxed mb-5">
              Unsere Mission ist klar. Wir bringen erfahrene Pflegefachkräfte in die Einrichtungen,
              die sie dringend brauchen. Aber nicht irgendwie. Sondern so, dass es funktioniert.
              Mit klarer Vorauswahl, strukturiertem Integrationsprozess und persönlicher Begleitung.
            </p>
            <p className="text-gray-600 leading-relaxed mb-10">
              Was uns auszeichnet, ist kein leeres Versprechen, sondern eine Lösung, die sich in
              zahlreichen Pflegeeinrichtungen und Kliniken bereits im Alltag bewährt hat. Wir kennen
              die Branche, sprechen Ihre Sprache und wissen, worauf es wirklich ankommt.
              Verlässlichkeit, Geschwindigkeit und Qualität.
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-3 leading-snug">
                  Erprobt in der Praxis,<br />erfolgreich im Alltag
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Die vermittelten Pflegekräfte sind nicht nur qualifiziert, sondern auch vorbereitet.
                  Jeder Schritt im Prozess ist darauf ausgelegt, dass sie langfristig bleiben.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-3 leading-snug">
                  Verantwortung beginnt<br />vor dem 1. Arbeitstag
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Von der Auswahl bis zur Integration denken wir weiter als andere. Weil Sie
                  kein Risiko brauchen, sondern echte Entlastung.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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

function Footer({ funnelRef, prozessRef }) {
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
  const prozessRef = useRef(null)

  useEffect(() => {
    supabase.from('profiles')
      .select('id,age,nationality,profile_image_url,specializations,total_experience_years,german_recognition')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { setProfiles(data || []); setProfilesLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <NavBar funnelRef={funnelRef} prozessRef={prozessRef} />
      <HeroSection />
      <LogoMarquee />
      <LeistungenSection />
      <KompetenzpassSection funnelRef={funnelRef} />
      <ProfilesSection profiles={profiles} profilesLoading={profilesLoading} />
      <KundenstimmenSection />
      <UeberUnsSection />
      <ProzessSection prozessRef={prozessRef} />
      <MotivationSection />
      <CtaSection />
      <Footer funnelRef={funnelRef} prozessRef={prozessRef} />
    </div>
  )
}
