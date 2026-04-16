import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

function PasswordStrength({ password }) {
  const checks = [
    { label: 'Mindestens 8 Zeichen',       ok: password.length >= 8 },
    { label: 'Großbuchstabe (A–Z)',          ok: /[A-Z]/.test(password) },
    { label: 'Zahl oder Sonderzeichen',      ok: /[0-9!@#$%^&*()_+\-=]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const bar   = ['bg-red-400', 'bg-amber-400', 'bg-green-500'][score - 1] || 'bg-gray-200'
  const label = ['', 'Schwach', 'Mittel', 'Stark'][score]

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < score ? bar : 'bg-gray-200'}`} />
        ))}
      </div>
      {password.length > 0 && (
        <div className="space-y-1">
          {checks.map(c => (
            <p key={c.label} className={`text-xs flex items-center gap-1.5 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`inline-block w-3.5 h-3.5 rounded-full flex-shrink-0 ${c.ok ? 'bg-green-500' : 'bg-gray-200'}`} />
              {c.label}
            </p>
          ))}
          {label && <p className={`text-xs font-medium ${score === 3 ? 'text-green-600' : score === 2 ? 'text-amber-600' : 'text-red-500'}`}>Passwortstärke: {label}</p>}
        </div>
      )}
    </div>
  )
}

export default function SetupPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const [ready, setReady]       = useState(false) // session is available

  useEffect(() => {
    // Supabase automatically exchanges the hash token on load.
    // We wait for a PASSWORD_RECOVERY session event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setEmail(session?.user?.email || '')
        setReady(true)
        window.history.replaceState(null, '', window.location.pathname)
      }
    })

    // Also check if there's already an active session from the hash (fast browsers)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || '')
        setReady(true)
        window.history.replaceState(null, '', window.location.pathname)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const isStrong = () => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9!@#$%^&*()_+\-=]/.test(password)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return }
    if (!isStrong()) { setError('Bitte wähle ein stärkeres Passwort.'); return }

    setLoading(true)
    try {
      // Verify session is still valid before updating
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        setError('Ihre Sitzung ist abgelaufen. Bitte fordern Sie einen neuen Link an.')
        return
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) { setError(updateErr.message); return }
      setDone(true)
      setTimeout(() => navigate('/matching'), 2000)
    } catch (err) {
      setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Konto eingerichtet!</h1>
          <p className="text-gray-500">Ihr Passwort wurde gespeichert. Sie werden weitergeleitet…</p>
        </div>
      </div>
    )
  }

  // ── No valid session (link expired / direct access) ──────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Link wird überprüft…</h1>
          <p className="text-gray-500 text-sm">
            Falls die Seite leer bleibt, ist der Link möglicherweise abgelaufen.{' '}
            <a href="/matching/passwort-vergessen" className="text-fkvi-blue underline">Neuen Link anfordern</a>
          </p>
        </div>
      </div>
    )
  }

  // ── Setup form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-fkvi-blue text-white font-bold text-xl mb-4 shadow-md">
            FK
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Konto einrichten</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Legen Sie jetzt Ihr persönliches Passwort fest.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email – read-only */}
          <div className="space-y-1.5">
            <Label>E-Mail-Adresse</Label>
            <Input value={email} disabled className="bg-gray-50 text-gray-500 cursor-not-allowed" />
            <p className="text-xs text-gray-400">Ihre E-Mail-Adresse kann nicht geändert werden.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="pw">Passwort wählen</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  autoFocus
                  className="pr-10"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <Label htmlFor="cf">Passwort bestätigen</Label>
              <div className="relative">
                <Input
                  id="cf"
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                  className="pr-10"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowCf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-red-500">Passwörter stimmen nicht überein.</p>
              )}
              {confirm.length > 0 && password === confirm && (
                <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Passwörter stimmen überein.</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading || !isStrong() || password !== confirm}>
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird gespeichert…</>
                : <><ShieldCheck className="mr-2 h-4 w-4" />Passwort speichern & einloggen</>
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
