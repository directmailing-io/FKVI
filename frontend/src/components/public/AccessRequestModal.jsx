import { useState } from 'react'
import { X, Loader2, ShieldCheck, Building2, MapPin, CheckCircle2 } from 'lucide-react'

export default function AccessRequestModal({ open, onClose }) {
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

              {/* Company */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  Einrichtung / Unternehmen <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Muster Klinikum GmbH"
                  required
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
