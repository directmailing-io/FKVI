import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ClipboardCopy, Check, Package, Loader2, Mail, AlertCircle, Search, User, FileText, X, Paperclip, FileCheck, FolderOpen } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const LABEL_META = {
  fachkraft:   { text: 'Fachkraft',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  unternehmen: { text: 'Unternehmen', cls: 'bg-green-50 text-green-700 border-green-200' },
  beide:       { text: null,          cls: '' },
}

const DOC_TYPE_LABELS = {
  lebenslauf: 'Lebenslauf', reisepass: 'Reisepass', zeugnis: 'Zeugnis',
  urkunde: 'Urkunde', anerkennung: 'Anerkennung', sprachzeugnis: 'Sprachnachweis', andere: 'Sonstiges',
}

export default function BundleDialog({
  entityType = 'profile',
  entityId,
  prefillData = {},
  defaultSignerName = '',
  defaultEmail = '',
  session,
  onClose,
  onSent,
}) {
  // Form state
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [bundleTitle, setBundleTitle] = useState('')

  // Templates
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState(new Set())

  // Profile docs (attachments)
  const [profileSearch, setProfileSearch] = useState('')
  const [profileResults, setProfileResults] = useState([])
  const [profileSearching, setProfileSearching] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null) // {id, first_name, last_name}
  const [docSource, setDocSource] = useState('profile') // 'profile' | 'signed'
  const [profileDocs, setProfileDocs] = useState([])
  const [profileDocsLoading, setProfileDocsLoading] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState(new Set())
  const searchRef = useRef(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Creation state
  const [creating, setCreating] = useState(false)
  const [bundleUrl, setBundleUrl] = useState(null)
  const [bundleId, setBundleId] = useState(null)
  const [copied, setCopied] = useState(false)

  // Email state
  const [emailAddress, setEmailAddress] = useState(defaultEmail)
  const [useCustomMessage, setUseCustomMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Load templates
  useEffect(() => {
    fetch('/api/admin/dokumente/list', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setTemplatesLoading(false) })
      .catch(() => setTemplatesLoading(false))
  }, [])

  // Auto-load docs for profile entity, or when selectedProfile/docSource changes
  const activeProfileId = entityType === 'profile' ? entityId : selectedProfile?.id
  useEffect(() => {
    if (!activeProfileId) { setProfileDocs([]); return }
    setProfileDocsLoading(true)
    setSelectedDocIds(new Set())
    const endpoint = docSource === 'signed'
      ? `/api/admin/dokumente/signed-docs?profileId=${activeProfileId}`
      : `/api/admin/profile-docs/list?profileId=${activeProfileId}`
    fetch(endpoint, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      .then(r => r.json())
      .then(d => { setProfileDocs(d.docs || []); setProfileDocsLoading(false) })
      .catch(() => setProfileDocsLoading(false))
  }, [activeProfileId, docSource])

  // Profile search (company context)
  useEffect(() => {
    if (entityType !== 'company') return
    if (!profileSearch.trim()) { setProfileResults([]); return }
    const timer = setTimeout(async () => {
      setProfileSearching(true)
      try {
        const res = await fetch(`/api/admin/profiles/search?q=${encodeURIComponent(profileSearch)}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const data = await res.json()
        setProfileResults(data.profiles || [])
        setShowDropdown(true)
      } catch {}
      finally { setProfileSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [profileSearch, entityType])

  const toggleTemplate = (id) => setSelectedTemplateIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleDoc = (id) => setSelectedDocIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const selectProfile = (profile) => {
    setSelectedProfile(profile)
    setProfileSearch(`${profile.first_name || ''} ${profile.last_name || ''}`.trim())
    setShowDropdown(false)
  }
  const clearProfile = () => {
    setSelectedProfile(null)
    setProfileSearch('')
    setProfileDocs([])
    setSelectedDocIds(new Set())
  }

  const totalSelected = selectedTemplateIds.size + selectedDocIds.size

  const handleCreate = async () => {
    if (totalSelected === 0 || !signerName.trim()) return
    setCreating(true)
    try {
      // Build attachments from selected docs
      const pName = selectedProfile
        ? `${selectedProfile.first_name || ''} ${selectedProfile.last_name || ''}`.trim()
        : null
      const attachments = profileDocs
        .filter(d => selectedDocIds.has(d.id))
        .map(d => ({
          id: d.id,
          title: d.title,
          doc_type: docSource === 'signed' ? 'signiert' : (d.doc_type || null),
          url: docSource === 'signed' ? d.url : d.link,
          profile_id: selectedProfile?.id || entityId,
          profile_name: pName,
        }))

      const body = {
        templateIds: [...selectedTemplateIds],
        attachments,
        signerName: signerName.trim(),
        prefillData,
        title: bundleTitle.trim() || undefined,
      }
      if (entityType === 'profile') body.profileId = entityId
      if (entityType === 'company') body.companyId = entityId

      const res = await fetch('/api/admin/dokumente/bundle-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')
      setBundleUrl(data.bundleUrl)
      setBundleId(data.bundleId)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(bundleUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSendEmail = async () => {
    if (!emailAddress.trim() || !bundleId) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/admin/dokumente/bundle-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          bundleId,
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

  const profileName = selectedProfile
    ? `${selectedProfile.first_name || ''} ${selectedProfile.last_name || ''}`.trim()
    : null

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {bundleUrl ? 'Paket-Link generiert' : 'Dokument-Paket erstellen'}
          </DialogTitle>
        </DialogHeader>

        {bundleUrl ? (
          /* ── Success screen ── */
          <div className="space-y-4 overflow-y-auto flex-1 pr-0.5">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Paket für {signerName} erstellt – {selectedTemplateIds.size} {selectedTemplateIds.size === 1 ? 'Vorlage' : 'Vorlagen'}
                {selectedDocIds.size > 0 && ` + ${selectedDocIds.size} Anhang${selectedDocIds.size > 1 ? 'anhänge' : ''}`}
              </div>
              <p className="text-xs text-gray-500">Teile diesen Link per E-Mail, WhatsApp oder direkt:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-700 select-all">
                  {bundleUrl}
                </code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyUrl}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
                <Mail className="h-4 w-4 shrink-0 text-[#1a3a5c]" />Per E-Mail senden
              </div>
              {emailSent ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2.5 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />E-Mail wurde gesendet!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-Mail-Adresse</Label>
                    <Input type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)}
                      placeholder="empfaenger@beispiel.de" className="text-sm" />
                    {!emailAddress && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3 shrink-0" />Keine E-Mail-Adresse hinterlegt
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setUseCustomMessage(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useCustomMessage ? 'bg-[#1a3a5c]' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${useCustomMessage ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-600">Eigenen Text verfassen</span>
                  </div>
                  {useCustomMessage && (
                    <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                      placeholder="Hier einen eigenen Begleittext eingeben..." rows={3}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]" />
                  )}
                  <Button onClick={handleSendEmail} disabled={!emailAddress.trim() || emailSending}
                    className="w-full bg-[#0ea5a0] hover:bg-[#0ea5a0]/90 text-white">
                    {emailSending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet...</>
                      : <><Mail className="h-3.5 w-3.5 mr-1.5" />E-Mail senden</>}
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={() => { onSent?.(); onClose() }}>
                Fertig
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Create screen ── */
          <div className="space-y-5 overflow-y-auto flex-1 pr-0.5 py-1">

            {/* Signer + title */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Unterzeichner <span className="text-red-500">*</span></Label>
                <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Vor- und Nachname" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Paket-Titel <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input value={bundleTitle} onChange={e => setBundleTitle(e.target.value)}
                  placeholder="z. B. Unterlagen für Arbeitsvermittlung" />
              </div>
            </div>

            {/* ── Section 1: Templates ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Vorlagen zum Unterschreiben</span>
                {selectedTemplateIds.size > 0 && (
                  <span className="ml-auto text-xs text-[#1a3a5c] font-medium">{selectedTemplateIds.size} ausgewählt</span>
                )}
              </div>
              {templatesLoading ? (
                <div className="h-28 animate-pulse bg-gray-100 rounded-lg" />
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-400 italic px-1">Keine aktiven Vorlagen vorhanden.</p>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 max-h-52 overflow-y-auto">
                  {templates.map(t => {
                    const checked = selectedTemplateIds.has(t.id)
                    const labelMeta = LABEL_META[t.label] || LABEL_META.beide
                    return (
                      <label key={t.id}
                        className={cn('flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                          checked ? 'bg-[#1a3a5c]/[0.04]' : 'bg-white hover:bg-gray-50/60')}>
                        <input type="checkbox" checked={checked} onChange={() => toggleTemplate(t.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#1a3a5c]" />
                        <span className="flex-1 text-sm text-gray-800">{t.name}</span>
                        {labelMeta.text && (
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0', labelMeta.cls)}>
                            {labelMeta.text}
                          </span>
                        )}
                        {checked && <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Section 2: Profile docs (attachments) ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Fachkraft-Dokumente beifügen</span>
                {selectedDocIds.size > 0 && (
                  <span className="ml-auto text-xs text-[#1a3a5c] font-medium">{selectedDocIds.size} ausgewählt</span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Reisepässe, Zeugnisse etc. werden dem Empfänger zur Ansicht beigefügt — nicht zum Unterschreiben.
              </p>

              {/* Profile search (company context only) */}
              {entityType === 'company' && (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchRef}
                      value={profileSearch}
                      onChange={e => { setProfileSearch(e.target.value); if (selectedProfile) clearProfile() }}
                      onFocus={() => profileResults.length > 0 && setShowDropdown(true)}
                      placeholder="Fachkraft suchen..."
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                    />
                    {profileSearching && <Loader2 className="absolute right-3 h-3.5 w-3.5 animate-spin text-gray-400" />}
                    {selectedProfile && !profileSearching && (
                      <button onClick={clearProfile} className="absolute right-3 text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {showDropdown && profileResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {profileResults.map(p => (
                        <button key={p.id} onClick={() => selectProfile(p)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors">
                          <div className="w-7 h-7 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.profile_image_url
                              ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                              : <User className="h-4 w-4 text-gray-400" />}
                          </div>
                          <span className="text-sm text-gray-800">
                            {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.gender || '—'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Source toggle — shown when a profile is available */}
              {(entityType === 'profile' || selectedProfile) && (
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  <button type="button" onClick={() => setDocSource('profile')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                      docSource === 'profile' ? 'bg-white text-[#1a3a5c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    <FolderOpen className="h-3.5 w-3.5" />Profil-Dokumente
                  </button>
                  <button type="button" onClick={() => setDocSource('signed')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                      docSource === 'signed' ? 'bg-white text-[#1a3a5c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    <FileCheck className="h-3.5 w-3.5" />Signierte PDFs
                  </button>
                </div>
              )}

              {/* Profile docs list */}
              {profileDocsLoading ? (
                <div className="h-20 animate-pulse bg-gray-100 rounded-lg" />
              ) : profileDocs.length === 0 ? (
                (entityType === 'profile' || selectedProfile) ? (
                  <p className="text-xs text-gray-400 italic px-1">
                    {docSource === 'signed' ? 'Keine signierten Dokumente vorhanden.' : 'Keine öffentlichen Dokumente vorhanden.'}
                  </p>
                ) : null
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {profileDocs.map(doc => {
                    const checked = selectedDocIds.has(doc.id)
                    const typeLabel = DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type
                    return (
                      <label key={doc.id}
                        className={cn('flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                          checked ? 'bg-[#1a3a5c]/[0.04]' : 'bg-white hover:bg-gray-50/60')}>
                        <input type="checkbox" checked={checked} onChange={() => toggleDoc(doc.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#1a3a5c]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{doc.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {docSource === 'signed'
                              ? `Signiert${doc.signerName ? ` von ${doc.signerName}` : ''}`
                              : [typeLabel, entityType === 'company' && profileName].filter(Boolean).join(' · ')
                            }
                          </p>
                        </div>
                        {checked && <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 shrink-0">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button onClick={handleCreate}
                disabled={totalSelected === 0 || !signerName.trim() || creating}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
                {creating
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Erstelle Paket...</>
                  : <><Package className="h-3.5 w-3.5 mr-1.5" />Paket generieren</>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
