import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Send, Check, Copy, Loader2, Mail, User, X, Eye, PenLine,
  FileText, Link2, Upload, ExternalLink, Plus, Search,
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  PenSquare,
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

function buildPrefillPayload(fillItem, values) {
  const fields = fillItem?.fields || []
  const prefillData = {}
  const prefillFieldIds = []
  for (const field of fields) {
    if (field.type === 'signature') continue
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
  const [message, setMessage] = useState('')

  // ── Results ───────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(null)

  // ── Helpers ───────────────────────────────────────────────────────────
  const isTemplateDoc = (doc) => doc.doc_type === 'template'
  const canFill = (doc) => !doc.isCv && (doc.doc_type === 'upload' || isTemplateDoc(doc))

  const hasFillDocs =
    docs.some((doc, i) => (docModes[i] || 'view') === 'fill') || selectedLibraryIds.size > 0

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
  const proceedFromModes = async () => {
    if (!hasFillDocs) { setStep('recipient'); return }
    setStep('prefill')
    setLoadingPrefill(true)
    const items = []
    const auto = buildProfilePrefill(profile)

    for (let i = 0; i < docs.length; i++) {
      if ((docModes[i] || 'view') !== 'fill') continue
      const doc = docs[i]
      const templateId = isTemplateDoc(doc) ? doc.link.replace('template:', '') : docTemplates[i]?.id
      if (!templateId) continue
      try {
        const res = await fetch(`/api/admin/dokumente/get?templateId=${templateId}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const data = await res.json()
        const fields = data.template?.fields || []
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
      const fields = tpl?.fields || []
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

  // ── Send ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!signerName.trim()) return
    setSending(true)
    try {
      const sends = []
      const authHeader = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
      const baseBody = {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || null,
        message: message.trim() || null,
        recipientType: entityType === 'profile' ? 'fachkraft' : 'unternehmen',
        ...(entityType === 'profile' ? { profileId: entityId } : { companyId: entityId }),
      }

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]
        const mode = docModes[i] || 'view'
        let body

        if (mode === 'fill') {
          const templateId = isTemplateDoc(doc) ? doc.link.replace('template:', '') : docTemplates[i]?.id
          const key = `doc-${i}`
          const fillItem = fillDocsData.find(f => f.key === key)
          const payload = buildPrefillPayload(fillItem, prefillValues[key])
          body = { ...baseBody, templateId, sendMode: 'sign', ...payload }
        } else {
          body = { ...baseBody, sourceUrl: doc.link, sourceTitle: doc.title || 'Dokument', sendMode: 'view' }
        }

        const res = await fetch('/api/admin/dokumente/send', { method: 'POST', headers: authHeader, body: JSON.stringify(body) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Versand fehlgeschlagen')
        sends.push({ title: doc.title || 'Dokument', signerUrl: data.signerUrl, mode })
      }

      for (const tplId of selectedLibraryIds) {
        const tpl = libraryTemplates.find(t => t.id === tplId)
        const key = `lib-${tplId}`
        const fillItem = fillDocsData.find(f => f.key === key)
        const payload = buildPrefillPayload(fillItem, prefillValues[key])
        const res = await fetch('/api/admin/dokumente/send', {
          method: 'POST', headers: authHeader,
          body: JSON.stringify({ ...baseBody, templateId: tplId, sendMode: 'sign', ...payload }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Versand fehlgeschlagen')
        sends.push({ title: tpl?.name || 'Vorlage', signerUrl: data.signerUrl, mode: 'fill' })
      }

      setResults(sends)
      onSent?.()
    } catch (err) {
      toast({ title: 'Versand fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
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
            {results.length === 1 ? 'Versendung erstellt!' : `${results.length} Versendungen erstellt!`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-sm text-gray-500">
            {signerEmail
              ? `E-Mail an ${signerEmail} gesendet.`
              : 'Kopiere die Links und sende sie manuell.'}
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  {r.mode === 'fill'
                    ? <PenLine className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    : <Eye className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                  <p className="text-xs font-medium text-gray-700 truncate flex-1">{r.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${r.mode === 'fill' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>
                    {r.mode === 'fill' ? 'Ausfüllen' : 'Ansehen'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input readOnly value={r.signerUrl} className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-gray-600 min-w-0" />
                  <button onClick={() => copyUrl(r.signerUrl, i)} className="p-1.5 rounded-lg border border-gray-200 hover:border-[#1a3a5c] text-gray-400 hover:text-[#1a3a5c] transition-colors shrink-0">
                    {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button className="w-full bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={onClose}>Fertig</Button>
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
                          : doc.doc_type === 'upload'
                            ? <Upload className="h-4 w-4 text-blue-500 shrink-0" />
                            : isTemplate
                              ? <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                              : <Link2 className="h-4 w-4 text-gray-400 shrink-0" />}
                        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{doc.title || 'Dokument'}</span>
                      </div>

                      {isTemplate ? (
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
                          {fillableFields.map(field => {
                            const isAdmin = field.audience === 'admin'
                            const autoValue = (() => {
                              const auto = buildProfilePrefill(profile)
                              return field.prefillKey ? auto[field.prefillKey] : auto[field.id]
                            })()
                            return (
                              <div key={field.id} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-gray-600 flex-1">{field.label || field.id}</Label>
                                  {isAdmin && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">FKVI</span>
                                  )}
                                  {autoValue && !values[field.id] && (
                                    <button
                                      onClick={() => setPrefillValues(prev => ({ ...prev, [item.key]: { ...prev[item.key], [field.id]: autoValue } }))}
                                      className="text-[10px] text-teal-600 hover:underline"
                                    >
                                      Auto-fill
                                    </button>
                                  )}
                                </div>
                                <Input
                                  value={values[field.id] || ''}
                                  onChange={e => setPrefillValues(prev => ({
                                    ...prev,
                                    [item.key]: { ...(prev[item.key] || {}), [field.id]: e.target.value }
                                  }))}
                                  placeholder={autoValue ? `Auto: ${autoValue}` : 'Leer lassen = Empfänger füllt aus'}
                                  className="h-8 text-xs"
                                />
                              </div>
                            )
                          })}
                          {sigFields.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                              <PenLine className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-500">
                                {sigFields.length} Signaturfeld{sigFields.length > 1 ? 'er' : ''} – wird vom Empfänger ausgefüllt
                              </span>
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
              <div className="space-y-1.5">
                <Label className="text-sm">Nachricht <span className="text-gray-400 font-normal">(optional, in der E-Mail)</span></Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="z.B. Bitte bis Freitag ausfüllen. Bei Fragen melden Sie sich gerne."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Zusammenfassung</p>
                {docs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {(docModes[i] || 'view') === 'fill'
                      ? <PenLine className="h-3 w-3 text-violet-500 shrink-0" />
                      : <Eye className="h-3 w-3 text-blue-500 shrink-0" />}
                    <span className="text-gray-700 truncate flex-1">{doc.title || 'Dokument'}</span>
                    <span className={`text-[10px] font-medium px-1.5 rounded ${(docModes[i] || 'view') === 'fill' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>
                      {(docModes[i] || 'view') === 'fill' ? 'Ausfüllen' : 'Ansehen'}
                    </span>
                  </div>
                ))}
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
                  : <><Send className="h-3.5 w-3.5 mr-1.5" />Link{totalCount > 1 ? 's' : ''} generieren</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
