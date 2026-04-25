import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ArrowRight, Loader2, Lock, ShieldCheck, BookOpen, Home, Clock, Users } from 'lucide-react'

const LANGUAGES = [
  { code: 'de', label: 'Deutsch',      flag: '🇩🇪', nativeLabel: 'Deutsch' },
  { code: 'en', label: 'Englisch',     flag: '🇬🇧', nativeLabel: 'English' },
  { code: 'fr', label: 'Französisch',  flag: '🇫🇷', nativeLabel: 'Français' },
  { code: 'ar', label: 'Arabisch',     flag: '🇸🇦', nativeLabel: 'عربي' },
  { code: 'vi', label: 'Vietnamesisch',flag: '🇻🇳', nativeLabel: 'Tiếng Việt' },
]

const BROCHURE_POINTS = [
  { Icon: BookOpen, color: 'text-teal-500', bg: 'bg-teal-50',
    title: 'Der Vermittlungsprozess', desc: 'Schritt für Schritt erklärt – von der Bewerbung bis zur Anstellung in Deutschland.' },
  { Icon: Home, color: 'text-blue-500', bg: 'bg-blue-50',
    title: 'Unterkunft & Ankommen', desc: 'Wir kümmern uns um deine Unterkunft und stehen dir beim Start in Deutschland zur Seite.' },
  { Icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-50',
    title: '12 Monate Begleitung', desc: 'Nach deiner Ankunft begleiten wir dich ein ganzes Jahr – damit du dich sicher und gut aufgehoben fühlst.' },
  { Icon: Users, color: 'text-purple-500', bg: 'bg-purple-50',
    title: 'Deine Rechte & Pflichten', desc: 'Alles, was du als Pflegefachkraft in Deutschland wissen musst – rechtlich, sozial und im Berufsalltag.' },
]

export default function DownloadsPage() {
  const [language, setLanguage] = useState('de')
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '' })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!agreed) { setError('Bitte stimme der Datenschutzerklärung zu.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/brochure/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, language }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'already_confirmed') {
          setError('Diese E-Mail-Adresse hat bereits Zugang zur Broschüre erhalten. Bitte prüfe dein Postfach.')
          return
        }
        throw new Error(data.error || 'Unbekannter Fehler')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-5 gap-10 items-start">

          {/* Left: Info */}
          <div className="lg:col-span-3 lg:sticky lg:top-28 space-y-8">

            <div>
              <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-200 mb-4">
                <BookOpen className="h-3.5 w-3.5" />
                Kostenlose Informationsbroschüre
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3">
                Deine Informationsbroschüre<br />
                <span className="text-teal-600">für den Start in Deutschland</span>
              </h1>
              <p className="text-gray-500 leading-relaxed">
                Alles, was du als Pflegefachkraft aus dem Ausland wissen musst – kompakt, verständlich und in deiner Sprache.
              </p>
            </div>

            {/* Language selector */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wähle deine Sprache</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      language === lang.code
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                  >
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span>{lang.nativeLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content points */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Das erwartet dich in der Broschüre</p>
              {BROCHURE_POINTS.map(({ Icon, color, bg, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm mb-0.5">{title}</p>
                    <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Deine Daten werden vertraulich behandelt und nicht weitergegeben.
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Fast geschafft!</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Wir haben dir eine Bestätigungs-E-Mail an <strong>{form.email}</strong> geschickt.
                  Klicke auf den Link in der E-Mail, um deine Broschüre zu öffnen.
                </p>
                <p className="text-xs text-gray-400">Keine E-Mail erhalten? Prüfe deinen Spam-Ordner.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1">Jetzt kostenlos anfordern</h2>
                <p className="text-xs text-gray-400 mb-5">
                  Du erhältst die Broschüre auf{' '}
                  <span className="font-semibold text-teal-600">
                    {LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.nativeLabel}
                  </span>{' '}
                  per E-Mail.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3.5">
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
                    <Label htmlFor="phone" className="text-xs text-gray-600 mb-1.5 block">Telefonnummer *</Label>
                    <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="+49 123 456789" />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs text-gray-600 mb-1.5 block">E-Mail-Adresse *</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="deine@email.de" />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      onClick={() => setAgreed(a => !a)}
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        agreed ? 'bg-teal-600 border-teal-600' : 'border-gray-300 group-hover:border-teal-400'
                      }`}
                    >
                      {agreed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Ich stimme der Verarbeitung meiner Daten gemäß der{' '}
                      <Link to="/datenschutzerklaerung" className="text-teal-600 underline" target="_blank">Datenschutzerklärung</Link> zu.
                    </span>
                  </label>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
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
