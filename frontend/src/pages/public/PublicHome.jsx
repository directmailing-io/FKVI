import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Phone, ChevronDown, ChevronUp, Lock, Star, Users, User, EyeOff, ArrowRight, Play, CheckCircle2, Info, X, Menu, Loader2, ShieldCheck, Building2, MapPin, Banknote, Home, Award, Heart, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProfileSpecializations, ALL_SPECIALIZATION_FIELDS } from '@/lib/profileOptions'

// ─── Data ─────────────────────────────────────────────────────────────────────
const FUNNEL_DATA = {
  fk: {
    stages: [
      { num:'01', title:'Persönliches Erstgespräch', sub:'Motivation, Ziele & Berufserfahrung', w:100, bg:'#EEF2FF', fg:'#3730a3', detail:'Warum Pflege? Warum Deutschland? Wir wollen die Person hinter dem Lebenslauf verstehen: ihre Antriebe, ihre Erfahrung und was sie sich vom nächsten Schritt erhofft.', tags:['Motivation','Berufsziele','Erfahrung'] },
      { num:'02', title:'Regionale Präferenzanalyse', sub:'Herkunft, Wunschregion & Einrichtungstyp', w:85, bg:'#E0F2FE', fg:'#0c4a6e', detail:'Stadt oder Land? Krankenhaus, Pflegeheim oder ambulanter Dienst? Wer in einer Kleinstadt aufgewachsen ist, fühlt sich in einer ländlichen Einrichtung oft deutlich wohler.', tags:['Herkunft','Wunschregion','Einrichtungstyp'] },
      { num:'03', title:'Soziale Ankerpunkte', sub:'Familie, Freunde & Community in Deutschland', w:70, bg:'#CCFBF1', fg:'#134e4a', detail:'Wer bereits Kontakte in Deutschland hat, kommt schneller an und bleibt länger. Wir vermitteln bevorzugt in der Nähe sozialer Ankerpunkte.', tags:['Familie','Community','Nähe'] },
      { num:'04', title:'Kulturelle Passung', sub:'Werte, Arbeitsweise & Teamdynamik', w:58, bg:'#FEF9C3', fg:'#713f12', detail:'Jedes Team tickt anders. Wir gleichen Persönlichkeit und Kommunikationsstil mit der Kultur der Einrichtung ab, damit das Miteinander von Anfang an klappt.', tags:['Teamkultur','Kommunikation','Werte'] },
      { num:'05', title:'Fachliche Qualifikation', sub:'B2-Zertifikat & Berufsanerkennung', w:44, bg:'#FEE2E2', fg:'#7f1d1d', detail:'Erst wenn die persönliche Passung stimmt, prüfen wir Sprachniveau (mind. B2), Berufsanerkennung und fachspezifische Erfahrung im Zielbereich.', tags:['B2-Zertifikat','Anerkennung','Fachkompetenz'] },
      { num:'06', title:'Platzierung & 12 Monate Begleitung', sub:'Inklusive Ersatzgarantie', w:32, bg:'#ffffff', fg:'#1a3a5c', detail:'Die Fachkraft startet, und wir bleiben dran. Regelmäßige Check-ins, Konfliktmediation und Integrationsbegleitung über 12 Monate, inklusive Ersatzgarantie.', tags:['Onboarding','Check-ins','Garantie'] },
    ],
    resultTitle: 'Perfekte Passung. Langfristiger Verbleib.',
    resultSub: 'Unsere Fachkräfte bleiben, weil sie genau dort ankommen, wo sie hingehören.',
  },
  az: {
    stages: [
      { num:'01', title:'Persönliches Erstgespräch', sub:'Motivation, Lernbereitschaft & Zukunftswunsch', w:100, bg:'#EEF2FF', fg:'#3730a3', detail:'Warum möchte die Person in die Pflege? Was erwartet sie von einer Ausbildung in Deutschland? Wir schauen auf Motivation und Reife, nicht nur auf Unterlagen.', tags:['Motivation','Lernbereitschaft','Zukunftsvision'] },
      { num:'02', title:'Regionale Präferenzanalyse', sub:'Herkunft, Wunschregion & Ausbildungsbetrieb', w:85, bg:'#E0F2FE', fg:'#0c4a6e', detail:'Stadt oder Land? Für junge Menschen ist die richtige Umgebung genauso wichtig wie die Einrichtung selbst. Wir schauen beides genau an.', tags:['Herkunft','Wunschregion','Betriebsgröße'] },
      { num:'03', title:'Soziale Ankerpunkte', sub:'Familie, Freunde & Betreuungsnetz', w:70, bg:'#CCFBF1', fg:'#134e4a', detail:'Gerade bei jüngeren Azubis ist ein soziales Netz besonders wichtig. Wir vermitteln bevorzugt in der Nähe bestehender Ankerpunkte.', tags:['Familie','Betreuung','Nähe'] },
      { num:'04', title:'Kulturelle Passung', sub:'Persönlichkeit, Teamfähigkeit & Betreuungskapazität', w:58, bg:'#FEF9C3', fg:'#713f12', detail:'Hat das Team Kapazität für Anleitung? Passt die Teamdynamik? Der Ausbildungsbetrieb muss menschlich und fachlich zur Person passen.', tags:['Teamfähigkeit','Anleitung','Betreuung'] },
      { num:'05', title:'Schulische Voraussetzungen', sub:'Sprachpotenzial (B1+), Schulabschluss & Eignung', w:44, bg:'#FEE2E2', fg:'#7f1d1d', detail:'Für den Ausbildungsstart reicht oft B1, entscheidend ist das Lernpotenzial. Wir prüfen schulische Voraussetzungen und Ausbildungseignung.', tags:['B1-Sprachniveau','Schulabschluss','Lernpotenzial'] },
      { num:'06', title:'Ausbildungsstart & Begleitung', sub:'Über die gesamte Ausbildung', w:32, bg:'#ffffff', fg:'#1a3a5c', detail:'Der Azubi startet, und wir begleiten den gesamten Weg: Onboarding, regelmäßige Check-ins und Unterstützung bei Herausforderungen.', tags:['Onboarding','Ausbildungsbegleitung','Check-ins'] },
    ],
    resultTitle: 'Der richtige Start. Die richtige Einrichtung.',
    resultSub: 'Unsere Azubis bleiben, weil Ausbildung und Umfeld von Anfang an zusammenpassen.',
  },
}

