import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Send, Check, Copy, Loader2, Mail, User, Eye, PenLine,
  FileText, Link2, Upload, ExternalLink, Plus, Search,
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  PenSquare, MessageSquare,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ── Profile auto-fill map ──────────────────────────────────────────────────
function buildProfilePrefill(profile) {
  if (!profile) return {}
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  return {
    'profile.first_name': profile.first_name || '',
    'profile.last_name': profile.last_name || '',
    'profile.nationality': profile.nationality || '',
    'profile.nursing_education': profile.nursing_education || '',
    'profile.education_duration': profile.education_duration || '',
    'profile.graduation_year': String(profile.graduation_year || ''),
    'profile.german_recognition': profile.german_recognition || '',
    'profile.total_experience_years': String(profile.total_experience_years || ''),
    'profile.germany_experience_years': String(profile.germany_experience_years || ''),
    'profile.work_time_preference': profile.work_time_preference || '',
    'profile.marital_status': profile.marital_status || '',
    'profile.children_count': String(profile.children_count ?? ''),
    'profile.address': profile.address || '',
    'profile.postal_code': profile.postal_code || '',
    'profile.city': profile.city || '',
    'signer.name': name,
    today: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  }
}

// ── Company auto-fill map ──────────────────────────────────────────────────
function buildCompanyPrefill(company) {
  if (!company) return {}
  const name = company.company_name || company.name || ''
  return {
    'company.name': name,
    'company.company_name': name,
    'company.contact_person': `${company.first_name || ''} ${company.last_name || ''}`.trim(),
    'company.first_name': company.first_name || '',
    'company.last_name': company.last_name || '',
    'company.email': company.email || '',
    'company.phone': company.phone || '',
    'company.address': company.address || '',
    'company.postal_code': company.postal_code || '',
    'company.city': company.city || '',
    'company.country': company.country || '',
    'signer.name': name,
    today: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  }
}

function buildPrefillPayload(fillItem, values) {
  const fields = fillItem?.fields || []
  const prefillData = {}
  const prefillFieldIds = []
  for (const field of fields) {
    const val = values?.[field.id]
    if (val && String(val).trim()) {
      prefillData[field.id] = val
      if (field.prefillKey) prefillData[field.prefillKey] = val
      prefillFieldIds.push(field.id)
    }
  }
  return {
    prefillMode: prefillFieldIds.length > 0 ? 'prefilled' : 'blank',
    prefillData,
    prefillFieldIds,
  }
}

