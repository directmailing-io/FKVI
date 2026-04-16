import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils'
import {
  Building2, Mail, Phone, Globe, MapPin, Plus, Trash2,
  Save, X, Search, Users, Loader2, ChevronDown, ChevronUp,
  Pencil, ShieldCheck,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Field helper ─────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-gray-500">{label}</Label>
    {children}
  </div>
)

const TYPE_CONFIG = {
  lead:     { label: 'Lead',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  customer: { label: 'Kunde',   color: 'bg-green-100 text-green-700 border-green-200' },
  inactive: { label: 'Inaktiv', color: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const STATUS_CONFIG = {
  pending:  { label: 'Ausstehend',     color: 'bg-yellow-50 text-yellow-700' },
  approved: { label: 'Freigeschaltet', color: 'bg-green-50 text-green-700' },
  rejected: { label: 'Abgelehnt',      color: 'bg-red-50 text-red-600' },
}

// ─── Contact card ─────────────────────────────────────────────────────────────
function ContactRow({ contact, idx, onChange, onRemove }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Ansprechpartner {idx + 1}</span>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={contact.name || ''}
          onChange={e => onChange({ ...contact, name: e.target.value })}
          placeholder="Name"
          className="h-8 text-sm"
        />
        <Input
          value={contact.role || ''}
          onChange={e => onChange({ ...contact, role: e.target.value })}
          placeholder="Funktion"
          className="h-8 text-sm"
        />
        <Input
          value={contact.email || ''}
          onChange={e => onChange({ ...contact, email: e.target.value })}
          placeholder="E-Mail"
          className="h-8 text-sm"
          type="email"
        />
        <Input
          value={contact.phone || ''}
          onChange={e => onChange({ ...contact, phone: e.target.value })}
          placeholder="Telefon"
          className="h-8 text-sm"
        />
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ company, onClose, onSaved }) {
  const [form, setForm] = useState({
    company_type: company.company_type || 'lead',
    website_url: company.website_url || '',
    address: company.address || '',
    city: company.city || '',
    postal_code: company.postal_code || '',
    crm_notes: company.crm_notes || '',
    internal_notes: company.internal_notes || '',
    additional_contacts: company.additional_contacts || [],
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const updateContact = (idx, data) => {
    const next = [...form.additional_contacts]
    next[idx] = data
    set('additional_contacts', next)
  }

  const removeContact = (idx) => {
    set('additional_contacts', form.additional_contacts.filter((_, i) => i !== idx))
  }

  const addContact = () => {
    set('additional_contacts', [...form.additional_contacts, { name: '', role: '', email: '', phone: '' }])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          company_type:         form.company_type,
          website_url:          form.website_url || null,
          address:              form.address || null,
          city:                 form.city || null,
          postal_code:          form.postal_code || null,
          crm_notes:            form.crm_notes || null,
          internal_notes:       form.internal_notes || null,
          additional_contacts:  form.additional_contacts,
        })
        .eq('id', company.id)

      if (error) {
        await supabase.from('companies').update({
          internal_notes: form.internal_notes || null,
        }).eq('id', company.id)
        toast({ title: 'Teilweise gespeichert', description: 'Einige Felder fehlen noch in der Datenbank.', variant: 'warning' })
      } else {
        toast({ title: 'Gespeichert', description: `${company.company_name} wurde aktualisiert.`, variant: 'success' })
      }
      onSaved({ ...company, ...form })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-96 shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 sticky top-8 overflow-y-auto max-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{company.company_name}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_CONFIG[form.company_type]?.color}`}>
                {TYPE_CONFIG[form.company_type]?.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[company.status]?.color}`}>
                {STATUS_CONFIG[company.status]?.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Type */}
          <Field label="Typ">
            <Select value={form.company_type} onValueChange={v => set('company_type', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="customer">Kunde</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Hauptkontakt (read-only from registration) */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-gray-500 mb-2">Hauptkontakt (aus Anfrage)</p>
            {[
              { icon: Users, value: `${company.first_name || ''} ${company.last_name || ''}`.trim() || '–' },
              { icon: Mail,  value: company.email },
              { icon: Phone, value: company.phone || '–' },
            ].map(({ icon: Icon, value }) => (
              <div key={value} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{value}</span>
              </div>
            ))}
          </div>

          {/* Website + Address */}
          <Field label="Website">
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={form.website_url}
                onChange={e => set('website_url', e.target.value)}
                placeholder="https://www.firma.de"
                className="pl-8 h-8 text-sm"
              />
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Field label="Straße / Adresse">
                <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Musterstr. 1" className="h-8 text-sm" />
              </Field>
            </div>
            <Field label="PLZ">
              <Input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="12345" className="h-8 text-sm" />
            </Field>
          </div>
          <Field label="Ort">
            <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Stadt" className="h-8 text-sm" />
          </Field>

          {/* Additional contacts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500">Weitere Ansprechpartner</Label>
              <button
                onClick={addContact}
                className="text-xs text-fkvi-blue hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />Hinzufügen
              </button>
            </div>
            {form.additional_contacts.map((c, idx) => (
              <ContactRow
                key={idx}
                contact={c}
                idx={idx}
                onChange={data => updateContact(idx, data)}
                onRemove={() => removeContact(idx)}
              />
            ))}
          </div>

          {/* CRM Notes */}
          <Field label="CRM-Notizen">
            <Textarea
              value={form.crm_notes}
              onChange={e => set('crm_notes', e.target.value)}
              placeholder="Gesprächsnotizen, nächste Schritte, Besonderheiten..."
              rows={4}
              className="text-sm"
            />
          </Field>

          {/* Internal Notes */}
          <Field label="Interne Bemerkungen">
            <Textarea
              value={form.internal_notes}
              onChange={e => set('internal_notes', e.target.value)}
              placeholder="Interne Notizen (nur für Admins)..."
              rows={2}
              className="text-sm"
            />
          </Field>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Speichern...</> : <><Save className="h-4 w-4 mr-2" />Speichern</>}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Erstellt: {formatDateTime(company.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
function ContextMenu({ x, y, company, onClose, onTypeChange, onApprove, onDelete, onEdit }) {
  const ref = useRef(null)

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Adjust so menu doesn't overflow viewport
  const style = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 240),
    zIndex: 9999,
  }

  const currentType = company.company_type || 'lead'

  const MenuItem = ({ icon: Icon, label, onClick, className = '' }) => (
    <button
      onClick={() => { onClick(); onClose() }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
      {label}
    </button>
  )

  const Separator = () => <div className="my-1 border-t border-gray-100" />

  return (
    <div ref={ref} style={style} className="bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[190px]">
      <MenuItem icon={Pencil} label="Bearbeiten" onClick={onEdit} />

      <Separator />

      {currentType !== 'lead' && (
        <MenuItem label="Als Lead markieren" onClick={() => onTypeChange('lead')}
          className="text-amber-700" />
      )}
      {currentType !== 'customer' && (
        <MenuItem label="Als Kunde markieren" onClick={() => onTypeChange('customer')}
          className="text-green-700" />
      )}
      {currentType !== 'inactive' && (
        <MenuItem label="Als Inaktiv markieren" onClick={() => onTypeChange('inactive')}
          className="text-gray-500" />
      )}

      {company.status === 'pending' && (
        <>
          <Separator />
          <MenuItem icon={ShieldCheck} label="Freischalten" onClick={onApprove}
            className="text-fkvi-blue" />
        </>
      )}

      <Separator />

      <MenuItem icon={Trash2} label="Löschen" onClick={onDelete}
        className="text-red-600 hover:bg-red-50" />
    </div>
  )
}

// ─── Main CRM Page ────────────────────────────────────────────────────────────
export default function CRMPage() {
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, company }

  useEffect(() => { fetchCompanies() }, [])

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
      setCompanies(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = (updated) => {
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-gray-500" />
      : <ChevronDown className="h-3 w-3 text-gray-500" />
  }

  const handleContextMenu = (e, company) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, company })
  }

  const handleTypeChange = async (type) => {
    const { company } = ctxMenu
    const { error } = await supabase.from('companies').update({ company_type: type }).eq('id', company.id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
      return
    }
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, company_type: type } : c))
    toast({ title: 'Typ geändert', description: `${company.company_name} ist jetzt als ${TYPE_CONFIG[type].label} markiert.`, variant: 'success' })
  }

  const handleApproveCtx = async () => {
    const { company } = ctxMenu
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ companyId: company.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.emailSent) {
        toast({ title: 'Freigeschaltet', description: `E-Mail an ${company.email} versandt.`, variant: 'success' })
      } else {
        toast({ title: 'Freigeschaltet – E-Mail fehlgeschlagen', description: data.emailError || '', variant: 'destructive' })
      }
      fetchCompanies()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteCtx = async () => {
    const { company } = ctxMenu
    if (!window.confirm(`"${company.company_name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return
    const res = await fetch('/api/admin/delete-company', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ companyId: company.id }),
    })
    if (res.ok) {
      setCompanies(prev => prev.filter(c => c.id !== company.id))
      toast({ title: 'Gelöscht', description: `${company.company_name} wurde entfernt.`, variant: 'success' })
    } else {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Fehler beim Löschen', description: data.error || 'Unbekannter Fehler', variant: 'destructive' })
    }
  }

  const filtered = companies
    .filter(c => {
      if (typeFilter !== 'all' && (c.company_type || 'lead') !== typeFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          c.company_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      let av = a[sortField] ?? ''
      let bv = b[sortField] ?? ''
      if (sortDir === 'asc') return av > bv ? 1 : -1
      return av < bv ? 1 : -1
    })

  const counts = {
    lead:     companies.filter(c => !c.company_type || c.company_type === 'lead').length,
    customer: companies.filter(c => c.company_type === 'customer').length,
    inactive: companies.filter(c => c.company_type === 'inactive').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM / Firmen</h1>
          <p className="text-gray-500 mt-1 text-sm">{companies.length} Unternehmen gesamt</p>
        </div>

        {/* Stats chips */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(counts).map(([type, count]) => (
            <div key={type} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${TYPE_CONFIG[type]?.color}`}>
              {TYPE_CONFIG[type]?.label}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suche nach Name, E-Mail, Ort..."
            className="pl-9 h-9"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'lead', 'customer', 'inactive'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                typeFilter === t
                  ? 'bg-fkvi-blue text-white border-fkvi-blue'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'Alle Typen' : TYPE_CONFIG[t]?.label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-fkvi-blue/30"
        >
          <option value="all">Alle Status</option>
          <option value="pending">Ausstehend</option>
          <option value="approved">Freigeschaltet</option>
          <option value="rejected">Abgelehnt</option>
        </select>
      </div>

      <div className="flex gap-6 items-start">
        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Keine Einträge gefunden</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      { label: 'Firma',          field: 'company_name' },
                      { label: 'Ansprechpartner', field: 'last_name' },
                      { label: 'Typ',             field: 'company_type' },
                      { label: 'Status',          field: 'status' },
                      { label: 'Ort',             field: 'city' },
                      { label: 'Datum',           field: 'created_at' },
                    ].map(col => (
                      <th
                        key={col.field}
                        onClick={() => toggleSort(col.field)}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          <SortIcon field={col.field} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(company => (
                    <tr
                      key={company.id}
                      onClick={() => navigate(`/admin/crm/${company.id}`)}
                      onContextMenu={(e) => handleContextMenu(e, company)}
                      className="border-b border-gray-50 cursor-pointer hover:bg-fkvi-blue/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[180px]">{company.company_name}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[180px]">{company.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {`${company.first_name || ''} ${company.last_name || ''}`.trim() || '–'}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const t = company.company_type || 'lead'
                          return (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_CONFIG[t]?.color}`}>
                              {TYPE_CONFIG[t]?.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[company.status]?.color}`}>
                          {STATUS_CONFIG[company.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {[company.city, company.postal_code].filter(Boolean).join(' ') || '–'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDateTime(company.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-2 px-1">{filtered.length} Einträge angezeigt</p>
        </div>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          company={ctxMenu.company}
          onClose={() => setCtxMenu(null)}
          onEdit={() => navigate(`/admin/crm/${ctxMenu.company.id}`)}
          onTypeChange={handleTypeChange}
          onApprove={handleApproveCtx}
          onDelete={handleDeleteCtx}
        />
      )}
    </div>
  )
}
