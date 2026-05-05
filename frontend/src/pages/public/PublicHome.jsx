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
      { num:'01', title:'Ihr Antrieb', sub:'Motivation, Ziele & Berufserfahrung', w:100, bg:'#EEF2FF', fg:'#3730a3', detail:'Warum Pflege? Warum Deutschland? Wir wollen die Person hinter dem Lebenslauf verstehen: ihre Antriebe, ihre Erfahrung und was sie sich vom nächsten Schritt erhofft. Nur wer wirklich ankommen will, bleibt auch.', tags:['Motivation','Berufsziele','Erfahrung'] },
      { num:'02', title:'Regionale Präferenzanalyse', sub:'Herkunft, Wunschregion & Einrichtungstyp', w:85, bg:'#E0F2FE', fg:'#0c4a6e', detail:'Stadt oder Land? Krankenhaus, Pflegeheim oder ambulanter Dienst? Wer in einer Kleinstadt aufgewachsen ist, fühlt sich in einer ländlichen Einrichtung oft deutlich wohler.', tags:['Herkunft','Wunschregion','Einrichtungstyp'] },
      { num:'03', title:'Soziale Ankerpunkte', sub:'Familie, Freunde & Community in Deutschland', w:70, bg:'#CCFBF1', fg:'#134e4a', detail:'Wer bereits Kontakte in Deutschland hat, kommt schneller an und bleibt länger. Wir vermitteln bevorzugt in der Nähe sozialer Ankerpunkte.', tags:['Familie','Community','Nähe'] },
      { num:'04', title:'Kulturelle Eignung', sub:'Werte, Arbeitsweise & Teamdynamik', w:58, bg:'#FEF9C3', fg:'#713f12', detail:'Jedes Team tickt anders. Wir gleichen Persönlichkeit und Kommunikationsstil mit der Kultur der Einrichtung ab, damit das Miteinander von Anfang an klappt.', tags:['Teamkultur','Kommunikation','Werte'] },
      { num:'05', title:'Fachliche Qualifikation', sub:'B2-Zertifikat & Berufsanerkennung', w:44, bg:'#FEE2E2', fg:'#7f1d1d', detail:'Erst wenn die persönliche Eignung stimmt, prüfen wir Sprachniveau (mind. B2), Berufsanerkennung und fachspezifische Erfahrung im Zielbereich.', tags:['B2-Zertifikat','Anerkennung','Fachkompetenz'] },
      { num:'06', title:'Platzierung & 12 Monate Begleitung', sub:'Inklusive Ersatzgarantie', w:32, bg:'#ffffff', fg:'#1a3a5c', detail:'Die Fachkraft startet, und wir bleiben dran. Regelmäßige Check-ins, Konfliktmediation und Integrationsbegleitung über 12 Monate, inklusive Ersatzgarantie.', tags:['Onboarding','Check-ins','Garantie'] },
    ],
    resultTitle: 'Perfekte Passung. Langfristiger Verbleib.',
    resultSub: 'Unsere Fachkräfte bleiben, weil sie genau dort ankommen, wo sie hingehören.',
  },
  az: {
    stages: [
      { num:'01', title:'Ihr Antrieb', sub:'Motivation, Erwartungen & persönliche Reife', w:100, bg:'#EEF2FF', fg:'#3730a3', detail:'Warum möchte die Person in die Pflege? Was erwartet sie wirklich von einer Ausbildung in Deutschland — und ist sie bereit für diesen Schritt? Wir schauen auf Motivation und persönliche Reife, nicht nur auf Unterlagen und Nachweise.', tags:['Motivation','Erwartungen','Persönliche Reife'] },
      { num:'02', title:'Regionale Präferenzanalyse', sub:'Herkunft, Wunschregion & Wohnumfeld', w:85, bg:'#E0F2FE', fg:'#0c4a6e', detail:'Stadt oder Land? Für junge Menschen ist das Umfeld mindestens genauso wichtig wie die Einrichtung selbst. Wer in einer Großstadt aufgewachsen ist, braucht andere Bedingungen als jemand vom Land. Wir schauen beides genau an.', tags:['Herkunft','Stadt/Land','Wohnumfeld'] },
      { num:'03', title:'Soziale Ankerpunkte', sub:'Familie, Freunde & Betreuungsnetz', w:70, bg:'#CCFBF1', fg:'#134e4a', detail:'Gerade bei jüngeren Azubis ist ein soziales Netz besonders wichtig. Wir vermitteln bevorzugt in der Nähe bestehender Ankerpunkte.', tags:['Familie','Betreuung','Nähe'] },
      { num:'04', title:'Kulturelle Eignung', sub:'Teamfähigkeit, Anleitung & Teamdynamik', w:58, bg:'#FEF9C3', fg:'#713f12', detail:'Hat das Team tatsächlich Kapazität für eine aktive Anleitung? Passt die Teamdynamik zur Person? Der Ausbildungsbetrieb muss menschlich und fachlich zu ihr passen — nicht nur auf dem Papier.', tags:['Teamfähigkeit','Anleitungskapazität','Teamdynamik'] },
      { num:'05', title:'Schulische Voraussetzungen', sub:'Sprachniveau, Schulabschluss & Ausbildungseignung', w:44, bg:'#FEE2E2', fg:'#7f1d1d', detail:'Für den Ausbildungsstart reicht oft B1 — unsere Kandidaten bringen aber bereits B2 mit, damit die Kommunikation von Tag 1 sicher läuft. Schulabschluss und Ausbildungseignung werden intensiv geprüft.', tags:['Sprachniveau B2','Schulabschluss','Ausbildungseignung'] },
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

function NavBar({ funnelRef, prozessRef, vorteileRef, kpassRef, poolRef, kundenstimmenRef }) {
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
    <header className="fixed top-0 left-0 right-0 z-50">

      {/* ── Topbar ── */}
      <div className="hidden md:block bg-fkvi-blue border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between">
          {/* Left: phone + email */}
          <div className="flex items-center gap-5">
            <a href="tel:+496980884364" className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors">
              <Phone className="h-3 w-3" />+49 69 8088 4364
            </a>
            <span className="w-px h-3 bg-white/20" />
            <a href="mailto:info@fachkraft-vermittlung.de" className="text-xs text-white/60 hover:text-white/90 transition-colors">
              info@fachkraft-vermittlung.de
            </a>
          </div>
          {/* Right: CTA */}
          <Link to="/beratung"
            className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-white/90 transition-colors">
            Gespräch vereinbaren <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Main navbar ── */}
      <div className={`transition-all duration-200 ${scrolled || mobileMenuOpen ? 'bg-white shadow-sm' : 'bg-white/97 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <img src="/logo.png" alt="FKVI – Fachkraft Vermittlung International" className="h-12 w-auto shrink-0" />

          {/* Nav links — desktop */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-gray-600 flex-1 justify-center">
            {[
              { label: 'Vorteile',             ref: vorteileRef },
              { label: 'Kompetenzpass',         ref: kpassRef },
              { label: 'Fachkräfte-Pool',       ref: poolRef },
              { label: 'Praxisberichte',        ref: kundenstimmenRef },
              { label: 'Ablauf',                ref: prozessRef },
              { label: 'Matching-Plattform',    ref: poolRef },
            ].map(({ label, ref }) => (
              <button key={label} onClick={() => scroll(ref)}
                className="px-3 py-2 rounded-lg hover:bg-gray-50 hover:text-fkvi-blue transition-colors whitespace-nowrap">
                {label}
              </button>
            ))}
            <span className="w-px h-4 bg-gray-200 mx-1" />
            <Link to="/downloads"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-fkvi-teal/30 bg-fkvi-teal/5 hover:bg-fkvi-teal/10 text-fkvi-teal transition-colors whitespace-nowrap">
              <span>Broschüre</span>
              <span className="text-[8px] font-bold tracking-wider bg-fkvi-teal text-white px-1.5 py-0.5 rounded-full leading-none">FACHKRAFT</span>
            </Link>
          </nav>

          {/* Right: CTA (mobile only — desktop CTA is in topbar) + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/beratung"
              className="md:hidden inline-flex items-center gap-1.5 bg-fkvi-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fkvi-blue/90 transition-colors whitespace-nowrap">
              Gespräch vereinbaren
            </Link>
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
              <button onClick={() => { scroll(poolRef); setMobileMenuOpen(false) }} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Fachkräfte-Pool</button>
              <button onClick={() => scroll(kundenstimmenRef)} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Praxisberichte</button>
              <button onClick={() => scroll(prozessRef)} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Ablauf</button>
              <button onClick={() => { scroll(poolRef); setMobileMenuOpen(false) }} className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">Matching-Plattform</button>
              <div className="border-t border-gray-100 my-1" />
              <Link to="/downloads" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-fkvi-teal hover:bg-teal-50 transition-colors">
                Broschüre <span className="text-[9px] font-bold bg-fkvi-teal text-white px-1.5 py-0.5 rounded-full">FACHKRAFT</span>
              </Link>
              <a href="tel:+496980884364" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fkvi-blue transition-colors">
                <Phone className="h-4 w-4 text-fkvi-teal" /><span>+49 69 8088 4364</span>
              </a>
              <Link to="/beratung" onClick={() => setMobileMenuOpen(false)} className="mt-1 flex items-center justify-center gap-2 bg-fkvi-blue text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-fkvi-blue/90 transition-colors">
                Gespräch vereinbaren <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          </div>
        )}
      </div>

    </header>
  )
}

const VIMEO_SRC = 'https://player.vimeo.com/video/1178838212?badge=0&autopause=0&player_id=hero&app_id=58479&title=0&byline=0&portrait=0'

function HeroSection({ poolRef }) {
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
    <section className="pt-16 md:pt-[104px] bg-white relative overflow-hidden">
      {/* Subtle green ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 75% 65% at 58% 42%, rgba(96,165,250,0.18) 0%, rgba(147,197,253,0.08) 45%, transparent 70%)',
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-24 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-fkvi-blue leading-tight mb-5 sm:mb-6">
              Pflegekräfte finden.<br />
              Inklusive Wohnraum.<br />
              <span className="text-blue-500">In 3 Monaten vor Ort.</span>
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
              <button
                onClick={() => poolRef?.current?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 border border-gray-200 text-fkvi-blue px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                Verfügbare Fachkräfte
              </button>
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
                <div className="text-lg sm:text-2xl font-bold text-fkvi-blue">3 Monate</div>
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
      <p className="text-center text-xs font-semibold tracking-widest uppercase mb-8">
        <span className="text-fkvi-teal">Vertrauensvolle Kooperationen mit </span>
        <span className="text-fkvi-teal">führenden Kliniken &amp; Pflegeeinrichtungen</span>
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
                className="h-10 w-auto max-w-[180px] object-contain opacity-80 hover:opacity-100 transition-all duration-300"
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

function PlatformEvents() {
  const fmt = (d) => {
    const months = ['Jan.','Feb.','Mär.','Apr.','Mai','Jun.','Jul.','Aug.','Sep.','Okt.','Nov.','Dez.']
    return `${d.getDate()}. ${months[d.getMonth()]}`
  }
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const daysAgo17 = new Date(Date.now() - 17 * 24 * 60 * 60 * 1000)
  const events = [
    { msg:'Visumsantrag eingereicht', time:'Heute', color:'#B6DAD5', ping: true },
    { msg:'Botschaftstermin bestätigt', time: fmt(lastWeek), color:'#10b981', ping: false },
    { msg:'Anerkennungsverfahren gestartet', time: fmt(daysAgo17), color:'#10b981', ping: false },
  ]
  return (
    <div className="flex flex-col gap-2">
      {events.map((ev, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <span className="relative flex h-2 w-2 shrink-0">
            {ev.ping && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: ev.color }} />}
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: ev.color }} />
          </span>
          <span className="text-gray-700 text-xs flex-1">{ev.msg}</span>
          <span className="text-gray-400 text-[10px] shrink-0">{ev.time}</span>
        </div>
      ))}
    </div>
  )
}

function LeistungenSection({ vorteileRef }) {
  const vorleistungItems = [
    { label: 'B2-Sprachkurs' },
    { label: 'Flug & Reise' },
    { label: 'Visum & Behörden' },
    { label: 'Wohnungsersteinrichtung' },
    { label: 'Onboarding-Begleitung' },
  ]

  return (
    <section ref={vorteileRef} className="py-16 sm:py-24 px-4 sm:px-6 bg-[#f5f5f7]" style={{ boxShadow: "inset 0 0 120px rgba(59,130,246,0.06)" }}>
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
            gridTemplateRows: '210px 210px 230px auto',
            gridTemplateAreas: `
              "hero   hero   small1"
              "hero   hero   small2"
              "small3 wide   wide  "
              "plat   plat   plat  "
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

          {/* 2 Tage — right top */}
          <div className="bg-white rounded-3xl p-6 flex flex-col justify-between" style={{ gridArea: 'small1', boxShadow: CARD_SHADOW }}>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-bold text-blue-500 tracking-tight leading-none">2 Tage</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">Vor-Ort-Support</div>
              <div className="text-xs text-gray-400 leading-relaxed mt-0.5">Abholung, Behördengänge, Steuer-ID, Bankkonto, Krankenkasse, Wohnungsübergabe — ab Tag 1 persönlich begleitet.</div>
            </div>
          </div>

          {/* 12 Monate — right middle */}
          <div className="rounded-3xl p-6 flex flex-col justify-between" style={{ gridArea: 'small2', boxShadow: CARD_SHADOW, background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', border: '1px solid rgba(13,148,136,0.18)' }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#0f766e' }}>
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-bold text-teal-600 tracking-tight leading-none">12 Monate</div>
              <div className="text-sm font-semibold text-teal-800 mt-1">kostenlose Ersatzgarantie</div>
              <div className="text-xs text-teal-700/70 leading-relaxed mt-0.5">Qualitätsgarantie auf unseren Auswahlprozess — bei Abgang übernehmen wir die Nachbesetzung auf eigene Kosten.</div>
            </div>
          </div>

          {/* 100% Vorleistung — wide bottom right */}
          <div className="bg-white rounded-3xl p-8 flex gap-10 items-start" style={{ gridArea: 'wide', boxShadow: CARD_SHADOW }}>
            <div className="shrink-0">
              <div className="text-6xl font-bold tracking-tight leading-none text-fkvi-teal">100 %</div>
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
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-bold text-indigo-500 tracking-tight leading-none">90 Tage</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">Intensiv-Mentoring</div>
              <div className="text-xs text-gray-400 leading-relaxed mt-0.5">Begleitung durch die kritische Eingewöhnungsphase, für Fachkraft und Team gleichermaßen.</div>
            </div>
          </div>

          {/* Platform Preview — full bottom row, light mode */}
          <div className="rounded-3xl overflow-hidden flex flex-col sm:flex-row gap-0 relative" style={{
            gridArea: 'plat',
            background: 'linear-gradient(135deg, #f0fdf8 0%, #ffffff 45%, #eff6ff 100%)',
            boxShadow: '0 0 0 1px rgba(13,148,136,0.12), 0 4px 24px rgba(13,148,136,0.08), 0 12px 48px rgba(59,130,246,0.07)',
          }}>
            {/* Soft ambient glows */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div style={{ position:'absolute', top:'-30%', left:'5%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)', filter:'blur(50px)' }} />
              <div style={{ position:'absolute', bottom:'-30%', right:'10%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(13,148,136,0.09) 0%, transparent 70%)', filter:'blur(50px)' }} />
            </div>

            {/* Matching-Portal */}
            <div className="relative flex-1 p-6 flex flex-col gap-3.5 border-b sm:border-b-0 sm:border-r border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-900 font-bold text-base leading-tight">Matching-Portal</div>
                  <div className="text-gray-500 text-xs mt-0.5">Fachkräfte einsehen, auswählen & kennenlernen</div>
                </div>
              </div>

              {/* Cards with fade-out gradient */}
              <div className="relative overflow-hidden" style={{ maxHeight: 195 }}>
                <div className="flex flex-col gap-2.5">
                  {[
                    { init:'AK', country:'🇵🇭', job:'Pflegefachkraft (B.Sc.)', exp:'6 J. Intensiv' },
                    { init:'MR', country:'🇧🇷', job:'Gesundheits- & Krankenpfleger', exp:'9 J. Chirurgie' },
                    { init:'FO', country:'🇲🇦', job:'Altenpflegerin (examiniert)', exp:'4 J. Demenz' },
                  ].map((p, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-xl px-3 py-2.5"
                      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1a3a5c, #0d9488)' }}>{p.init}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 text-xs font-semibold truncate">{p.job} {p.country}</div>
                          <div className="text-gray-400 text-[10px]">{p.exp} Erfahrung</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 pl-0">
                        {['Profil ansehen','Video anschauen','Lebenslauf öffnen'].map(btn => (
                          <span key={btn} className="text-[9px] font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 bg-gray-50 cursor-default whitespace-nowrap">{btn}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Fade to white */}
                <div style={{
                  position:'absolute', bottom:0, left:0, right:0, height:80,
                  background:'linear-gradient(to bottom, transparent 0%, rgba(248,253,252,0.98) 100%)',
                  pointerEvents:'none',
                }} />
              </div>
            </div>

            {/* Live-Statustracking */}
            <div className="relative flex-1 p-6 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-900 font-bold text-base leading-tight">Live-Statustracking</div>
                  <div className="text-gray-500 text-xs mt-0.5">Immer up to date, völlige Transparenz.</div>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Live
                </span>
              </div>

              {/* Progress tracker */}
              <div className="rounded-xl p-3.5" style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-900 text-xs font-semibold">Amara K. 🇮🇳</span>
                  <span className="text-fkvi-teal text-[10px] font-bold tracking-wide">Woche 7 / 12</span>
                </div>
                <div className="flex gap-1.5 mb-1">
                  {[{l:'Matching',d:true},{l:'Behörden',d:true},{l:'Visum',d:false,a:true},{l:'Einreise',d:false}].map((s,i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="h-1.5 w-full rounded-full" style={{
                        background: s.d ? '#0d9488' : s.a ? 'rgba(13,148,136,0.35)' : 'rgba(0,0,0,0.08)',
                        boxShadow: s.d ? '0 0 4px rgba(13,148,136,0.4)' : 'none',
                      }} />
                      <span className="text-[8px] font-medium" style={{ color: s.d || s.a ? '#374151' : '#9ca3af' }}>{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic events */}
              <PlatformEvents />
            </div>

          </div>
        </div>

        {/* ── Mobile Bento Grid (< lg) ────────────────────────────────── */}
        <div
          className="lg:hidden grid gap-3"
          style={{
            gridTemplateColumns: '1fr 1fr',
            gridTemplateAreas: `
              "hero   hero  "
              "small1 small2"
              "small3 wide  "
              "plat   plat  "
            `,
          }}
        >
          {/* 360° hero — full width */}
          <div className="rounded-3xl p-5 sm:p-7 flex flex-col gap-4 relative overflow-hidden"
            style={{ gridArea: 'hero', background: 'white', boxShadow: HERO_SHADOW }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 25% 80%, rgba(99,102,241,0.09) 0%, rgba(14,165,233,0.07) 45%, transparent 75%)',
            }} />
            <div className="relative">
              <div className="font-bold tracking-tight leading-none mb-2"
                style={{
                  fontSize: 64,
                  background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 55%, #0d9488 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>360°</div>
              <div className="text-lg font-bold text-gray-900 mb-1.5">Wohnungssuche & Ersteinrichtung</div>
              <div className="text-sm text-gray-400 leading-relaxed">
                Wir finden die passende Wohnung und richten sie komplett ein — Fachkräfte kommen zum Arbeiten, nicht zum Möbelkaufen.
              </div>
            </div>
          </div>

          {/* 2 Tage */}
          <div className="bg-white rounded-3xl p-4 flex flex-col justify-between" style={{ gridArea: 'small1', boxShadow: CARD_SHADOW, minHeight: 164 }}>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-3xl font-bold text-blue-500 tracking-tight leading-none">2 Tage</div>
              <div className="text-xs font-semibold text-gray-900 mt-0.5">Vor-Ort-Support</div>
              <div className="text-[11px] text-gray-400 leading-relaxed mt-0.5">Abholung, Behördengänge, Bankkonto, Wohnungsübergabe — ab Tag 1.</div>
            </div>
          </div>

          {/* 12 Monate */}
          <div className="rounded-3xl p-4 flex flex-col justify-between" style={{ gridArea: 'small2', boxShadow: CARD_SHADOW, background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', border: '1px solid rgba(13,148,136,0.18)', minHeight: 164 }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#0f766e' }}>
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-3xl font-bold text-teal-600 tracking-tight leading-none">12 Monate</div>
              <div className="text-xs font-semibold text-teal-800 mt-0.5">Ersatzgarantie</div>
              <div className="text-[11px] text-teal-700/70 leading-relaxed mt-0.5">Kostenlose Nachbesetzung — wir stehen für unseren Prozess ein.</div>
            </div>
          </div>

          {/* 90 Tage */}
          <div className="bg-white rounded-3xl p-4 flex flex-col justify-between" style={{ gridArea: 'small3', boxShadow: CARD_SHADOW, minHeight: 164 }}>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-3xl font-bold text-indigo-500 tracking-tight leading-none">90 Tage</div>
              <div className="text-xs font-semibold text-gray-900 mt-0.5">Intensiv-Mentoring</div>
              <div className="text-[11px] text-gray-400 leading-relaxed mt-0.5">Begleitung durch die kritische Eingewöhnungsphase.</div>
            </div>
          </div>

          {/* 100% Vorleistung — vertical for 50% width */}
          <div className="bg-white rounded-3xl p-4 flex flex-col gap-2.5" style={{ gridArea: 'wide', boxShadow: CARD_SHADOW }}>
            <div>
              <div className="text-3xl font-bold tracking-tight leading-none text-fkvi-teal">100 %</div>
              <div className="text-xs font-semibold text-gray-500 mt-1">Vorleistung</div>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex flex-col gap-1.5">
              {vorleistungItems.slice(0, 5).map(item => (
                <div key={item.label} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-gray-700 font-medium leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Preview — full width */}
          <div className="rounded-3xl overflow-hidden flex flex-col relative" style={{
            gridArea: 'plat',
            background: 'linear-gradient(135deg, #f0fdf8 0%, #ffffff 45%, #eff6ff 100%)',
            boxShadow: '0 0 0 1px rgba(13,148,136,0.12), 0 4px 24px rgba(13,148,136,0.08), 0 12px 48px rgba(59,130,246,0.07)',
          }}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div style={{ position:'absolute', top:'-30%', left:'5%', width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)', filter:'blur(40px)' }} />
              <div style={{ position:'absolute', bottom:'-30%', right:'10%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(13,148,136,0.09) 0%, transparent 70%)', filter:'blur(40px)' }} />
            </div>
            {/* Matching-Portal */}
            <div className="relative p-5 flex flex-col gap-3 border-b border-gray-100 overflow-hidden">
              <div>
                <div className="text-gray-900 font-bold text-sm leading-tight">Matching-Portal</div>
                <div className="text-gray-500 text-xs mt-0.5">Fachkräfte einsehen, auswählen & kennenlernen</div>
              </div>
              <div className="relative overflow-hidden" style={{ maxHeight: 160 }}>
                <div className="flex flex-col gap-2">
                  {[
                    { init:'AK', country:'🇵🇭', job:'Pflegefachkraft (B.Sc.)', exp:'6 J. Intensiv' },
                    { init:'MR', country:'🇧🇷', job:'Gesundheits- & Krankenpfleger', exp:'9 J. Chirurgie' },
                    { init:'FO', country:'🇲🇦', job:'Altenpflegerin (examiniert)', exp:'4 J. Demenz' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                      style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                        style={{ background:'linear-gradient(135deg, #1a3a5c, #0d9488)' }}>{p.init}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 text-xs font-semibold truncate">{p.job} {p.country}</div>
                        <div className="text-gray-400 text-[10px]">{p.exp}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, background:'linear-gradient(to bottom, transparent 0%, rgba(248,253,252,0.98) 100%)', pointerEvents:'none' }} />
              </div>
            </div>
            {/* Live-Statustracking */}
            <div className="relative p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-900 font-bold text-sm leading-tight">Live-Statustracking</div>
                  <div className="text-gray-500 text-xs mt-0.5">Immer up to date, völlige Transparenz.</div>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5 shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Live
                </span>
              </div>
              <div className="rounded-xl p-3" style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-gray-900 text-xs font-semibold">Amara K. 🇮🇳</span>
                  <span className="text-fkvi-teal text-[10px] font-bold tracking-wide">Woche 7 / 12</span>
                </div>
                <div className="flex gap-1.5">
                  {[{l:'Matching',d:true},{l:'Behörden',d:true},{l:'Visum',d:false,a:true},{l:'Einreise',d:false}].map((s,i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="h-1.5 w-full rounded-full" style={{ background: s.d ? '#0d9488' : s.a ? 'rgba(13,148,136,0.35)' : 'rgba(0,0,0,0.08)', boxShadow: s.d ? '0 0 4px rgba(13,148,136,0.4)' : 'none' }} />
                      <span className="text-[8px] font-medium" style={{ color: s.d || s.a ? '#374151' : '#9ca3af' }}>{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <PlatformEvents />
            </div>
          </div>
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


function PlatformPreviewSection() {
  return (
    <section className="py-14 sm:py-24 px-4 sm:px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-3">Unsere Plattform</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue mb-4">
            Immer auf dem Laufenden bleiben.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
            Matching-Portal und Live-Statustracking — damit Sie zu jedem Zeitpunkt wissen, wo Ihre Fachkraft im Prozess steht.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Matching-Portal Mockup */}
          <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5">
            <div className="bg-fkvi-blue px-5 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <div className="flex-1 bg-white/10 rounded-md h-5 mx-4 flex items-center px-3">
                <span className="text-white/50 text-[10px]">fkvi-plattform.de/matching</span>
              </div>
            </div>
            <div className="bg-[#f0f4f8] p-4">
              {/* Search bar */}
              <div className="bg-white rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm mb-4">
                <div className="w-4 h-4 rounded bg-gray-200" />
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full" />
                <div className="px-3 py-1 bg-fkvi-teal rounded-lg">
                  <div className="w-8 h-2 bg-white/60 rounded-full" />
                </div>
              </div>
              {/* Filter pills */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {['Pflegefachkraft','B2','Intensivstation','Süddeutschland'].map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-fkvi-blue/10 text-fkvi-blue font-medium">{tag}</span>
                ))}
              </div>
              {/* Profile cards */}
              {[
                { init:'AK', country:'🇵🇭', job:'Pflegefachkraft (B.Sc.)', exp:'6 J. Intensiv', status:'Verfügbar', statusColor:'#10b981' },
                { init:'MR', country:'🇧🇷', job:'Gesundheits- & Krankenpfleger', exp:'9 J. Chirurgie', status:'In Verfahren', statusColor:'#f59e0b' },
              ].map((p, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-4 mb-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c, #0d9488)' }}>
                    {p.init}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-900">{p.job}</span>
                      <span>{p.country}</span>
                    </div>
                    <span className="text-xs text-gray-400">{p.exp} Erfahrung</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ color: p.statusColor, background: p.statusColor + '18' }}>{p.status}</span>
                </div>
              ))}
              <div className="bg-white/60 rounded-2xl p-4 flex items-center gap-4 mb-3 blur-[2px]">
                <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 bg-gray-100 rounded-full w-2/3" />
                  <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            </div>
            <div className="bg-white px-5 py-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Matching-Plattform</span>
              <span className="text-xs text-fkvi-teal font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-fkvi-teal animate-pulse" />
                Live
              </span>
            </div>
          </div>

          {/* Status-Tracking Mockup */}
          <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5">
            <div className="bg-gradient-to-r from-fkvi-blue to-fkvi-teal px-5 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <div className="flex-1 bg-white/10 rounded-md h-5 mx-4 flex items-center px-3">
                <span className="text-white/50 text-[10px]">fkvi-plattform.de/status</span>
              </div>
            </div>
            <div className="bg-[#f8fafc] p-5">
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-900">Amara K. · Pflegefachkraft</span>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-blue-600 bg-blue-50">Woche 7 / 12</span>
                </div>
                <div className="relative">
                  <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-100" />
                  <div className="absolute top-3 left-3 h-0.5 bg-fkvi-teal" style={{ width: '58%' }} />
                  <div className="flex justify-between relative">
                    {[
                      { label:'Matching', done:true },
                      { label:'Behörden', done:true },
                      { label:'Visum', done:false, active:true },
                      { label:'Einreise', done:false },
                    ].map((step, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${step.done ? 'bg-fkvi-teal text-white' : step.active ? 'bg-white border-2 border-fkvi-teal text-fkvi-teal' : 'bg-gray-100 text-gray-400'}`}>
                          {step.done ? '✓' : i + 1}
                        </div>
                        <span className={`text-[9px] font-medium ${step.done || step.active ? 'text-gray-700' : 'text-gray-400'}`}>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Aktuelle Updates */}
              <div className="space-y-2.5">
                {[
                  { time:'Heute', msg:'Visumsantrag eingereicht', color:'#10b981', dot:'bg-green-500' },
                  { time:'3. Dez.', msg:'Botschaftstermin bestätigt', color:'#3b82f6', dot:'bg-blue-500' },
                  { time:'28. Nov.', msg:'Anerkennungsverfahren gestartet', color:'#8b5cf6', dot:'bg-purple-500' },
                  { time:'14. Nov.', msg:'Arbeitsvertrag unterzeichnet', color:'#f59e0b', dot:'bg-amber-500' },
                ].map((ev, i) => (
                  <div key={i} className="bg-white rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${ev.dot}`} />
                    <span className="text-xs text-gray-800 font-medium flex-1">{ev.msg}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{ev.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white px-5 py-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Live-Statustracking</span>
              <span className="text-xs text-fkvi-teal font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-fkvi-teal animate-pulse" />
                Echtzeit
              </span>
            </div>
          </div>
        </div>

        {/* USP Chips */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {[
            { label: 'Matching nach 6 Kriterien', color: 'text-fkvi-blue bg-fkvi-blue/8' },
            { label: 'Live-Status für jede Fachkraft', color: 'text-fkvi-teal bg-fkvi-teal/8' },
            { label: 'Dokumente digital verwalten', color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Immer auf dem Laufenden bleiben', color: 'text-emerald-700 bg-emerald-50' },
          ].map(chip => (
            <span key={chip.label} className={`text-sm font-semibold px-4 py-2 rounded-full ${chip.color}`}>
              {chip.label}
            </span>
          ))}
        </div>

      </div>
    </section>
  )
}

function KompetenzpassCarouselSection({ kpassRef }) {
  const [tab, setTab] = useState('fachlich')
  const cards = tab === 'fachlich' ? KPASS_FACHLICH : KPASS_INTEGRATION
  const accentColor = tab === 'fachlich' ? '#3b82f6' : '#10b981'
  const accentBg   = tab === 'fachlich' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)'

  return (
    <section ref={kpassRef} style={{ background: '#0f172a' }} className="py-14 sm:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          {tab === 'fachlich' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-sm mb-5"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
              <ShieldCheck className="h-4 w-4" />
              PDL validiert
            </div>
          )}
          {tab !== 'fachlich' && <div className="mb-5 h-9" />}
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Der FKVI Kompetenzpass</h2>
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            Prüfung der pflegerischen Handlungskompetenz und sozialen Integration nach deutschen Standards.
            Wählen Sie einen Bereich, um die Module zu sehen.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center gap-4 mb-10 flex-wrap">
          {[
            { key: 'fachlich',    label: 'Fachliche Pflege',    activeColor: '#3b82f6', activeBg: 'rgba(59,130,246,0.15)',  glow: 'rgba(59,130,246,0.25)'  },
            { key: 'integration', label: 'Leben & Integration', activeColor: '#10b981', activeBg: 'rgba(16,185,129,0.15)', glow: 'rgba(16,185,129,0.25)' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-7 py-3 rounded-full text-base font-semibold transition-all duration-300"
              style={tab === t.key ? {
                border: `2px solid ${t.activeColor}`,
                color: t.activeColor,
                background: t.activeBg,
                boxShadow: `0 0 28px ${t.glow}`,
              } : {
                border: '2px solid #475569',
                color: '#cbd5e1',
                background: 'rgba(255,255,255,0.04)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
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
    <section ref={funnelRef} className="py-14 sm:py-20 px-4 sm:px-6" style={{ background: '#0f172a' }}>
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
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">Unser Matching-Filter</h2>
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

      <section ref={poolRef} className="py-14 sm:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ background: '#f8fafc' }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(96,165,250,0.12) 0%, rgba(147,197,253,0.05) 50%, transparent 75%)' }} />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-3">Aktueller Pool</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Fachkräfte verfügbar</h2>
            <p className="text-gray-400 mt-4 max-w-md mx-auto text-sm leading-relaxed">
              Vollständige Profile mit Namen, Kontaktdaten und Dokumenten sind ausschließlich für freigeschaltete Partnereinrichtungen sichtbar.
            </p>
          </div>

          {profilesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
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
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 overflow-hidden">
                {visible.map((p, i) => (
                  <ProfileCard key={p.id} profile={p} onRequestAccess={() => setModalOpen(true)} />
                ))}
              </div>
              {/* Anschnitt-Indikator: weitere Kandidaten andeuten */}
              <div className="hidden sm:flex absolute -right-10 top-0 bottom-0 w-40 pointer-events-none"
                style={{ background: 'linear-gradient(to right, transparent 0%, rgba(248,250,252,0.7) 40%, rgba(248,250,252,0.97) 100%)' }}>
                <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 opacity-40">
                  <div className="w-20 h-32 bg-white rounded-2xl border border-gray-200 shadow-sm" style={{ filter: 'blur(2px)' }} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-10 text-center">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-fkvi-blue text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-fkvi-blue/90 transition-all shadow-lg shadow-fkvi-blue/20"
            >
              Zugang freischalten <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-gray-400 mt-3">Zugang nur für verifizierte Einrichtungen</p>
          </div>
        </div>
      </section>
    </>
  )
}

function KundenstimmenSection({ kundenstimmenRef }) {
  const VIMEO_TESTIMONIAL = 'https://player.vimeo.com/video/1093472894?badge=0&autopause=0&player_id=testimonial&app_id=58479&title=0&byline=0&portrait=0'

  return (
    <section ref={kundenstimmenRef} className="px-4 sm:px-6 pb-8 pt-10 sm:pt-16 relative overflow-hidden"
      style={{ background: '#f8fafc' }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(96,165,250,0.10) 0%, rgba(147,197,253,0.04) 50%, transparent 75%)' }} />
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-3">Praxisberichte</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-fkvi-blue">Erfahrungen aus der Praxis</h2>
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
                  className="h-7 w-auto object-contain opacity-70" />
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
              <p className="text-white/60 text-xs">Matching-Plattform & Kandidatenprofile</p>
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
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl hover:border-gray-200 transition-all duration-300 flex flex-col overflow-hidden">

      {/* Full-card gradient — matches matching platform exactly */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(170deg, rgba(13,148,136,0.07) 0%, rgba(26,58,92,0.04) 25%, rgba(255,255,255,0) 55%)' }} />

      {/* Top spacer for avatar */}
      <div className="h-20 shrink-0" />

      {/* Avatar */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <div className="w-28 h-28 rounded-full p-[3px] shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #1a3a5c 100%)' }}>
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
            {profile.profile_image_url
              ? <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover object-top" />
              : <div className="w-full h-full flex items-center justify-center bg-fkvi-blue/10"><User className="h-10 w-10 text-fkvi-blue/30" /></div>
            }
          </div>
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800/75 backdrop-blur-sm rounded-full px-2.5 py-0.5 whitespace-nowrap">
          <EyeOff className="h-2.5 w-2.5 text-white/70" />
          <span className="text-[9px] text-white/80 font-medium tracking-wide">Anonymisiert</span>
        </div>
      </div>

      {/* Lock-Zugang button */}
      <button onClick={onRequestAccess}
        className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-fkvi-teal text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full hover:bg-fkvi-teal/85 transition-colors z-10 shadow-sm">
        <Lock className="h-3 w-3" />Zugang
      </button>

      {/* Content */}
      <div className="relative pt-14 pb-5 px-4 flex flex-col flex-1 gap-3">

        {/* Identity */}
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm leading-tight">{profile.nursing_education || 'Pflegefachkraft'}</p>
          <p className="text-xs text-gray-500 mt-0.5">
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
      </div>

      {/* Hover teal accent */}
      <div className="h-0.5 bg-gradient-to-r from-fkvi-teal/0 via-fkvi-teal/40 to-fkvi-teal/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}

function UeberUnsSection() {
  return (
    <section className="pt-8 sm:pt-12 pb-12 sm:pb-20 px-4 sm:px-6 bg-white">
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

function PhaseCard({ p }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col rounded-2xl p-6"
      style={{
        background: hovered ? '#263348' : '#1e293b',
        border: `1px solid ${hovered || p.goal ? p.color + (hovered ? 'cc' : '70') : '#334155'}`,
        boxShadow: hovered
          ? `0 0 0 1px ${p.color}40, 0 12px 40px ${p.color}28`
          : p.goal ? `0 0 0 1px ${p.color}20, 0 8px 32px ${p.color}18` : 'none',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}>
      <span className="self-start text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4"
        style={{ background: p.bg, color: p.color }}>
        {p.week}
      </span>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold mb-4"
        style={{
          background: p.goal || hovered ? p.color : p.bg,
          color: p.goal || hovered ? '#fff' : p.color,
          boxShadow: p.goal || hovered ? `0 0 24px ${p.color}55` : 'none',
          transition: 'all 0.25s ease',
        }}>
        {p.num}
      </div>
      <h3 className="font-bold text-white text-sm leading-snug mb-2">{p.title}</h3>
      <p className="text-slate-300 text-xs leading-relaxed flex-1">{p.body}</p>
      {p.goal && (
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">Ziel erreicht</span>
        </div>
      )}
    </div>
  )
}

function ProzessSection({ prozessRef }) {
  const phases = [
    {
      num: 1, week: 'Woche 1',
      title: 'Vertragsabschluss & Startschuss',
      body: 'Nach erfolgreichem Matching und unterzeichnetem Arbeitsvertrag übernehmen wir ab sofort die vollständige Steuerung aller behördlichen Prozesse — von Antragsstellung bis Terminfristenmanagement.',
      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',
    },
    {
      num: 2, week: 'Woche 2–6',
      title: 'Behörden-Management & Anerkennung',
      body: 'Wir initiieren das beschleunigte Fachkräfteverfahren nach § 81a AufenthG sowie das Anerkennungsverfahren. Da alle Unterlagen bereits Monate im Voraus geprüft und vollständig vorbereitet wurden, erfolgt die Einreichung ohne Verzögerungen.',
      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',
    },
    {
      num: 3, week: 'Woche 7–10',
      title: 'Visumsverfahren & Reisevorbereitung',
      body: 'Die Fachkraft wird persönlich zur deutschen Botschaft begleitet. Alle Anträge werden vorab geprüft, um Ablehnungen aufgrund von Formfehlern von vornherein auszuschließen.',
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
    <section ref={prozessRef} style={{ background: '#0f172a' }} className="py-14 sm:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-3">Ablauf</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ihre neue Fachkraft in 12 Wochen</h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unser Ziel ist eine langfristige Partnerschaft. Dass der sichtbare Prozess ab Vertragsunterschrift in der Regel nur rund 12 Wochen dauert, ist das Ergebnis sorgfältiger Vorarbeit, die Monate zuvor beginnt.
          </p>
        </div>

        {/* Phase cards — 4-col grid with connector line */}
        <div className="relative mb-8">
          {/* Connector line desktop */}
          <div className="hidden lg:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px"
            style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6, #f59e0b, #10b981)', opacity: 0.35 }} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {phases.map((p, i) => (
              <PhaseCard key={i} p={p} />
            ))}
          </div>
        </div>

        {/* Foundation card — full width */}
        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0c1628 100%)', border: '1px solid #1e3a5f' }}>
          {/* Top banner */}
          <div className="flex items-center justify-center gap-2 py-3 border-b border-slate-800/80"
            style={{ background: 'rgba(59,130,246,0.06)' }}>
            <span className="text-blue-400 font-bold uppercase tracking-widest text-xs text-center px-2">
              Das 18-Monate Fundament – 90% passiert im Verborgenen
            </span>
          </div>
          <div className="p-5 sm:p-8 flex flex-col md:flex-row gap-5 md:gap-8 items-center md:items-start text-center md:text-left">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { title: 'Dokumentenprüfung', sub: 'Anerkennungsfähigkeit vorab gesichert', color: '#10b981' },
                  { title: 'B2-Sprachausbildung', sub: 'Komplett vorfinanziert von FKVI', color: '#3b82f6' },
                  { title: 'Interkulturelles Coaching', sub: 'Intensiv & persönlich begleitet', color: '#8b5cf6' },
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(167,243,208,0.6)' }}>Endet das Arbeitsverhältnis innerhalb eines Jahres — unabhängig vom Grund — übernehmen wir die Nachbesetzung vollständig kostenlos. Wir gehen hier bewusst die Extrameile, weil wir von unserem Prozess überzeugt sind.</p>
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
    <section className="py-16 sm:py-28 px-4 sm:px-6"
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)' }}>
      <div className="max-w-6xl mx-auto">

        <p className="text-xs font-semibold tracking-widest uppercase text-teal-400 text-center mb-4">
          Unsere Motivation
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center leading-tight mb-4 sm:mb-6"
          style={{ letterSpacing: '-1px', color: '#0d9488' }}>
          Wir tun das für unsere Eltern
        </h2>

        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto text-center mb-5">
          Wir sind Söhne und Töchter. Unsere Eltern werden älter, und wir wollen sicherstellen,
          dass sie in stabilen, kompetenten Teams gepflegt werden.
        </p>
        <p className="text-slate-300 font-medium text-base italic text-center mb-20 max-w-xl mx-auto" style={{ lineHeight: 1.8 }}>
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
          <a href="tel:+496980884364" className="hover:text-white transition-colors">+49 69 8088 4364</a>
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
              <Link to="/downloads" className="flex items-center gap-2 text-slate-400 text-sm hover:text-white transition-colors">
                Informationsbroschüre
                <span className="text-[9px] font-bold tracking-widest bg-fkvi-teal/15 text-fkvi-teal px-1.5 py-0.5 rounded-full leading-none">FACHKRAFT</span>
              </Link>
              <Link to="/matching/login" className="block text-slate-400 text-sm hover:text-white transition-colors">Matching-Plattform</Link>
            </div>
          </div>
          <div>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-3">Kontakt</p>
            <div className="space-y-2">
              <a href="tel:+496980884364" className="block text-slate-400 text-sm hover:text-white transition-colors">+49 69 8088 4364</a>
              <a href="mailto:info@fachkraft-vermittlung.de" className="block text-slate-400 text-sm hover:text-white transition-colors">info@fachkraft-vermittlung.de</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>© 2026 Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link to="/datenschutzerklaerung" className="hover:text-white transition-colors">Datenschutzerklärung</Link>
            <Link to="/matching/login" className="hover:text-white transition-colors">Zum Login</Link>
          </div>
        </div>
      </div>

    </footer>
  )
}

// ─── Floating Guarantee Badge ──────────────────────────────────────────────────
function FloatingGuaranteeBadge() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <div
      className="fixed bottom-6 left-6 z-40 transition-all duration-500 ease-out pointer-events-none"
      style={{
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.9)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2 rounded-full pointer-events-auto"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 16px rgba(13,148,136,0.18), 0 1px 4px rgba(0,0,0,0.08)',
          border: '1px solid rgba(13,148,136,0.2)',
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
        <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">12 Monate Garantie</span>
        <span className="w-px h-3 bg-gray-200" />
        <span className="text-xs text-teal-600 font-medium whitespace-nowrap">Kostenloser Ersatz</span>
      </div>
    </div>
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
  const kundenstimmenRef = useRef(null)

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
        <meta name="description" content="FKVI vermittelt qualifizierte Pflegefachkräfte aus dem Ausland an Kliniken, Pflegeheime und ambulante Dienste. 100 % Vorleistung, B2-Zertifikat, Wohnung, 12 Monate Garantie – in 3 Monaten vor Ort." />
        <link rel="canonical" href="https://fkvi-plattform.de/" />
        <meta property="og:title" content="FKVI – Internationale Pflegekräfte für Kliniken & Pflegeheime" />
        <meta property="og:description" content="Qualifizierte Pflegefachkräfte aus dem Ausland. 100 % Vorleistung, B2-Zertifikat, Wohnung inklusive. 12 Monate Garantie." />
        <meta property="og:url" content="https://fkvi-plattform.de/" />
      </Helmet>
      <NavBar funnelRef={funnelRef} prozessRef={prozessRef} vorteileRef={vorteileRef} kpassRef={kpassRef} poolRef={poolRef} kundenstimmenRef={kundenstimmenRef} />
      <HeroSection poolRef={poolRef} />
      <LogoMarquee />
      <LeistungenSection vorteileRef={vorteileRef} />
      {/* ── Dark zone 1: Kompetenzpass + floating light island + Prozess ── */}
      <div style={{ background: '#0f172a' }}>
        <KompetenzpassCarouselSection kpassRef={kpassRef} />
        <KompetenzpassSection funnelRef={funnelRef} />
        <div style={{ background: '#f8fafc', borderRadius: 32, margin: '40px 0', overflow: 'hidden' }}>
          <ProfilesSection profiles={profiles} profilesLoading={profilesLoading} poolRef={poolRef} />
          <KundenstimmenSection kundenstimmenRef={kundenstimmenRef} />
        </div>
        <ProzessSection prozessRef={prozessRef} />
        <div style={{ background: '#fff', borderRadius: 32, margin: '40px 0', overflow: 'hidden' }}>
          <UeberUnsSection />
        </div>
        <MotivationSection />
      </div>

      <Footer funnelRef={funnelRef} prozessRef={prozessRef} vorteileRef={vorteileRef} kpassRef={kpassRef} />
      <FloatingGuaranteeBadge />
    </div>
  )
}
