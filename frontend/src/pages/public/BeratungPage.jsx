import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Video, CheckCircle2, Users, FileText, Info } from 'lucide-react'

const CALENDLY_URL = 'https://calendly.com/fachkraft-vermittlung/beratungsgesprach-fachkrafte-aus-dem-ausland'

export default function BeratungPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI" className="h-[52px] w-auto" />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Zurück zur Startseite
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-5 gap-10 items-start">

          {/* ── Left: Context ── */}
          <div className="lg:col-span-2 lg:sticky lg:top-28 space-y-6">

            <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Kostenlos &amp; unverbindlich
            </span>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
                Freien Termin für ein persönliches Gespräch sichern
              </h1>
              <p className="text-gray-500 leading-relaxed">
                Keine Verbindlichkeit für Sie, nur ein ehrliches Beratungsgespräch.
              </p>
            </div>

            {/* What happens */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Was Sie erwartet</p>
              {[
                {
                  Icon: CheckCircle2,
                  color: 'text-teal-500',
                  bg: 'bg-teal-50',
                  title: 'Ehrliche Bedarfsanalyse',
                  desc: 'Wir prüfen gemeinsam, ob internationale Fachkräfte für Ihre Einrichtung die richtige Lösung sind.',
                  chip: null,
                },
                {
                  Icon: Users,
                  color: 'text-blue-500',
                  bg: 'bg-blue-50',
                  title: 'Kostenloser Plattform-Zugang',
                  desc: 'Bei Bedarf schalten wir Ihnen kostenfrei unsere Matching-Plattform frei, auf der zahlreiche Profile von Pflegefachkräften aus dem Ausland gelistet sind.',
                  chip: null,
                },
                {
                  Icon: FileText,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-50',
                  title: 'Profile mit Video & Lebenslauf',
                  desc: 'Jede Fachkraft ist mit einem Vorstellungsvideo und vollständigem Lebenslauf hinterlegt, damit Sie sich ein echtes Bild machen können.',
                  tooltip: 'Erst vor wenigen Tagen wurden neue Profile hinzugefügt.',
                },
              ].map(({ Icon, color, bg, title, desc, tooltip }) => (
                <div key={title} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-800 text-sm">{title}</p>
                      {tooltip && (
                        <div className="relative group/tip">
                          <Info className="h-3.5 w-3.5 text-gray-300 hover:text-amber-400 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-20 text-center">
                            {tooltip}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Call details */}
            <div className="flex flex-col gap-2.5 text-sm text-gray-500">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-teal-500 shrink-0" />
                <span>Ca. 30 Minuten, auf Ihre Situation zugeschnitten</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Video className="h-4 w-4 text-teal-500 shrink-0" />
                <span>Digital von Ihrem Büro aus</span>
              </div>
            </div>

            {/* Contact */}
            <div className="pt-4 border-t border-gray-100 space-y-2.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Oder direkt melden</p>
              <a href="tel:+491605562142" className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-teal-600 transition-colors">
                <Phone className="h-4 w-4 text-teal-500 shrink-0" />
                +49 160 5562142
              </a>
              <a href="mailto:info@fachkraft-vermittlung.de" className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-teal-600 transition-colors">
                <Mail className="h-4 w-4 text-teal-500 shrink-0" />
                info@fachkraft-vermittlung.de
              </a>
              <div className="flex items-start gap-2.5 text-sm text-gray-500">
                <MapPin className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                Ammelburgstraße 34, 60320 Frankfurt am Main
              </div>
            </div>

          </div>

          {/* ── Right: Calendly iframe ── */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)' }}>
            <iframe
              src={`${CALENDLY_URL}?hide_gdpr_banner=1&background_color=ffffff&text_color=1a1a2e&primary_color=0d9488`}
              width="100%"
              style={{ display: 'block', height: 'clamp(580px, 80vh, 800px)' }}
              frameBorder="0"
              title="Termin vereinbaren"
            />
          </div>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 text-center text-xs text-gray-400 mt-12">
        <span>© 2026 Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
        <span className="mx-3">·</span>
        <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
        <span className="mx-3">·</span>
        <Link to="/datenschutzerklaerung" className="hover:text-gray-600 transition-colors">Datenschutzerklärung</Link>
      </footer>
    </div>
  )
}
