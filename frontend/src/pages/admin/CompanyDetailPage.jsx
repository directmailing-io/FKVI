import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, cn } from '@/lib/utils'
import { ArrowLeft, Globe, Mail, Phone, Plus, Trash2, X, Save, Loader2, Building2, MessageSquare, AlertTriangle, CheckCircle2, CalendarCheck, ExternalLink, Heart } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const COMPANY_TYPE_LABELS = {
  lead: 'Lead',
  customer: 'Kunde',
  inactive: 'Inaktiv',
}

const COMPANY_TYPE_COLORS = {
  lead: 'bg-blue-100 text-blue-700 border-blue-200',
  customer: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
}

const LEAD_STATUS_LABELS = {
  pending: 'Ausstehend',
  approved: 'Freigegeben',
  rejected: 'Abgelehnt',
  active: 'Aktiv',
}

const LEAD_STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  active: 'bg-teal-100 text-teal-700 border-teal-200',
}

export default function CompanyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, session } = useAuthStore()

  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  // Notes state
  const [notesList, setNotesList] = useState([])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [interestProfiles, setInterestProfiles] = useState({})

  // Additional contacts state
  const [contacts, setContacts] = useState([])
  const [savingContacts, setSavingContacts] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [id])

  useEffect(() => {
    const interestNotes = notesList.filter(n => n.type === 'interest_booking')
    const allIds = [...new Set(interestNotes.flatMap(n => n.profile_ids || []))]
    if (allIds.length === 0) return
    supabase
      .from('profiles')
      .select('id, gender, age, nationality, nursing_education')
      .in('id', allIds)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(p => { map[p.id] = p })
          setInterestProfiles(map)
        }
      })
  }, [notesList])

  const fetchCompany = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      setCompany(data)
      setNotesList(data.notes_list || [])
      setContacts(data.additional_contacts || [])
    }
    setLoading(false)
  }

  const updateField = async (field, value) => {
    setSaving(true)
    const { error } = await supabase
      .from('companies')
      .update({ [field]: value })
      .eq('id', id)
    if (error) {
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' })
    } else {
      setCompany(prev => ({ ...prev, [field]: value }))
    }
    setSaving(false)
  }

  const handleBlurSave = (field) => (e) => {
    const value = e.target.value
    if (company && company[field] !== value) {
      updateField(field, value)
    }
  }

  const handleTypeChange = (value) => {
    updateField('company_type', value)
  }

  const handleCrmNotesBlur = (e) => {
    const value = e.target.value
    if (company && company.crm_notes !== value) {
      updateField('crm_notes', value)
    }
  }

  // Notes list operations
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return
    setAddingNote(true)
    const newNote = {
      id: crypto.randomUUID(),
      content: newNoteContent.trim(),
      created_at: new Date().toISOString(),
      author: user?.email || 'Admin',
    }
    const updatedNotes = [newNote, ...notesList]
    const { error } = await supabase
      .from('companies')
      .update({ notes_list: updatedNotes })
      .eq('id', id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      setNotesList(updatedNotes)
      setNewNoteContent('')
      toast({ title: 'Notiz gespeichert' })
    }
    setAddingNote(false)
  }

  const handleDeleteNote = async (noteId) => {
    const updatedNotes = notesList.filter(n => n.id !== noteId)
    const { error } = await supabase
      .from('companies')
      .update({ notes_list: updatedNotes })
      .eq('id', id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      setNotesList(updatedNotes)
    }
  }

  // Additional contacts
  const handleSaveContacts = async () => {
    setSavingContacts(true)
    const { error } = await supabase
      .from('companies')
      .update({ additional_contacts: contacts })
      .eq('id', id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Kontakte gespeichert' })
    }
    setSavingContacts(false)
  }

  const addContact = () => {
    setContacts(prev => [...prev, { name: '', role: '', email: '', phone: '' }])
  }

  const updateContact = (idx, field, value) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  const removeContact = (idx) => {
    setContacts(prev => prev.filter((_, i) => i !== idx))
  }

  // Approve
  const handleApprove = async () => {
    setApproving(true)
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      toast({ title: 'Freigegeben', description: 'Das Unternehmen wurde freigeschaltet.' })
      fetchCompany()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setApproving(false)
    }
  }

  // Reject
  const handleReject = async () => {
    setRejecting(true)
    const { error } = await supabase
      .from('companies')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Abgelehnt' })
      fetchCompany()
    }
    setRejecting(false)
  }

  // Delete
  const handleDelete = async () => {
    try {
      const res = await fetch('/api/admin/delete-company', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ companyId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Löschen')
      toast({ title: 'Unternehmen gelöscht' })
      navigate('/admin/crm')
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-16">
        <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Unternehmen nicht gefunden</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/crm')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Zurück
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/crm')} className="shrink-0 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {company.company_name || 'Unbenanntes Unternehmen'}
            </h1>
            {company.company_type && (
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', COMPANY_TYPE_COLORS[company.company_type])}>
                {COMPANY_TYPE_LABELS[company.company_type] || company.company_type}
              </span>
            )}
            {company.status && (
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', LEAD_STATUS_COLORS[company.status])}>
                {LEAD_STATUS_LABELS[company.status] || company.status}
              </span>
            )}
            {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <p className="text-gray-500 text-sm mt-1">ID: {id}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {company.status === 'pending' && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Freischalten
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleReject}
                disabled={rejecting}
              >
                {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Ablehnen
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />Löschen
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Firmendaten */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />Firmendaten
            </h2>

            {/* Company type */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Typ</Label>
              <Select value={company.company_type || ''} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="customer">Kunde</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company name */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Firmenname</Label>
              <Input
                defaultValue={company.company_name || ''}
                onBlur={handleBlurSave('company_name')}
                placeholder="Firmenname"
              />
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  defaultValue={company.website_url || ''}
                  onBlur={handleBlurSave('website_url')}
                  placeholder="https://example.com"
                  className="pl-9"
                />
              </div>
            </div>

            {/* Address grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-sm text-gray-600">Adresse</Label>
                <Input
                  defaultValue={company.address || ''}
                  onBlur={handleBlurSave('address')}
                  placeholder="Straße und Hausnummer"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-600">PLZ</Label>
                <Input
                  defaultValue={company.postal_code || ''}
                  onBlur={handleBlurSave('postal_code')}
                  placeholder="12345"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm text-gray-600">Stadt</Label>
                <Input
                  defaultValue={company.city || ''}
                  onBlur={handleBlurSave('city')}
                  placeholder="Stadt"
                />
              </div>
            </div>
          </div>

          {/* Hauptkontakt */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-base">Hauptkontakt (aus Anfrage)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Vorname</p>
                <p className="text-gray-900">{company.first_name || <span className="text-gray-400">—</span>}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nachname</p>
                <p className="text-gray-900">{company.last_name || <span className="text-gray-400">—</span>}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">E-Mail</p>
                {company.email ? (
                  <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />{company.email}
                  </a>
                ) : (
                  <p className="text-gray-400">—</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Telefon</p>
                {company.phone ? (
                  <p className="text-gray-900 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />{company.phone}
                  </p>
                ) : (
                  <p className="text-gray-400">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Weitere Ansprechpartner */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-base">Weitere Ansprechpartner</h2>
              <Button variant="outline" size="sm" onClick={addContact}>
                <Plus className="h-3.5 w-3.5 mr-1" />Hinzufügen
              </Button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-sm text-gray-400">Keine weiteren Ansprechpartner erfasst.</p>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Kontakt {idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeContact(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Name</Label>
                        <Input
                          value={contact.name || ''}
                          onChange={e => updateContact(idx, 'name', e.target.value)}
                          placeholder="Vor- und Nachname"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Position / Rolle</Label>
                        <Input
                          value={contact.role || ''}
                          onChange={e => updateContact(idx, 'role', e.target.value)}
                          placeholder="z.B. Pflegedienstleitung"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">E-Mail</Label>
                        <Input
                          value={contact.email || ''}
                          onChange={e => updateContact(idx, 'email', e.target.value)}
                          placeholder="email@beispiel.de"
                          type="email"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Telefon</Label>
                        <Input
                          value={contact.phone || ''}
                          onChange={e => updateContact(idx, 'phone', e.target.value)}
                          placeholder="+49 ..."
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {contacts.length > 0 && (
              <div className="pt-2">
                <Button size="sm" onClick={handleSaveContacts} disabled={savingContacts}>
                  {savingContacts
                    ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Speichern...</>
                    : <><Save className="h-3.5 w-3.5 mr-2" />Kontakte speichern</>}
                </Button>
              </div>
            )}
          </div>

          {/* CRM-Notizen */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">CRM-Notizen</h2>
            <p className="text-xs text-gray-500">Freitext-Notizen zum Unternehmen — werden automatisch gespeichert.</p>
            <Textarea
              defaultValue={company.crm_notes || ''}
              onBlur={handleCrmNotesBlur}
              placeholder="Interne Notizen, Gesprächsnotizen, nächste Schritte..."
              rows={5}
            />
          </div>

          {/* Interesse — separate card, only shown when bookings exist */}
          {notesList.some(n => n.type === 'interest_booking') && (
            <div className="bg-white rounded-xl border border-orange-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-orange-500 fill-orange-100" />
                Interesse des Unternehmens
              </h2>
              <p className="text-xs text-gray-500">
                Profile, für die das Unternehmen Interesse bekundet und einen Termin gebucht hat.
              </p>
              <div className="space-y-4">
                {notesList.filter(n => n.type === 'interest_booking').map(note => (
                  <div key={note.id} className="border border-orange-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="text-sm font-semibold text-gray-800">
                          Terminbuchung — {note.profile_ids?.length || 0} {note.profile_ids?.length === 1 ? 'Profil' : 'Profile'} vorgemerkt
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatDateTime ? formatDateTime(note.created_at) : new Date(note.created_at).toLocaleString('de-DE')}
                        </span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eintrag löschen"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {(note.profile_ids || []).map((pid, idx) => {
                        const p = interestProfiles[pid]
                        return (
                          <a
                            key={pid}
                            href={`/admin/fachkraefte/${pid}?reserveFor=${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-lg transition-colors group/link"
                          >
                            <span className="text-xs font-bold text-orange-400 w-4 shrink-0">{idx + 1}</span>
                            <span className="text-sm font-medium text-gray-800 flex-1">
                              {p
                                ? `${p.gender || 'Fachkraft'}${p.age ? `, ${p.age} J.` : ''}${p.nationality ? ` · ${p.nationality}` : ''}${p.nursing_education ? ` · ${p.nursing_education}` : ''}`
                                : `Profil-ID: ${pid.slice(0, 12)}…`}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 text-orange-300 opacity-0 group-hover/link:opacity-100 shrink-0" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />Notizen & Verlauf
            </h2>

            {/* Add note */}
            <div className="space-y-2">
              <Textarea
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Neue Notiz eingeben..."
                rows={3}
                className="resize-none"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={handleAddNote}
                disabled={addingNote || !newNoteContent.trim()}
              >
                {addingNote
                  ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Speichern...</>
                  : <><Plus className="h-3.5 w-3.5 mr-2" />Notiz hinzufügen</>}
              </Button>
            </div>

            {/* Notes list — interest_booking entries are shown in the dedicated card above */}
            <div className="space-y-3 mt-2">
              {notesList.filter(n => n.type !== 'interest_booking').length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Noch keine Notizen vorhanden.</p>
                </div>
              ) : (
                notesList.filter(n => n.type !== 'interest_booking').map(note => note.type === 'interest_booking' ? (
                  <div key={note.id} className="relative pl-4 border-l-2 border-teal-400 group bg-teal-50/40 rounded-r-lg pr-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="text-xs font-semibold text-teal-700">Terminbuchung Matching</span>
                          <span className="text-xs text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full border border-teal-200">
                            {note.profile_ids?.length || 0} {note.profile_ids?.length === 1 ? 'Profil' : 'Profile'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {(note.profile_ids || []).map(pid => {
                            const p = interestProfiles[pid]
                            return (
                              <a
                                key={pid}
                                href={`/lebenslauf/${pid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-2 py-1.5 bg-white rounded-lg border border-teal-100 text-xs hover:border-teal-300 hover:bg-teal-50 transition-colors group/link"
                              >
                                <span className="font-medium text-gray-800 flex-1">
                                  {p
                                    ? `${p.gender || 'Fachkraft'}${p.age ? `, ${p.age} J.` : ''}${p.nationality ? ` · ${p.nationality}` : ''}${p.nursing_education ? ` · ${p.nursing_education}` : ''}`
                                    : `Profil ${pid.slice(0, 8)}…`}
                                </span>
                                <ExternalLink className="h-3 w-3 text-teal-400 opacity-0 group-hover/link:opacity-100 shrink-0" />
                              </a>
                            )
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Notiz löschen"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>{note.author}</span>
                      <span>·</span>
                      <span>{formatDateTime ? formatDateTime(note.created_at) : new Date(note.created_at).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    key={note.id}
                    className="relative pl-4 border-l-2 border-blue-200 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1 leading-relaxed">
                        {note.content}
                      </p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Notiz löschen"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                      <span>{note.author}</span>
                      <span>·</span>
                      <span>{formatDateTime ? formatDateTime(note.created_at) : new Date(note.created_at).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SQL migration hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
        <p className="text-xs font-medium text-amber-800">Einmalig in Supabase SQL-Editor ausführen (falls Spalten fehlen):</p>
        <code className="text-xs text-amber-700 font-mono block">ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'lead';</code>
        <code className="text-xs text-amber-700 font-mono block">ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS notes_list JSONB DEFAULT '[]'::jsonb;</code>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog} onOpenChange={open => !open && setDeleteDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />Unternehmen löschen?
            </DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Unternehmen und alle zugehörigen Daten werden dauerhaft gelöscht.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
