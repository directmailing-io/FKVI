import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Building2, Shield } from 'lucide-react'

export default function PublicHome() {
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

      {/* CTA */}
      <section className="py-16 px-4">
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
