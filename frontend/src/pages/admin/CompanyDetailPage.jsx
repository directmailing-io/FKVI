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
import { formatDateTime, cn, PROCESS_STATUS_LABELS } from '@/lib/utils'
import { ArrowLeft, Globe, Mail, Phone, Plus, Trash2, X, Save, Loader2, Building2, MessageSquare, AlertTriangle, CheckCircle2, CalendarCheck, ExternalLink, Heart, Activity, User, Eye, Send, FileText, Download, Link2, Check, Package, Upload, Pencil } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import DocSendDialog from '@/components/DocSendDialog'
import AddDocumentModal from '@/components/AddDocumentModal'
import UnifiedSendDialog from '@/components/UnifiedSendDialog'

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
  const [activeTab, setActiveTab] = useState('stammdaten')
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  // Notes state
  const [notesList, setNotesList] = useState([])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [interestProfiles, setInterestProfiles] = useState({})
  const [reservations, setReservations] = useState([])

  // Additional contacts state
  const [contacts, setContacts] = useState([])
  const [savingContacts, setSavingContacts] = useState(false)

  // Dokumente state
  const [docSends, setDocSends] = useState([])
  const [docSendsLoading, setDocSendsLoading] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [sendDocInitial, setSendDocInitial] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [companyDocuments, setCompanyDocuments] = useState([])
  const [companyDocSaving, setCompanyDocSaving] = useState(false)
  const [deletingStoredDocIdx, setDeletingStoredDocIdx] = useState(null)
  const [selectedDocIndices, setSelectedDocIndices] = useState(new Set())
  const [showUnifiedSend, setShowUnifiedSend] = useState(false)
  const [deletingSendId, setDeletingSendId] = useState(null)
  const [deletingSendBusy, setDeletingSendBusy] = useState(false)
  const [downloadingSendId, setDownloadingSendId] = useState(null)
  const [deletingBundleId, setDeletingBundleId] = useState(null)
  const [deletingBundleBusy, setDeletingBundleBusy] = useState(false)
  const [copiedBundleId, setCopiedBundleId] = useState(null)

  useEffect(() => {
    fetchCompany()
  }, [id])

  useEffect(() => {
    if (id && session?.access_token) loadDocSends()
  }, [id, session?.access_token])

  useEffect(() => {
    const interestNotes = notesList.filter(n => n.type === 'interest_booking')
    const allIds = [...new Set(interestNotes.flatMap(n => n.profile_ids || []))]
    if (allIds.length === 0) return
    supabase
      .from('profiles')
      .select('id, first_name, last_name, gender, age, nationality, nursing_education, status')
      .in('id', allIds)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(p => { map[p.id] = p })
          setInterestProfiles(map)
        }
      })
  }, [notesList])

  const loadDocSends = async () => {
    if (!session?.access_token) return
    setDocSendsLoading(true)
    try {
      const res = await fetch(`/api/admin/dokumente/sends-list?companyId=${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setDocSends(data.sends || [])
    } catch {
      // ignore
    } finally {
      setDocSendsLoading(false)
    }
  }

  const handleDeleteSend = async (sendId) => {
    setDeletingSendBusy(true)
    try {
      const res = await fetch('/api/admin/dokumente/delete-send', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ sendId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Fehler')
      setDocSends(prev => prev.filter(s => s.id !== sendId))
      toast({ title: 'Signierlink gelöscht', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler beim Löschen', description: err.message, variant: 'destructive' })
    } finally {
      setDeletingSendBusy(false)
      setDeletingSendId(null)
    }
  }

  const handleDeleteBundle = async (bundleId) => {
    setDeletingBundleBusy(true)
    try {
      const res = await fetch('/api/admin/dokumente/bundle-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ bundleId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Fehler')
      setDocSends(prev => prev.filter(s => s.bundle_id !== bundleId))
      toast({ title: 'Paket gelöscht', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler beim Löschen', description: err.message, variant: 'destructive' })
    } finally {
      setDeletingBundleBusy(false)
      setDeletingBundleId(null)
    }
  }

  const copyBundleUrl = (bundleId, url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedBundleId(bundleId)
      setTimeout(() => setCopiedBundleId(null), 2000)
    })
  }

  const handleDownloadSend = async (sendId) => {
    setDownloadingSendId(sendId)
    try {
      const res = await fetch(`/api/admin/dokumente/sends-detail?sendId=${sendId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (data.signedPdfUrl) {
        window.open(data.signedPdfUrl, '_blank')
      } else {
        toast({ title: 'Dokument nicht verfügbar', description: 'Das Dokument wurde noch nicht unterzeichnet.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler beim Laden', variant: 'destructive' })
    } finally {
      setDownloadingSendId(null)
    }
  }

  const fetchCompany = async () => {
    setLoading(true)
    const [{ data, error }, { data: resData }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase
        .from('reservations')
        .select(`id, process_status, created_at, profiles (id, first_name, last_name, gender, age, nationality, nursing_education, profile_image_url)`)
        .eq('company_id', id)
        .order('created_at', { ascending: false }),
    ])
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      setCompany(data)
      setNotesList(data.notes_list || [])
      setContacts(data.additional_contacts || [])
      setCompanyDocuments(data.company_documents || [])
    }
    setReservations(resData || [])
    setLoading(false)
  }

  const saveCompanyDocuments = async (docs) => {
    setCompanyDocSaving(true)
    try {
      await fetch('/api/admin/company-docs/save-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ companyId: id, documents: docs }),
      })
    } catch {
      // silent
    } finally {
      setCompanyDocSaving(false)
    }
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

  // Reserve a profile for this company directly from the interest card
  const handleReserveProfile = async (profileId) => {
    try {
      const res = await fetch('/api/admin/create-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profileId, companyId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Reserviert', description: 'Fachkraft wurde erfolgreich reserviert.' })
      setInterestProfiles(prev => ({ ...prev, [profileId]: { ...prev[profileId], status: 'reserved' } }))
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  // Remove a single profile from an interest_booking note
  const handleRemoveFromInterest = async (noteId, profileId) => {
    const note = notesList.find(n => n.id === noteId)
    if (!note) return
    const remainingIds = (note.profile_ids || []).filter(pid => pid !== profileId)
    let updatedNotes
    if (remainingIds.length === 0) {
      updatedNotes = notesList.filter(n => n.id !== noteId)
    } else {
      updatedNotes = notesList.map(n => n.id === noteId ? { ...n, profile_ids: remainingIds } : n)
    }
    const { error } = await supabase.from('companies').update({ notes_list: updatedNotes }).eq('id', id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      setNotesList(updatedNotes)
    }
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

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'stammdaten', label: 'Stammdaten' },
          { id: 'notizen', label: 'Notizen' },
          { id: 'dokumente', label: `Dokumente${(docSends.length + companyDocuments.length) > 0 ? ` (${docSends.length + companyDocuments.length})` : ''}` },
          { id: 'vermittlungen', label: `Vermittlungen${reservations.length > 0 ? ` (${reservations.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id
                ? 'border-[#1a3a5c] text-[#1a3a5c]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Stammdaten */}
      {activeTab === 'stammdaten' && (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">

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
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">

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
        </div>
      </div>
      )}

      {/* Tab: Notizen */}
      {activeTab === 'notizen' && (
      <div className="space-y-6">

          {/* Notizen & Verlauf */}
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
      )}

      {/* Tab: Dokumente */}
      {activeTab === 'dokumente' && (
      <div className="space-y-4">

        {/* Delete stored doc confirmation */}
        {deletingStoredDocIdx !== null && (
          <Dialog open onOpenChange={open => !open && setDeletingStoredDocIdx(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />Dokument löschen?
                </DialogTitle>
                <DialogDescription>
                  <strong>„{companyDocuments[deletingStoredDocIdx]?.title || 'Dieses Dokument'}"</strong> wird unwiderruflich entfernt.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeletingStoredDocIdx(null)}>Abbrechen</Button>
                <Button variant="destructive" onClick={async () => {
                  const updated = companyDocuments.filter((_, i) => i !== deletingStoredDocIdx)
                  setCompanyDocuments(updated)
                  setDeletingStoredDocIdx(null)
                  await saveCompanyDocuments(updated)
                }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Löschen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Unified documents card */}
        {(() => {
          const individualSends = docSends.filter(s => !s.bundle_id)
          const bundleMap = {}
          docSends.filter(s => s.bundle_id).forEach(s => {
            if (!bundleMap[s.bundle_id]) bundleMap[s.bundle_id] = {
              id: s.bundle_id, token: s.bundle_token, title: s.bundle_title,
              url: s.bundle_url, signer_name: s.signer_name, created_at: s.created_at, sends: [],
            }
            bundleMap[s.bundle_id].sends.push(s)
          })
          const bundles = Object.values(bundleMap)
          const totalSends = bundles.length + individualSends.length
          const totalCount = companyDocuments.length + totalSends

          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Dokumente
                  {totalCount > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{totalCount}</span>
                  )}
                  {(companyDocSaving || docSendsLoading) && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                </h2>
                <div className="flex items-center gap-2">
                  {selectedDocIndices.size > 0 && (
                    <>
                      <span className="text-xs text-[#1a3a5c] font-medium">{selectedDocIndices.size} ausgewählt</span>
                      <Button size="sm" variant="outline" className="text-gray-500" onClick={() => setSelectedDocIndices(new Set())}>
                        <X className="h-3 w-3 mr-1" />Auswahl
                      </Button>
                      <Button size="sm" className="bg-[#0d9488] hover:bg-[#0d9488]/90 text-white" onClick={() => setShowUnifiedSend(true)}>
                        <Send className="h-3.5 w-3.5 mr-1.5" />Versenden ({selectedDocIndices.size})
                      </Button>
                    </>
                  )}
                  <Button size="sm" className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white" onClick={() => setShowAddModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Hinzufügen
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {/* Stored docs (links/uploads) — selectable */}
                {companyDocuments.map((doc, idx) => {
                  const isSelected = selectedDocIndices.has(idx)
                  const toggleSelect = () => setSelectedDocIndices(prev => {
                    const next = new Set(prev)
                    isSelected ? next.delete(idx) : next.add(idx)
                    return next
                  })
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/50'}`}
                      onClick={toggleSelect}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#1a3a5c] border-[#1a3a5c]' : 'border-gray-300 group-hover:border-[#1a3a5c]/40'}`}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        {doc.doc_type === 'upload' ? <Upload className="h-4 w-4 text-blue-500" /> : <Link2 className="h-4 w-4 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{doc.title || <span className="text-gray-400 italic">Kein Titel</span>}</p>
                        <p className="text-xs text-gray-400 truncate">{doc.description || (doc.doc_type === 'upload' ? 'Hochgeladen' : 'Externer Link')}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {doc.link && (
                          <a href={doc.link} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a3a5c] hover:bg-blue-50 transition-colors" title="Öffnen">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => setDeletingStoredDocIdx(idx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Löschen">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Versandhistorie header */}
                {(bundles.length > 0 || individualSends.length > 0) && (
                  <div className="px-4 py-2 bg-gray-50/70 border-t border-gray-100">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Versandhistorie</p>
                  </div>
                )}

                {/* Bundle rows */}
                {bundles.map(bundle => {
                  const signedCount = bundle.sends.filter(s => s.status === 'submitted' || s.status === 'signed').length
                  const allSigned = signedCount === bundle.sends.length
                  const anySigned = signedCount > 0
                  return (
                    <div key={bundle.id} className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50/40 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="h-4 w-4 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{bundle.title || `Paket · ${bundle.sends.length} Dokumente`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(bundle.created_at).toLocaleDateString('de-DE')}
                          {bundle.signer_name ? ` · ${bundle.signer_name}` : ''}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {bundle.sends.map(s => {
                            const isSigned = s.status === 'submitted' || s.status === 'signed'
                            return (
                              <span key={s.id} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${isSigned ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                {isSigned && <Check className="h-2.5 w-2.5" />}{s.template_name || '–'}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${allSigned ? 'bg-green-50 text-green-700 border-green-200' : anySigned ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {signedCount}/{bundle.sends.length} ✓
                        </span>
                        {bundle.url && (
                          <button onClick={() => copyBundleUrl(bundle.id, bundle.url)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a3a5c] hover:bg-blue-50 transition-colors inline-flex" title="Link kopieren">
                            {copiedBundleId === bundle.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Link2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {bundle.sends.filter(s => s.status === 'submitted' || s.status === 'signed').map(s => (
                          <button key={s.id} onClick={() => handleDownloadSend(s.id)} disabled={downloadingSendId === s.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a3a5c] hover:bg-blue-50 transition-colors inline-flex" title={s.template_name}>
                            {downloadingSendId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                        <button onClick={() => setDeletingBundleId(bundle.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors inline-flex" title="Löschen">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Individual send rows */}
                {individualSends.map(send => {
                  const isSigned = send.status === 'submitted' || send.status === 'signed'
                  const isRevoked = send.status === 'revoked'
                  return (
                    <div key={send.id} className={`flex items-center gap-3 px-6 py-3 transition-colors ${isSigned ? 'bg-green-50/30' : 'hover:bg-gray-50/50'}`}>
                      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                        <Send className="h-4 w-4 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{send.template_name || '–'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(send.created_at).toLocaleDateString('de-DE')}
                          {send.signer_name ? ` · ${send.signer_name}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${isSigned ? 'bg-green-100 text-green-700' : isRevoked ? 'bg-red-50 text-red-600' : send.status === 'opened' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {isSigned ? (send.send_mode === 'view' ? 'Gelesen' : 'Unterzeichnet') : isRevoked ? 'Widerrufen' : send.status === 'opened' ? 'Geöffnet' : 'Ausstehend'}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isSigned && send.send_mode !== 'view' && (
                          <button onClick={() => handleDownloadSend(send.id)} disabled={downloadingSendId === send.id}
                            className="p-1.5 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-100 transition-colors inline-flex" title="PDF herunterladen">
                            {downloadingSendId === send.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {!isSigned && send.signer_url && (
                          <a href={send.signer_url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a3a5c] hover:bg-blue-50 transition-colors inline-flex" title="Link öffnen">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => setDeletingSendId(send.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors inline-flex" title="Löschen">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Empty state */}
                {totalCount === 0 && !docSendsLoading && (
                  <div className="text-center py-10 px-6 text-gray-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm font-medium text-gray-500">Noch keine Dokumente</p>
                    <p className="text-xs mt-1">Klicke auf „Dokument hinzufügen" um loszulegen.</p>
                  </div>
                )}
              </div>

              {/* Send hint */}
              {companyDocuments.length === 0 && selectedDocIndices.size === 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-400">Dokumente auswählen und dann „Versenden" klicken, oder über „Hinzufügen" neue hinzufügen.</p>
                </div>
              )}

              {docSends.some(s => s.status === 'submitted' || s.status === 'signed') && (
                <div className="px-4 py-3 border-t border-gray-100 bg-green-50/50 flex items-center gap-2 text-xs text-green-700">
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  Unterzeichnete Dokumente sind auch im <strong className="mx-1">Postfach</strong> verfügbar.
                </div>
              )}
            </div>
          )
        })()}

        {/* UnifiedSendDialog */}
        {showUnifiedSend && selectedDocIndices.size > 0 && (
          <UnifiedSendDialog
            docs={[...selectedDocIndices].map(i => companyDocuments[i]).filter(Boolean)}
            company={company}
            entityType="company"
            entityId={id}
            session={session}
            onClose={() => { setShowUnifiedSend(false); setSelectedDocIndices(new Set()) }}
            onSent={loadDocSends}
          />
        )}

        {/* AddDocumentModal */}
        {showAddModal && (
          <AddDocumentModal
            profileId={id}
            session={session}
            entityType="company"
            activeVermittlungen={reservations
              .filter(r => r.profiles?.id)
              .map(r => ({
                profileId: r.profiles.id,
                profileName: `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim(),
              }))}
            onAddDoc={async (doc) => {
              const updated = [...companyDocuments, doc]
              setCompanyDocuments(updated)
              await saveCompanyDocuments(updated)
            }}
            onSendTemplate={() => { setSendDocInitial({ fixedSource: 'template' }); setShowSendDialog(true) }}
            onClose={() => setShowAddModal(false)}
          />
        )}

        {/* DocSendDialog */}
        {showSendDialog && (
          <DocSendDialog
            entityType="company"
            entityId={id}
            company={company}
            activeVermittlungen={reservations.map(r => ({
              companyId: id,
              companyName: company?.company_name || '',
              companyEmail: company?.email || '',
              profileId: r.profiles?.id,
              profileName: r.profiles ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim() : '',
              profileEmail: '',
            }))}
            session={session}
            fixedSource={sendDocInitial?.fixedSource || null}
            onClose={() => { setShowSendDialog(false); setSendDocInitial(null) }}
            onSent={loadDocSends}
          />
        )}

      </div>
      )}

      {/* Tab: Vermittlungen */}
      {activeTab === 'vermittlungen' && (
      <div className="space-y-6">

          {/* Aktive Vermittlungen */}
          {reservations.length > 0 && (
            <div className="bg-white rounded-xl border border-blue-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Aktive Vermittlungen
                <span className="ml-auto text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                  {reservations.length}
                </span>
              </h2>
              <div className="space-y-2">
                {reservations.map(res => {
                  const p = res.profiles
                  const step = res.process_status
                  const pct = Math.round((step / 11) * 100)
                  const isDone = step === 11
                  return (
                    <a
                      key={res.id}
                      href={`/admin/vermittlungen/${res.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg hover:border-blue-300 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p?.profile_image_url
                          ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                          : <User className="h-4 w-4 text-blue-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.gender || '—' : '—'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 bg-blue-200/50 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            Schritt {step}/11
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{PROCESS_STATUS_LABELS[step]}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Interesse — separate card. Profiles already in active Vermittlung are hidden here. */}
          {(() => {
            // Build set of profile IDs that are currently in an active Vermittlung with this company
            const activelyReservedIds = new Set(reservations.map(r => r.profiles?.id).filter(Boolean))
            // Filter notes to only those that still have profiles not in Vermittlung
            const interestNotes = notesList.filter(n => n.type === 'interest_booking').map(note => ({
              ...note,
              visibleIds: (note.profile_ids || []).filter(pid => !activelyReservedIds.has(pid)),
            })).filter(note => note.visibleIds.length > 0)

            if (interestNotes.length === 0) return null
            return (
              <div className="bg-white rounded-xl border border-orange-200 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-orange-500 fill-orange-100" />
                  Interesse des Unternehmens
                </h2>
                <p className="text-xs text-gray-500">
                  Profile, für die das Unternehmen Interesse bekundet hat. Profile in aktiver Vermittlung werden hier ausgeblendet.
                </p>
                <div className="space-y-4">
                  {interestNotes.map(note => (
                    <div key={note.id} className="border border-orange-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="h-4 w-4 text-orange-500 shrink-0" />
                          <span className="text-sm font-semibold text-gray-800">
                            Terminbuchung — {note.visibleIds.length} {note.visibleIds.length === 1 ? 'Profil' : 'Profile'} vorgemerkt
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
                        {note.visibleIds.map((pid, idx) => {
                          const p = interestProfiles[pid]
                          const fullName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : ''
                          return (
                            <div key={pid} className="flex items-center gap-3 px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-lg group/row hover:border-orange-200 transition-colors">
                              <span className="text-xs font-bold text-orange-400 w-4 shrink-0">{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {fullName || (p ? `${p.gender || 'Fachkraft'}` : `Profil ${pid.slice(0, 8)}…`)}
                                </p>
                                {p && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {[p.gender, p.age ? `${p.age} J.` : null, p.nationality, p.nursing_education].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 bg-green-50 text-green-700 border-green-200">
                                Verfügbar
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-orange-200 text-orange-700 hover:bg-orange-100"
                                  onClick={() => handleReserveProfile(pid)}
                                >
                                  Reservieren
                                </Button>
                                <a href={`/admin/fachkraefte/${pid}`} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-gray-300 hover:text-red-500"
                                  onClick={() => handleRemoveFromInterest(note.id, pid)}
                                  title="Aus Interessenliste entfernen"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {reservations.length === 0 && notesList.filter(n => n.type === 'interest_booking').length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Noch keine Vermittlungen vorhanden.</p>
            </div>
          )}
      </div>
      )}

      {/* Delete send confirmation */}
      {deletingSendId && (
        <Dialog open onOpenChange={open => !open && setDeletingSendId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />Signierlink löschen?
              </DialogTitle>
              <DialogDescription>
                Der Link und das unterzeichnete Dokument werden dauerhaft gelöscht.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingSendId(null)}>Abbrechen</Button>
              <Button variant="destructive" disabled={deletingSendBusy} onClick={() => handleDeleteSend(deletingSendId)}>
                {deletingSendBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete bundle confirmation */}
      {deletingBundleId && (
        <Dialog open onOpenChange={open => !open && setDeletingBundleId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />Paket löschen?
              </DialogTitle>
              <DialogDescription>
                Das Paket und alle enthaltenen Dokumente werden dauerhaft gelöscht. Der Signierlink wird ungültig.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingBundleId(null)}>Abbrechen</Button>
              <Button variant="destructive" disabled={deletingBundleBusy} onClick={() => handleDeleteBundle(deletingBundleId)}>
                {deletingBundleBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DocSendDialog */}
      {showSendDialog && company && (
        <DocSendDialog
          entityType="company"
          entityId={id}
          company={company}
          activeVermittlungen={reservations.map(r => ({
            profileId: r.profiles?.id,
            profileName: r.profiles ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim() : '',
            profileEmail: '',
            companyId: id,
            companyName: company.company_name || '',
            companyEmail: company.email || '',
          })).filter(v => v.profileId)}
          session={session}
          onClose={() => setShowSendDialog(false)}
          onSent={() => { setShowSendDialog(false); loadDocSends() }}
        />
      )}

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
