import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import {
  FileText, Plus, Trash2, Pencil, Link2, Copy, Check,
  Loader2, X, Send, ExternalLink, Mail, ChevronRight,
  FolderOpen, Sparkles, AlertCircle, Clock, History, User, RefreshCw,
  Eye, EyeOff,
} from 'lucide-react'

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || 'https://fachkraft-vermittlung.de'

// ─── File type icon helper ──────────────────────────────────────────────────
function getFileIcon(url) {
  if (!url) return '📄'
  const lower = url.toLowerCase()
  if (lower.includes('.pdf') || lower.includes('pdf')) return '📕'
  if (lower.includes('.doc') || lower.includes('word')) return '📘'
  if (lower.includes('.xls') || lower.includes('sheet') || lower.includes('excel')) return '📗'
  if (lower.includes('.ppt') || lower.includes('present')) return '📙'
  if (lower.includes('drive.google') || lower.includes('docs.google')) return '📁'
  return '📄'
}

// ─── Single file row ────────────────────────────────────────────────────────
function FileRow({ file, selected, onSelect, onEdit, onDelete }) {
  const isVirtual = !!file.isVirtual
  return (
    <div
      className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
        selected
          ? 'border-teal-300 bg-teal-50/60'
          : isVirtual
            ? 'border-teal-100 bg-teal-50/30 hover:border-teal-200 hover:bg-teal-50/50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
      }`}
      onClick={() => onSelect(file.id)}
    >
      {/* Checkbox */}
      <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
        selected ? 'border-teal-500 bg-teal-500' : 'border-gray-300 group-hover:border-gray-400'
      }`}>
        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>

      {/* Icon */}
      {isVirtual
        ? <User className="h-5 w-5 text-teal-500 mt-0.5 shrink-0" />
        : <span className="text-xl leading-none mt-0.5 shrink-0">{getFileIcon(file.url)}</span>
      }

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{file.title}</p>
          {isVirtual && file.cvMode === 'censored' && (
            <span className="shrink-0 inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              <RefreshCw className="h-2.5 w-2.5" />anonymisiert
            </span>
          )}
          {isVirtual && file.cvMode === 'full' && (
            <span className="shrink-0 inline-flex items-center gap-0.5 bg-teal-100 text-teal-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              <RefreshCw className="h-2.5 w-2.5" />vollständig
            </span>
          )}
          {!isVirtual && file.is_internal && (
            <span className="shrink-0 inline-flex items-center gap-0.5 bg-amber-50 text-amber-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-amber-200">
              <EyeOff className="h-2.5 w-2.5" />Intern
            </span>
          )}
          {!isVirtual && !file.is_internal && (
            <span className="shrink-0 inline-flex items-center gap-0.5 bg-green-50 text-green-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-green-200">
              <Eye className="h-2.5 w-2.5" />Geteilt
            </span>
          )}
        </div>
        {file.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{file.description}</p>
        )}
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mt-1 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="truncate max-w-[260px]">{isVirtual ? 'Lebenslauf öffnen' : file.url}</span>
        </a>
      </div>

      {/* Actions — only for real files */}
      {!isVirtual && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => onEdit(file)}
            title="Bearbeiten"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            onClick={() => onDelete(file.id)}
            title="Löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Add/Edit form (inline) ─────────────────────────────────────────────────
