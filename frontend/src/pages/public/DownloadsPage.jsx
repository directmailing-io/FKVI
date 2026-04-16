import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, FileDown, Loader2, ArrowRight, Lock, ShieldCheck } from 'lucide-react'

export default function DownloadsPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', company_name: '', phone: '', email: '' })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!agreed) { setError('Bitte stimmen Sie der Datenschutzerklärung zu.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/brochure/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'already_confirmed') {
          setError('Diese E-Mail-Adresse hat bereits Zugang zur Broschüre erhalten. Bitte prüfen Sie Ihr Postfach.')
          return
        }
        throw new Error(data.error || 'Unbekannter Fehler')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-28 flex items-center justify-between">
          <Link to="/"><img src="/logo.svg" alt="FKVI" className="h-24 w-auto" style={{ mixBlendMode: 'multiply' }} /></Link>
          <div className="flex items-center gap-3">
            <Link to="/matching/login">
              <Button variant="outline" size="sm">Unternehmens-Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left: Info */}
          <div>
            <div className="inline-flex items-center gap-2 bg-fkvi-blue/8 text-fkvi-blue text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <FileDown className="h-3.5 w-3.5" />
              Kostenloser Download
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              FKVI Broschüre &amp;<br />
              <span className="text-fkvi-blue">Informationsmappe</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Erfahren Sie alles über unseren Vermittlungsprozess, Qualitätsstandards und wie wir deutsche
              Unternehmen mit qualifizierten Fachkräften aus dem Ausland verbinden.
            </p>

            <div className="space-y-4">
              {[
                { icon: '📋', label: 'Vermittlungsprozess im Detail', desc: 'Schritt-für-Schritt erklärt' },
                { icon: '✅', label: 'Qualitätssicherung & Prüfverfahren', desc: 'Unsere Standards auf einen Blick' },
                { icon: '📊', label: 'Kosten & Konditionen', desc: 'Transparente Preisgestaltung' },
                { icon: '🤝', label: 'Vermittlungsvertrag', desc: 'Rechtliche Grundlagen' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                    <p className="text-gray-400 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Ihre Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.
            </div>
          </div>

          {/* Right: Form or Success */}
          <div>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Fast geschafft!</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Wir haben Ihnen eine Bestätigungs-E-Mail an <strong>{form.email}</strong> gesendet.
                  Bitte klicken Sie auf den Link in der E-Mail, um Ihre Adresse zu bestätigen und
                  sofort Zugang zur Broschüre zu erhalten.
                </p>
                <p className="text-xs text-gray-400">
                  Keine E-Mail erhalten? Prüfen Sie Ihren Spam-Ordner.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Jetzt kostenlos herunterladen</h2>
                <p className="text-sm text-gray-400 mb-6">Nach Bestätigung Ihrer E-Mail erhalten Sie sofort Zugang.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="first_name" className="text-xs text-gray-600 mb-1.5 block">Vorname *</Label>
                      <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Max" />
                    </div>
                    <div>
                      <Label htmlFor="last_name" className="text-xs text-gray-600 mb-1.5 block">Nachname *</Label>
                      <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Mustermann" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company_name" className="text-xs text-gray-600 mb-1.5 block">Unternehmen <span className="text-gray-400">(optional)</span></Label>
                    <Input id="company_name" name="company_name" value={form.company_name} onChange={handleChange} placeholder="Muster GmbH" />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-xs text-gray-600 mb-1.5 block">Telefonnummer *</Label>
                    <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="+49 123 456789" />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs text-gray-600 mb-1.5 block">E-Mail-Adresse *</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="max@muster.de" />
                  </div>

                  {/* DSGVO */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      onClick={() => setAgreed(a => !a)}
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        agreed ? 'bg-fkvi-blue border-fkvi-blue' : 'border-gray-300 group-hover:border-fkvi-blue/50'
                      }`}
                    >
                      {agreed && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Ich stimme der Verarbeitung meiner Daten gemäß der{' '}
                      <a href="#" className="text-fkvi-blue underline">Datenschutzerklärung</a> zu.
                      Meine Daten werden ausschließlich zur Bereitstellung der Broschüre und
                      ggf. zur Kontaktaufnahme durch FKVI verwendet.
                    </span>
                  </label>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wird gesendet...</>
                    ) : (
                      <>Broschüre anfordern <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </form>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Double-Opt-in · DSGVO-konform · Kostenlos
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
