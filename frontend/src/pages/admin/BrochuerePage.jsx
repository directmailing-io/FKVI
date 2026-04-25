import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  FileText, Upload, CheckCircle2, Clock, Eye, Send, Loader2,
  ChevronUp, ChevronDown, Search, RefreshCw, Mail, Phone,
  Trash2, SortAsc, ExternalLink, Settings, FileSignature,
  PenLine, ArrowRight, Info,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGS = [
  { code: 'de', label: 'Deutsch',       flag: '🇩🇪' },
  { code: 'en', label: 'English',       flag: '🇬🇧' },
  { code: 'fr', label: 'Français',      flag: '🇫🇷' },
  { code: 'ar', label: 'عربي',          flag: '🇸🇦' },
  { code: 'vi', label: 'Tiếng Việt',   flag: '🇻🇳' },
]

const LEAD_FIELDS = [
  { key: 'first_name', label: 'Vorname' },
  { key: 'last_name',  label: 'Nachname' },
  { key: 'full_name',  label: 'Vollständiger Name' },
  { key: 'email',      label: 'E-Mail' },
  { key: 'phone',      label: 'Telefon' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return '–'
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(ts) {
  if (!ts) return '–'
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function getDaysRemaining(confirmedAt) {
  if (!confirmedAt) return null
  const end = new Date(confirmedAt).getTime() + 7 * 24 * 60 * 60 * 1000
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24))
}

function LangBadge({ lang }) {
  const m = LANGS.find(l => l.code === lang) || LANGS[0]
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
      {m.flag} {m.code.toUpperCase()}
    </span>
  )
}

function StatusBadge({ request }) {
  if (!request.email_confirmed_at) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full"><Clock className="h-3 w-3" />E-Mail ausstehend</span>
  }
  if (request.contract_send?.status === 'signed') {
    return <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-full"><FileSignature className="h-3 w-3" />Unterschrieben</span>
  }
  if (request.contract_sent_at) {
    const openedStr = request.contract_send?.opened_at ? `· geöffnet ${fmtDate(request.contract_send.opened_at)}` : '· noch nicht geöffnet'
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full"><Send className="h-3 w-3" />Vertrag geschickt {openedStr}</span>
  }
  if (!request.confirmation) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><Eye className="h-3 w-3" />Noch nicht bestätigt</span>
  }
  const days = getDaysRemaining(request.confirmation.confirmed_at)
  if (days > 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full"><Clock className="h-3 w-3" />{days} {days === 1 ? 'Tag' : 'Tage'} bis Versand</span>
  }
  return <span className="inline-flex items-center gap-1 text-xs font-bold text-green-800 bg-green-100 border border-green-300 px-2.5 py-1 rounded-full"><Send className="h-3 w-3" />Vertrag fällig!</span>
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 whitespace-nowrap" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
          : <SortAsc className="h-3.5 w-3.5 text-gray-300" />}
      </div>
    </th>
  )
}

// ─── Upload Panel (per language) ──────────────────────────────────────────────

