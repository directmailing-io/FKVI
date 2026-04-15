import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({
    company_name: '', first_name: '', last_name: '', phone: '', email: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: sbErr } = await supabase
        .from('companies')
        .insert({
          company_name: form.company_name,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
        })
        .select()
        .single()

      if (sbErr) {
        if (sbErr.code === '23505') {
          throw new Error('Eine Anfrage mit dieser E-Mail-Adresse existiert bereits.')
        }
        if (sbErr.code === '42501') {
          throw new Error('Registrierung momentan nicht möglich. Bitte kontaktieren Sie uns direkt.')
        }
        throw new Error(sbErr.message)
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Anfrage eingegangen</h1>
          <p className="text-gray-500">
            Vielen Dank für Ihre Anfrage. Wir prüfen Ihre Angaben und melden uns zeitnah bei Ihnen.
          </p>
          <Link to="/">
            <Button variant="outline">Zurück zur Website</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-3.5 w-3.5" />Zurück
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Zugang anfragen</h1>
          <p className="text-gray-500 mt-2">
            Füllen Sie das Formular aus. Wir prüfen Ihre Anfrage und schalten Sie nach Freigabe für die Matching-Plattform frei.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="company_name">Firmenname <span className="text-red-500">*</span></Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={e => set('company_name', e.target.value)}
                placeholder="Muster GmbH"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">Vorname</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  placeholder="Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nachname</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  placeholder="Mustermann"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="max@mustermann.de"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+49 123 4567890"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Anfrage wird gesendet...</>
                : 'Zugang anfragen'
              }
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Bereits freigeschaltet?{' '}
          <Link to="/matching/login" className="text-fkvi-blue hover:underline">Hier anmelden</Link>
        </p>
      </div>
    </div>
  )
}
