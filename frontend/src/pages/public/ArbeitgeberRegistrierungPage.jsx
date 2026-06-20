import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { openCookieSettings } from '@/lib/cookieConsent'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

export default function ArbeitgeberRegistrierungPage() {
  const [form, setForm] = useState({ einrichtung: '', ansprechperson: '', email: '', telefon: '' })
  const [checks, setChecks] = useState([false, false, false, false])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const allChecked = checks.every(Boolean)
  const allFilled = Object.values(form).every(v => v.trim())

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const toggleCheck = i => setChecks(c => c.map((v, idx) => idx === i ? !v : v))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!allChecked || !allFilled) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/arbeitgeber/registrierung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bitte versuche es erneut.')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Helmet>
        <title>Als Arbeitgeber registrieren | FKVI Matching-Plattform</title>
        <meta name="description" content="Registrieren Sie sich als Arbeitgeber für die FKVI Matching-Plattform und erhalten Sie Zugang zu Profilen vermittlungsinteressierter Fachkräfte." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="FKVI – Fachkraft Vermittlung International" className="h-16 w-auto" />
          </Link>
          <Link to="/matching/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Zurück zum Login</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-20">

        <p className="text-xs font-semibold tracking-widest uppercase text-fkvi-teal mb-2">Matching-Plattform für Arbeitgeber</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fkvi-blue mb-2">Als Arbeitgeber registrieren</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Nach der Freischaltung erhalten Sie Zugang zu Profilen vermittlungsinteressierter Fachkräfte
          (u.a. Pflege, Physiotherapie, Ergotherapie, OTA/ATA sowie Auszubildende). Bitte beachten Sie
          vor der Registrierung die Hinweise zum Umgang mit diesen Daten.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Anfrage eingegangen</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Vielen Dank! Wir haben Ihre Registrierungsanfrage erhalten und prüfen sie zeitnah.
              Nach manueller Freigabe erhalten Sie eine E-Mail mit Ihren Zugangsdaten.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-1">

              {/* Form fields */}
              <div className="space-y-4 pb-6 border-b border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Einrichtung / Unternehmen</label>
                  <input
                    name="einrichtung" value={form.einrichtung} onChange={handleChange} required
                    placeholder="Name der Einrichtung"
                    className="w-full bg-[#f5f7fa] border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-fkvi-teal focus:ring-1 focus:ring-fkvi-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Ansprechperson</label>
                  <input
                    name="ansprechperson" value={form.ansprechperson} onChange={handleChange} required
                    placeholder="Vor- und Nachname"
                    className="w-full bg-[#f5f7fa] border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-fkvi-teal focus:ring-1 focus:ring-fkvi-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">E-Mail-Adresse (geschäftlich)</label>
                  <input
                    name="email" type="email" value={form.email} onChange={handleChange} required
                    placeholder="name@einrichtung.de"
                    className="w-full bg-[#f5f7fa] border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-fkvi-teal focus:ring-1 focus:ring-fkvi-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Telefonnummer</label>
                  <input
                    name="telefon" type="tel" value={form.telefon} onChange={handleChange} required
                    placeholder="+49 …"
                    className="w-full bg-[#f5f7fa] border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-fkvi-teal focus:ring-1 focus:ring-fkvi-teal transition-colors"
                  />
                </div>
              </div>

              {/* DSGVO warning */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-4 my-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <h3 className="text-sm font-bold text-amber-800">Wichtiger Hinweis zum Datenschutz</h3>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Die Profile enthalten Lichtbilder und Vorstellungsvideos der Fachkräfte. Auch ohne Namen sind die
                  Personen dadurch identifizierbar. Es handelt sich um personenbezogene und besondere (biometrische)
                  Daten im Sinne der DSGVO, die ausschließlich für die konkrete Vermittlungsentscheidung verwendet
                  werden dürfen.
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4 py-2">
                {[
                  <>Ich verpflichte mich zur <strong>Vertraulichkeit</strong>: Ich werde Profilinhalte, Lichtbilder und Videos weder herunterladen, speichern, vervielfältigen noch an Dritte weitergeben oder außerhalb der konkreten Vermittlungsentscheidung verwenden.</>,
                  <>Ich habe die <a href="/Nutzungsbedingungen_Matching-Plattform_FKVI.pdf" target="_blank" rel="noopener noreferrer" className="text-fkvi-teal font-bold hover:underline">Nutzungsbedingungen der Matching-Plattform</a> gelesen und akzeptiere diese.</>,
                  <>Ich habe die <Link to="/datenschutzerklaerung" target="_blank" className="text-fkvi-teal font-bold hover:underline">Datenschutzhinweise</Link> gelesen und nehme zur Kenntnis, dass ich beim Zugriff auf die Profile personenbezogene und biometrische Daten verarbeite.</>,
                  <>Ich bin bereit, mit der FKVI eine <strong>Vereinbarung zur Auftragsverarbeitung (Art. 28 DSGVO)</strong> bzw. die erforderliche datenschutzrechtliche Vereinbarung abzuschließen.</>,
                ].map((label, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer group">
                    <button
                      type="button"
                      onClick={() => toggleCheck(i)}
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-fkvi-teal focus:ring-offset-1 ${
                        checks[i] ? 'bg-fkvi-teal border-fkvi-teal' : 'border-gray-300 group-hover:border-fkvi-teal'
                      }`}
                      aria-checked={checks[i]}
                      role="checkbox"
                    >
                      {checks[i] && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-xs text-gray-600 leading-relaxed">{label}</span>
                  </label>
                ))}
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Submit */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={!allChecked || !allFilled || loading}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    allChecked && allFilled && !loading
                      ? 'bg-fkvi-teal text-white hover:bg-fkvi-teal/90 cursor-pointer'
                      : 'bg-fkvi-teal/40 text-white cursor-not-allowed'
                  }`}
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet...</> : 'Registrierung anfragen'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Die FKVI prüft Ihre Anfrage und schaltet den Zugang erst nach Freigabe frei. Erst danach werden Profile sichtbar.
                </p>
              </div>

            </div>
          </form>
        )}
      </main>

      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 text-center text-xs text-gray-400">
        <span>© 2026 Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
        <span className="mx-3">·</span>
        <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
        <span className="mx-3">·</span>
        <Link to="/datenschutzerklaerung" className="hover:text-gray-600 transition-colors">Datenschutzerklärung</Link>
        <span className="mx-3">·</span>
        <button onClick={openCookieSettings} className="hover:text-gray-600 transition-colors">Cookie-Einstellungen</button>
      </footer>
    </div>
  )
}
