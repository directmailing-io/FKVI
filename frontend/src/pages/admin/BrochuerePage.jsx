import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  FileText, Upload, CheckCircle2, Clock, AlertCircle, Download, ExternalLink,
  Loader2, ChevronUp, ChevronDown, Search, RefreshCw, Building2, Mail, Phone,
  History, Eye, Send, FileDown, User, SortAsc,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function StatusBadge({ request }) {
  if (!request.email_confirmed_at) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full"><Clock className="h-3 w-3" />E-Mail ausstehend</span>
  }
  if (!request.confirmation) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><Eye className="h-3 w-3" />Noch nicht bestätigt</span>
  }
  const days = getDaysRemaining(request.confirmation.confirmed_at)
  if (days > 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full"><Clock className="h-3 w-3" />{days} {days === 1 ? 'Tag' : 'Tage'} verbleibend</span>
  }
  return <span className="inline-flex items-center gap-1 text-xs font-bold text-green-800 bg-green-100 border border-green-300 px-2.5 py-1 rounded-full"><Send className="h-3 w-3" />Vertrag zusenden!</span>
}

// ─── Sortable column header ─────────────────────────────────────────────────
function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
          : <SortAsc className="h-3.5 w-3.5 text-gray-300" />
        }
      </div>
    </th>
  )
}

