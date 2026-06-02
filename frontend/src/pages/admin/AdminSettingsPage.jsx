import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Loader2, Save, Building2, CheckCircle2 } from 'lucide-react'

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
    </div>
  )
}

export default function AdminSettingsPage() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tableError, setTableError] = useState(false)

  const [form, setForm] = useState({
    company_name: '',
    contact_first_name: '',
    contact_last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    website: '',
  })

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (!session?.access_token) return
    fetch('/api/admin/fkvi-settings', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setTableError(true); return }
        const s = d.settings || {}
        setForm({
          company_name:        s.company_name        || '',
          contact_first_name:  s.contact_first_name  || '',
          contact_last_name:   s.contact_last_name   || '',
          email:               s.email               || '',
          phone:               s.phone               || '',
          address:             s.address             || '',
          city:                s.city                || '',
          postal_code:         s.postal_code         || '',
          website:             s.website             || '',
        })
      })
      .catch(() => setTableError(true))
      .finally(() => setLoading(false))
  }, [session?.access_token])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/fkvi-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern')
      setSaved(true)
      toast({ title: 'Gespeichert', description: 'FKVI-Stammdaten wurden aktualisiert.', variant: 'success' })
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
    </div>
  )

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 mt-1">Stammdaten von FKVI – werden automatisch in Antragsformulare eingetragen</p>
      </div>

      {tableError && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Datenbanktabelle fehlt</p>
          <p className="text-xs text-amber-700">
            Bitte führe folgendes SQL im Supabase SQL-Editor aus, damit Einstellungen gespeichert werden können:
          </p>
          <pre className="text-xs bg-white border border-amber-200 rounded-lg p-3 overflow-x-auto text-gray-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_direct_access" ON admin_settings AS RESTRICTIVE USING (false);
INSERT INTO admin_settings (key, value) VALUES ('fkvi_company', '{}') ON CONFLICT (key) DO NOTHING;`}
          </pre>
        </div>
      )}

      {/* FKVI Firmendaten */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-2 pb-1">
          <Building2 className="h-5 w-5 text-fkvi-blue" />
          <h2 className="font-semibold text-gray-900">FKVI Firmendaten</h2>
        </div>

        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 leading-relaxed">
          Diese Daten werden beim Versenden von Antragsformularen automatisch in alle Felder mit dem Präfix <code className="font-mono bg-blue-100 px-1 rounded">vermittler.*</code> eingetragen — z.B. für die Untervollmacht §81a, wo FKVI als Unterbevollmächtigter auftritt.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <Field label="Firmenname">
            <Input
              value={form.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Fachkraft Vermittlung International GmbH & Co. KG"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Vorname Ansprechperson">
            <Input
              value={form.contact_first_name}
              onChange={e => set('contact_first_name', e.target.value)}
              placeholder="Daniel"
            />
          </Field>
          <Field label="Nachname Ansprechperson">
            <Input
              value={form.contact_last_name}
              onChange={e => set('contact_last_name', e.target.value)}
              placeholder="Kurzeja"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="E-Mail">
            <Input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="info@fkvi.de"
            />
          </Field>
          <Field label="Telefon">
            <Input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+49 123 456789"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Field label="Straße + Hausnummer">
            <Input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Musterstraße 1"
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="PLZ">
            <Input
              value={form.postal_code}
              onChange={e => set('postal_code', e.target.value)}
              placeholder="12345"
            />
          </Field>
          <div className="col-span-2">
            <Field label="Stadt">
              <Input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Berlin"
              />
            </Field>
          </div>
        </div>

        <Field label="Website (optional)">
          <Input
            value={form.website}
            onChange={e => set('website', e.target.value)}
            placeholder="https://fkvi.de"
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || tableError}
          className="bg-fkvi-blue hover:bg-fkvi-blue/90 px-6"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Speichern…</>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4 mr-2" />Gespeichert</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Stammdaten speichern</>
          )}
        </Button>
      </div>
    </div>
  )
}
