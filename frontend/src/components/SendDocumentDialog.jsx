import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle2, ClipboardCopy, Check, FileText, Loader2, Link2, Mail,
  AlertCircle, Forward, Search, User, FileCheck, FolderOpen,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const Field = ({ label, children, required }) => (
  <div className="space-y-1.5">
    <Label>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {children}
  </div>
)

/**
 * Reusable dialog for sending/forwarding a document.
 *
 * Props:
 *   entityType: 'profile' | 'company'
 *   entityId: uuid string
 *   prefillData: { prefillKey: value }
 *   defaultSignerName: string
 *   defaultEmail: string
 *   linkedProfiles: [{ id, first_name, last_name, profile_image_url }] — linked Fachkräfte (for company page)
 *   session: supabase session object
 *   onClose: () => void
 *   onSent: () => void
 */
export default function SendDocumentDialog({
  entityType = 'profile',
  entityId,
  prefillData = {},
  defaultSignerName = '',
  defaultEmail = '',
  linkedProfiles = [],
  session,
  onClose,
  onSent,
}) {
  // ── Top-level mode ────────────────────────────────────────────
  const [mode, setMode] = useState('sign') // 'sign' | 'forward'

  // ── Sign mode state ───────────────────────────────────────────
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [sending, setSending] = useState(false)
  const [signerUrl, setSignerUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [sendId, setSendId] = useState(null)
  const [emailAddress, setEmailAddress] = useState(defaultEmail)
  const [useCustomMessage, setUseCustomMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [checkboxPrefills, setCheckboxPrefills] = useState({})
  const [prefillMode, setPrefillMode] = useState('prefilled')
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false)
  const [disabledPrefillIds, setDisabledPrefillIds] = useState(new Set())
  const [adminFieldValues, setAdminFieldValues] = useState({})

  // ── Forward mode state ────────────────────────────────────────
  const [fwdProfileId, setFwdProfileId] = useState(
    entityType === 'profile' ? entityId : (linkedProfiles[0]?.id || '')
  )
  const [fwdProfileName, setFwdProfileName] = useState(
    entityType === 'profile' ? defaultSignerName : (
      linkedProfiles[0] ? `${linkedProfiles[0].first_name} ${linkedProfiles[0].last_name}` : ''
    )
  )
  // Track selected non-linked profile separately for visual display
  const [fwdExtraProfile, setFwdExtraProfile] = useState(null) // { id, first_name, last_name, profile_image_url }
  const [fwdProfileSearch, setFwdProfileSearch] = useState('')
  const [fwdSearchResults, setFwdSearchResults] = useState([])
  const [fwdSearching, setFwdSearching] = useState(false)
  const [fwdSearchOpen, setFwdSearchOpen] = useState(false)
  const [fwdDocSource, setFwdDocSource] = useState('profile') // 'profile' | 'signed'
  const [fwdDocs, setFwdDocs] = useState([])
  const [fwdDocsLoading, setFwdDocsLoading] = useState(false)
  const [fwdSelectedDoc, setFwdSelectedDoc] = useState(null)
  const [fwdRecipientName, setFwdRecipientName] = useState(entityType === 'company' ? defaultSignerName : '')
  const [fwdRecipientEmail, setFwdRecipientEmail] = useState(entityType === 'company' ? defaultEmail : '')
  const [fwdUseCustomMessage, setFwdUseCustomMessage] = useState(false)
  const [fwdCustomMessage, setFwdCustomMessage] = useState('')
  const [fwdSending, setFwdSending] = useState(false)
  const [fwdResult, setFwdResult] = useState(null) // { docTitle, docUrl, emailSent }
  const [fwdCopied, setFwdCopied] = useState(false)

  const searchTimeout = useRef(null)

  // ── Effects ───────────────────────────────────────────────────

  useEffect(() => {
    setCheckboxPrefills({})
    setDisabledPrefillIds(new Set())
    setFieldPickerOpen(false)
    setAdminFieldValues({})
  }, [selectedId])

  useEffect(() => {
    fetch('/api/admin/dokumente/list', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setTemplatesLoading(false) })
      .catch(() => setTemplatesLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) { setSelectedTemplate(null); return }
    setTemplateLoading(true)
    fetch(`/api/admin/dokumente/get?templateId=${selectedId}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setSelectedTemplate(d.template || null); setTemplateLoading(false) })
      .catch(() => setTemplateLoading(false))
  }, [selectedId])

  // Load forward docs when profile or source changes
  useEffect(() => {
    if (!fwdProfileId) { setFwdDocs([]); return }
    setFwdDocsLoading(true)
    setFwdSelectedDoc(null)
    const endpoint = fwdDocSource === 'signed'
      ? `/api/admin/dokumente/signed-docs?profileId=${fwdProfileId}`
      : `/api/admin/profile-docs/list?profileId=${fwdProfileId}`
    fetch(endpoint, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setFwdDocs(d.docs || []); setFwdDocsLoading(false) })
      .catch(() => setFwdDocsLoading(false))
  }, [fwdProfileId, fwdDocSource])

  // Profile search debounce
  useEffect(() => {
    if (!fwdProfileSearch.trim()) { setFwdSearchResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setFwdSearching(true)
      fetch(`/api/admin/profiles/search?q=${encodeURIComponent(fwdProfileSearch)}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then(r => r.json())
        .then(d => { setFwdSearchResults(d.profiles || []); setFwdSearching(false) })
        .catch(() => setFwdSearching(false))
    }, 300)
    return () => clearTimeout(searchTimeout.current)
  }, [fwdProfileSearch])

  // ── Sign mode helpers ─────────────────────────────────────────

  const recipientType = entityType === 'company' ? 'unternehmen' : 'fachkraft'

  const prefillableFields = (selectedTemplate?.fields || []).filter(
    f => !['signature', 'checkbox'].includes(f.type) && f.prefillKey && prefillData[f.prefillKey]
  )
  const checkboxFields = (selectedTemplate?.fields || []).filter(
    f => f.type === 'checkbox' && Array.isArray(f.options) && f.options.length > 0
  )
  const adminFields = (selectedTemplate?.fields || []).filter(
    f => f.audience === 'admin' && !['signature', 'checkbox'].includes(f.type)
  )
  const activePrefillFieldIds = prefillableFields
    .filter(f => !disabledPrefillIds.has(f.id))
    .map(f => f.id)
  const hasPrefillableFields = prefillableFields.length > 0
  const activeCount = activePrefillFieldIds.length
  const totalCount = prefillableFields.length

  const toggleDisabled = (fieldId) => {
    setDisabledPrefillIds(prev => {
      const next = new Set(prev)
      if (next.has(fieldId)) next.delete(fieldId)
      else next.add(fieldId)
      return next
    })
  }

  const toggleCheckboxPrefill = (field, optId) => {
    const isMultiple = field.multiple === true
    setCheckboxPrefills(prev => {
      const cur = prev[field.id]
      if (isMultiple) {
        const arr = Array.isArray(cur) ? cur : []
        return { ...prev, [field.id]: arr.includes(optId) ? arr.filter(x => x !== optId) : [...arr, optId] }
      } else {
        return { ...prev, [field.id]: cur === optId ? '' : optId }
      }
    })
  }

  const handleCreate = async () => {
    if (!selectedId || !signerName.trim()) return
    setSending(true)
    try {
      const body = {
        templateId: selectedId,
        signerName: signerName.trim(),
        signerEmail: null,
        prefillData: { ...prefillData, ...checkboxPrefills, ...adminFieldValues },
        prefillMode,
        recipientType,
      }
      if (entityType === 'profile') body.profileId = entityId
      if (entityType === 'company') body.companyId = entityId
      if (prefillMode === 'prefilled') body.prefillFieldIds = activePrefillFieldIds

      const res = await fetch('/api/admin/dokumente/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')
      setSignerUrl(data.signerUrl)
      setSendId(data.sendId || null)
      onSent?.()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(signerUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSendEmail = async () => {
    if (!emailAddress.trim() || !sendId) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/admin/dokumente/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
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

  // ── Forward mode helpers ──────────────────────────────────────

  const selectForwardProfile = (profile) => {
    setFwdProfileId(profile.id)
    setFwdProfileName(`${profile.first_name} ${profile.last_name}`)
    // Only store as extra if not already in linked profiles
    const isLinked = linkedProfiles.some(p => p.id === profile.id)
    setFwdExtraProfile(isLinked ? null : profile)
    setFwdProfileSearch('')
    setFwdSearchResults([])
    setFwdSearchOpen(false)
  }

  const handleForward = async () => {
    if (!fwdSelectedDoc || !fwdRecipientEmail.trim()) return
    setFwdSending(true)
    try {
      const res = await fetch('/api/admin/dokumente/share-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          recipientEmail: fwdRecipientEmail.trim(),
          recipientName: fwdRecipientName.trim() || undefined,
          documentTitle: fwdSelectedDoc.title,
          documentUrl: fwdSelectedDoc.url,
          customMessage: fwdUseCustomMessage ? fwdCustomMessage : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Weiterleiten')
      setFwdResult({ docTitle: fwdSelectedDoc.title, docUrl: fwdSelectedDoc.url, emailSent: true })
      onSent?.()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setFwdSending(false)
    }
  }

  const copyFwdUrl = () => {
    if (!fwdResult?.docUrl) return
    navigator.clipboard.writeText(fwdResult.docUrl).then(() => {
      setFwdCopied(true)
      setTimeout(() => setFwdCopied(false), 2000)
    })
  }

  // ── Render ────────────────────────────────────────────────────

  const showModeToggle = !signerUrl && !fwdResult

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {signerUrl ? 'Signierlink generiert'
              : fwdResult ? 'Dokument weitergeleitet'
              : 'Dokument senden'}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        {showModeToggle && (
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('sign')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'sign'
                  ? 'bg-white text-[#1a3a5c] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Zum Unterschreiben
            </button>
            <button
              type="button"
              onClick={() => setMode('forward')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'forward'
                  ? 'bg-white text-[#1a3a5c] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Forward className="h-3.5 w-3.5" />
              Weiterleiten
            </button>
          </div>
        )}

        {/* ── SIGN MODE ── */}
        {mode === 'sign' && (
          signerUrl ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Link für {signerName} erstellt
                </div>
                <p className="text-xs text-gray-500">Teile diesen Link per E-Mail, WhatsApp oder direkt:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-700 select-all">
                    {signerUrl}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={copyUrl}>
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

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
                      <Input
                        type="email"
                        value={emailAddress}
                        onChange={e => setEmailAddress(e.target.value)}
                        placeholder="empfaenger@beispiel.de"
                        className="text-sm"
                      />
                      {!defaultEmail && !emailAddress && (
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
                <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={onClose}>Fertig</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-1 max-h-[65vh] overflow-y-auto pr-1">
              {/* Template picker */}
              <div className="space-y-1.5">
                <Label>Vorlage <span className="text-red-500">*</span></Label>
                {templatesLoading ? (
                  <div className="h-9 animate-pulse bg-gray-100 rounded-md" />
                ) : templates.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Keine aktiven Vorlagen vorhanden.</p>
                ) : (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger><SelectValue placeholder="Vorlage wählen..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => {
                        const labelMap = { fachkraft: 'Fachkraft', unternehmen: 'Unternehmen' }
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}{t.label && t.label !== 'beide' ? ` [${labelMap[t.label]}]` : ''}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Field label="Unterzeichner" required>
                <Input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Vor- und Nachname"
                />
              </Field>

              {selectedId && templateLoading && (
                <div className="h-20 animate-pulse bg-gray-100 rounded-lg" />
              )}

              {selectedId && !templateLoading && (
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
                            ? 'Bekannte Daten werden direkt ins PDF eingetragen.'
                            : 'Keine vorausfüllbaren Felder in dieser Vorlage.'}
                        </p>
                      </div>
                    </button>
                  </div>

                  {prefillMode === 'prefilled' && hasPrefillableFields && (
                    <div className="rounded-xl border border-[#1a3a5c]/15 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setFieldPickerOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1a3a5c]/[0.04] hover:bg-[#1a3a5c]/[0.07] transition-colors"
                      >
                        <span className="text-xs font-medium text-[#1a3a5c]">
                          {activeCount === totalCount
                            ? `Alle ${totalCount} Felder vorausgefüllt`
                            : `${activeCount} von ${totalCount} Feldern vorausgefüllt`}
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
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={() => toggleDisabled(f.id)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1a3a5c]"
                                />
                                <span className="flex-1 text-xs text-gray-700 truncate">{f.label || f.id}</span>
                                <span className={`text-xs font-medium truncate max-w-[140px] ${isActive ? 'text-gray-600' : 'text-gray-300 line-through'}`}>
                                  {prefillData[f.prefillKey]}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedId && !templateLoading && checkboxFields.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-3 space-y-4">
                  <p className="text-xs font-medium text-gray-600">Checkboxen vorausfüllen (optional):</p>
                  {checkboxFields.map(field => {
                    const isMultiple = field.multiple === true
                    const cur = checkboxPrefills[field.id]
                    return (
                      <div key={field.id} className="space-y-1.5">
                        <p className="text-xs text-gray-500 font-medium">{field.label || 'Checkbox'}</p>
                        <div className="flex flex-wrap gap-2">
                          {field.options.map(opt => {
                            const active = isMultiple
                              ? (Array.isArray(cur) ? cur : []).includes(opt.id)
                              : cur === opt.id
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleCheckboxPrefill(field, opt.id)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                  active
                                    ? 'bg-[#0d9488]/10 border-[#0d9488] text-[#0d9488] font-medium'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
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

              {/* FKVI admin fields — filled by admin before sending */}
              {selectedId && !templateLoading && adminFields.length > 0 && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-3">
                  <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-purple-500 text-white flex items-center justify-center text-[9px] font-bold">AD</span>
                    FKVI-Felder (werden direkt eingetragen)
                  </p>
                  {adminFields.map(f => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-xs text-purple-600 font-medium">{f.label || f.type}</label>
                      <input
                        type="text"
                        value={adminFieldValues[f.id] || ''}
                        onChange={e => setAdminFieldValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                        placeholder={`${f.label || f.type}...`}
                        className="w-full h-8 text-sm border border-purple-200 rounded-md px-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Abbrechen</Button>
                <Button
                  onClick={handleCreate}
                  disabled={!selectedId || !signerName.trim() || sending}
                  className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                >
                  {sending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Erstelle Link...</>
                    : <><Link2 className="h-3.5 w-3.5 mr-1.5" />Link generieren</>
                  }
                </Button>
              </DialogFooter>
            </div>
          )
        )}

        {/* ── FORWARD MODE ── */}
        {mode === 'forward' && (
          fwdResult ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Dokument weitergeleitet
                </div>
                <p className="text-sm text-gray-700 font-medium">{fwdResult.docTitle}</p>
                {fwdResult.emailSent && (
                  <p className="text-xs text-green-600">E-Mail wurde gesendet an {fwdRecipientEmail}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-600 select-all">
                    {fwdResult.docUrl}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={copyFwdUrl}>
                    {fwdCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={onClose}>Fertig</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-1 max-h-[65vh] overflow-y-auto pr-1">

              {/* Profile selector — only for company context */}
              {entityType === 'company' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fachkraft</Label>

                  {/* Linked profiles */}
                  {linkedProfiles.length > 0 && (
                    <div className="space-y-1.5">
                      {linkedProfiles.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectForwardProfile(p)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                            fwdProfileId === p.id
                              ? 'border-[#1a3a5c] bg-[#1a3a5c]/[0.04]'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.profile_image_url
                              ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                              : <User className="h-3.5 w-3.5 text-gray-400" />
                            }
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-800">
                            {p.first_name} {p.last_name}
                          </span>
                          <span className="text-[10px] font-semibold bg-[#0d9488]/10 text-[#0d9488] px-2 py-0.5 rounded-full">Aktive Vermittlung</span>
                          {fwdProfileId === p.id && <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected extra (non-linked) profile */}
                  {fwdExtraProfile && (
                    <div className="border border-[#1a3a5c] bg-[#1a3a5c]/[0.04] rounded-lg px-3 py-2.5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {fwdExtraProfile.profile_image_url
                          ? <img src={fwdExtraProfile.profile_image_url} alt="" className="w-full h-full object-cover" />
                          : <User className="h-3.5 w-3.5 text-gray-400" />
                        }
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {fwdExtraProfile.first_name} {fwdExtraProfile.last_name}
                      </span>
                      <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />
                    </div>
                  )}

                  {/* Search for other profiles */}
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        value={fwdProfileSearch}
                        onChange={e => { setFwdProfileSearch(e.target.value); setFwdSearchOpen(true) }}
                        onFocus={() => setFwdSearchOpen(true)}
                        onBlur={() => setTimeout(() => setFwdSearchOpen(false), 150)}
                        placeholder={linkedProfiles.length ? 'Andere Fachkraft suchen...' : 'Fachkraft suchen...'}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                      />
                      {fwdSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />}
                    </div>
                    {fwdSearchOpen && fwdSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                        {fwdSearchResults.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => selectForwardProfile(p)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {p.profile_image_url
                                ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                                : <User className="h-3.5 w-3.5 text-gray-400" />
                              }
                            </div>
                            <span className="text-sm text-gray-800">{p.first_name} {p.last_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Document source toggle */}
              {(fwdProfileId || entityType === 'profile') && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dokumentenquelle</Label>
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFwdDocSource('profile')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                        fwdDocSource === 'profile'
                          ? 'bg-white text-[#1a3a5c] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Profil-Dokumente
                    </button>
                    <button
                      type="button"
                      onClick={() => setFwdDocSource('signed')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                        fwdDocSource === 'signed'
                          ? 'bg-white text-[#1a3a5c] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      Signierte PDFs
                    </button>
                  </div>

                  {/* Document list */}
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {fwdDocsLoading ? (
                      <div className="space-y-1.5">
                        {[1,2].map(i => <div key={i} className="h-12 animate-pulse bg-gray-100 rounded-lg" />)}
                      </div>
                    ) : fwdDocs.length === 0 ? (
                      <div className="text-center py-6 text-sm text-gray-400">
                        {fwdDocSource === 'signed'
                          ? 'Keine signierten Dokumente vorhanden'
                          : 'Keine Profil-Dokumente vorhanden'
                        }
                      </div>
                    ) : fwdDocs.map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setFwdSelectedDoc(doc)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          fwdSelectedDoc?.id === doc.id
                            ? 'border-[#1a3a5c] bg-[#1a3a5c]/[0.04]'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          fwdDocSource === 'signed' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {fwdDocSource === 'signed'
                            ? <FileCheck className="h-3.5 w-3.5 text-green-600" />
                            : <FileText className="h-3.5 w-3.5 text-blue-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                          {doc.signerName && (
                            <p className="text-xs text-gray-400">Signiert von {doc.signerName}</p>
                          )}
                          {doc.doc_type && (
                            <p className="text-xs text-gray-400 capitalize">{doc.doc_type}</p>
                          )}
                        </div>
                        {fwdSelectedDoc?.id === doc.id && <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient */}
              {fwdSelectedDoc && (
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Empfänger</Label>
                  <Field label="Name">
                    <Input
                      value={fwdRecipientName}
                      onChange={e => setFwdRecipientName(e.target.value)}
                      placeholder="Vor- und Nachname"
                      className="text-sm"
                    />
                  </Field>
                  <Field label="E-Mail-Adresse" required>
                    <Input
                      type="email"
                      value={fwdRecipientEmail}
                      onChange={e => setFwdRecipientEmail(e.target.value)}
                      placeholder="empfaenger@beispiel.de"
                      className="text-sm"
                    />
                  </Field>

                  {/* Custom message toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFwdUseCustomMessage(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${fwdUseCustomMessage ? 'bg-[#1a3a5c]' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${fwdUseCustomMessage ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-600">Nachricht hinzufügen</span>
                  </div>
                  {fwdUseCustomMessage && (
                    <textarea
                      value={fwdCustomMessage}
                      onChange={e => setFwdCustomMessage(e.target.value)}
                      placeholder="anbei findest du das gewünschte Dokument."
                      rows={3}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                    />
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Abbrechen</Button>
                <Button
                  onClick={handleForward}
                  disabled={!fwdSelectedDoc || !fwdRecipientEmail.trim() || fwdSending}
                  className="bg-[#0ea5a0] hover:bg-[#0ea5a0]/90 text-white"
                >
                  {fwdSending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet...</>
                    : <><Forward className="h-3.5 w-3.5 mr-1.5" />Weiterleiten</>
                  }
                </Button>
              </DialogFooter>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