// ─── Upload panel ────────────────────────────────────────────────────────────
function UploadPanel({ session, onUploaded }) {
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef()

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
      // 1. Get signed upload URL
      const urlRes = await fetch('/api/admin/brochure/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ fileName: file.name, notes }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error || 'Upload-URL Fehler')
      setProgress(30)

      // 2. Upload file directly to Supabase Storage
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
      })
      if (!uploadRes.ok) throw new Error('Datei-Upload fehlgeschlagen')
      setProgress(70)

      // 3. Register version in DB
      const verRes = await fetch('/api/admin/brochure/create-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ fileName: file.name, storagePath: urlData.storagePath, versionNumber: urlData.versionNumber, notes }),
      })
      const verData = await verRes.json()
      if (!verRes.ok) throw new Error(verData.error || 'Version-Registrierung Fehler')
      setProgress(100)

      toast({ title: `Version ${urlData.versionNumber} erfolgreich hochgeladen` })
      setFile(null)
      setNotes('')
      fileRef.current.value = ''
      onUploaded()
    } catch (err) {
      toast({ title: 'Upload fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1500)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 hover:border-fkvi-blue/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-fkvi-blue/8 rounded-lg flex items-center justify-center">
          <Upload className="h-4.5 w-4.5 text-fkvi-blue" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Neue Version hochladen</p>
          <p className="text-xs text-gray-400">PDF · max. 50 MB · wird automatisch versioniert</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden" id="broschuere-upload" />
          <label
            htmlFor="broschuere-upload"
            className={cn(
              'flex items-center gap-3 w-full border rounded-lg px-4 py-3 cursor-pointer transition-colors text-sm',
              file ? 'border-fkvi-blue bg-fkvi-blue/4 text-fkvi-blue' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            {file ? file.name : 'PDF-Datei auswählen...'}
          </label>
        </div>

        <Input
          placeholder="Versions-Notiz (optional, z.B. 'Aktualisierter Vermittlungsvertrag')"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="text-sm"
        />

        {progress > 0 && progress < 100 && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-fkvi-blue h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wird hochgeladen...</> : <><Upload className="h-4 w-4 mr-2" />Version hochladen</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BrochuerePage() {
  const { session } = useAuthStore()
  const navigate = useNavigate()

  // Versions
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(true)

  // Requests
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  // Filters & sorting
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const fetchVersions = useCallback(async () => {
    if (!session?.access_token) return
    setVersionsLoading(true)
    try {
      const res = await fetch('/api/admin/brochure/versions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setVersions(data.versions || [])
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
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
    } finally {
      setRequestsLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchVersions()
    fetchRequests()
  }, [fetchVersions, fetchRequests])

  const handleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const latestVersion = versions[0]

  // Filter + sort
  const filtered = requests
    .filter(r => {
      const q = search.toLowerCase()
      if (q && !`${r.first_name} ${r.last_name} ${r.email} ${r.company_name || ''}`.toLowerCase().includes(q)) return false
      if (statusFilter === 'pending_email') return !r.email_confirmed_at
      if (statusFilter === 'confirmed_email') return r.email_confirmed_at && !r.confirmation
      if (statusFilter === 'read') return r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) > 0
      if (statusFilter === 'contract_ready') return r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) <= 0
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
    all: requests.length,
    pending_email: requests.filter(r => !r.email_confirmed_at).length,
    confirmed_email: requests.filter(r => r.email_confirmed_at && !r.confirmation).length,
    read: requests.filter(r => r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) > 0).length,
    contract_ready: requests.filter(r => r.confirmation && getDaysRemaining(r.confirmation.confirmed_at) <= 0).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broschüre</h1>
        <p className="text-gray-500 mt-0.5 text-sm">PDF-Verwaltung, Download-Tracking und Lesebestätigungen</p>
      </div>

      <Tabs defaultValue="dokument">
        <TabsList className="mb-6">
          <TabsTrigger value="dokument">Dokument &amp; Versionen</TabsTrigger>
          <TabsTrigger value="anfragen">
            Anfragen
            {counts.contract_ready > 0 && (
              <span className="ml-2 bg-green-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {counts.contract_ready}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Dokument ──────────────────────────────────────────────────── */}
        <TabsContent value="dokument" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Current version */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4.5 w-4.5 text-fkvi-blue" />
                <h2 className="font-semibold text-gray-900">Aktuelle Version</h2>
              </div>
              {versionsLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-5 bg-gray-100 rounded w-2/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ) : latestVersion ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-fkvi-blue">v{latestVersion.version_number}</span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{latestVersion.file_name}</p>
                      <p className="text-xs text-gray-400">Hochgeladen am {fmtDate(latestVersion.uploaded_at)}{latestVersion.uploaded_by && ` von ${latestVersion.uploaded_by}`}</p>
                    </div>
                  </div>
                  {latestVersion.notes && (
                    <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">
                      {latestVersion.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />Aktiv
                    </span>
                    <span className="text-xs text-gray-400">{requests.length} Anfragen total</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Noch keine Broschüre hochgeladen</p>
                </div>
              )}
            </div>

            {/* Upload */}
            <UploadPanel session={session} onUploaded={() => { fetchVersions(); fetchRequests() }} />
          </div>

          {/* Version history */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <History className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800">Versionshistorie</h2>
              <span className="text-xs text-gray-400 ml-1">({versions.length} Versionen)</span>
            </div>
            <div className="divide-y divide-gray-50">
              {versionsLoading ? (
                <div className="px-5 py-4 text-sm text-gray-400">Lädt...</div>
              ) : versions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Keine Versionen vorhanden</div>
              ) : versions.map((v, i) => (
                <div key={v.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                    i === 0 ? 'bg-fkvi-blue text-white' : 'bg-gray-100 text-gray-400'
                  )}>
                    v{v.version_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{v.file_name}</p>
                    <p className="text-xs text-gray-400">
                      {fmt(v.uploaded_at)}{v.uploaded_by && ` · ${v.uploaded_by}`}
                    </p>
                    {v.notes && <p className="text-xs text-gray-500 italic mt-0.5">{v.notes}</p>}
                  </div>
                  {i === 0 && (
                    <span className="text-xs font-semibold text-fkvi-blue bg-fkvi-blue/8 px-2 py-0.5 rounded-full shrink-0">Aktuell</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Anfragen ──────────────────────────────────────────────────── */}
        <TabsContent value="anfragen" className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Name, E-Mail oder Firma suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle ({counts.all})</SelectItem>
                <SelectItem value="pending_email">E-Mail ausstehend ({counts.pending_email})</SelectItem>
                <SelectItem value="confirmed_email">E-Mail bestätigt ({counts.confirmed_email})</SelectItem>
                <SelectItem value="read">Gelesen – Wartezeit ({counts.read})</SelectItem>
                <SelectItem value="contract_ready">Vertrag zusenden ({counts.contract_ready})</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => { fetchRequests() }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Aktualisieren
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Firma</th>
                    <SortHeader label="E-Mail" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</th>
                    <SortHeader label="Registriert" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="E-Mail bestätigt" field="email_confirmed_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Erstmals gelesen" field="confirmed_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Zugriffe" field="access_count" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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
                        Keine Anfragen gefunden
                      </td>
                    </tr>
                  ) : filtered.map(r => {
                    const days = r.confirmation ? getDaysRemaining(r.confirmation.confirmed_at) : null
                    const contractReady = days !== null && days <= 0
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          'hover:bg-gray-50 transition-colors',
                          contractReady && 'bg-green-50/60 hover:bg-green-50'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-fkvi-blue/10 flex items-center justify-center text-fkvi-blue text-xs font-bold shrink-0">
                              {r.first_name[0]}{r.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{r.first_name} {r.last_name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />{r.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {r.company_name || <span className="text-gray-300">–</span>}
                        </td>
                        <td className="px-4 py-3">
                          <a href={`mailto:${r.email}`} className="text-fkvi-blue hover:underline text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />{r.email}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {r.brochure_version
                            ? <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">v{r.brochure_version.version_number}</span>
                            : <span className="text-gray-300 text-xs">–</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {r.email_confirmed_at
                            ? <span className="text-green-700">{fmtDate(r.email_confirmed_at)}</span>
                            : <span className="text-gray-300">–</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {r.confirmation
                            ? <span className="text-blue-700 font-medium">{fmtDate(r.confirmation.confirmed_at)}</span>
                            : <span className="text-gray-300">–</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.access_count > 0
                            ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-fkvi-blue/10 text-fkvi-blue text-xs font-bold">{r.access_count}</span>
                            : <span className="text-gray-300 text-xs">0</span>
                          }
                        </td>
                        <td className="px-4 py-3"><StatusBadge request={r} /></td>
                        <td className="px-4 py-3">
                          {r.company_id && (
                            <button
                              onClick={() => navigate(`/admin/crm/${r.company_id}`)}
                              className="text-xs text-gray-400 hover:text-fkvi-blue flex items-center gap-1 whitespace-nowrap"
                            >
                              <ExternalLink className="h-3 w-3" />CRM
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!requestsLoading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                {filtered.length} von {requests.length} Anfragen
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
