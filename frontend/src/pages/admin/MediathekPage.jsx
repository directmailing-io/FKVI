import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Upload, FileText, Pencil, Send, Trash2, Copy, Check, Eye,
  CheckCircle2, XCircle, Loader2, ClipboardCopy, ExternalLink,
  ChevronDown, Search, Tag, Users, Building2, UserCheck, Mail, AlertCircle,
} from 'lucide-react'
import { PDFDocument } from 'pdf-lib'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 50 * 1024 * 1024

const LABEL_OPTIONS = [
  { value: 'beide',        label: 'Beide',        color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'fachkraft',    label: 'Fachkraft',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'unternehmen',  label: 'Unternehmen',  color: 'bg-purple-50 text-purple-700 border-purple-200' },
]

function getLabelCfg(val) {
  return LABEL_OPTIONS.find(l => l.value === val) || LABEL_OPTIONS[0]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
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

function SendStatusBadge({ status }) {
  const cfg = {
    pending:   { label: 'Ausstehend',    variant: 'secondary' },
    opened:    { label: 'Geöffnet',      variant: 'info' },
    signed:    { label: 'Unterzeichnet', variant: 'success' },
    submitted: { label: 'Unterzeichnet', variant: 'success' },
    expired:   { label: 'Abgelaufen',   variant: 'destructive' },
    revoked:   { label: 'Widerrufen',   variant: 'secondary' },
  }
  const c = cfg[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

// ─── PDF compression (client-side via pdf-lib) ────────────────────────────────

async function compressPdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    const compressed = await pdfDoc.save({ useObjectStreams: true })
    // Only use compressed version if actually smaller
    if (compressed.byteLength < arrayBuffer.byteLength) {
      return new File([compressed], file.name, { type: 'application/pdf' })
    }
    return file
  } catch {
    // If compression fails (e.g. encrypted PDF), just use original
    return file
  }
}

// ─── AssignDialog: directly assign a template to a Fachkraft or Unternehmen ──

function AssignDialog({ template, open, onClose, session }) {
  const [entityType, setEntityType]       = useState('fachkraft')
  const [search, setSearch]               = useState('')
  const [entities, setEntities]           = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [selected, setSelected]           = useState(null)
  const [signerName, setSignerName]       = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [sending, setSending]             = useState(false)
  const [signerUrl, setSignerUrl]         = useState(null)
  const [sendId, setSendId]               = useState(null)
  const [emailAddress, setEmailAddress]   = useState('')
  const [useCustomMessage, setUseCustomMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [emailSending, setEmailSending]   = useState(false)
  const [emailSent, setEmailSent]         = useState(false)
  const { copied, copy }                  = useCopyText()

  // Prefill state (mirrors SendDocumentDialog)
  const [templateDetail, setTemplateDetail]   = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [prefillMode, setPrefillMode]         = useState('prefilled')
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false)
  const [disabledPrefillIds, setDisabledPrefillIds] = useState(new Set())
  const [checkboxPrefills, setCheckboxPrefills]     = useState({})

  // Load full template fields on open
  useEffect(() => {
    if (!open || !template?.id) return
    setTemplateDetail(null)
    setTemplateLoading(true)
    fetch(`/api/admin/dokumente/get?templateId=${template.id}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => setTemplateDetail(d.template || null))
      .catch(() => {})
      .finally(() => setTemplateLoading(false))
  }, [open, template?.id])

  // Reset on open/type change
  useEffect(() => {
    if (!open) return
    setSelected(null); setSearch(''); setSignerUrl(null); setSignerName('')
    setSendId(null); setEmailAddress(''); setUseCustomMessage(false); setCustomMessage(''); setEmailSending(false); setEmailSent(false)
    setDisabledPrefillIds(new Set()); setCheckboxPrefills({}); setFieldPickerOpen(false)
    fetchEntities(entityType)
  }, [open, entityType])

  const fetchEntities = async (type) => {
    setLoadingEntities(true)
    try {
      if (type === 'fachkraft') {
        const res = await fetch('/api/admin/entities/profiles', {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Fehler beim Laden')
        setEntities(json.profiles || [])
      } else {
        const res = await fetch('/api/admin/entities/companies', {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Fehler beim Laden')
        setEntities(json.companies || [])
      }
    } catch (err) {
      toast({ title: 'Fehler', description: err.message || 'Einträge konnten nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoadingEntities(false)
    }
  }

  const buildPrefillData = (entity) => {
    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (entityType === 'fachkraft') {
      return {
        'profile.first_name':  entity.first_name  || '',
        'profile.last_name':   entity.last_name   || '',
        'profile.nationality': entity.nationality  || '',
        'profile.education':   entity.nursing_education || '',
        'today':               today,
        'signer.name':         `${entity.first_name || ''} ${entity.last_name || ''}`.trim(),
      }
    }
    const contactName = `${entity.first_name || ''} ${entity.last_name || ''}`.trim()
    return {
      'company.company_name':       entity.company_name || '',
      'company.contact_name':       contactName,
      'company.contact_first_name': entity.first_name  || '',
      'company.contact_last_name':  entity.last_name   || '',
      'company.email':              entity.email        || '',
      'company.phone':              entity.phone        || '',
      'today':                      today,
      'signer.name':                contactName || entity.company_name || '',
    }
  }

  const filtered = entities.filter(e => {
    const q = search.toLowerCase()
    if (!q) return true
    if (entityType === 'fachkraft') return `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)
    return (e.company_name || '').toLowerCase().includes(q) ||
           `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(q)
  })

  const handleSelect = (entity) => {
    setSelected(entity)
    setDisabledPrefillIds(new Set()); setCheckboxPrefills({}); setFieldPickerOpen(false)
    if (entityType === 'fachkraft') {
      setSignerName(`${entity.first_name || ''} ${entity.last_name || ''}`.trim())
    } else {
      setSignerName(`${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.company_name || '')
    }
  }

  // Compute prefillable fields (same logic as SendDocumentDialog)
  const prefillData = selected ? buildPrefillData(selected) : {}
  const prefillableFields = (templateDetail?.fields || []).filter(
    f => !['signature', 'checkbox'].includes(f.type) && f.prefillKey && prefillData[f.prefillKey]
  )
  const checkboxFields = (templateDetail?.fields || []).filter(
    f => f.type === 'checkbox' && Array.isArray(f.options) && f.options.length > 0
  )
  const activePrefillFieldIds = prefillableFields.filter(f => !disabledPrefillIds.has(f.id)).map(f => f.id)
  const hasPrefillableFields  = prefillableFields.length > 0

  const toggleDisabled = (fieldId) => {
    setDisabledPrefillIds(prev => {
      const next = new Set(prev)
      next.has(fieldId) ? next.delete(fieldId) : next.add(fieldId)
      return next
    })
  }
  const toggleCheckboxPrefill = (field, optId) => {
    setCheckboxPrefills(prev => {
      const cur = prev[field.id]
      if (field.multiple) {
        const arr = Array.isArray(cur) ? cur : []
        return { ...prev, [field.id]: arr.includes(optId) ? arr.filter(x => x !== optId) : [...arr, optId] }
      }
      return { ...prev, [field.id]: cur === optId ? '' : optId }
    })
  }

  const handleSend = async () => {
    if (!selected || !signerName.trim()) return
    setSending(true)
    try {
      const body = {
        templateId:    template.id,
        signerName:    signerName.trim(),
        expiresInDays: parseInt(expiresInDays, 10),
        prefillMode,
        prefillData:   { ...prefillData, ...checkboxPrefills },
      }
      if (prefillMode === 'prefilled') body.prefillFieldIds = activePrefillFieldIds
      if (entityType === 'fachkraft') body.profileId = selected.id
      else body.companyId = selected.id

      const res = await fetch('/api/admin/dokumente/send', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unbekannter Fehler')
      setSignerUrl(data.signerUrl)
      setSendId(data.sendId || null)
      // Pre-fill email from selected entity
      const email = entityType === 'fachkraft' ? (selected.contact_email || '') : (selected.email || '')
      setEmailAddress(email)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailAddress.trim() || !sendId) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/admin/dokumente/send-email', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({
          sendId,
          recipientEmail: emailAddress.trim(),
          recipientName: signerName,
          customMessage: useCustomMessage ? customMessage : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden')
      setEmailSent(true)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setEmailSending(false)
    }
  }

  const handleClose = () => {
    setSelected(null); setSearch(''); setSignerUrl(null); setSignerName('')
    setSendId(null); setEmailAddress(''); setUseCustomMessage(false); setCustomMessage(''); setEmailSending(false); setEmailSent(false)
    setDisabledPrefillIds(new Set()); setCheckboxPrefills({}); setFieldPickerOpen(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dokument zuweisen</DialogTitle>
          <DialogDescription>
            Vorlage: <span className="font-medium text-gray-700">{template?.name}</span>
          </DialogDescription>
        </DialogHeader>

        {signerUrl ? (
          <div className="space-y-4">
            {/* Link */}
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Signierlink erfolgreich erstellt
              </div>
              <p className="text-xs text-gray-500">Teile diesen Link per E-Mail, WhatsApp oder direkt:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-700 select-all">{signerUrl}</code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(signerUrl)}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
                <Mail className="h-4 w-4 shrink-0 text-[#1a3a5c]" />
                Per E-Mail senden
              </div>

              {emailSent ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2.5 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  E-Mail wurde gesendet!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-Mail-Adresse</Label>
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={e => setEmailAddress(e.target.value)}
                      placeholder="empfaenger@beispiel.de"
                      className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {!emailAddress && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        Keine E-Mail-Adresse im Profil hinterlegt
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUseCustomMessage(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useCustomMessage ? 'bg-[#1a3a5c]' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${useCustomMessage ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-600">Eigenen Text verfassen</span>
                  </div>

                  {useCustomMessage && (
                    <textarea
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      placeholder="ich sende dir ein Dokument zum Ausfüllen und Unterschreiben."
                      rows={3}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                    />
                  )}

                  <Button
                    onClick={handleSendEmail}
                    disabled={!emailAddress.trim() || emailSending}
                    className="w-full bg-[#0ea5a0] hover:bg-[#0ea5a0]/90 text-white"
                  >
                    {emailSending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet...</>
                      : <><Mail className="h-3.5 w-3.5 mr-1.5" />E-Mail senden</>
                    }
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={handleClose}>Fertig</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="max-h-[75vh] overflow-y-auto pr-0.5 space-y-4">
            {/* Entity type toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {[
                { type: 'fachkraft',   icon: UserCheck,  label: 'Fachkraft' },
                { type: 'unternehmen', icon: Building2,  label: 'Unternehmen' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setEntityType(type); setSelected(null) }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${type !== 'fachkraft' ? 'border-l border-gray-200' : ''} ${
                    entityType === type ? 'bg-[#1a3a5c] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={entityType === 'fachkraft' ? 'Fachkraft suchen...' : 'Unternehmen suchen...'}
                className="w-full h-9 pl-9 pr-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Entity list */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
              {loadingEntities ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Keine Einträge gefunden</p>
              ) : filtered.map(entity => {
                const isSel = selected?.id === entity.id
                const name = entityType === 'fachkraft'
                  ? `${entity.first_name || ''} ${entity.last_name || ''}`.trim()
                  : entity.company_name || `${entity.first_name || ''} ${entity.last_name || ''}`.trim()
                const sub = entityType === 'unternehmen'
                  ? `${entity.first_name || ''} ${entity.last_name || ''}`.trim()
                  : entity.nationality || ''
                return (
                  <button
                    key={entity.id} type="button"
                    onClick={() => handleSelect(entity)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 ${isSel ? 'bg-[#1a3a5c]/5' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isSel ? 'bg-[#1a3a5c] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSel ? 'text-[#1a3a5c]' : 'text-gray-800'}`}>{name || '—'}</p>
                      {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
                    </div>
                    {isSel && <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* After entity selection: same options as SendDocumentDialog */}
            {selected && (
              <>
                <Separator />

                {/* Signer name + expiry */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>Name des Unterzeichners <span className="text-red-500">*</span></Label>
                    <input
                      value={signerName}
                      onChange={e => setSignerName(e.target.value)}
                      placeholder="Max Mustermann"
                      className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ablauf nach</Label>
                    <select
                      value={expiresInDays}
                      onChange={e => setExpiresInDays(e.target.value)}
                      className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} Tage</option>)}
                    </select>
                  </div>
                </div>

                {/* Dokument-Modus (identical to SendDocumentDialog) */}
                {templateLoading ? (
                  <div className="h-20 animate-pulse bg-gray-100 rounded-lg" />
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dokument-Modus</Label>
                    <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                      <button
                        type="button"
                        onClick={() => setPrefillMode('blank')}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${prefillMode === 'blank' ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/60'}`}
                      >
                        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${prefillMode === 'blank' ? 'border-[#1a3a5c]' : 'border-gray-300'}`}>
                          {prefillMode === 'blank' && <div className="h-2 w-2 rounded-full bg-[#1a3a5c]" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Blankes Dokument</p>
                          <p className="text-xs text-gray-400 mt-0.5">Alle Felder werden manuell ausgefüllt</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrefillMode('prefilled')}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${prefillMode === 'prefilled' ? 'bg-[#1a3a5c]/[0.03]' : 'bg-white hover:bg-gray-50/60'}`}
                      >
                        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${prefillMode === 'prefilled' ? 'border-[#1a3a5c]' : 'border-gray-300'}`}>
                          {prefillMode === 'prefilled' && <div className="h-2 w-2 rounded-full bg-[#1a3a5c]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">Vorausgefüllt</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#0d9488]/10 text-[#0d9488] px-1.5 py-0.5 rounded">Empfohlen</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {hasPrefillableFields
                              ? 'Bekannte Daten werden direkt ins PDF eingetragen. Nur offene Felder bleiben übrig.'
                              : 'Keine vorausfüllbaren Felder in dieser Vorlage.'}
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* Field picker */}
                    {prefillMode === 'prefilled' && hasPrefillableFields && (
                      <div className="rounded-xl border border-[#1a3a5c]/15 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setFieldPickerOpen(v => !v)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1a3a5c]/[0.04] hover:bg-[#1a3a5c]/[0.07] transition-colors"
                        >
                          <span className="text-xs font-medium text-[#1a3a5c]">
                            {activePrefillFieldIds.length === prefillableFields.length
                              ? `Alle ${prefillableFields.length} Felder vorausgefüllt`
                              : `${activePrefillFieldIds.length} von ${prefillableFields.length} Feldern vorausgefüllt`}
                          </span>
                          <svg className={`h-3.5 w-3.5 text-[#1a3a5c]/60 transition-transform ${fieldPickerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {fieldPickerOpen && (
                          <div className="divide-y divide-gray-100">
                            {prefillableFields.map(f => {
                              const isActive = !disabledPrefillIds.has(f.id)
                              return (
                                <label key={f.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50/60 transition-colors">
                                  <input type="checkbox" checked={isActive} onChange={() => toggleDisabled(f.id)} className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1a3a5c]" />
                                  <span className="flex-1 text-xs text-gray-700 truncate">{f.label || f.id}</span>
                                  <span className={`text-xs font-medium truncate max-w-[140px] ${isActive ? 'text-gray-600' : 'text-gray-300 line-through'}`}>{prefillData[f.prefillKey]}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Checkbox prefill */}
                {!templateLoading && checkboxFields.length > 0 && (
                  <div className="rounded-lg border border-gray-200 p-3 space-y-4">
                    <p className="text-xs font-medium text-gray-600">Checkboxen vorausfüllen (optional):</p>
                    {checkboxFields.map(field => {
                      const cur = checkboxPrefills[field.id]
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <p className="text-xs text-gray-500 font-medium">{field.label || 'Checkbox'}</p>
                          <div className="flex flex-wrap gap-2">
                            {field.options.map(opt => {
                              const active = field.multiple
                                ? (Array.isArray(cur) ? cur : []).includes(opt.id)
                                : cur === opt.id
                              return (
                                <button
                                  key={opt.id} type="button"
                                  onClick={() => toggleCheckboxPrefill(field, opt.id)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                    active ? 'bg-[#0d9488]/10 border-[#0d9488] text-[#0d9488] font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                  }`}
                                >
                                  {opt.label || opt.id}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            <DialogFooter className="pt-2 sticky bottom-0 bg-white pt-3 border-t border-gray-100 mt-2">
              <Button variant="outline" onClick={handleClose} disabled={sending}>Abbrechen</Button>
              <Button
                onClick={handleSend}
                disabled={sending || !selected || !signerName.trim()}
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
      setDetail(null); setLoading(true)
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
    if (detail?.signedPdfUrl) { window.open(detail.signedPdfUrl, '_blank'); return }
    try {
      const res  = await fetch(`/api/admin/dokumente/sends-detail?sendId=${send.id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const data = await res.json()
      if (data.signedPdfUrl) window.open(data.signedPdfUrl, '_blank')
      else toast({ title: 'Nicht verfügbar', description: 'Kein signiertes PDF vorhanden.', variant: 'destructive' })
    } catch {
      toast({ title: 'Fehler', description: 'URL konnte nicht geladen werden.', variant: 'destructive' })
    }
  }

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      const res  = await fetch('/api/admin/dokumente/revoke', { method: 'POST', headers: authHeaders(session?.access_token), body: JSON.stringify({ sendId: send.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Widerrufen')
      toast({ title: 'Widerrufen', description: 'Der Signierlink wurde widerrufen.', variant: 'success' })
      setConfirmRevoke(false); onRevoked(send.id); onClose()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setRevoking(false)
    }
  }

  const eventCfg = {
    created:   { icon: FileText,     label: () => 'Erstellt' },
    opened:    { icon: Eye,          label: (e) => `Geöffnet${e.count > 1 ? ` (${e.count} Mal)` : ''}` },
    signed:    { icon: CheckCircle2, label: () => 'Unterzeichnet' },
    submitted: { icon: CheckCircle2, label: () => 'Unterzeichnet' },
    revoked:   { icon: XCircle,      label: () => 'Widerrufen' },
  }
  const canRevoke = send && !['revoked', 'signed', 'submitted'].includes(send.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Versand-Details</DialogTitle>
          <DialogDescription>{send?.template_name || detail?.template?.name || '—'}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-gray-500">Unterzeichner</p>
                <p className="font-medium text-gray-800">{send?.signer_name || '—'}</p>
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
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-500">Unterschrieben am</p>
                  <p className="text-gray-700">{formatDateTime(send.signed_at)}</p>
                </div>
              )}
            </div>
            <Separator />
            {detail?.events?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktivitäten</p>
                <ul className="space-y-2">
                  {detail.events.map((ev, i) => {
                    const c = eventCfg[ev.type] || { icon: FileText, label: () => ev.type }
                    const Icon = c.icon
                    const iconColor = ev.type === 'signed' || ev.type === 'submitted' ? 'text-green-500'
                      : ev.type === 'revoked' ? 'text-red-500' : ev.type === 'opened' ? 'text-blue-500' : 'text-gray-400'
                    return (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                        <span className="flex-1 text-gray-700">{c.label(ev)}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(ev.created_at)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {send?.signer_url && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signierlink</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all text-gray-600 select-all">{send.signer_url}</code>
                    <Button size="sm" variant="outline" onClick={() => copy(send.signer_url)} className="shrink-0">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        <DialogFooter className="flex-wrap gap-2">
          {(send?.status === 'signed' || send?.status === 'submitted') && (
            <Button size="sm" variant="outline" className="text-[#0d9488] border-[#0d9488]/40 hover:bg-[#0d9488]/5" onClick={handleDownload}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Signiertes PDF
            </Button>
          )}
          {canRevoke && !confirmRevoke && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmRevoke(true)}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />Widerrufen
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

function TemplateCard({ template, onEdit, onAssign, onDelete }) {
  const labelCfg = getLabelCfg(template.label || 'beide')
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
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${labelCfg.color}`}>
            {labelCfg.label}
          </span>
          {template.sends_count > 0 && (
            <Badge variant="secondary" className="text-xs">{template.sends_count}×</Badge>
          )}
        </div>
      </div>

      {template.description && (
        <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400">
        {template.page_count > 0 && <span>{template.page_count} Seite{template.page_count !== 1 ? 'n' : ''}</span>}
        <span>·</span>
        <span>{formatDateTime(template.created_at)}</span>
      </div>

      <Separator />

      <div className="flex items-center gap-2">
        <Button
          size="sm" variant="outline"
          className="flex-1 text-[#1a3a5c] border-[#1a3a5c]/30 hover:bg-[#1a3a5c]/5"
          onClick={() => onEdit(template)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />Felder
        </Button>
        <Button
          size="sm" variant="outline"
          className="flex-1 text-[#0d9488] border-[#0d9488]/30 hover:bg-[#0d9488]/5"
          onClick={() => onAssign(template)}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />Zuweisen
        </Button>
        <Button
          size="sm" variant="outline"
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
  const navigate   = useNavigate()
  const fileInputRef = useRef(null)
  const [templates,    setTemplates]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [uploading,    setUploading]    = useState(false)
  const [uploadFile,   setUploadFile]   = useState(null)
  const [uploadName,   setUploadName]   = useState('')
  const [uploadDesc,   setUploadDesc]   = useState('')
  const [uploadLabel,  setUploadLabel]  = useState('beide')
  const [compressing,  setCompressing]  = useState(false)
  const [dragOver,     setDragOver]     = useState(false)
  const [search,       setSearch]       = useState('')
  const [labelFilter,  setLabelFilter]  = useState('')
  const [assignTarget, setAssignTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteActiveSendCount, setDeleteActiveSendCount] = useState(0)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => { fetchTemplates() }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/dokumente/list', { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      toast({ title: 'Fehler', description: 'Vorlagen konnten nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const acceptFile = useCallback(async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast({ title: 'Ungültiges Format', description: 'Nur PDF-Dateien sind erlaubt.', variant: 'destructive' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Datei zu groß', description: 'Maximale Dateigröße: 50 MB.', variant: 'destructive' })
      return
    }
    setCompressing(true)
    const compressed = await compressPdf(file)
    setCompressing(false)
    const saved = file.size - compressed.size
    if (saved > 1024) {
      toast({ title: 'PDF komprimiert', description: `Gespart: ${(saved / 1024).toFixed(0)} KB`, variant: 'success' })
    }
    setUploadFile(compressed)
    setUploadName(compressed.name.replace(/\.pdf$/i, ''))
  }, [])

  const handleFileChange = (e) => { acceptFile(e.target.files?.[0]); e.target.value = '' }
  const handleDrop       = (e)  => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files?.[0]) }
  const handleDragOver   = (e)  => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave  = ()   => setDragOver(false)

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
        body: JSON.stringify({ fileName: uploadFile.name, name: uploadName.trim(), description: uploadDesc.trim() || null, label: uploadLabel }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error || 'Fehler beim Abrufen der Upload-URL')

      const putRes = await fetch(urlData.signedUrl, { method: 'PUT', body: uploadFile })
      if (!putRes.ok) throw new Error('Datei-Upload fehlgeschlagen')

      const confirmRes = await fetch('/api/admin/dokumente/confirm-upload', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({ templateId: urlData.templateId, pageCount: 1, fileSize: uploadFile.size }),
      })
      const confirmData = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(confirmData.error || 'Bestätigung fehlgeschlagen')

      toast({ title: 'Hochgeladen', description: `"${uploadName}" wurde erfolgreich hochgeladen.`, variant: 'success' })
      setUploadFile(null); setUploadName(''); setUploadDesc(''); setUploadLabel('beide')
      fetchTemplates()
    } catch (err) {
      toast({ title: 'Upload fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (force = false) => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res  = await fetch('/api/admin/dokumente/delete', {
        method: 'DELETE', headers: authHeaders(session?.access_token),
        body: JSON.stringify({ templateId: deleteTarget.id, force }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.requiresForce && data.activeSendCount > 0) {
          setDeleteActiveSendCount(data.activeSendCount); setDeleting(false); return
        }
        throw new Error(data.error || 'Löschen fehlgeschlagen')
      }
      toast({ title: 'Gelöscht', description: `"${deleteTarget.name}" wurde entfernt.`, variant: 'success' })
      setDeleteTarget(null); setDeleteActiveSendCount(0); fetchTemplates()
    } catch (err) {
      toast({ title: 'Fehler beim Löschen', description: err.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  // Filter templates
  const filtered = templates.filter(t => {
    if (labelFilter && t.label !== labelFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (t.name || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        onClick={() => !uploadFile && !compressing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer select-none
          ${dragOver ? 'border-[#1a3a5c] bg-[#1a3a5c]/5'
            : uploadFile ? 'border-[#0d9488] bg-[#0d9488]/[0.03] cursor-default'
            : compressing ? 'border-gray-300 bg-gray-50 cursor-wait'
            : 'border-[#1a3a5c]/25 bg-[#1a3a5c]/[0.02] hover:border-[#1a3a5c]/50 hover:bg-[#1a3a5c]/[0.04]'
          }`}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />

        {compressing ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <Loader2 className="h-6 w-6 text-[#1a3a5c] animate-spin mb-3" />
            <p className="text-sm text-gray-600 font-medium">PDF wird komprimiert...</p>
          </div>
        ) : !uploadFile ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-[#1a3a5c]/20' : 'bg-[#1a3a5c]/10'}`}>
              <Upload className={`h-5 w-5 transition-colors ${dragOver ? 'text-[#1a3a5c]' : 'text-[#1a3a5c]/70'}`} />
            </div>
            <p className="font-semibold text-gray-700 text-sm mb-1">
              {dragOver ? 'Datei loslassen zum Hochladen' : 'PDF hier ablegen oder klicken zum Auswählen'}
            </p>
            <p className="text-xs text-gray-400">Nur PDF-Dateien · max. 50 MB · wird automatisch komprimiert</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
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
                onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadName(''); setUploadDesc(''); setUploadLabel('beide') }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
              <div className="space-y-1.5">
                <Label htmlFor="upload-name">Titel <span className="text-red-500">*</span></Label>
                <Input id="upload-name" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="z. B. Arbeitsvertrag" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upload-desc">Beschreibung <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input id="upload-desc" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="Kurze Beschreibung" />
              </div>
            </div>

            {/* Label selector */}
            <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
              <Label>Kategorie</Label>
              <div className="flex gap-2">
                {LABEL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUploadLabel(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      uploadLabel === opt.value ? `${opt.color} ring-2 ring-offset-1 ring-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end" onClick={e => e.stopPropagation()}>
              <Button onClick={handleUpload} disabled={uploading || !uploadName.trim()} className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
                {uploading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird hochgeladen...</>
                  : <><Upload className="h-4 w-4 mr-2" />Vorlage hochladen</>
                }
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search + label filter bar */}
      {templates.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Vorlagen durchsuchen..."
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setLabelFilter('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!labelFilter ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              Alle
            </button>
            {LABEL_OPTIONS.filter(l => l.value !== 'beide').map(l => (
              <button
                key={l.value}
                onClick={() => setLabelFilter(labelFilter === l.value ? '' : l.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  labelFilter === l.value ? `${l.color} ring-1 ring-current` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search || labelFilter ? 'Keine passenden Vorlagen' : 'Noch keine Vorlagen hochgeladen'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={(tmpl) => navigate(`/admin/dokumente/editor/${tmpl.id}`)}
              onAssign={(tmpl) => setAssignTarget(tmpl)}
              onDelete={(tmpl) => setDeleteTarget(tmpl)}
            />
          ))}
        </div>
      )}

      {assignTarget && (
        <AssignDialog
          template={assignTarget}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          session={session}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteActiveSendCount(0) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vorlage löschen?</DialogTitle>
            {deleteActiveSendCount > 0 ? (
              <DialogDescription asChild>
                <div className="space-y-3">
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    <p className="font-semibold mb-1">⚠️ {deleteActiveSendCount} aktive Versendung{deleteActiveSendCount !== 1 ? 'en' : ''} vorhanden</p>
                    <p>Diese werden automatisch widerrufen und zusammen mit der Vorlage <strong>"{deleteTarget?.name}"</strong> gelöscht.</p>
                  </div>
                  <p className="text-sm text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                </div>
              </DialogDescription>
            ) : (
              <DialogDescription>
                Soll <span className="font-medium text-gray-700">"{deleteTarget?.name}"</span> wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteActiveSendCount(0) }} disabled={deleting}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteActiveSendCount > 0)} disabled={deleting}>
              {deleting
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Löschen...</>
                : deleteActiveSendCount > 0
                  ? <><Trash2 className="h-4 w-4 mr-2" />Alle löschen</>
                  : <><Trash2 className="h-4 w-4 mr-2" />Löschen</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Versand Tab ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: '',                    label: 'Alle' },
  { key: 'pending,opened',      label: 'Ausstehend' },
  { key: 'signed,submitted',    label: 'Unterzeichnet' },
  { key: 'expired,revoked',     label: 'Abgelaufen/Widerrufen' },
]

function VersandTab({ session }) {
  const [sends,        setSends]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('')
  const [search,       setSearch]       = useState('')
  const [detailSend,   setDetailSend]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const { copied, copy } = useCopyText()

  useEffect(() => { fetchSends() }, [filter])

  const fetchSends = async () => {
    setLoading(true)
    try {
      const params = filter ? `?status=${encodeURIComponent(filter)}` : ''
      const res  = await fetch(`/api/admin/dokumente/sends-list${params}`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const data = await res.json()
      setSends(data.sends || [])
    } catch {
      toast({ title: 'Fehler', description: 'Versand-Liste konnte nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleRevoked = (sendId) => setSends(prev => prev.map(s => s.id === sendId ? { ...s, status: 'revoked' } : s))

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/dokumente/delete-send', {
        method: 'DELETE',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({ sendId: deleteTarget.id }),
      })
      if (!res.ok) throw new Error()
      setSends(prev => prev.filter(s => s.id !== deleteTarget.id))
      toast({ title: 'Gelöscht', description: `Versand-Eintrag wurde entfernt.` })
    } catch {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht gelöscht werden.', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? sends.filter(s =>
        (s.template_name || '').toLowerCase().includes(q) ||
        (s.signer_name   || '').toLowerCase().includes(q) ||
        (s.signer_email  || '').toLowerCase().includes(q)
      )
    : sends

  return (
    <div className="space-y-4">
      {/* Status-Filter + Suche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filter === opt.key ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Vorlage oder Empfänger…"
            className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{q ? 'Keine Einträge für diese Suche' : 'Keine Versand-Einträge gefunden'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Vorlage', 'Empfänger', 'Status', 'Erstellt', 'Unterschrieben am', 'Aktionen'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(send => (
                  <tr key={send.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3"><p className="font-medium text-gray-800 truncate max-w-[160px]">{send.template_name || '—'}</p></td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 truncate max-w-[140px]">{send.signer_name}</p>
                      {send.signer_email && <p className="text-xs text-gray-400 truncate max-w-[140px]">{send.signer_email}</p>}
                    </td>
                    <td className="px-4 py-3"><SendStatusBadge status={send.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(send.created_at)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{send.signed_at ? formatDateTime(send.signed_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setDetailSend(send)}>Details</Button>
                        {send.signer_url && (
                          <button
                            onClick={() => copy(send.signer_url)}
                            title="Signierlink kopieren"
                            className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5 text-gray-500" />}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(send)}
                          title="Eintrag löschen"
                          className="h-7 w-7 flex items-center justify-center rounded border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
        <SendDetailDialog send={detailSend} open={!!detailSend} onClose={() => setDetailSend(null)} session={session} onRevoked={handleRevoked} />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eintrag löschen?</DialogTitle>
            <DialogDescription>
              Versand <strong>{deleteTarget?.template_name || '—'}</strong> an <strong>{deleteTarget?.signer_name}</strong> wird unwiderruflich gelöscht — inklusive signierter PDF (falls vorhanden).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Löschen…</> : 'Ja, löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MediathekPage() {
  const { session } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dokumentenvorlagen</h1>
        <p className="text-gray-500 mt-1 text-sm">PDF-Vorlagen verwalten, Felder definieren & direkt an Fachkräfte oder Unternehmen zuweisen</p>
      </div>

      <Tabs defaultValue="vorlagen">
        <TabsList className="mb-2">
          <TabsTrigger value="vorlagen">Vorlagen</TabsTrigger>
          <TabsTrigger value="versand">Versand</TabsTrigger>
        </TabsList>
        <TabsContent value="vorlagen"><VorlagenTab session={session} /></TabsContent>
        <TabsContent value="versand"><VersandTab session={session} /></TabsContent>
      </Tabs>
    </div>
  )
}