function FileForm({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [url, setUrl] = useState(initial?.url || '')
  // isVisible = true means visible to companies (is_internal = false)
  const [isVisible, setIsVisible] = useState(!(initial?.is_internal ?? false))

  const isValid = title.trim() && url.trim()

  return (
    <div className="border border-teal-200 bg-teal-50/30 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">{initial?.id ? 'Datei bearbeiten' : 'Neue Datei hinzufügen'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Titel <span className="text-red-500">*</span></Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z. B. FKVI Informationsbroschüre"
            className="h-9 text-sm"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">URL / Link <span className="text-red-500">*</span></Label>
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="h-9 text-sm"
            type="url"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Beschreibung <span className="text-gray-400">(optional)</span></Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Kurze Beschreibung für den Empfänger..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>
      {/* Visibility toggle */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
          isVisible ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
        }`}
        onClick={() => setIsVisible(v => !v)}
      >
        <div className="flex items-center gap-2">
          {isVisible
            ? <Eye className="h-4 w-4 text-green-600 shrink-0" />
            : <EyeOff className="h-4 w-4 text-gray-400 shrink-0" />}
          <div>
            <p className={`text-xs font-semibold ${isVisible ? 'text-green-800' : 'text-gray-700'}`}>
              Für Unternehmen sichtbar
            </p>
            <p className="text-[11px] text-gray-400 leading-tight">
              {isVisible
                ? 'Wird im Unternehmensportal angezeigt'
                : 'Nur intern – nicht im Unternehmensportal sichtbar'}
            </p>
          </div>
        </div>
        <Switch checked={isVisible} onCheckedChange={setIsVisible} onClick={e => e.stopPropagation()} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onSave({ title, description, url, is_internal: !isVisible })}
          disabled={!isValid || saving}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          {initial?.id ? 'Speichern' : 'Hinzufügen'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}

// ─── Bundle / Share modal ───────────────────────────────────────────────────
// existingBundle: if provided, skip generation and show this bundle directly
function BundleModal({ open, onClose, selectedFiles, entityType, entityId, entityName, recipientName, recipientEmail, session, existingBundle, onCreated }) {
  const [step, setStep] = useState('generating') // 'generating' | 'ready'
  const [bundleId, setBundleId] = useState(null)
  const [bundleUrl, setBundleUrl] = useState('')
  const [displayFiles, setDisplayFiles] = useState([])
  const [copied, setCopied] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailName, setEmailName] = useState(recipientName || '')
  const [emailAddr, setEmailAddr] = useState(recipientEmail || '')
  const [customMsg, setCustomMsg] = useState('')
  const [error, setError] = useState('')

  // Auto-generate or load existing on open
  useEffect(() => {
    if (!open) return
    setCopied(false)
    setEmailSent(false)
    setError('')
    setCustomMsg('')

    if (existingBundle) {
      // Load existing bundle — no generation needed
      setBundleId(existingBundle.id)
      setBundleUrl(`${PLATFORM_URL}/unterlagen/${existingBundle.token}`)
      setDisplayFiles(existingBundle.files || [])
      setEmailName(existingBundle.recipient_name || recipientName || '')
      setEmailAddr(existingBundle.recipient_email || recipientEmail || '')
      setStep('ready')
      return
    }

    // New bundle — generate
    setStep('generating')
    setBundleId(null)
    setBundleUrl('')
    setDisplayFiles(selectedFiles)
    setEmailName(recipientName || '')
    setEmailAddr(recipientEmail || '')

    const generate = async () => {
      try {
        const res = await fetch('/api/admin/doc-bundles/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            entity_name: entityName,
            title: 'Ihre Unterlagen',
            files: selectedFiles.map(f => ({ id: f.id, title: f.title, description: f.description, url: f.url })),
            recipient_name: recipientName,
            recipient_email: recipientEmail,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')
        setBundleId(data.id)
        setBundleUrl(data.url)
        setStep('ready')
        onCreated?.()
      } catch (err) {
        setError(err.message)
        setStep('ready')
      }
    }
    generate()
  }, [open])

  const handleCopy = () => {
    navigator.clipboard.writeText(bundleUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    if (!emailAddr.trim() || !bundleId) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/admin/doc-bundles/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          bundle_id: bundleId,
          recipient_name: emailName,
          recipient_email: emailAddr,
          custom_message: customMsg,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'E-Mail-Fehler')
      setEmailSent(true)
      toast({ title: 'E-Mail gesendet', description: `An ${emailAddr} verschickt.` })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-full max-w-[520px] p-0 overflow-hidden rounded-2xl gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a3a5c] to-[#0d9488] px-6 py-5 pr-14">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-200 shrink-0" />
              Unterlagen-Link generieren
            </DialogTitle>
            <p className="text-teal-100 text-sm mt-1">
              {existingBundle ? `Gespeicherter Link · ${(existingBundle.files || []).length} Dokument${(existingBundle.files || []).length !== 1 ? 'e' : ''}` : `${selectedFiles.length} Dokument${selectedFiles.length !== 1 ? 'e' : ''} ausgewählt`}
            </p>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[70vh] p-6 space-y-5">
          {step === 'generating' && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              <p className="text-sm text-gray-500">Link wird generiert…</p>
            </div>
          )}

          {step === 'ready' && error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {step === 'ready' && !error && (
            <>
              {/* Files preview */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Enthaltene Dokumente</p>
                <div className="space-y-1.5 rounded-xl overflow-hidden border border-gray-100">
                  {displayFiles.map((f, i) => (
                    <div key={f.id || i} className={`flex items-center gap-2.5 px-3 py-2.5 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <span className="text-base leading-none shrink-0">{getFileIcon(f.url)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{f.title}</p>
                        {f.description && <p className="text-xs text-gray-400 truncate">{f.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated URL */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Generierter Link</p>
                {/* URL display */}
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <Link2 className="h-4 w-4 text-teal-500 shrink-0" />
                  <p className="flex-1 text-sm text-gray-700 font-mono truncate min-w-0">{bundleUrl}</p>
                </div>
                {/* Actions row below URL */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      copied
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:text-teal-700'
                    }`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Kopiert!' : 'Link kopieren'}
                  </button>
                  <a
                    href={bundleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />Vorschau
                  </a>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Email section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">Optional per E-Mail versenden</p>
                </div>

                {emailSent ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-700 font-medium">Gesendet an {emailAddr}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Name des Empfängers</Label>
                      <Input
                        value={emailName}
                        onChange={e => setEmailName(e.target.value)}
                        placeholder="Vorname Nachname"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">E-Mail-Adresse <span className="text-red-500">*</span></Label>
                      <Input
                        value={emailAddr}
                        onChange={e => setEmailAddr(e.target.value)}
                        placeholder="email@example.com"
                        type="email"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Eigene Nachricht <span className="text-gray-400 font-normal">(optional)</span></Label>
                      <Textarea
                        value={customMsg}
                        onChange={e => setCustomMsg(e.target.value)}
                        placeholder="z. B. Bitte schau dir diese Unterlagen durch und melde dich bei Fragen bei uns."
                        rows={3}
                        className="text-sm resize-none"
                      />
                      <p className="text-xs text-gray-400">Wird als hervorgehobener Hinweis in der E-Mail angezeigt.</p>
                    </div>
                    <button
                      onClick={handleSendEmail}
                      disabled={!emailAddr.trim() || sendingEmail}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        emailAddr.trim() && !sendingEmail
                          ? 'bg-[#1a3a5c] hover:bg-[#152f4d] text-white cursor-pointer'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {sendingEmail
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Wird gesendet…</>
                        : <><Send className="h-4 w-4" />E-Mail senden</>
                      }
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <Button variant="outline" onClick={onClose} size="sm">Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Virtual CV entry IDs ────────────────────────────────────────────────────
const CV_VIRTUAL_IDS = new Set(['__cv_censored__', '__cv_full__'])

// ─── Main component ─────────────────────────────────────────────────────────
export default function EntityFilesTab({ entityType, entityId, entityName, recipientName, recipientEmail }) {
  const { session } = useAuthStore()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFile, setEditingFile] = useState(null)
  const [savingFile, setSavingFile] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [bundleModalOpen, setBundleModalOpen] = useState(false)

  // Virtual CV entries for profile entities (two modes)
  const [cvUrlFull, setCvUrlFull] = useState(null)
  const [cvUrlCensored, setCvUrlCensored] = useState(null)

  // Bundle list
  const [bundles, setBundles] = useState([])
  const [loadingBundles, setLoadingBundles] = useState(true)
  const [copiedBundleId, setCopiedBundleId] = useState(null)
  const [openBundleForModal, setOpenBundleForModal] = useState(null) // existing bundle to show in modal

  useEffect(() => {
    fetchFiles()
    fetchBundles()
    if (entityType === 'profile') {
      fetchCvUrl()
    }
  }, [entityType, entityId])

  const fetchCvUrl = async () => {
    try {
      const res = await fetch(`/api/admin/cv-admin-url?profileId=${entityId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setCvUrlFull(data.urlFull)
        setCvUrlCensored(data.urlCensored)
      }
    } catch { /* silent */ }
  }

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/entity-files/list?entity_type=${entityType}&entity_id=${entityId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (res.ok) setFiles(data.files || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  const fetchBundles = async () => {
    setLoadingBundles(true)
    try {
      const res = await fetch(`/api/admin/doc-bundles/list?entity_type=${entityType}&entity_id=${entityId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (res.ok) setBundles(data.bundles || [])
    } catch { /* silent */ }
    setLoadingBundles(false)
  }

  const handleDeleteBundle = async (id) => {
    try {
      const res = await fetch(`/api/admin/doc-bundles/delete?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      setBundles(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  const handleCopyBundleUrl = (bundle) => {
    navigator.clipboard.writeText(`${PLATFORM_URL}/unterlagen/${bundle.token}`)
    setCopiedBundleId(bundle.id)
    setTimeout(() => setCopiedBundleId(null), 2000)
  }

  const handleSaveFile = async ({ title, description, url, is_internal }) => {
    setSavingFile(true)
    try {
      const res = await fetch('/api/admin/entity-files/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          id: editingFile?.id || undefined,
          entity_type: entityType,
          entity_id: entityId,
          title,
          description,
          url,
          is_internal: is_internal === true,
          sort_order: editingFile?.sort_order ?? files.length,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (editingFile?.id) {
        setFiles(prev => prev.map(f => f.id === data.file.id ? data.file : f))
        toast({ title: 'Datei aktualisiert' })
      } else {
        setFiles(prev => [...prev, data.file])
        toast({ title: 'Datei hinzugefügt' })
      }
      setShowForm(false)
      setEditingFile(null)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
    setSavingFile(false)
  }

  const handleDeleteFile = async (id) => {
    try {
      const res = await fetch(`/api/admin/entity-files/delete?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      setFiles(prev => prev.filter(f => f.id !== id))
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
      toast({ title: 'Datei gelöscht' })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  const handleEditFile = (file) => {
    setEditingFile(file)
    setShowForm(true)
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === allFiles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allFiles.map(f => f.id)))
    }
  }

  // Merged list: two virtual CV entries first (for profiles), then DB files
  const cvVirtualEntries = entityType === 'profile' && cvUrlFull
    ? [
        {
          id: '__cv_censored__',
          title: 'Lebenslauf (anonymisiert)',
          description: 'Für Matching-Plattform & erste Kontaktaufnahme – persönliche Daten geblurrt.',
          url: cvUrlCensored,
          isVirtual: true,
          cvMode: 'censored',
        },
        {
          id: '__cv_full__',
          title: 'Lebenslauf (vollständig)',
          description: 'Alle Daten sichtbar – für aktive Vermittlung oder auf Anfrage.',
          url: cvUrlFull,
          isVirtual: true,
          cvMode: 'full',
        },
      ]
    : []
  const allFiles = [...cvVirtualEntries, ...files]

  const selectedFiles = allFiles.filter(f => selected.has(f.id))

  return (
    <div className="space-y-5">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 rounded-xl">
            <FolderOpen className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Dateien & Dokumente</h3>
            <p className="text-xs text-gray-500">{allFiles.length} Dokument{allFiles.length !== 1 ? 'e' : ''}</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditingFile(null); setShowForm(true) }}
          className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
          disabled={showForm && !editingFile}
        >
          <Plus className="h-4 w-4" />Datei hinzufügen
        </Button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <FileForm
          initial={editingFile}
          onSave={handleSaveFile}
          onCancel={() => { setShowForm(false); setEditingFile(null) }}
          saving={savingFile}
        />
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Laden…</span>
        </div>
      ) : allFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="p-3 bg-gray-100 rounded-2xl">
            <FileText className="h-7 w-7 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Noch keine Dateien</p>
            <p className="text-xs text-gray-400 mt-0.5">Füge Dokumente oder Links hinzu, die du mit dieser Person teilen möchtest.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditingFile(null); setShowForm(true) }}
            className="mt-1 border-dashed"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />Erste Datei hinzufügen
          </Button>
        </div>
      ) : (
        <div>
          {/* Select all bar */}
          {allFiles.length > 1 && (
            <div className="flex items-center justify-between mb-2.5 px-1">
              <button
                onClick={toggleSelectAll}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1.5"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  selected.size === allFiles.length ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                }`}>
                  {selected.size === allFiles.length && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  {selected.size > 0 && selected.size < allFiles.length && (
                    <div className="w-2 h-0.5 bg-teal-500 rounded" />
                  )}
                </div>
                {selected.size === allFiles.length ? 'Alle abwählen' : 'Alle auswählen'}
              </button>
              {selected.size > 0 && (
                <span className="text-xs text-teal-600 font-semibold bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                  {selected.size} ausgewählt
                </span>
              )}
            </div>
          )}

          {/* Files */}
          <div className="space-y-2">
            {allFiles.map(file => (
              <FileRow
                key={file.id}
                file={file}
                selected={selected.has(file.id)}
                onSelect={toggleSelect}
                onEdit={handleEditFile}
                onDelete={handleDeleteFile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bundle action bar */}
      {allFiles.length > 0 && (
        <div className={`border rounded-2xl p-4 transition-all ${
          selected.size > 0
            ? 'border-teal-200 bg-teal-50/40'
            : 'border-gray-200 bg-gray-50/40'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-teal-500" />
                {selected.size > 0
                  ? `${selected.size} Dokument${selected.size !== 1 ? 'e' : ''} für Versand ausgewählt`
                  : 'Dokumente auswählen zum Teilen'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selected.size > 0
                  ? 'Generiere einen Link und versende ihn direkt per E-Mail.'
                  : 'Wähle Dokumente oben aus, um einen Unterlagen-Link zu generieren.'}
              </p>
            </div>
            <Button
              onClick={() => setBundleModalOpen(true)}
              disabled={selected.size === 0}
              className={`shrink-0 gap-2 transition-all ${
                selected.size > 0
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Link generieren
              {selected.size > 0 && <ChevronRight className="h-4 w-4 -ml-1" />}
            </Button>
          </div>
        </div>
      )}

      {/* ── Generierte Links ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3 mt-2">
          <History className="h-4 w-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">Generierte Links</p>
          {bundles.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{bundles.length}</span>
          )}
        </div>

        {loadingBundles ? (
          <div className="flex items-center gap-2 py-4 text-gray-400 text-sm pl-1">
            <Loader2 className="h-4 w-4 animate-spin" /><span>Laden…</span>
          </div>
        ) : bundles.length === 0 ? (
          <p className="text-xs text-gray-400 pl-1 py-2">Noch kein Link generiert. Wähle Dateien aus und klicke auf „Link generieren".</p>
        ) : (
          <div className="space-y-2">
            {bundles.map(bundle => {
              const url = `${PLATFORM_URL}/unterlagen/${bundle.token}`
              const isCopied = copiedBundleId === bundle.id
              return (
                <div key={bundle.id} className="group flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3.5 hover:border-gray-300 transition-colors">
                  {/* Left: icon */}
                  <div className="shrink-0 w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mt-0.5">
                    <Link2 className="h-4 w-4 text-blue-500" />
                  </div>

                  {/* Center: info */}
                  <div className="flex-1 min-w-0">
                    {/* Files summary */}
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {(bundle.files || []).map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-md px-1.5 py-0.5 max-w-[160px] truncate">
                          <span className="text-[10px]">{getFileIcon(f.url)}</span>
                          <span className="truncate">{f.title}</span>
                        </span>
                      ))}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(bundle.created_at)}
                      </span>
                      {bundle.email_sent_at && (
                        <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                          <Check className="h-3 w-3" />
                          E-Mail gesendet
                          {bundle.recipient_email && <span className="font-normal text-green-500">an {bundle.recipient_email}</span>}
                        </span>
                      )}
                    </div>

                    {/* URL row */}
                    <p className="text-xs font-mono text-gray-400 truncate mt-1">{url}</p>
                  </div>

                  {/* Right: actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => handleCopyBundleUrl(bundle)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isCopied
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700'
                      }`}
                      title="Link kopieren"
                    >
                      {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {isCopied ? 'Kopiert' : 'Kopieren'}
                    </button>
                    <button
                      onClick={() => setOpenBundleForModal(bundle)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                      title="Öffnen / E-Mail senden"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-transparent"
                      title="Vorschau"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => handleDeleteBundle(bundle.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent transition-colors opacity-0 group-hover:opacity-100"
                      title="Link löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bundle modal — new */}
      <BundleModal
        open={bundleModalOpen}
        onClose={() => setBundleModalOpen(false)}
        selectedFiles={selectedFiles}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        recipientName={recipientName}
        recipientEmail={recipientEmail}
        session={session}
        onCreated={fetchBundles}
      />

      {/* Bundle modal — existing */}
      {openBundleForModal && (
        <BundleModal
          open={!!openBundleForModal}
          onClose={() => setOpenBundleForModal(null)}
          selectedFiles={[]}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          recipientName={recipientName}
          recipientEmail={recipientEmail}
          session={session}
          existingBundle={openBundleForModal}
          onCreated={fetchBundles}
        />
      )}
    </div>
  )
}
