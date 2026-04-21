import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Upload,
  FileText,
  Pencil,
  Send,
  Trash2,
  Copy,
  Check,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardCopy,
  ExternalLink,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function SendStatusBadge({ status }) {
  const cfg = {
    pending:   { label: 'Ausstehend',   variant: 'secondary',    extra: '' },
    opened:    { label: 'Geöffnet',     variant: 'info',         extra: '' },
    signed:    { label: 'Unterzeichnet', variant: 'success',     extra: '' },
    submitted: { label: 'Unterzeichnet', variant: 'success',     extra: '' },
    expired:   { label: 'Abgelaufen',   variant: 'destructive',  extra: '' },
    revoked:   { label: 'Widerrufen',   variant: 'secondary',    extra: 'line-through opacity-60' },
  }
  const c = cfg[status] ?? { label: status, variant: 'outline', extra: '' }
  return (
    <Badge variant={c.variant} className={c.extra}>
      {c.label}
    </Badge>
  )
}

function useCopyText() {
  const [copied, setCopied] = useState(false)
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

// ─── SendDialog ───────────────────────────────────────────────────────────────

function SendDialog({ template, open, onClose, session }) {
  const [signerName, setSignerName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [sending, setSending] = useState(false)
  const [signerUrl, setSignerUrl] = useState(null)
  const { copied, copy } = useCopyText()

  const handleClose = () => {
    setSignerName('')
    setExpiresInDays('30')
    setSignerUrl(null)
    onClose()
  }

  const handleCreate = async () => {
    if (!signerName.trim()) {
      toast({ title: 'Pflichtfeld fehlt', description: 'Bitte gib den Namen des Unterzeichners an.', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/dokumente/send', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({
          templateId: template.id,
          signerName: signerName.trim(),
          signerEmail: null, // never auto-email from Mediathek
          expiresInDays: parseInt(expiresInDays, 10),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unbekannter Fehler')
      setSignerUrl(data.signerUrl)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Signierlink erstellen</DialogTitle>
          <DialogDescription>
            Vorlage: <span className="font-medium text-gray-700">{template?.name}</span>
          </DialogDescription>
        </DialogHeader>

        {signerUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Signierlink erfolgreich erstellt
              </div>
              <p className="text-xs text-gray-500">
                Sende diesen Link manuell an den Unterzeichner (E-Mail, WhatsApp, o.ä.):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-700 select-all">
                  {signerUrl}
                </code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(signerUrl)}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={handleClose}>Fertig</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name des Unterzeichners <span className="text-red-500">*</span></Label>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Max Mustermann"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ablauf nach</Label>
              <select
                value={expiresInDays}
                onChange={e => setExpiresInDays(e.target.value)}
                className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {[7, 14, 30, 60, 90].map(d => (
                  <option key={d} value={d}>{d} Tagen</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={sending}>Abbrechen</Button>
              <Button
                onClick={handleCreate}
                disabled={sending || !signerName.trim()}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {sending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Erstelle Link...</>
                  : <><Send className="h-4 w-4 mr-2" />Link generieren</>
                }
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── SendDetailDialog ─────────────────────────────────────────────────────────

function SendDetailDialog({ send, open, onClose, session, onRevoked }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const { copied, copy } = useCopyText()

  useEffect(() => {
    if (open && send) {
      setDetail(null)
      setLoading(true)
      fetch(`/api/admin/dokumente/sends-detail?sendId=${send.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then(r => r.json())
        .then(data => setDetail(data))
        .catch(() => toast({ title: 'Fehler', description: 'Details konnten nicht geladen werden.', variant: 'destructive' }))
        .finally(() => setLoading(false))
    }
  }, [open, send])

  const handleDownload = async () => {
    if (detail?.signedPdfUrl) {
      window.open(detail.signedPdfUrl, '_blank')
    } else {
      try {
        const res = await fetch(`/api/admin/dokumente/sends-detail?sendId=${send.id}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const data = await res.json()
        if (data.signedPdfUrl) window.open(data.signedPdfUrl, '_blank')
        else toast({ title: 'Nicht verfügbar', description: 'Kein signiertes PDF vorhanden.', variant: 'destructive' })
      } catch {
        toast({ title: 'Fehler', description: 'URL konnte nicht geladen werden.', variant: 'destructive' })
      }
    }
  }

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      const res = await fetch('/api/admin/dokumente/revoke', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({ sendId: send.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Widerrufen')
      toast({ title: 'Widerrufen', description: 'Der Signierlink wurde widerrufen.', variant: 'success' })
      setConfirmRevoke(false)
      onRevoked(send.id)
      onClose()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setRevoking(false)
    }
  }

  const eventCfg = {
    created:   { icon: FileText,     label: (e) => 'Erstellt' },
    opened:    { icon: Eye,          label: (e) => `Geöffnet${e.count > 1 ? ` (${e.count} Mal)` : ''}` },
    signed:    { icon: CheckCircle2, label: (e) => 'Unterzeichnet' },
    submitted: { icon: CheckCircle2, label: (e) => 'Unterzeichnet' },
    revoked:   { icon: XCircle,      label: (e) => 'Widerrufen' },
  }

  const canRevoke = send && !['revoked', 'signed', 'submitted'].includes(send.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Versand-Details</DialogTitle>
          <DialogDescription>
            {send?.template_name || detail?.template?.name || '—'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-gray-500">Unterzeichner</p>
                <p className="font-medium text-gray-800">{send?.signer_name || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-500">E-Mail</p>
                <p className="font-medium text-gray-800">{send?.signer_email || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-500">Status</p>
                <SendStatusBadge status={send?.status} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-500">Erstellt</p>
                <p className="text-gray-700">{formatDateTime(send?.created_at)}</p>
              </div>
              {send?.signed_at && (
                <div className="space-y-0.5 col-span-2">
                  <p className="text-xs text-gray-500">Unterschrieben am</p>
                  <p className="text-gray-700">{formatDateTime(send.signed_at)}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Audit log */}
            {detail?.events && detail.events.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktivitäten</p>
                <ul className="space-y-2">
                  {detail.events.map((ev, i) => {
                    const cfg = eventCfg[ev.type] || { icon: FileText, label: () => ev.type }
                    const Icon = cfg.icon
                    const iconColor = ev.type === 'signed' || ev.type === 'submitted'
                      ? 'text-green-500' : ev.type === 'revoked'
                      ? 'text-red-500' : ev.type === 'opened'
                      ? 'text-blue-500' : 'text-gray-400'
                    return (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                        <span className="flex-1 text-gray-700">{cfg.label(ev)}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(ev.created_at)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <Separator />

            {/* Signing URL */}
            {send?.signer_url && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signierlink</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all text-gray-600 select-all">
                    {send.signer_url}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copy(send.signer_url)} className="shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {(send?.status === 'signed' || send?.status === 'submitted') && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#0d9488] border-[#0d9488]/40 hover:bg-[#0d9488]/5"
              onClick={handleDownload}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Signiertes PDF herunterladen
            </Button>
          )}
          {canRevoke && !confirmRevoke && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmRevoke(true)}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Widerrufen
            </Button>
          )}
          {canRevoke && confirmRevoke && (
            <Button size="sm" variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
              Wirklich widerrufen?
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onEdit, onSend, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#1a3a5c]/10 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-[#1a3a5c]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{template.name}</p>
            <p className="text-xs text-gray-400 truncate">{template.file_name}</p>
          </div>
        </div>
        {template.sends_count > 0 && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {template.sends_count}× gesendet
          </Badge>
        )}
      </div>

      {template.description && (
        <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        {template.page_count > 0 && <span>{template.page_count} Seite{template.page_count !== 1 ? 'n' : ''}</span>}
        <span>·</span>
        <span>{formatDateTime(template.created_at)}</span>
      </div>

      <Separator />

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-[#1a3a5c] border-[#1a3a5c]/30 hover:bg-[#1a3a5c]/5"
          onClick={() => onEdit(template)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Felder bearbeiten
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-[#0d9488] border-[#0d9488]/30 hover:bg-[#0d9488]/5"
          onClick={() => onSend(template)}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Link generieren
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-200 hover:bg-red-50"
          onClick={() => onDelete(template)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Vorlagen Tab ─────────────────────────────────────────────────────────────

function VorlagenTab({ session }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [sendTarget, setSendTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchTemplates() }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dokumente/list', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      toast({ title: 'Fehler', description: 'Vorlagen konnten nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const acceptFile = useCallback((file) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Datei zu groß', description: 'Maximale Dateigröße: 50 MB.', variant: 'destructive' })
      return
    }
    if (file.type !== 'application/pdf') {
      toast({ title: 'Ungültiges Format', description: 'Nur PDF-Dateien sind erlaubt.', variant: 'destructive' })
      return
    }
    setUploadFile(file)
    setUploadName(file.name.replace(/\.pdf$/i, ''))
  }, [])

  const handleFileChange = (e) => {
    acceptFile(e.target.files?.[0])
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)

  const handleUpload = async () => {
    if (!uploadFile) return
    if (!uploadName.trim()) {
      toast({ title: 'Name fehlt', description: 'Bitte gib einen Namen für die Vorlage ein.', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      const urlRes = await fetch('/api/admin/dokumente/upload-url', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({
          fileName: uploadFile.name,
          name: uploadName.trim(),
          description: uploadDesc.trim() || null,
        }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error || 'Fehler beim Abrufen der Upload-URL')

      const putRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        body: uploadFile,
      })
      if (!putRes.ok) throw new Error('Datei-Upload fehlgeschlagen')

      const confirmRes = await fetch('/api/admin/dokumente/confirm-upload', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({
          templateId: urlData.templateId,
          pageCount: 1,
          fileSize: uploadFile.size,
        }),
      })
      const confirmData = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(confirmData.error || 'Bestätigung fehlgeschlagen')

      toast({ title: 'Hochgeladen', description: `"${uploadName}" wurde erfolgreich hochgeladen.`, variant: 'success' })
      setUploadFile(null)
      setUploadName('')
      setUploadDesc('')
      fetchTemplates()
    } catch (err) {
      toast({ title: 'Upload fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/dokumente/delete', {
        method: 'DELETE',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({ templateId: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Löschen fehlgeschlagen')
      toast({ title: 'Gelöscht', description: `"${deleteTarget.name}" wurde entfernt.`, variant: 'success' })
      setDeleteTarget(null)
      fetchTemplates()
    } catch (err) {
      toast({ title: 'Fehler beim Löschen', description: err.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drag-and-drop upload zone */}
      <div>
        {/* Drop zone — always visible */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploadFile && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer select-none
            ${dragOver
              ? 'border-[#1a3a5c] bg-[#1a3a5c]/5'
              : uploadFile
                ? 'border-[#0d9488] bg-[#0d9488]/[0.03] cursor-default'
                : 'border-[#1a3a5c]/25 bg-[#1a3a5c]/[0.02] hover:border-[#1a3a5c]/50 hover:bg-[#1a3a5c]/[0.04]'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={handleFileChange}
          />

          {!uploadFile ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-[#1a3a5c]/20' : 'bg-[#1a3a5c]/10'}`}>
                <Upload className={`h-5 w-5 transition-colors ${dragOver ? 'text-[#1a3a5c]' : 'text-[#1a3a5c]/70'}`} />
              </div>
              <p className="font-semibold text-gray-700 text-sm mb-1">
                {dragOver ? 'Datei loslassen zum Hochladen' : 'PDF hier ablegen oder klicken zum Auswählen'}
              </p>
              <p className="text-xs text-gray-400">Nur PDF-Dateien · max. 50 MB</p>
            </div>
          ) : (
            /* File selected — show title/desc inputs */
            <div className="p-5 space-y-4">
              {/* File info row */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0d9488]/15 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-[#0d9488]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{uploadFile.name}</p>
                  <p className="text-xs text-gray-400">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadName(''); setUploadDesc('') }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                  title="Datei entfernen"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-name">Titel <span className="text-red-500">*</span></Label>
                  <Input
                    id="upload-name"
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    placeholder="z. B. Arbeitsvertrag Pflegefachkraft"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-desc">Beschreibung <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    id="upload-desc"
                    value={uploadDesc}
                    onChange={e => setUploadDesc(e.target.value)}
                    placeholder="Kurze Beschreibung der Vorlage"
                  />
                </div>
              </div>

              <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !uploadName.trim()}
                  className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                >
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird hochgeladen...</>
                    : <><Upload className="h-4 w-4 mr-2" />Vorlage hochladen</>
                  }
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Vorlagen hochgeladen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={(tmpl) => navigate(`/admin/dokumente/editor/${tmpl.id}`)}
              onSend={(tmpl) => setSendTarget(tmpl)}
              onDelete={(tmpl) => setDeleteTarget(tmpl)}
            />
          ))}
        </div>
      )}

      {/* Send dialog */}
      {sendTarget && (
        <SendDialog
          template={sendTarget}
          open={!!sendTarget}
          onClose={() => setSendTarget(null)}
          session={session}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vorlage löschen?</DialogTitle>
            <DialogDescription>
              Soll <span className="font-medium text-gray-700">"{deleteTarget?.name}"</span> wirklich gelöscht werden?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Löschen...</> : <><Trash2 className="h-4 w-4 mr-2" />Löschen</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Versand Tab ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: '', label: 'Alle' },
  { key: 'pending,opened', label: 'Ausstehend' },
  { key: 'signed,submitted', label: 'Unterzeichnet' },
  { key: 'expired,revoked', label: 'Abgelaufen/Widerrufen' },
]

function VersandTab({ session }) {
  const [sends, setSends] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [detailSend, setDetailSend] = useState(null)
  const { copied, copy } = useCopyText()

  useEffect(() => { fetchSends() }, [filter])

  const fetchSends = async () => {
    setLoading(true)
    try {
      const params = filter ? `?status=${encodeURIComponent(filter)}` : ''
      const res = await fetch(`/api/admin/dokumente/sends-list${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setSends(data.sends || [])
    } catch {
      toast({ title: 'Fehler', description: 'Versand-Liste konnte nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleRevoked = (sendId) => {
    setSends(prev => prev.map(s => s.id === sendId ? { ...s, status: 'revoked' } : s))
  }

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === opt.key
                ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : sends.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Versand-Einträge gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Vorlage', 'Empfänger', 'Status', 'Erstellt', 'Unterschrieben am', 'Aktionen'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sends.map(send => (
                  <tr key={send.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 truncate max-w-[160px]">{send.template_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 truncate max-w-[140px]">{send.signer_name}</p>
                      {send.signer_email && (
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">{send.signer_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SendStatusBadge status={send.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDateTime(send.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {send.signed_at ? formatDateTime(send.signed_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => setDetailSend(send)}
                        >
                          Details
                        </Button>
                        {send.signer_url && (
                          <button
                            onClick={() => copy(send.signer_url)}
                            title="Signierlink kopieren"
                            className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            {copied ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <ClipboardCopy className="h-3.5 w-3.5 text-gray-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailSend && (
        <SendDetailDialog
          send={detailSend}
          open={!!detailSend}
          onClose={() => setDetailSend(null)}
          session={session}
          onRevoked={handleRevoked}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MediathekPage() {
  const { session } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dokumentenmediathek</h1>
        <p className="text-gray-500 mt-1 text-sm">PDF-Vorlagen verwalten, Felder definieren & zur Unterzeichnung versenden</p>
      </div>

      <Tabs defaultValue="vorlagen">
        <TabsList className="mb-2">
          <TabsTrigger value="vorlagen">Vorlagen</TabsTrigger>
          <TabsTrigger value="versand">Versand</TabsTrigger>
        </TabsList>

        <TabsContent value="vorlagen">
          <VorlagenTab session={session} />
        </TabsContent>

        <TabsContent value="versand">
          <VersandTab session={session} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
