import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Send, Check, Copy, Loader2, Mail, User, X, Eye, PenLine,
  FileText, Link2, Upload, ExternalLink, Plus, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

/**
 * UnifiedSendDialog – zentraler Versand-Dialog für alle Dokumenttypen
 *
 * Props:
 *   docs: [{ title, link, doc_type, isCv? }]
 *     - isCv: true → Lebenslauf (nur Ansehen)
 *     - doc_type === 'upload' → kann Ausfüllen/Signieren sein
 *     - doc_type === 'link' → nur Ansehen
 *   entityType: 'profile' | 'company'
 *   entityId: uuid
 *   profile/company: object for pre-filling recipient
 *   session: Supabase session
 *   onClose: () => void
 *   onSent: () => void
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

  // Per-doc mode: 'view' | 'fill'
  const [docModes, setDocModes] = useState(() => Object.fromEntries(docs.map((_, i) => [i, 'view'])))
  // Per-doc template info (for uploads converted to templates)
  const [docTemplates, setDocTemplates] = useState({}) // { [i]: { id, creating, error } }

  // Mediathek templates
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryTemplates, setLibraryTemplates] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedLibraryIds, setSelectedLibraryIds] = useState(new Set())

  // Recipient
  const [signerName, setSignerName] = useState(defaultName)
  const [signerEmail, setSignerEmail] = useState(defaultEmail)

  // Send state
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null) // [{title, signerUrl, mode}]
  const [copiedIdx, setCopiedIdx] = useState(null)

  const canFill = (doc) => !doc.isCv && doc.doc_type === 'upload'

  // Toggle mode for a doc (only for uploads)
  const toggleMode = async (idx, newMode) => {
    const doc = docs[idx]
    if (!canFill(doc)) return

    setDocModes(prev => ({ ...prev, [idx]: newMode }))

    // Create template on first switch to 'fill'
    if (newMode === 'fill' && !docTemplates[idx]) {
      setDocTemplates(prev => ({ ...prev, [idx]: { creating: true } }))
      try {
        const res = await fetch('/api/admin/profile-docs/to-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ sourceUrl: doc.link, title: doc.title || 'Dokument' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler')
        setDocTemplates(prev => ({ ...prev, [idx]: { id: data.templateId, creating: false } }))
      } catch (err) {
        setDocTemplates(prev => ({ ...prev, [idx]: { error: err.message, creating: false } }))
        toast({ title: 'Vorlage konnte nicht erstellt werden', description: err.message, variant: 'destructive' })
        setDocModes(prev => ({ ...prev, [idx]: 'view' }))
      }
    }
  }

  // Load Mediathek templates
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

  const toggleLibraryTemplate = (id) => {
    setSelectedLibraryIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Send all
  const handleSend = async () => {
    if (!signerName.trim()) return
    setSending(true)
    try {
      const sends = []
      const authHeader = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
      const baseBody = {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || null,
        recipientType: entityType === 'profile' ? 'fachkraft' : 'unternehmen',
        ...(entityType === 'profile' ? { profileId: entityId } : { companyId: entityId }),
      }

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]
        const mode = docModes[i] || 'view'

        let body
        if (mode === 'fill' && docTemplates[i]?.id) {
          body = { ...baseBody, templateId: docTemplates[i].id, sendMode: 'sign', prefillMode: 'blank' }
        } else {
          body = { ...baseBody, sourceUrl: doc.link, sourceTitle: doc.title || 'Dokument', sendMode: 'view' }
        }

        const res = await fetch('/api/admin/dokumente/send', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Versand fehlgeschlagen')
        sends.push({ title: doc.title || 'Dokument', signerUrl: data.signerUrl, mode })
      }

      // Library templates
      for (const tplId of selectedLibraryIds) {
        const tpl = libraryTemplates.find(t => t.id === tplId)
        const res = await fetch('/api/admin/dokumente/send', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({
            ...baseBody,
            templateId: tplId,
            sendMode: 'sign',
            prefillMode: 'blank',
          }),
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
  const hasAnyFillWithoutTemplate = docs.some(
    (doc, i) => docModes[i] === 'fill' && !docTemplates[i]?.id && !docTemplates[i]?.creating
  )

  // ── Results view ─────────────────────────────────────────────────────────
  if (results) {
    return (
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
              {signerEmail ? 'E-Mail wurde an ' + signerEmail + ' gesendet.' : 'Kopiere die Links und sende sie manuell.'}
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    {r.mode === 'fill'
                      ? <PenLine className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      : <Eye className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    <p className="text-xs font-medium text-gray-700 truncate flex-1">{r.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      r.mode === 'fill' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {r.mode === 'fill' ? 'Ausfüllen' : 'Ansehen'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={r.signerUrl}
                      className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-gray-600 min-w-0"
                    />
                    <button
                      onClick={() => copyUrl(r.signerUrl, i)}
                      className="p-1.5 rounded-lg border border-gray-200 hover:border-[#1a3a5c] text-gray-400 hover:text-[#1a3a5c] transition-colors shrink-0"
                    >
                      {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={onClose}>
              Fertig
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Send form ────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-[#1a3a5c]" />
            {totalCount === 1 ? 'Dokument versenden' : `${totalCount} Dokumente versenden`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-1 pr-1">

          {/* ── Selected documents ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dokumente</p>

            <div className="space-y-1.5">
              {docs.map((doc, i) => {
                const mode = docModes[i] || 'view'
                const tpl = docTemplates[i]
                const fillable = canFill(doc)

                return (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {doc.isCv ? (
                        <User className="h-4 w-4 text-teal-500 shrink-0" />
                      ) : doc.doc_type === 'upload' ? (
                        <Upload className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                        {doc.title || 'Dokument'}
                      </span>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => fillable && toggleMode(i, 'view')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          mode === 'view'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : fillable
                              ? 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
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
                          mode === 'fill'
                            ? 'bg-violet-100 text-violet-700 border border-violet-200'
                            : fillable
                              ? 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                              : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                        }`}
                      >
                        <PenLine className="h-3 w-3" />Zum Ausfüllen
                      </button>

                      {/* Template creation status */}
                      {mode === 'fill' && (
                        <div className="ml-auto flex items-center gap-1.5">
                          {tpl?.creating && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />Vorlage wird erstellt…
                            </span>
                          )}
                          {tpl?.id && (
                            <a
                              href={`/admin/dokumente/editor/${tpl.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />Felder einrichten
                            </a>
                          )}
                          {tpl?.error && (
                            <span className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />Fehler
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {mode === 'fill' && tpl?.id && (
                      <p className="text-xs text-gray-400 bg-violet-50 rounded px-2 py-1">
                        Öffne den Editor (neuer Tab), platziere Felder und speichere. Dann kannst du hier versenden.
                      </p>
                    )}
                    {mode === 'view' && doc.isCv && (
                      <p className="text-xs text-gray-400">Der Lebenslauf wird als Ansichts-Link versendet.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Library templates ── */}
          <div className="space-y-2">
            <button
              onClick={loadLibrary}
              className="flex items-center gap-2 text-xs font-semibold text-[#1a3a5c] hover:text-[#1a3a5c]/80 transition-colors"
            >
              {loadingLibrary
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : showLibrary
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />}
              <Plus className="h-3.5 w-3.5" />
              Vorlage aus Mediathek hinzufügen
            </button>

            {showLibrary && (
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                {libraryTemplates.length === 0 ? (
                  <p className="text-xs text-gray-400 px-2 py-3 text-center">Keine Vorlagen vorhanden</p>
                ) : (
                  libraryTemplates.map(tpl => {
                    const checked = selectedLibraryIds.has(tpl.id)
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => toggleLibraryTemplate(tpl.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                          checked ? 'bg-violet-50 border border-violet-200' : 'bg-white border border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                          checked ? 'bg-violet-600 border-violet-600' : 'border-gray-300'
                        }`}>
                          {checked && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <FileText className={`h-3.5 w-3.5 shrink-0 ${checked ? 'text-violet-600' : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium truncate ${checked ? 'text-violet-700' : 'text-gray-700'}`}>
                          {tpl.name}
                        </span>
                        <PenLine className="h-3 w-3 shrink-0 ml-auto text-gray-300" />
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Recipient ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Empfänger</p>
            <div className="space-y-1.5">
              <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <Input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">E-Mail <span className="text-gray-400 font-normal">(optional)</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <Input
                  value={signerEmail}
                  onChange={e => setSignerEmail(e.target.value)}
                  placeholder="email@beispiel.de"
                  type="email"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex gap-2 justify-end pt-3 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={handleSend}
            disabled={!signerName.trim() || sending || totalCount === 0}
            className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
          >
            {sending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet…</>
              : <><Send className="h-3.5 w-3.5 mr-1.5" />Link{totalCount > 1 ? 's' : ''} generieren</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
