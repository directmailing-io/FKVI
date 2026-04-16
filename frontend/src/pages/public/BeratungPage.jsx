import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, ArrowLeft } from 'lucide-react'

// TODO: Replace with actual Calendly URL from fachkraft-vermittlung.de/beratung
const CALENDLY_URL = 'https://calendly.com/fachkraft-vermittlung/beratung'

export default function BeratungPage() {
  useEffect(() => {
    const existing = document.querySelector('script[src*="calendly"]')
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)
    return () => { if (document.body.contains(script)) document.body.removeChild(script) }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/">
            <div className="overflow-hidden flex items-center" style={{ height: 72 }}>
              <img src="/logo.svg" alt="FKVI" style={{ height: 192, marginTop: -56, mixBlendMode: 'multiply' }} />
            </div>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-fkvi-blue transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-5 gap-12 items-start">

          {/* Left: Context */}
          <div className="lg:col-span-2 lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 bg-fkvi-teal/10 text-fkvi-teal text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              Kostenlos & unverbindlich
            </div>
            <h1 className="text-3xl font-bold text-fkvi-blue leading-tight mb-4">
              Kostenloses Beratungsgespräch vereinbaren
            </h1>
            <p className="text-gray-500 leading-relaxed mb-8">
              In einem persönlichen Gespräch zeigen wir Ihnen, wie Sie schnell und planbar neue
              Pflegefachkräfte gewinnen – ohne Bewerbungsmarathon und ohne zusätzlichen Aufwand.
            </p>

            <div className="space-y-5">
              {[
                { icon: '⏱', title: 'Ca. 30 Minuten', desc: 'Kurz, präzise, auf Ihre Situation zugeschnitten' },
                { icon: '💬', title: 'Digital oder telefonisch', desc: 'Bequem von Ihrem Büro aus' },
                { icon: '✅', title: 'Keine Verpflichtung', desc: 'Erstgespräch ist kostenlos und unverbindlich' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-4">
                  <span className="text-2xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-gray-200 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Oder direkt kontaktieren</p>
              <a href="tel:+491605562142" className="flex items-center gap-3 text-sm text-gray-600 hover:text-fkvi-blue transition-colors">
                <Phone className="h-4 w-4 text-fkvi-teal" />
                +49 160 5562142
              </a>
              <a href="mailto:info@fachkraft-vermittlung.de" className="flex items-center gap-3 text-sm text-gray-600 hover:text-fkvi-blue transition-colors">
                <Mail className="h-4 w-4 text-fkvi-teal" />
                info@fachkraft-vermittlung.de
              </a>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-fkvi-teal shrink-0" />
                Ammelburgstraße 34, 60320 Frankfurt am Main
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Hinweis:</strong> Aufgrund der hohen Nachfrage können wir nur eine begrenzte Zahl
                an Einrichtungen gleichzeitig betreuen. Sichern Sie sich jetzt Ihren Termin.
              </p>
            </div>
          </div>

          {/* Right: Calendly */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div
              className="calendly-inline-widget"
              data-url={CALENDLY_URL}
              style={{ minWidth: 320, height: 700 }}
            />
          </div>

        </div>
      </main>
    </div>
  )
}