function LangUploadPanel({ session, lang, latestVersion, onUploaded }) {
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [viewing, setViewing] = useState(false)
  const fileRef = useRef()

  const handleView = async () => {
    if (!latestVersion) return
    setViewing(true)
    try {
      const res = await fetch(`/api/admin/brochure/view-url?versionId=${latestVersion.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok && data.url) window.open(data.url, '_blank')
      else toast({ title: 'Fehler beim Laden', description: data.error, variant: 'destructive' })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally { setViewing(false) }
  }

  const handleDelete = async () => {
    if (!latestVersion) return
    if (!confirm(`${lang.flag} ${lang.label}: Aktuelle Broschüre wirklich löschen? Die Datei wird dauerhaft entfernt.`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/brochure/delete-version', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ versionId: latestVersion.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: `${lang.flag} ${lang.label}: Broschüre gelöscht` })
      onUploaded()
    } catch (err) {
      toast({ title: 'Löschen fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally { setDeleting(false) }
  }

  const handleFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.type !== 'application/pdf') { toast({ title: 'Nur PDF-Dateien erlaubt', variant: 'destructive' }); return }
    if (f.size > 50 * 1024 * 1024) { toast({ title: 'Datei zu groß (max. 50 MB)', variant: 'destructive' }); return }
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(10)
    try {
      const urlRes = await fetch('/api/admin/brochure/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ fileName: file.name, notes, language: lang.code }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error || 'Upload-URL Fehler')
      setProgress(30)

      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
      })
      if (!uploadRes.ok) throw new Error('Datei-Upload fehlgeschlagen')
      setProgress(70)

      const verRes = await fetch('/api/admin/brochure/create-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ fileName: file.name, storagePath: urlData.storagePath, versionNumber: urlData.versionNumber, notes, language: lang.code }),
      })
      const verData = await verRes.json()
      if (!verRes.ok) throw new Error(verData.error || 'Version-Registrierung Fehler')
      setProgress(100)

      toast({ title: `${lang.flag} ${lang.label}: Version ${urlData.versionNumber} hochgeladen` })
      setFile(null)
      setNotes('')
      if (fileRef.current) fileRef.current.value = ''
      onUploaded()
    } catch (err) {
      toast({ title: 'Upload fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1500)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{lang.flag}</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{lang.label}</p>
            {latestVersion ? (
              <p className="text-xs text-gray-400">Aktuelle Version: v{latestVersion.version_number} · {fmtDate(latestVersion.uploaded_at)}</p>
            ) : (
              <p className="text-xs text-amber-600 font-medium">Noch keine Broschüre hochgeladen</p>
            )}
          </div>
        </div>
        {latestVersion && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleView}
              disabled={viewing}
              className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
              title="Ansehen"
            >
              {viewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Löschen"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="space-y-2">
        <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden" id={`upload-${lang.code}`} />
        <label
          htmlFor={`upload-${lang.code}`}
          className={cn(
            'flex items-center gap-3 w-full border rounded-lg px-3 py-2.5 cursor-pointer transition-colors text-sm',
            file ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'
          )}
        >
          <FileText className="h-4 w-4 shrink-0" />
          {file ? file.name : 'PDF auswählen...'}
        </label>
        <Input
          placeholder="Versions-Notiz (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="text-sm"
        />
        {progress > 0 && progress < 100 && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full" size="sm">
          {uploading ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Hochladen...</> : <><Upload className="h-3.5 w-3.5 mr-2" />Hochladen</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BrochuerePage() {
  const { session } = useAuthStore()
  const navigate = useNavigate()

  const [byLanguage, setByLanguage] = useState({})
  const [versionsLoading, setVersionsLoading] = useState(true)

  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  const [templates, setTemplates] = useState([])
  const [settings, setSettings] = useState({ contract_template_id: null, prefill_config: {} })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const [sendingContract, setSendingContract] = useState(null)
  const [deletingLead, setDeletingLead] = useState(null)

  const fetchVersions = useCallback(async () => {
    if (!session?.access_token) return
    setVersionsLoading(true)
    try {
      const res = await fetch('/api/admin/brochure/versions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setByLanguage(data.byLanguage || {})
    } catch { setByLanguage({}) }
    finally { setVersionsLoading(false) }
  }, [session])

  const fetchRequests = useCallback(async () => {
    if (!session?.access_token) return
    setRequestsLoading(true)
    try {
      const res = await fetch('/api/admin/brochure/requests', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequests(data.requests || [])
    } catch (err) {
      toast({ title: 'Fehler beim Laden', description: err.message, variant: 'destructive' })
    } finally { setRequestsLoading(false) }
  }, [session])

  const fetchTemplates = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/admin/dokumente/list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch { setTemplates([]) }
  }, [session])

  const fetchSettings = useCallback(async () => {
    if (!session?.access_token) return
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/admin/brochure/settings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok && data.settings) {
        setSettings(data.settings)
      }
    } catch { /* silent */ }
    finally { setSettingsLoading(false) }
  }, [session])

  useEffect(() => {
    fetchVersions()
    fetchRequests()
    fetchTemplates()
    fetchSettings()
  }, [fetchVersions, fetchRequests, fetchTemplates, fetchSettings])

  // Sync selectedTemplate with settings
  useEffect(() => {
    if (settings.contract_template_id && templates.length > 0) {
      const t = templates.find(t => t.id === settings.contract_template_id)
      setSelectedTemplate(t || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [settings.contract_template_id, templates])

  const handleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/admin/brochure/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast({ title: 'Einstellungen gespeichert' })
    } catch (err) {
      toast({ title: 'Fehler beim Speichern', description: err.message, variant: 'destructive' })
    } finally { setSettingsSaving(false) }
  }

  const handleSendContract = async (requestId) => {
    setSendingContract(requestId)
    try {
      const res = await fetch('/api/admin/brochure/send-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Vertrag erfolgreich verschickt' })
      fetchRequests()
    } catch (err) {
      toast({ title: 'Fehler beim Versenden', description: err.message, variant: 'destructive' })
    } finally { setSendingContract(null) }
  }

  const handleDeleteLead = async (requestId, name) => {
    if (!confirm(`Lead "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return
    setDeletingLead(requestId)
    try {
      const res = await fetch('/api/admin/brochure/delete-lead', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: `Lead "${name}" gelöscht` })
      fetchRequests()
    } catch (err) {
      toast({ title: 'Fehler beim Löschen', description: err.message, variant: 'destructive' })
    } finally { setDeletingLead(null) }
  }

  // Separate signed vs active leads
  const activeRequests = requests.filter(r => r.contract_send?.status !== 'signed')
  const signedRequests = requests.filter(r => r.contract_send?.status === 'signed')

  // Filter + sort active leads
  const filtered = activeRequests
    .filter(r => {
      const q = search.toLowerCase()
      if (q && !`${r.first_name} ${r.last_name} ${r.email} ${r.phone || ''}`.toLowerCase().includes(q)) return false
      if (statusFilter === 'pending_email') return !r.email_confirmed_at
      if (statusFilter === 'confirmed_email') return r.email_confirmed_at && !r.confirmation
      if (statusFilter === 'read') return r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) > 0 && !r.contract_sent_at
      if (statusFilter === 'contract_ready') return r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) <= 0 && !r.contract_sent_at
      if (statusFilter === 'contract_sent') return !!r.contract_sent_at
      return true
    })
    .sort((a, b) => {
      let av, bv
      switch (sortField) {
        case 'name': av = `${a.last_name}${a.first_name}`; bv = `${b.last_name}${b.first_name}`; break
        case 'email': av = a.email; bv = b.email; break
        case 'created_at': av = a.created_at; bv = b.created_at; break
        case 'email_confirmed_at': av = a.email_confirmed_at || ''; bv = b.email_confirmed_at || ''; break
        case 'confirmed_at': av = a.confirmation?.confirmed_at || ''; bv = b.confirmation?.confirmed_at || ''; break
        case 'access_count': av = a.access_count; bv = b.access_count; break
        default: av = a.created_at; bv = b.created_at
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const counts = {
    all: activeRequests.length,
    pending_email: activeRequests.filter(r => !r.email_confirmed_at).length,
    confirmed_email: activeRequests.filter(r => r.email_confirmed_at && !r.confirmation).length,
    read: activeRequests.filter(r => r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) > 0 && !r.contract_sent_at).length,
    contract_ready: activeRequests.filter(r => r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) <= 0 && !r.contract_sent_at).length,
    contract_sent: activeRequests.filter(r => !!r.contract_sent_at).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broschüre</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Mehrsprachige Broschüren, Lead-Tracking und automatischer Vertragsversand</p>
      </div>

      <Tabs defaultValue="broschueren">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="broschueren">Broschüren</TabsTrigger>
          <TabsTrigger value="leads">
            Leads
            {counts.contract_ready > 0 && (
              <span className="ml-2 bg-green-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {counts.contract_ready}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="vertragsvorlage">Vertragsvorlage</TabsTrigger>
          <TabsTrigger value="unterschrieben">
            Unterschriebene Verträge
            {signedRequests.length > 0 && (
              <span className="ml-2 bg-purple-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {signedRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Broschüren ────────────────────────────────────────────── */}
        <TabsContent value="broschueren" className="space-y-4">
          <p className="text-sm text-gray-500">Lade für jede Sprache die aktuelle Informationsbroschüre hoch. Jede Sprache wird separat versioniert.</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {LANGS.map(lang => (
              <LangUploadPanel
                key={lang.code}
                session={session}
                lang={lang}
                latestVersion={versionsLoading ? null : (byLanguage[lang.code]?.latest || null)}
                onUploaded={fetchVersions}
              />
            ))}
          </div>

        </TabsContent>

        {/* ── Tab 2: Leads ─────────────────────────────────────���───────────── */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-9" placeholder="Name, E-Mail oder Telefon..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle ({counts.all})</SelectItem>
                <SelectItem value="pending_email">E-Mail ausstehend ({counts.pending_email})</SelectItem>
                <SelectItem value="confirmed_email">E-Mail bestätigt ({counts.confirmed_email})</SelectItem>
                <SelectItem value="read">Gelesen – Wartezeit ({counts.read})</SelectItem>
                <SelectItem value="contract_ready">Vertrag fällig ({counts.contract_ready})</SelectItem>
                <SelectItem value="contract_sent">Vertrag verschickt ({counts.contract_sent})</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={fetchRequests} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />Aktualisieren
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sprache</th>
                    <SortHeader label="E-Mail" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Angefragt" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="E-Mail ✓" field="email_confirmed_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Gelesen" field="confirmed_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Aufrufe" field="access_count" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vertrag</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requestsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[...Array(10)].map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                        Keine Leads gefunden
                      </td>
                    </tr>
                  ) : filtered.map(r => {
                    const days = r.confirmation ? getDaysRemaining(r.confirmation.confirmed_at) : null
                    const contractReady = days !== null && days <= 0 && !r.contract_sent_at
                    return (
                      <tr key={r.id} className={cn('hover:bg-gray-50 transition-colors', contractReady && 'bg-green-50/60 hover:bg-green-50')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0">
                              {r.first_name[0]}{r.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 whitespace-nowrap">{r.first_name} {r.last_name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{r.phone || '–'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><LangBadge lang={r.language} /></td>
                        <td className="px-4 py-3">
                          <a href={`mailto:${r.email}`} className="text-teal-600 hover:underline text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />{r.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {r.email_confirmed_at
                            ? <span className="text-green-700">{fmtDate(r.email_confirmed_at)}</span>
                            : <span className="text-gray-300">–</span>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {r.confirmation
                            ? <span className="text-blue-700 font-medium">{fmtDate(r.confirmation.confirmed_at)}</span>
                            : <span className="text-gray-300">–</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.access_count > 0
                            ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">{r.access_count}</span>
                            : <span className="text-gray-300 text-xs">0</span>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {r.contract_sent_at ? (
                            <span className="text-blue-600">{fmtDate(r.contract_sent_at)}</span>
                          ) : contractReady ? (
                            <button
                              onClick={() => handleSendContract(r.id)}
                              disabled={sendingContract === r.id}
                              className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {sendingContract === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              Jetzt senden
                            </button>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge request={r} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {r.company_id && (
                              <button onClick={() => navigate(`/admin/crm/${r.company_id}`)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="CRM">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLead(r.id, `${r.first_name} ${r.last_name}`)}
                              disabled={deletingLead === r.id}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Lead löschen"
                            >
                              {deletingLead === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!requestsLoading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                {filtered.length} von {activeRequests.length} Leads
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 3: Vertragsvorlage ───────────────────────────────────────── */}
        <TabsContent value="vertragsvorlage" className="space-y-6 max-w-2xl">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 leading-relaxed">
              Wähle eine Dokumentenvorlage aus dem Template-Editor aus. 7 Tage nach der Lesebestätigung wird diese Vorlage automatisch an die Fachkraft verschickt. Vorausgefüllte Felder werden mit den Lead-Daten befüllt.
            </p>
          </div>

          {settingsLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Template selector */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Vertragsvorlage auswählen</h2>
                </div>
                <Select
                  value={settings.contract_template_id || '__none__'}
                  onValueChange={val => setSettings(s => ({ ...s, contract_template_id: val === '__none__' ? null : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vorlage auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Keine Vorlage</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-xs text-gray-400">
                    Noch keine Vorlagen vorhanden.{' '}
                    <button onClick={() => navigate('/admin/postfach')} className="text-teal-600 underline">
                      Im Template-Editor erstellen
                    </button>
                  </p>
                )}
              </div>

              {/* Prefill field mapping */}
              {selectedTemplate && selectedTemplate.fields?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <PenLine className="h-4 w-4 text-gray-400" />
                      <h2 className="font-semibold text-gray-900">Vorausgefüllte Felder</h2>
                    </div>
                    <p className="text-xs text-gray-400">
                      Weise Vorlagenfelder Lead-Daten zu. Diese werden beim Versand automatisch eingefügt.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {selectedTemplate.fields
                      .filter(f => f.type !== 'signature' && f.type !== 'checkbox')
                      .map(field => {
                        const currentSource = settings.prefill_config?.[field.id]?.source || ''
                        return (
                          <div key={field.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{field.label || field.name || `Feld ${field.id.slice(0, 6)}`}</p>
                              <p className="text-xs text-gray-400 capitalize">{field.type}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                            <Select
                              value={currentSource || '__none__'}
                              onValueChange={val => setSettings(s => ({
                                ...s,
                                prefill_config: {
                                  ...s.prefill_config,
                                  [field.id]: val && val !== '__none__' ? { source: val } : undefined,
                                },
                              }))}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Lead-Daten wählen..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Nicht vorausfüllen</SelectItem>
                                {LEAD_FIELDS.map(lf => (
                                  <SelectItem key={lf.key} value={lf.key}>{lf.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                {settingsSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Speichern...</> : 'Einstellungen speichern'}
              </Button>
            </>
          )}
        </TabsContent>

        {/* ── Tab 4: Unterschriebene Verträge ─────────────────────────────── */}
        <TabsContent value="unterschrieben" className="space-y-4">
          {signedRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileSignature className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Noch keine unterschriebenen Verträge</p>
              <p className="text-xs text-gray-400 mt-1">Sobald eine Fachkraft ihren Vertrag unterschreibt, erscheint sie hier.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sprache</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">E-Mail</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Angefragt</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Gelesen</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vertrag verschickt</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Unterschrieben</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {signedRequests.map(r => (
                      <tr key={r.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                              {r.first_name[0]}{r.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 whitespace-nowrap">{r.first_name} {r.last_name}</p>
                              <p className="text-xs text-gray-400">{r.phone || '–'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><LangBadge lang={r.language} /></td>
                        <td className="px-4 py-3">
                          <a href={`mailto:${r.email}`} className="text-teal-600 hover:underline text-xs">{r.email}</a>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.confirmation?.confirmed_at)}</td>
                        <td className="px-4 py-3 text-xs text-blue-600 whitespace-nowrap">{fmtDate(r.contract_sent_at)}</td>
                        <td className="px-4 py-3 text-xs text-purple-700 font-semibold whitespace-nowrap">
                          {fmtDate(r.contract_send?.signed_at)}
                        </td>
                        <td className="px-4 py-3">
                          {r.contract_send_id && (
                            <button
                              onClick={() => navigate(`/admin/postfach`)}
                              className="text-xs text-gray-400 hover:text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg transition-colors"
                              title="Vertrag ansehen"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                {signedRequests.length} unterschriebene {signedRequests.length === 1 ? 'Vertrag' : 'Verträge'}
              </div>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