const ERFOLGSQUOTE_TOOLTIP = 'Anteil der Fachkräfte, die im Jahr 2025 ihr Anerkennungsverfahren durchliefen und weiterhin in einem festen Einstellungsverhältnis bei ihrem ursprünglichen Arbeitgeber stehen.'


const LOGO_PARTNERS = [
  { name: 'Asklepios',                    src: '/logos/asklepios.svg' },
  { name: 'Fürsorge im Alter',            src: '/logos/fuersorge-im-alter.webp' },
  { name: 'Hospital zum Heiligen Geist',  src: '/logos/hospital-heiliger-geist.svg' },
  { name: 'Residenz-Gruppe',              src: '/logos/residenz-gruppe.webp' },
  { name: 'Krankenhaus Nordwest',         src: '/logos/krankenhaus-nordwest.svg' },
  { name: 'Vitalis Senioren-Zentren',     src: '/logos/vitalis.webp' },
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
            <span className="block font-semibold text-green-400 mb-1">98,2 % Erfolgsquote</span>
            {text}
          </span>
          <span className="block w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </span>
      )}
    </span>
  )
}

function NavBar({ funnelRef, prozessRef, vorteileRef, kpassRef, poolRef }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  const scroll = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled || mobileMenuOpen ? 'bg-white shadow-sm' : 'bg-white/95 backdrop-blur-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <img src="/logo.png" alt="FKVI – Fachkraft Vermittlung International" className="h-14 w-auto" />

        {/* Nav links — desktop */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-gray-600">
          <button onClick={() => scroll(vorteileRef)} className="hover:text-fkvi-blue transition-colors whitespace-nowrap">Vorteile</button>
          <button onClick={() => scroll(kpassRef)} className="hover:text-fkvi-blue transition-colors whitespace-nowrap">Kompetenzpass</button>
          <button onClick={() => scroll(poolRef)} className="hover:text-fkvi-blue transition-colors whitespace-nowrap">Verfügbare Fachkräfte</button>
          <button onClick={() => scroll(prozessRef)} className="hover:text-fkvi-blue transition-colors whitespace-nowrap">Ablauf</button>
          <Link to="/downloads" className="hover:text-fkvi-blue transition-colors flex items-center gap-1.5 whitespace-nowrap">
            Broschüre<span className="relative -top-1.5 -ml-0.5 text-[7px] font-bold tracking-widest bg-fkvi-teal/10 text-fkvi-teal px-1 py-0.5 rounded-full leading-none">FACHKRÄFTE</span>
          </Link>
          <Link to="/matching/login" className="hover:text-fkvi-blue transition-colors whitespace-nowrap">Matching-Plattform</Link>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a href="tel:+491605562142" className="hidden md:flex items-center gap-1.5 text-sm text-gray-600 hover:text-fkvi-blue transition-colors">
            <Phone className="h-4 w-4" />+49 160 5562142
          </a>
          <Link to="/beratung" className="hidden sm:inline-flex items-center gap-2 bg-fkvi-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fkvi-blue/90 transition-colors whitespace-nowrap">
            Gespräch vereinbaren
          </Link>
          {/* Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label={mobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-0.5">
            <button onClick={() => scroll(vorteileRef)} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Vorteile</button>
            <button onClick={() => scroll(kpassRef)} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Kompetenzpass</button>
            <button onClick={() => { scroll(poolRef); setMobileMenuOpen(false) }} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Verfügbare Fachkräfte</button>
            <button onClick={() => scroll(prozessRef)} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Ablauf</button>
            <Link to="/downloads" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">
              Broschüre<span className="relative -top-1.5 -ml-0.5 text-[7px] font-bold tracking-widest bg-fkvi-teal/10 text-fkvi-teal px-1 py-0.5 rounded-full leading-none">FACHKRÄFTE</span>
            </Link>
            <Link to="/matching/login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Matching-Plattform</Link>
            <div className="border-t border-gray-100 my-1" />
            <a href="tel:+491605562142" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">
              <Phone className="h-4 w-4 text-fkvi-teal" /><span>+49 160 5562142</span>
            </a>
            <Link to="/beratung" onClick={() => setMobileMenuOpen(false)} className="sm:hidden mt-1 flex items-center justify-center gap-2 bg-fkvi-blue text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-fkvi-blue/90 transition-colors">
              Gespräch vereinbaren <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

const VIMEO_SRC = 'https://player.vimeo.com/video/1178838212?badge=0&autopause=0&player_id=hero&app_id=58479&title=0&byline=0&portrait=0'

function HeroSection() {
  const videoRef = useRef(null)
  const [sticky, setSticky] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) setSticky(true); else { setSticky(false); setDismissed(false) } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const showFloat = sticky && !dismissed

  return (
    <section className="pt-16 bg-white relative overflow-hidden">
      {/* Subtle green ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 75% 65% at 58% 42%, rgba(96,165,250,0.18) 0%, rgba(147,197,253,0.08) 45%, transparent 70%)',
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-fkvi-blue leading-tight mb-6">
              Pflegekräfte finden.<br />
              Inklusive Wohnraum.<br />
              <span className="text-blue-500">In 4 Monaten vor Ort.</span>
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
              Wir vermitteln qualifizierte Pflegekräfte aus dem Ausland an Kliniken, Pflegeheime
              und ambulante Dienste. Vollständig vorbereitet, mit Wohnung, B2-Zertifikat und
              12 Monaten Begleitung. Sie kümmern sich um die Pflege, wir um alles andere.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link to="/beratung"
                className="inline-flex items-center justify-center gap-2 bg-fkvi-blue text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-fkvi-blue/90 transition-all shadow-lg shadow-fkvi-blue/20">
                Gespräch vereinbaren <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/matching/login"
                className="inline-flex items-center justify-center gap-2 border border-gray-200 text-fkvi-blue px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                Zur Matching-Plattform
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-0 pt-8 border-t border-gray-100">
              {/* Erfolgsquote with tooltip */}
              <div className="pr-3 sm:pr-6 border-r border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-2xl font-bold text-fkvi-blue">98,2%</span>
                  <InfoTooltip text={ERFOLGSQUOTE_TOOLTIP} />
                </div>
                <div className="text-xs text-gray-400 mt-1">Erfolgsquote</div>
              </div>
              <div className="px-3 sm:px-6 border-r border-gray-100">
                <div className="text-lg sm:text-2xl font-bold text-fkvi-blue whitespace-nowrap">4 Monate</div>
                <div className="text-xs text-gray-400 mt-1">Ø bis vor Ort</div>
              </div>
              <div className="pl-3 sm:pl-6">
                <div className="text-lg sm:text-2xl font-bold text-fkvi-blue">100%</div>
                <div className="text-xs text-gray-400 mt-1">Vorleistung</div>
              </div>
            </div>
          </div>

          {/* Right – Vimeo player */}
          <div ref={videoRef} className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl bg-gray-900 aspect-video">
              <iframe
                src={VIMEO_SRC}
                title="FKVI – Ihr Partner für internationale Pflegekräfte"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                className="w-full h-full"
                style={{ border: 0 }}
              />
            </div>
            {/* Guarantee pill – floating top-left, glass style */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-800 tracking-tight">12 Monate Garantie</span>
              <span className="w-px h-3 bg-gray-300" />
              <span className="text-xs text-gray-400">Kostenloser Ersatz</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating sticky player ─────────────────────────────────────── */}
      <div
        className="hidden sm:block fixed bottom-6 right-6 z-50 transition-all duration-500 ease-out"
        style={{
          width: 'min(300px, calc(100vw - 1.5rem))',
          transform: showFloat ? 'translateY(0) scale(1)' : 'translateY(120%) scale(0.95)',
          opacity: showFloat ? 1 : 0,
          pointerEvents: showFloat ? 'auto' : 'none',
        }}
      >
        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10 bg-gray-900">
          {/* Header bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
            <span className="text-white text-xs font-semibold tracking-wide opacity-70">FKVI – Unternehmensvideo</span>
            <button
              onClick={() => { setDismissed(true) }}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
              aria-label="Video schließen"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
          {/* Video — only render iframe while visible to stop playback on close */}
          <div className="aspect-video">
            {showFloat && (
              <iframe
                src={VIMEO_SRC}
                title="FKVI Sticky"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                className="w-full h-full"
                style={{ border: 0 }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function LogoMarquee() {
  // 4 copies → animate -25% (= one set width) → perfectly seamless at any viewport
  const logos = [...LOGO_PARTNERS, ...LOGO_PARTNERS, ...LOGO_PARTNERS, ...LOGO_PARTNERS]
  return (
    <section className="py-12 border-y border-gray-100 overflow-hidden">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-25%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 50s linear infinite;
        }
      `}</style>
      <p className="text-center text-xs font-semibold text-gray-400 tracking-widest uppercase mb-8">
        Vertrauensvolle Kooperationen mit
      </p>
      <div
        className="relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        }}
      >
        <div className="marquee-track">
          {logos.map((logo, i) => (
            <div key={i} className="mx-14 shrink-0 flex items-center h-14">
              <img
                src={logo.src}
                alt={`${logo.name} – Kooperationspartner von FKVI`}
                className="h-10 w-auto max-w-[180px] object-contain grayscale opacity-55 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)'
const HERO_SHADOW = '0 0 0 1px rgba(99,102,241,0.10), 0 8px 40px rgba(99,102,241,0.18), 0 24px 64px rgba(0,0,0,0.07)'

function LeistungenSection({ vorteileRef }) {
  const vorleistungItems = [
    { label: 'B2-Sprachkurs' },
    { label: 'Flug & Reise' },
    { label: 'Visum & Behörden' },
    { label: 'Wohnungsersteinrichtung' },
    { label: 'Onboarding-Begleitung' },
  ]

  return (
    <section ref={vorteileRef} className="py-24 px-4 sm:px-6 bg-[#f5f5f7]">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-3">Unsere Leistungen</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Warum Kliniken, Pflegeheime<br className="hidden sm:block" /> und ambulante Dienste auf FKVI setzen</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto text-base leading-relaxed">
            Weit mehr als Personalvermittlung. Ganzheitlich, verbindlich und mit Garantie.
          </p>
        </div>

        {/* ── Desktop Bento (lg+) ──────────────────────────────────────── */}
        {/* Layout:
            hero(360°) wide  | s1(3 Tage)
            hero(360°) wide  | s2(12 Monate)
            wide(100%)       | wide(100%) | s3(90 Tage)
        */}
        <div
          className="hidden lg:grid gap-3"
          style={{
            gridTemplateColumns: '280px 1fr 1fr',
            gridTemplateRows: '210px 210px 230px',
            gridTemplateAreas: `
              "hero   hero   small1"
              "hero   hero   small2"
              "small3 wide   wide  "
            `,
          }}
        >
          {/* 360° — hero, large LEFT block, no icon */}
          <div
            className="rounded-3xl p-10 flex flex-col justify-between relative overflow-hidden"
            style={{ gridArea: 'hero', background: 'white', boxShadow: HERO_SHADOW }}
          >
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 25% 80%, rgba(99,102,241,0.09) 0%, rgba(14,165,233,0.07) 45%, transparent 75%)',
            }} />
            <div className="relative">
              <div
                className="font-bold tracking-tight leading-none mb-4"
                style={{
                  fontSize: 100,
                  background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 55%, #0d9488 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}
              >360°</div>
              <div className="text-xl font-bold text-gray-900 mb-2">Wohnungssuche & Ersteinrichtung</div>
              <div className="text-sm text-gray-400 leading-relaxed max-w-sm">
                Wir finden die passende Wohnung und richten sie komplett ein — Fachkräfte kommen zum Arbeiten, nicht zum Möbelkaufen.
              </div>
            </div>
          </div>

          {/* 3 Tage — right top */}
          <div className="bg-white rounded-3xl p-6 flex flex-col justify-between" style={{ gridArea: 'small1', boxShadow: CARD_SHADOW }}>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-500 tracking-tight leading-none mb-2">3 Tage</div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Vor-Ort-Support</div>
              <div className="text-xs text-gray-400 leading-relaxed">Abholung, Behördengänge, Wohnungsübergabe: ab Tag 1 persönlich begleitet.</div>
            </div>
          </div>

          {/* 12 Monate — right middle */}
          <div className="bg-white rounded-3xl p-6 flex flex-col justify-between" style={{ gridArea: 'small2', boxShadow: CARD_SHADOW }}>
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-teal-500" />
            </div>
            <div>
              <div className="text-5xl font-bold text-teal-500 tracking-tight leading-none mb-2">12 Monate</div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Ersatzgarantie</div>
              <div className="text-xs text-gray-400 leading-relaxed">Kostenloser Ersatz bei Abgang. Volle Planungssicherheit.</div>
            </div>
          </div>

          {/* 100% Vorleistung — wide bottom right */}
          <div className="bg-white rounded-3xl p-8 flex gap-10 items-start" style={{ gridArea: 'wide', boxShadow: CARD_SHADOW }}>
            <div className="shrink-0">
              <div className="text-6xl font-bold tracking-tight leading-none text-gray-900">100 %</div>
              <div className="text-sm font-semibold text-gray-500 mt-2">Vorleistung</div>
            </div>
            <div className="w-px self-stretch bg-gray-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-3 font-medium">Wir gehen für Sie in finanzielle Vorleistung:</p>
              <div className="relative overflow-hidden" style={{ maxHeight: 120 }}>
                <div className="flex flex-col gap-2.5">
                  {vorleistungItems.map(item => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-sm text-gray-800 font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
                  background: 'linear-gradient(to bottom, transparent 0%, white 100%)',
                  pointerEvents: 'none',
                }} />
              </div>
            </div>
          </div>

          {/* 90 Tage — small bottom left */}
          <div className="bg-white rounded-3xl p-6 flex flex-col justify-between" style={{ gridArea: 'small3', boxShadow: CARD_SHADOW }}>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <div className="text-5xl font-bold text-indigo-500 tracking-tight leading-none mb-2">90 Tage</div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Intensiv-Mentoring</div>
              <div className="text-xs text-gray-400 leading-relaxed">Begleitung durch die kritische Eingewöhnungsphase, für Fachkraft und Team gleichermaßen.</div>
            </div>
          </div>
        </div>

        {/* ── Mobile / Tablet fallback ─────────────────────────────────── */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { Icon: Home,       metric: '360°',    color: '#6366f1', bg: 'bg-indigo-50', title: 'Wohnungssuche & Ersteinrichtung', desc: 'Wir finden und richten die Wohnung komplett ein.' },
            { Icon: Banknote,   metric: '100 %',   color: '#10b981', bg: 'bg-emerald-50', title: 'Vorleistung',                   desc: 'B2-Kurs, Flug, Visum, Einrichtung – alles vorfinanziert.' },
            { Icon: MapPin,     metric: '3 Tage',  color: '#3b82f6', bg: 'bg-blue-50',    title: 'Vor-Ort-Support',              desc: 'Abholung, Behördengänge und Wohnungsübergabe ab Tag 1.' },
            { Icon: ShieldCheck,metric: '12 Mo.',  color: '#14b8a6', bg: 'bg-teal-50',    title: 'Ersatzgarantie',               desc: 'Kostenloser Ersatz bei Abgang. Planungssicherheit.' },
            { Icon: Users,      metric: '90 Tage', color: '#6366f1', bg: 'bg-indigo-50',  title: 'Intensiv-Mentoring',           desc: 'Begleitung durch die kritische Eingewöhnungsphase, für Fachkraft und Team.' },
          ].map(({ Icon, metric, color, bg, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 flex flex-col gap-4" style={{ boxShadow: CARD_SHADOW }}>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight leading-none mb-1" style={{ color }}>{metric}</div>
                <div className="text-sm font-semibold text-gray-900 mb-1">{title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

// ─── Kompetenzpass Carousel Data ─────────────────────────────────────────────
const KPASS_FACHLICH = [
  { icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>, title: 'Grundpflege', desc: 'Mobilisation, Lagerung & Kinästhetik nach aktuellem Standard.' },
  { icon: <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 10v4m-2-2h4M6 10h.01M6 14h.01"/></>, title: 'Behandlungspflege', desc: 'Wundmanagement, Injektionen & sichere Infusionstherapie.' },
  { icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>, title: 'Dokumentation', desc: 'Rechtssichere Pflegeplanung, MD-Konformität & SIS.' },
  { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>, title: 'Recht & Delegation', desc: 'SGB V/XI Abgrenzung & Haftungsrecht bei ärztl. Delegation.' },
  { icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>, title: 'Notfallmanagement', desc: 'Klinisches Assessment & Erstmaßnahmen im Dienst.' },
  { icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>, title: 'Kommunikation', desc: 'Fachliche Übergaben (ISBAR) & Visitenbegleitung.' },
  { icon: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></>, title: 'Hygiene & PSA', desc: 'Isolations-Management, MRE-Richtlinien & Aseptik.' },
  { icon: <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>, title: 'Gerontopsychiatrie', desc: 'Demenz, Delir, Schmerzerfassung & Deeskalation.' },
]

const KPASS_INTEGRATION = [
  { icon: <><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>, title: 'Alltag in DE', desc: 'Behördengänge, Steuerklassen & Finanzen meistern.' },
  { icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>, title: 'Sozialsystem', desc: 'Krankenversicherung verstehen & eAU-Prozess.' },
  { icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>, title: 'Wohnen & Mobilität', desc: 'Mietverträge, Mülltrennung & Nutzung des ÖPNV.' },
  { icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>, title: 'Arbeitskultur', desc: 'Pünktlichkeit, Feedback-Kultur & Team-Dynamik.' },
  { icon: <polygon points="5 3 19 12 5 21 5 3"/>, title: 'Sprache & Dialekt', desc: 'Umgangssprache & Stationsalltag sicher verstehen.' },
  { icon: <><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></>, title: 'Soziales Netzwerk', desc: 'Vereinsleben, Hobbys & aktive Freizeitgestaltung.' },
  { icon: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>, title: 'Mentale Gesundheit', desc: 'Resilienz stärken & Kulturschock-Prävention.' },
  { icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>, title: 'Kenntnisprüfung', desc: 'Berufliche Anerkennung & Karrierewege planen.' },
]

function KpassCard({ card, accentColor, accentBg }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#1e293b',
        border: `1px solid ${hovered ? accentColor : '#334155'}`,
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered ? `0 10px 20px rgba(0,0,0,0.25)` : 'none',
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: hovered ? accentColor : accentBg,
        color: hovered ? '#fff' : accentColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        flexShrink: 0,
        transition: 'all 0.3s ease',
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          {card.icon}
        </svg>
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: 8, marginTop: 0 }}>{card.title}</h3>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{card.desc}</p>
    </div>
  )
}

function KompetenzpassCarouselSection({ kpassRef }) {
  const [tab, setTab] = useState('fachlich')
  const cards = tab === 'fachlich' ? KPASS_FACHLICH : KPASS_INTEGRATION
  const accentColor = tab === 'fachlich' ? '#3b82f6' : '#10b981'
  const accentBg   = tab === 'fachlich' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)'

  return (
    <section ref={kpassRef} style={{ background: '#0f172a' }} className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-sm mb-5"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
            <ShieldCheck className="h-4 w-4" />
            PDL-VALIDIERT
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Der FKVI Kompetenzpass</h2>
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            Prüfung der pflegerischen Handlungskompetenz und sozialen Integration nach deutschen Standards.
            Wählen Sie einen Bereich, um die Module zu sehen.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center gap-4 mb-10 flex-wrap">
          {[
            { key: 'fachlich',    label: '1. Fachliche Pflege',    activeColor: '#3b82f6', activeBg: 'rgba(59,130,246,0.15)',  glow: 'rgba(59,130,246,0.2)'  },
            { key: 'integration', label: '2. Leben & Integration', activeColor: '#10b981', activeBg: 'rgba(16,185,129,0.15)', glow: 'rgba(16,185,129,0.2)' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-7 py-3 rounded-full text-base font-semibold transition-all duration-300"
              style={tab === t.key ? {
                border: `2px solid ${t.activeColor}`,
                color: t.activeColor,
                background: t.activeBg,
                boxShadow: `0 0 20px ${t.glow}`,
              } : {
                border: '2px solid #334155',
                color: '#94a3b8',
                background: 'transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card, i) => (
            <KpassCard key={`${tab}-${i}`} card={card} accentColor={accentColor} accentBg={accentBg} />
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
    <section ref={funnelRef} className="py-20 px-4 sm:px-6" style={{ background: '#0f172a' }}>
      <style>{`
        @media (min-width: 640px) {
          .fk-funnel-0 { width: 100%; }
          .fk-funnel-1 { width: 85%; }
          .fk-funnel-2 { width: 70%; }
          .fk-funnel-3 { width: 58%; }
          .fk-funnel-4 { width: 44%; }
          .fk-funnel-5 { width: 32%; }
        }
      `}</style>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-300 mb-3">Matching-Faktoren</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Unser Matching-Filter</h2>
          <p className="text-white/60 max-w-xl mx-auto">
            6 Stufen bis zur perfekten Passung. Jede Stufe filtert gezielt,
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
                className={`fk-funnel-${i} relative flex items-center justify-between px-5 py-4 rounded-xl text-left transition-transform hover:scale-[1.015] w-full`}
                style={{ background:s.bg, color:s.fg, ...(i === d.stages.length - 1 ? { border: '2px solid #1a3a5c', fontStyle: 'italic' } : {}) }}>
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

function ProfilesSection({ profiles, profilesLoading, poolRef }) {
  const [modalOpen, setModalOpen] = useState(false)
  const visible = profiles.slice(0, 3)

  return (
    <>
      <AccessRequestModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <section ref={poolRef} className="py-24 px-4 sm:px-6" style={{ background: '#f8fafc' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-3">Aktueller Pool</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Fachkräfte verfügbar</h2>
            <p className="text-gray-400 mt-4 max-w-md mx-auto text-sm leading-relaxed">
              Vollständige Profile mit Namen, Kontaktdaten und Dokumenten sind ausschließlich für freigeschaltete Partnereinrichtungen sichtbar.
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
                <ProfileCard key={p.id} profile={p} onRequestAccess={() => setModalOpen(true)} />
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
  const VIMEO_TESTIMONIAL = 'https://player.vimeo.com/video/1093472894?badge=0&autopause=0&player_id=testimonial&app_id=58479&title=0&byline=0&portrait=0'

  return (
    <section className="px-4 sm:px-6 pb-8 pt-16"
      style={{ background: '#f8fafc' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-3">Kundenstimmen</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Großartige Ergebnisse<br className="hidden sm:block" /> und zufriedene Kunden</h2>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden border border-gray-100"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)' }}>

          {/* Video — 16:9 */}
          <div className="relative bg-slate-900" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={VIMEO_TESTIMONIAL}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
              title="Kundenstimme Alfred Schaub"
            />
          </div>

          {/* Quote panel */}
          <div className="bg-white px-8 py-7">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">

              {/* Quote */}
              <div className="flex-1 min-w-0">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_,j) => <Star key={j} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed italic">
                  „Ich bin sehr zufrieden, weil alle Azubis einfach die Einreise geschafft haben. Sie haben für uns einen nicht unerheblichen Teil der behördlichen Arbeit, unter anderem auch in Marokko selbst vor Ort erledigt."
                </p>
              </div>

              {/* Attribution */}
              <div className="sm:pl-6 sm:border-l sm:border-gray-100 shrink-0 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-fkvi-blue flex items-center justify-center text-white font-bold text-xs shrink-0">AS</div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">Alfred Schaub</p>
                    <p className="text-xs text-gray-400">Seniorenresidenzen Lerchenhof</p>
                  </div>
                </div>
                <img src="/logos/residenz-gruppe.webp" alt="Residenz-Gruppe – Seniorenresidenzen Lerchenhof"
                  className="h-7 w-auto object-contain grayscale opacity-40" />
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AccessRequestModal({ open, onClose }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '', address: '', postal_code: '', city: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleClose = () => {
    if (loading) return
    setForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '', address: '', postal_code: '', city: '' })
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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

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

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  Straße &amp; Hausnummer <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Musterstraße 12"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                />
              </div>

              {/* PLZ + Ort */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">PLZ <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={form.postal_code}
                    onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                    placeholder="12345"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Ort <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Frankfurt am Main"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30 focus:border-fkvi-blue transition"
                  />
                </div>
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

// Matches the recognition config from the matching platform
const RECOGNITION = {
  anerkannt:       { label: 'Anerkennung in DE: Anerkannt',             cls: 'bg-green-50 text-green-700 border-green-200' },
  in_bearbeitung:  { label: 'Anerkennung in DE: läuft',                 cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  nicht_beantragt: { label: 'Anerkennung in DE: noch nicht beantragt',  cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  abgelehnt:       { label: 'Anerkennung in DE: abgelehnt',             cls: 'bg-red-50 text-red-600 border-red-200' },
}

function ProfileCard({ profile, onRequestAccess }) {
  const specs = getProfileSpecializations(profile).slice(0, 3)
  const rec   = RECOGNITION[profile.german_recognition]

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all flex flex-col">

      {/* Top gradient band — same as matching platform */}
      <div className="h-16 bg-gradient-to-br from-fkvi-blue/10 via-fkvi-teal/5 to-transparent shrink-0" />

      {/* Avatar — real photo blurred to show presence but hide identity */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div className="w-24 h-24 rounded-full p-[3px] shadow-md" style={{ background: 'linear-gradient(135deg, #0d9488, #1a3a5c)' }}>
          <div className="w-full h-full rounded-full overflow-hidden bg-fkvi-blue/10 flex items-center justify-center">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Fachkraft"
                className="w-full h-full object-cover object-top"
                style={{}}
              />
            ) : (
              <User className="h-9 w-9 text-fkvi-blue/30" />
            )}
          </div>
        </div>
        {/* "Anonymisiert" pill — identical to matching platform */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800/80 backdrop-blur-sm rounded-full px-2 py-0.5 whitespace-nowrap">
          <EyeOff className="h-2.5 w-2.5 text-white/70" />
          <span className="text-[9px] text-white/80 font-medium tracking-wide">Anonymisiert</span>
        </div>
      </div>

      {/* Content */}
      <div className="pt-14 pb-4 px-4 flex flex-col flex-1 gap-3">

        {/* Job title (not personal) + blurred name bar + demographics */}
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm leading-tight">{profile.nursing_education || 'Pflegefachkraft'}</p>
          <div className="flex justify-center my-1">
            <div className="h-3 w-24 rounded bg-gray-300 select-none" style={{ filter: 'blur(3px)' }} />
          </div>
          <p className="text-xs text-gray-500">
            {[profile.gender, profile.age ? `${profile.age} J.` : null, profile.nationality].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Recognition badge */}
        {rec && (
          <div className="flex justify-center">
            <span className={cn('text-[10px] font-medium px-2.5 py-0.5 rounded-full border', rec.cls)}>
              {rec.label}
            </span>
          </div>
        )}

        {/* Experience */}
        {profile.total_experience_years && (
          <p className="text-xs text-gray-600 text-center">
            <span className="font-semibold">{profile.total_experience_years} J.</span> Berufserfahrung
            {profile.germany_experience_years ? <span className="text-gray-400"> · {profile.germany_experience_years} J. in DE</span> : ''}
          </p>
        )}

        {/* Specialization tags */}
        {specs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {specs.map(s => (
              <span key={s} className="px-2 py-0.5 bg-fkvi-blue/8 text-fkvi-blue rounded-full text-[10px] font-medium">{s}</span>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* CTA */}
        <button
          onClick={onRequestAccess}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-500 hover:bg-fkvi-blue hover:text-white hover:border-fkvi-blue group-hover:bg-fkvi-blue group-hover:text-white group-hover:border-fkvi-blue transition-all duration-200"
        >
          <Lock className="h-3.5 w-3.5" />
          Zugang beantragen
        </button>
      </div>

      {/* Hover teal accent */}
      <div className="h-0.5 bg-gradient-to-r from-fkvi-teal/0 via-fkvi-teal/50 to-fkvi-teal/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}

function UeberUnsSection() {
  return (
    <section className="pt-12 pb-20 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">

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
                alt="Das Team der Fachkraft Vermittlung International GmbH & Co. KG"
                className="w-full object-cover"
              />
            </div>
          </div>

          {/* Right: Text content */}
          <div className="lg:pt-16">
            <p className="text-gray-600 leading-relaxed mb-5">
              FKVI ist entstanden, weil wir selbst erlebt haben, wie schwer es ist, gute Pflegekräfte
              nach Deutschland zu holen. Heute lösen wir genau dieses Problem.
            </p>
            <p className="text-gray-600 leading-relaxed mb-5">
              Wir bringen erfahrene Pflegefachkräfte in die Einrichtungen, die sie dringend brauchen,
              ob Krankenhaus, Pflegeheim oder ambulanter Dienst. Nicht irgendwie, sondern so, dass
              es wirklich funktioniert: mit klarer Vorauswahl, strukturierter Integration und
              persönlicher Begleitung.
            </p>
            <p className="text-gray-600 leading-relaxed mb-10">
              Was uns von anderen unterscheidet, ist keine Hochglanzbroschüre, sondern eine Lösung,
              die sich in stationären Pflegeeinrichtungen, Kliniken und ambulanten Diensten bereits
              bewährt hat. Wir kennen die Branche, sprechen Ihre Sprache und wissen, worauf es ankommt:
              Verlässlichkeit, Tempo und Qualität.
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-3 leading-snug">
                  Erprobt in der Praxis,<br />erfolgreich im Alltag
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Unsere Pflegekräfte sind nicht nur qualifiziert, sie sind vorbereitet.
                  Jeder Schritt im Prozess zielt darauf ab, dass sie langfristig bleiben.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-3 leading-snug">
                  Verantwortung beginnt<br />vor dem 1. Arbeitstag
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Von der Auswahl bis zur Integration denken wir weiter als andere. Sie brauchen
                  kein Risiko, sondern echte Entlastung.
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
  const phases = [
    {
      num: 1, week: 'Woche 1',
      title: 'Vertragsabschluss & Startschuss',
      body: 'Das Matching war erfolgreich und der Arbeitsvertrag ist unterschrieben. Ab diesem Moment übernehmen wir die komplette Steuerung des behördlichen Dschungels für Sie.',
      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',
    },
    {
      num: 2, week: 'Woche 2–6',
      title: 'Behörden-Management & Anerkennung',
      body: 'Wir initiieren das beschleunigte Fachkräfteverfahren (§ 81a AufenthG). Da wir alle Zeugnisse bereits vor Monaten geprüft haben, verläuft die Einreichung reibungslos.',
      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',
    },
    {
      num: 3, week: 'Woche 7–10',
      title: 'Visumsverfahren & Reisevorbereitung',
      body: 'Wir begleiten die Fachkraft in die Deutsche Botschaft und prüfen vorab alle Anträge, um Ablehnungen durch Formfehler auszuschließen.',
      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
    },
    {
      num: 4, week: 'Woche 11–12',
      title: 'Einreise, Onboarding & Arbeitsstart',
      body: 'Wir unterstützen bei der Logistik und den ersten Schritten. Sie müssen lediglich den Arbeitsplatz einrichten.',
      color: '#10b981', bg: 'rgba(16,185,129,0.12)', goal: true,
    },
  ]

  return (
    <section ref={prozessRef} style={{ background: '#0f172a' }} className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-3">Ihr Ablauf</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ihre neue Fachkraft in 12 Wochen</h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unser gemeinsames Ziel ist eine langfristige Zusammenarbeit. Dass der sichtbare Prozess ab Vertragsunterschrift idealerweise nur rund 12 Wochen dauert, liegt an dem, was vorher passiert ist.
          </p>
        </div>

        {/* Phase cards — 4-col grid with connector line */}
        <div className="relative mb-8">
          {/* Connector line desktop */}
          <div className="hidden lg:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px"
            style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6, #f59e0b, #10b981)', opacity: 0.35 }} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {phases.map((p, i) => (
              <div key={i} className="relative flex flex-col rounded-2xl p-6"
                style={{
                  background: '#1e293b',
                  border: `1px solid ${p.goal ? p.color + '70' : '#334155'}`,
                  boxShadow: p.goal ? `0 0 0 1px ${p.color}20, 0 8px 32px ${p.color}18` : 'none',
                }}>
                {/* Week badge */}
                <span className="self-start text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4"
                  style={{ background: p.bg, color: p.color }}>
                  {p.week}
                </span>
                {/* Number circle */}
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold mb-4"
                  style={{
                    background: p.goal ? p.color : p.bg,
                    color: p.goal ? '#fff' : p.color,
                    boxShadow: p.goal ? `0 0 24px ${p.color}55` : 'none',
                  }}>
                  {p.num}
                </div>
                <h3 className="font-bold text-white text-sm leading-snug mb-2">{p.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed flex-1">{p.body}</p>
                {p.goal && (
                  <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">Ziel erreicht</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Foundation card — full width */}
        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0c1628 100%)', border: '1px solid #1e3a5f' }}>
          {/* Top banner */}
          <div className="flex items-center justify-center gap-2 py-3 border-b border-slate-800/80"
            style={{ background: 'rgba(59,130,246,0.06)' }}>
            <span className="text-blue-400 font-bold uppercase tracking-widest text-xs">
              90% passieren vorab im Verborgenen: Das 18-Monate Fundament
            </span>
          </div>
          <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
            {/* Left stat */}
            <div className="shrink-0">
              <div className="text-5xl font-black text-white leading-none mb-1">18</div>
              <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Monate</div>
              <div className="text-xs text-slate-500 mt-1">Intensivbegleitung</div>
            </div>
            <div className="w-px self-stretch bg-slate-800 hidden md:block shrink-0" />
            <div className="flex-1">
              <p className="text-slate-300 text-sm leading-relaxed mb-5 text-center md:text-left">
                Der reibungslose 12-Wochen-Ablauf ist nur möglich, weil wir die Fachkraft davor bereits <strong className="text-white">12 bis 18 Monate</strong> lang intensiv begleitet haben. Das ist Ihre Garantie, dass es klappt.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { title: 'B2-Sprachausbildung', sub: 'Komplett vorfinanziert von FKVI', color: '#3b82f6' },
                  { title: 'Interkulturelles Coaching', sub: 'Intensiv & persönlich begleitet', color: '#8b5cf6' },
                  { title: 'Dokument-Prüfung', sub: 'Anerkennungsfähigkeit vorab gesichert', color: '#10b981' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3 items-start p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b' }}>
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: item.color }} />
                    <div>
                      <div className="text-white text-xs font-semibold mb-0.5">{item.title}</div>
                      <div className="text-slate-500 text-xs">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl p-5 flex gap-4"
            style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="w-1 rounded-full shrink-0" style={{ background: '#f59e0b' }} />
            <div>
              <h3 className="text-sm font-bold text-amber-400 mb-1">Behördliche Laufzeiten</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(253,230,138,0.6)' }}>Aufgrund stark ausgelasteter Ausländerbehörden (z.B. in Berlin oder Frankfurt) kann es zu unverschuldeten Verzögerungen kommen. Wir kommunizieren dies stets transparent.</p>
            </div>
          </div>
          <div className="rounded-xl p-5 flex gap-4"
            style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="w-1 rounded-full shrink-0" style={{ background: '#10b981' }} />
            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-1">Nachbesetzungsgarantie</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(167,243,208,0.6)' }}>Sollte das Arbeitsverhältnis während der Probezeit gelöst werden, kümmern wir uns kostenfrei um eine äquivalente Nachbesetzung.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

function MotivationSection() {
  const values = [
    {
      Icon: Heart,
      title: 'Menschlichkeit',
      desc: 'Wir sehen Menschen, nicht Ressourcen. Hinter jeder Bewerbung steht jemand, der seine Familie verlässt, um hier eine Zukunft aufzubauen.',
      color: '#f43f5e',
      glow: 'rgba(244,63,94,0.14)',
    },
    {
      Icon: ShieldCheck,
      title: 'Verlässlichkeit',
      desc: 'Klare Versprechen, eingehaltene Zusagen. Unsere Partner wissen: Was wir sagen, meinen wir. Was wir zusagen, liefern wir.',
      color: '#0d9488',
      glow: 'rgba(13,148,136,0.14)',
    },
    {
      Icon: Globe,
      title: 'Integration',
      desc: 'Wir denken nachhaltiger als andere. Nicht nur Visa und Vertrag, sondern echtes Ankommen: im Team, im Alltag, in Deutschland.',
      color: '#3b82f6',
      glow: 'rgba(59,130,246,0.14)',
    },
  ]

  return (
    <section className="py-28 px-4 sm:px-6"
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)' }}>
      <div className="max-w-6xl mx-auto">

        <p className="text-xs font-semibold tracking-widest uppercase text-teal-400 text-center mb-4">
          Unsere Motivation
        </p>
        <h2 className="text-4xl sm:text-5xl font-black text-white text-center leading-tight mb-6"
          style={{ letterSpacing: '-1px' }}>
          Wir tun das für{' '}
          <span style={{
            background: 'linear-gradient(90deg, #0d9488 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            unsere Eltern
          </span>
        </h2>

        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto text-center mb-5">
          Wir sind Söhne und Töchter. Unsere Eltern werden älter, und wir wollen sicherstellen,
          dass sie in stabilen, kompetenten Teams gepflegt werden.
        </p>
        <p className="text-slate-600 italic text-center mb-20 max-w-xl mx-auto">
          „Pflege ist keine Übergangslösung. Sie ist das Fundament unserer Gesellschaft."
        </p>

        <div className="grid sm:grid-cols-3 gap-6">
          {values.map(({ Icon, title, desc, color, glow }) => (
            <div key={title} className="rounded-2xl p-7 flex flex-col gap-4"
              style={{
                background: `radial-gradient(ellipse at top left, ${glow} 0%, rgba(15,23,42,0.6) 70%)`,
                border: `1px solid ${color}28`,
              }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <h3 className="font-bold text-white text-lg">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer({ funnelRef, prozessRef, vorteileRef, kpassRef }) {
  const scroll = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' })
  return (
    <footer style={{ background: '#0f172a' }} className="px-4 sm:px-6">

      {/* ── CTA zone ── */}
      <div className="max-w-3xl mx-auto text-center py-24 border-b border-white/10">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-400 mb-4">Gesprächsanfragen</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Lassen Sie uns Ihren<br />Business-Case besprechen
        </h2>
        <p className="text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
          Sagen Sie uns, was Sie brauchen. Wir schauen gemeinsam, wie wir Ihre Einrichtung am besten unterstützen können.
        </p>
        <Link to="/beratung"
          className="inline-flex items-center gap-2 text-white px-8 py-4 rounded-xl font-bold text-base transition-all"
          style={{
            background: '#0d9488',
            boxShadow: '0 8px 32px rgba(13,148,136,0.35)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0f766e'}
          onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}>
          Gespräch vereinbaren <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-500">
          <Phone className="h-4 w-4" />
          <a href="tel:+491605562142" className="hover:text-white transition-colors">+49 160 5562142</a>
        </div>
      </div>

      {/* ── Footer links ── */}
      <div className="max-w-7xl mx-auto py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
          <div>
            <img src="/logo.png" alt="FKVI – Fachkraft Vermittlung International" className="h-14 w-auto mb-4"
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
            <p className="text-slate-500 text-xs leading-relaxed">
              Fachkraft Vermittlung International<br />GmbH &amp; Co. KG<br />
              Ammelburgstraße 34<br />60320 Frankfurt am Main
            </p>
          </div>
          <div>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-3">Navigation</p>
            <div className="space-y-2">
              <button onClick={() => scroll(vorteileRef)} className="block text-slate-400 text-sm hover:text-white transition-colors text-left">Vorteile</button>
              <button onClick={() => scroll(kpassRef)} className="block text-slate-400 text-sm hover:text-white transition-colors text-left">Kompetenzpass</button>
              <button onClick={() => scroll(prozessRef)} className="block text-slate-400 text-sm hover:text-white transition-colors text-left">Ablauf</button>
              <Link to="/downloads" className="block text-slate-400 text-sm hover:text-white transition-colors">Informationsbroschüre für Fachkräfte</Link>
              <Link to="/matching/login" className="block text-slate-400 text-sm hover:text-white transition-colors">Matching-Plattform</Link>
            </div>
          </div>
          <div>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-3">Kontakt</p>
            <div className="space-y-2">
              <a href="tel:+491605562142" className="block text-slate-400 text-sm hover:text-white transition-colors">+49 160 5562142</a>
              <a href="mailto:info@fachkraft-vermittlung.de" className="block text-slate-400 text-sm hover:text-white transition-colors">info@fachkraft-vermittlung.de</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>© 2026 Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
          <div className="flex items-center gap-4">
            <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link to="/datenschutzerklaerung" className="hover:text-white transition-colors">Datenschutzerklärung</Link>
            <Link to="/matching/login" className="hover:text-white transition-colors">Zum Login</Link>
          </div>
        </div>
      </div>

    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PublicHome() {
  const [profiles, setProfiles] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const vorteileRef = useRef(null)
  const kpassRef = useRef(null)
  const funnelRef = useRef(null)
  const prozessRef = useRef(null)
  const poolRef = useRef(null)

  useEffect(() => {
    supabase.from('profiles')
      .select(`id,age,nationality,profile_image_url,total_experience_years,german_recognition,${ALL_SPECIALIZATION_FIELDS.join(',')}`)
      .eq('status', 'published')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .limit(3)
      .then(({ data }) => { setProfiles(data || []); setProfilesLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>FKVI – Internationale Pflegekräfte für Kliniken &amp; Pflegeheime | Fachkraft Vermittlung International</title>
        <meta name="description" content="FKVI vermittelt qualifizierte Pflegefachkräfte aus dem Ausland an Kliniken, Pflegeheime und ambulante Dienste. 100 % Vorleistung, B2-Zertifikat, Wohnung, 12 Monate Garantie – in 4 Monaten vor Ort." />
        <link rel="canonical" href="https://fkvi-plattform.de/" />
        <meta property="og:title" content="FKVI – Internationale Pflegekräfte für Kliniken & Pflegeheime" />
        <meta property="og:description" content="Qualifizierte Pflegefachkräfte aus dem Ausland. 100 % Vorleistung, B2-Zertifikat, Wohnung inklusive. 12 Monate Garantie." />
        <meta property="og:url" content="https://fkvi-plattform.de/" />
      </Helmet>
      <NavBar funnelRef={funnelRef} prozessRef={prozessRef} vorteileRef={vorteileRef} kpassRef={kpassRef} poolRef={poolRef} />
      <HeroSection />
      <LogoMarquee />
      <LeistungenSection vorteileRef={vorteileRef} />
      {/* ── Dark zone 1: Kompetenzpass + floating light island + Prozess ── */}
      <div style={{ background: '#0f172a' }}>
        <KompetenzpassCarouselSection kpassRef={kpassRef} />
        <KompetenzpassSection funnelRef={funnelRef} />
        <div style={{ background: '#f8fafc', borderRadius: 32, margin: '40px 0', overflow: 'hidden' }}>
          <ProfilesSection profiles={profiles} profilesLoading={profilesLoading} poolRef={poolRef} />
          <KundenstimmenSection />
        </div>
        <ProzessSection prozessRef={prozessRef} />
        <div style={{ background: '#fff', borderRadius: 32, margin: '40px 0', overflow: 'hidden' }}>
          <UeberUnsSection />
        </div>
        <MotivationSection />
      </div>

      <Footer funnelRef={funnelRef} prozessRef={prozessRef} vorteileRef={vorteileRef} kpassRef={kpassRef} />
    </div>
  )
}