// ── Step indicator ────────────────────────────────────────────────────────
const STEPS = ['Modus', 'Vorausfüllen', 'Empfänger']
function StepBar({ step }) {
  const idx = { modes: 0, prefill: 1, recipient: 2 }[step] ?? 0
  return (
    <div className="flex items-center gap-1 mb-4">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-all ${
            i < idx ? 'bg-[#0d9488] text-white' : i === idx ? 'bg-[#1a3a5c] text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            {i < idx ? <Check className="h-3 w-3" /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === idx ? 'text-[#1a3a5c]' : i < idx ? 'text-[#0d9488]' : 'text-gray-400'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className={`h-px w-6 mx-0.5 ${i < idx ? 'bg-[#0d9488]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

/**
 * UnifiedSendDialog – 4-Schritt-Versand für alle Dokumenttypen
 *
 * Schritt 1 – Modus: Ansehen / Ausfüllen pro Dokument + Mediathek-Vorlagen
 * Schritt 2 – Vorausfüllen: Felder für "Ausfüllen"-Dokumente
 * Schritt 3 – Empfänger: Name, E-Mail, Nachricht
 * Ergebnis: Links zum Kopieren / Versenden
 */
export default function UnifiedSendDialog({
  docs = [],
  entityType = 'profile',
  entityId,
  profile = null,
  company = null,
  session,
  onClose,
  onSent,
}) {
  const defaultName = entityType === 'profile'
    ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
    : company?.company_name || company?.name || ''
  const defaultEmail = entityType === 'profile'
    ? (profile?.contact_email || '')
    : (company?.email || '')

  // ── Step 1: mode selection ─────────────────────────────────────────────
  const [step, setStep] = useState('modes')
  const [docModes, setDocModes] = useState(() =>
    Object.fromEntries(docs.map((doc, i) => [i, doc.doc_type === 'template' ? 'fill' : 'view']))
  )
  const [docTemplates, setDocTemplates] = useState({}) // upload→template {id, creating, error}
  const [showLibrary, setShowLibrary] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryTemplates, setLibraryTemplates] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedLibraryIds, setSelectedLibraryIds] = useState(new Set())

  // ── Step 2: prefill ───────────────────────────────────────────────────
  const [fillDocsData, setFillDocsData] = useState([])
  const [prefillValues, setPrefillValues] = useState({}) // {key: {fieldId: value}}
  const [loadingPrefill, setLoadingPrefill] = useState(false)

  // ── Step 3: recipient ─────────────────────────────────────────────────
  const [signerName, setSignerName] = useState(defaultName)
  const [signerEmail, setSignerEmail] = useState(defaultEmail)

  // ── Results + email ───────────────────────────────────────────────────
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null) // [{title, signerUrl, sendId, mode}]
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [showCustomMsg, setShowCustomMsg] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────
  const isTemplateDoc = (doc) => doc.doc_type === 'template'
  const isSendRef = (doc) => doc.doc_type === 'send_ref'
  const canFill = (doc) => !doc.isCv && !isSendRef(doc) && (doc.doc_type === 'upload' || isTemplateDoc(doc))

  // send_ref docs are always "forwarded" — don't count them as fill docs for the prefill step
  const hasFillDocs =
    docs.some((doc, i) => !isSendRef(doc) && (docModes[i] || 'view') === 'fill') || selectedLibraryIds.size > 0

  // ── Mode toggle (upload→template creation) ────────────────────────────
  const toggleMode = async (idx, newMode) => {
    const doc = docs[idx]
    if (!canFill(doc)) return
    setDocModes(prev => ({ ...prev, [idx]: newMode }))
    if (newMode === 'fill' && doc.doc_type === 'upload' && !docTemplates[idx]) {
      setDocTemplates(prev => ({ ...prev, [idx]: { creating: true } }))
      try {
        const res = await fetch('/api/admin/profile-docs/to-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ sourceUrl: doc.link, title: doc.title || 'Dokument' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler')
        setDocTemplates(prev => ({ ...prev, [idx]: { id: data.templateId, creating: false } }))
      } catch (err) {
        setDocTemplates(prev => ({ ...prev, [idx]: { error: err.message, creating: false } }))
        setDocModes(prev => ({ ...prev, [idx]: 'view' }))
        toast({ title: 'Vorlage konnte nicht erstellt werden', description: err.message, variant: 'destructive' })
      }
    }
  }

  // ── Mediathek ─────────────────────────────────────────────────────────
  const loadLibrary = async () => {
    if (showLibrary) { setShowLibrary(false); return }
    if (libraryTemplates.length > 0) { setShowLibrary(true); return }
    setLoadingLibrary(true)
    try {
      const res = await fetch('/api/admin/dokumente/list', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setLibraryTemplates(data.templates || [])
    } catch {}
    setLoadingLibrary(false)
    setShowLibrary(true)
  }

  const filteredLibrary = libraryTemplates.filter(t =>
    !librarySearch.trim() || t.name?.toLowerCase().includes(librarySearch.toLowerCase())
  )

  // ── Step 1 → 2 (load template fields) ────────────────────────────────
  const recipientAudience = entityType === 'company' ? 'unternehmen' : 'fachkraft'

  const proceedFromModes = async () => {
    if (!hasFillDocs) { setStep('recipient'); return }
    setStep('prefill')
    setLoadingPrefill(true)
    const items = []
    const auto = entityType === 'company' ? buildCompanyPrefill(company) : buildProfilePrefill(profile)

    for (let i = 0; i < docs.length; i++) {
      if (isSendRef(docs[i])) continue // forward docs skip prefill
      if ((docModes[i] || 'view') !== 'fill') continue
      const doc = docs[i]
      const templateId = isTemplateDoc(doc) ? doc.link.replace('template:', '') : docTemplates[i]?.id
      if (!templateId) continue
      try {
        const res = await fetch(`/api/admin/dokumente/get?templateId=${templateId}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const data = await res.json()
        // Filter fields to those matching the recipient audience
        const allFields = data.template?.fields || []
        const fields = allFields.filter(f => {
          const aud = f.audience || 'fachkraft'
          return aud === recipientAudience
        })
        const key = `doc-${i}`
        items.push({ key, templateId, fields, name: doc.title || 'Dokument' })
        const init = {}
        for (const f of fields) {
          if (f.type === 'signature') continue
          init[f.id] = (f.prefillKey && auto[f.prefillKey] !== undefined)
            ? String(auto[f.prefillKey])
            : (auto[f.id] !== undefined ? String(auto[f.id]) : '')
        }
        setPrefillValues(prev => ({ ...prev, [key]: init }))
      } catch {}
    }

    for (const tplId of selectedLibraryIds) {
      const tpl = libraryTemplates.find(t => t.id === tplId)
      const key = `lib-${tplId}`
      const allFields = tpl?.fields || []
      const fields = allFields.filter(f => {
        const aud = f.audience || 'fachkraft'
        return aud === recipientAudience
      })
      items.push({ key, templateId: tplId, fields, name: tpl?.name || 'Vorlage' })
      const init = {}
      for (const f of fields) {
        if (f.type === 'signature') continue
        init[f.id] = (f.prefillKey && auto[f.prefillKey] !== undefined) ? String(auto[f.prefillKey]) : ''
      }
      setPrefillValues(prev => ({ ...prev, [key]: init }))
    }

    setFillDocsData(items)
    setLoadingPrefill(false)
  }

  // ── Generate bundle (one link for all docs) ──────────────────────────
  const handleSend = async () => {
    if (!signerName.trim()) return
    setSending(true)
    try {
      const authHeader = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
      const docsList = []

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]
        const mode = docModes[i] || 'view'

        if (isSendRef(doc)) {
          // Forward the FK's signed document to the company
          const sourceSendId = doc.link?.replace('send:', '')
          if (sourceSendId) {
            docsList.push({ type: 'forward', sourceSendId, sourceTitle: doc.title || 'Dokument' })
          }
        } else if (mode === 'fill') {
          const templateId = isTemplateDoc(doc) ? doc.link.replace('template:', '') : docTemplates[i]?.id
          if (!templateId) continue
          const key = `doc-${i}`
          const fillItem = fillDocsData.find(f => f.key === key)
          const payload = buildPrefillPayload(fillItem, prefillValues[key])
          docsList.push({ type: 'template', templateId, sendMode: 'sign', ...payload })
        } else {
          docsList.push({ type: 'view', sourceUrl: doc.link, sourceTitle: doc.title || 'Dokument' })
        }
      }

      for (const tplId of selectedLibraryIds) {
        const key = `lib-${tplId}`
        const fillItem = fillDocsData.find(f => f.key === key)
        const payload = buildPrefillPayload(fillItem, prefillValues[key])
        docsList.push({ type: 'template', templateId: tplId, sendMode: 'sign', ...payload })
      }

      const res = await fetch('/api/admin/dokumente/bundle-create', {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({
          docsList,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim() || null,
          skipEmail: true,
          recipientType: entityType === 'profile' ? 'fachkraft' : 'unternehmen',
          ...(entityType === 'profile' ? { profileId: entityId } : { companyId: entityId }),
          title: `Unterlagen für ${signerName.trim()}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bundle-Erstellung fehlgeschlagen')

      setResults({ bundleUrl: data.bundleUrl, docCount: docsList.length })
      onSent?.()
    } catch (err) {
      toast({ title: 'Versand fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  // ── Send email for generated links ────────────────────────────────────
  const handleSendEmail = async () => {
    if (!signerEmail.trim() || !results) return
    setSendingEmail(true)
    try {
      const authHeader = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
      await fetch('/api/admin/dokumente/share-email', {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({
          recipientEmail: signerEmail.trim(),
          recipientName: signerName.trim(),
          documentTitle: `Unterlagen für ${signerName.trim()}`,
          documentUrl: results.bundleUrl,
          customMessage: showCustomMsg && customMessage.trim() ? customMessage.trim() : null,
        }),
      })
      setEmailSent(true)
      toast({ title: 'E-Mail gesendet', description: `E-Mail an ${signerEmail} versendet.` })
    } catch (err) {
      toast({ title: 'E-Mail fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setSendingEmail(false)
    }
  }

  const copyUrl = (url, idx) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  const totalCount = docs.length + selectedLibraryIds.size

  // ────────────────────────────────────────────────────────────────────────
  // RESULTS
  // ────────────────────────────────────────────────────────────────────────
  if (results) return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Link generiert!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-xs text-gray-500">
            {results.docCount} {results.docCount === 1 ? 'Dokument' : 'Dokumente'} — Empfänger öffnet eine Übersicht und kann alle Dokumente von dort aus ansehen / ausfüllen.
          </p>

          {/* Single bundle link */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Übersichts-Link</p>
            <div className="flex items-center gap-2">
              <input readOnly value={results.bundleUrl} className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-gray-600 min-w-0" />
              <button onClick={() => copyUrl(results.bundleUrl, 0)} className="p-1.5 rounded-lg border border-gray-200 hover:border-[#1a3a5c] text-gray-400 hover:text-[#1a3a5c] transition-colors shrink-0" title="Link kopieren">
                {copiedIdx === 0 ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a href={results.bundleUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-gray-200 hover:border-[#1a3a5c] text-gray-400 hover:text-[#1a3a5c] transition-colors shrink-0" title="Link öffnen">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Email section */}
          {signerEmail.trim() ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-700 flex-1 truncate">Per Mail an <strong>{signerEmail}</strong> senden</span>
                {emailSent && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" />Gesendet</span>}
              </div>
              <div className="p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600">Eigene Nachricht</span>
                  </div>
                  <Switch checked={showCustomMsg} onCheckedChange={setShowCustomMsg} />
                </div>
                {showCustomMsg ? (
                  <Textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder="z.B. Bitte bis Freitag ausfüllen. Bei Fragen melden Sie sich gerne."
                    rows={3}
                    className="text-xs resize-none"
                  />
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Standardmailtext wird verwendet.</p>
                )}
                <Button onClick={handleSendEmail} disabled={sendingEmail || emailSent} className="w-full bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
                  {sendingEmail ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet…</>
                    : emailSent ? <><Check className="h-3.5 w-3.5 mr-1.5" />E-Mail gesendet</>
                    : <><Mail className="h-3.5 w-3.5 mr-1.5" />Per Mail verschicken</>}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center">Kein E-Mail hinterlegt – Link manuell teilen.</p>
          )}

          <Button variant="outline" className="w-full" onClick={onClose}>Fertig</Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  // ────────────────────────────────────────────────────────────────────────
  // MAIN DIALOG
  // ────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-[#1a3a5c]" />
            {totalCount === 1 ? 'Dokument versenden' : `${totalCount} Dokumente versenden`}
          </DialogTitle>
        </DialogHeader>

        {step !== 'recipient' && <StepBar step={step} />}

        <div className="flex-1 overflow-y-auto pr-1">

          {/* ════════════════════════════════════════════════════════════
              STEP 1: MODUS
          ════════════════════════════════════════════════════════════ */}
          {step === 'modes' && (
            <div className="space-y-4">

              {/* Doc list */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dokumente</p>
                {docs.map((doc, i) => {
                  const mode = docModes[i] || 'view'
                  const tpl = docTemplates[i]
                  const fillable = canFill(doc)
                  const isTemplate = isTemplateDoc(doc)

                  return (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        {doc.isCv
                          ? <User className="h-4 w-4 text-teal-500 shrink-0" />
                          : isSendRef(doc)
                            ? <FileText className="h-4 w-4 text-green-600 shrink-0" />
                            : doc.doc_type === 'upload'
                              ? <Upload className="h-4 w-4 text-blue-500 shrink-0" />
                              : isTemplate
                                ? <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                                : <Link2 className="h-4 w-4 text-gray-400 shrink-0" />}
                        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{doc.title || 'Dokument'}</span>
                      </div>

                      {isSendRef(doc) ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <PenLine className="h-3 w-3" />Weiterleiten zum Ausfüllen
                          </span>
                          <span className="text-xs text-gray-400">FK-Felder bereits ausgefüllt</span>
                        </div>
                      ) : isTemplate ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                            <PenLine className="h-3 w-3" />Zum Ausfüllen
                          </span>
                          <span className="text-xs text-gray-400">Felder & Vorausfüllen im nächsten Schritt</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => { if (fillable) toggleMode(i, 'view') }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              mode === 'view' ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : fillable ? 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            <Eye className="h-3 w-3" />Nur ansehen
                          </button>
                          <button
                            onClick={() => fillable && toggleMode(i, 'fill')}
                            disabled={!fillable}
                            title={!fillable ? (doc.isCv ? 'Lebenslauf kann nur angesehen werden' : 'Externe Links können nur angesehen werden') : undefined}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              mode === 'fill' ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                : fillable ? 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                            }`}
                          >
                            <PenLine className="h-3 w-3" />Zum Ausfüllen
                          </button>
                          {mode === 'fill' && (
                            <div className="ml-auto flex items-center gap-1.5">
                              {tpl?.creating && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Erstelle…</span>}
                              {tpl?.id && (
                                <a href={`/admin/dokumente/editor/${tpl.id}`} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />Felder einrichten
                                </a>
                              )}
                              {tpl?.error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Fehler</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Mediathek */}
              <div className="space-y-2">
                <button
                  onClick={loadLibrary}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#1a3a5c] hover:text-[#1a3a5c]/80 transition-colors"
                >
                  {loadingLibrary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Vorlage aus Mediathek hinzufügen
                  {selectedLibraryIds.size > 0 && <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{selectedLibraryIds.size}</span>}
                </button>

                {showLibrary && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <input
                          value={librarySearch}
                          onChange={e => setLibrarySearch(e.target.value)}
                          placeholder="Vorlage suchen…"
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1a3a5c] bg-white"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto p-1.5 space-y-1 bg-white">
                      {filteredLibrary.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">
                          {librarySearch ? 'Keine Treffer' : 'Keine Vorlagen vorhanden'}
                        </p>
                      ) : filteredLibrary.map(tpl => {
                        const checked = selectedLibraryIds.has(tpl.id)
                        return (
                          <button
                            key={tpl.id}
                            onClick={() => setSelectedLibraryIds(prev => { const n = new Set(prev); checked ? n.delete(tpl.id) : n.add(tpl.id); return n })}
                            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${checked ? 'bg-violet-50 border border-violet-200' : 'border border-transparent hover:bg-gray-50'}`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`}>
                              {checked && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <FileText className={`h-3.5 w-3.5 shrink-0 ${checked ? 'text-violet-600' : 'text-gray-400'}`} />
                            <span className={`text-xs font-medium truncate flex-1 ${checked ? 'text-violet-700' : 'text-gray-700'}`}>{tpl.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              STEP 2: VORAUSFÜLLEN
          ════════════════════════════════════════════════════════════ */}
          {step === 'prefill' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Felder können vorausgefüllt werden (automatisch aus dem Profil oder manuell). Leere Felder füllt der Empfänger selbst aus.
              </p>

              {loadingPrefill ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                </div>
              ) : fillDocsData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Keine Ausfüllen-Dokumente gefunden.</p>
              ) : (
                fillDocsData.map(item => {
                  const fillableFields = (item.fields || []).filter(f => f.type !== 'signature')
                  const sigFields = (item.fields || []).filter(f => f.type === 'signature')
                  const values = prefillValues[item.key] || {}
                  const anySigPrefilled = sigFields.some(f => values[f.id]?.trim())

                  return (
                    <div key={item.key} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-50 border-b border-violet-100">
                        <FileText className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                        <span className="text-sm font-semibold text-violet-800 flex-1 truncate">{item.name}</span>
                        <a
                          href={`/admin/dokumente/editor/${item.templateId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-violet-600 hover:underline shrink-0"
                        >
                          <PenSquare className="h-3 w-3" />Felder bearbeiten
                        </a>
                      </div>

                      {fillableFields.length === 0 && sigFields.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                          <p className="text-xs text-gray-400">Noch keine Felder definiert.</p>
                          <a href={`/admin/dokumente/editor/${item.templateId}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-violet-600 hover:underline mt-1 inline-flex items-center gap-1">
                            <PenSquare className="h-3 w-3" />Felder im Editor einrichten →
                          </a>
                        </div>
                      ) : (
                        <div className="p-3 space-y-2.5">
                          {/* Auto-fill all button */}
                          {(() => {
                            const auto = buildProfilePrefill(profile)
                            const autoFillable = fillableFields.filter(f => {
                              const v = f.prefillKey ? auto[f.prefillKey] : auto[f.id]
                              return v && !values[f.id]
                            })
                            return autoFillable.length > 0 ? (
                              <button
                                onClick={() => {
                                  const next = { ...values }
                                  autoFillable.forEach(f => { next[f.id] = f.prefillKey ? auto[f.prefillKey] : auto[f.id] })
                                  setPrefillValues(prev => ({ ...prev, [item.key]: next }))
                                }}
                                className="text-[11px] text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" />Alle {autoFillable.length} Felder aus Profil befüllen
                              </button>
                            ) : null
                          })()}

                          {/* 2-column compact grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {fillableFields.map(field => {
                              const auto = buildProfilePrefill(profile)
                              const autoValue = field.prefillKey ? auto[field.prefillKey] : auto[field.id]
                              const filled = !!(values[field.id] || '').trim()
                              return (
                                <div key={field.id} className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <Label className="text-[11px] text-gray-500 flex-1 truncate">{field.label || field.id}</Label>
                                    {filled && <Check className="h-2.5 w-2.5 text-teal-500 shrink-0" />}
                                  </div>
                                  <Input
                                    value={values[field.id] || ''}
                                    onChange={e => setPrefillValues(prev => ({
                                      ...prev,
                                      [item.key]: { ...(prev[item.key] || {}), [field.id]: e.target.value }
                                    }))}
                                    placeholder={autoValue ? autoValue : '–'}
                                    className="h-7 text-xs"
                                  />
                                </div>
                              )
                            })}
                          </div>
                          {sigFields.length > 0 && (
                            <div className="rounded-lg border border-dashed border-gray-200 overflow-hidden">
                              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                                <PenLine className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-500 flex-1">
                                  {sigFields.length} Signaturfeld{sigFields.length > 1 ? 'er' : ''} – wird vom Empfänger ausgefüllt
                                </span>
                                <button
                                  onClick={() => setPrefillValues(prev => {
                                    const cur = prev[item.key] || {}
                                    const hasAny = sigFields.some(f => cur[f.id] !== undefined)
                                    if (hasAny) {
                                      const next = { ...cur }
                                      sigFields.forEach(f => delete next[f.id])
                                      return { ...prev, [item.key]: next }
                                    }
                                    const next = { ...cur }
                                    sigFields.forEach(f => { if (!next[f.id]) next[f.id] = '' })
                                    return { ...prev, [item.key]: next }
                                  })}
                                  className="text-[10px] text-violet-600 hover:underline shrink-0"
                                >
                                  {sigFields.some(f => values[f.id] !== undefined) ? 'Einklappen' : 'Vorausfüllen'}
                                </button>
                              </div>
                              {sigFields.some(f => values[f.id] !== undefined) && (
                                <div className="p-3 space-y-2.5 bg-white border-t border-dashed border-gray-200">
                                  {sigFields.map(field => (
                                    <div key={field.id} className="space-y-1">
                                      <Label className="text-xs text-gray-600">{field.label || 'Signatur'}</Label>
                                      <Input
                                        value={values[field.id] || ''}
                                        onChange={e => setPrefillValues(prev => ({
                                          ...prev,
                                          [item.key]: { ...(prev[item.key] || {}), [field.id]: e.target.value }
                                        }))}
                                        placeholder="Leer lassen = Empfänger zeichnet/füllt aus"
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              STEP 3: EMPFÄNGER
          ════════════════════════════════════════════════════════════ */}
          {step === 'recipient' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Vor- und Nachname" className="pl-9" autoFocus />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">E-Mail <span className="text-gray-400 font-normal">(optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="email@beispiel.de" type="email" className="pl-9" />
                </div>
              </div>
              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Zusammenfassung</p>
                {docs.map((doc, i) => {
                  const mode = docModes[i] || 'view'
                  const isForward = isSendRef(doc)
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {isForward
                        ? <PenLine className="h-3 w-3 text-green-600 shrink-0" />
                        : mode === 'fill'
                          ? <PenLine className="h-3 w-3 text-violet-500 shrink-0" />
                          : <Eye className="h-3 w-3 text-blue-500 shrink-0" />}
                      <span className="text-gray-700 truncate flex-1">{doc.title || 'Dokument'}</span>
                      <span className={`text-[10px] font-medium px-1.5 rounded ${
                        isForward ? 'bg-green-50 text-green-600'
                        : mode === 'fill' ? 'bg-violet-50 text-violet-600'
                        : 'bg-blue-50 text-blue-600'
                      }`}>
                        {isForward ? 'Weiterleiten' : mode === 'fill' ? 'Ausfüllen' : 'Ansehen'}
                      </span>
                    </div>
                  )
                })}
                {[...selectedLibraryIds].map(id => {
                  const tpl = libraryTemplates.find(t => t.id === id)
                  return (
                    <div key={id} className="flex items-center gap-2 text-xs">
                      <PenLine className="h-3 w-3 text-violet-500 shrink-0" />
                      <span className="text-gray-700 truncate flex-1">{tpl?.name || 'Vorlage'}</span>
                      <span className="text-[10px] font-medium px-1.5 rounded bg-violet-50 text-violet-600">Ausfüllen</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
          <div>
            {(step === 'prefill' || step === 'recipient') && (
              <button
                onClick={() => setStep(step === 'recipient' ? (hasFillDocs ? 'prefill' : 'modes') : 'modes')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />Zurück
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            {step === 'modes' && (
              <Button onClick={proceedFromModes} className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
                Weiter<ChevronRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
            {step === 'prefill' && (
              <Button onClick={() => setStep('recipient')} className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
                Weiter<ChevronRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
            {step === 'recipient' && (
              <Button
                onClick={handleSend}
                disabled={!signerName.trim() || sending}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {sending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet…</>
                  : <><Send className="h-3.5 w-3.5 mr-1.5" />{totalCount > 1 ? 'Links generieren' : 'Link generieren'}</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
