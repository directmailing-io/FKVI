import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, CheckCircle2, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/matching/konto-einrichten`,
    })
    setLoading(false)
    setSent(true) // always show success (security best practice)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <Link to="/matching/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Zurück zum Login
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-fkvi-blue text-white font-bold text-xl mb-4 shadow-md">
            FK
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Passwort zurücksetzen</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Wir senden Ihnen einen sicheren Link zum Zurücksetzen.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="font-semibold text-gray-900">E-Mail gesendet</h2>
              <p className="text-sm text-gray-500">
                Falls ein Konto mit <strong>{email}</strong> existiert, erhalten Sie in Kürze eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.
              </p>
              <p className="text-xs text-gray-400 pt-2">
                Kein Link erhalten?{' '}
                <button onClick={() => setSent(false)} className="text-fkvi-blue hover:underline">
                  Erneut senden
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ihre@email.de"
                    className="pl-9"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird gesendet…</>
                  : 'Link zusenden'
                }
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
