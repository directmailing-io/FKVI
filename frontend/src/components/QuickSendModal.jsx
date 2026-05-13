import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Link2, Upload, Send, Check, Copy, Loader2, Mail, User, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

/**
 * QuickSendModal – schnelles Versenden gespeicherter Dokumente (Links/Uploads)
 * als "Nur ansehen"-Versendung. Kein Template-Flow, keine Felder.
 *
 * Props:
 *   docs: [{ title, link, doc_type }]       — ausgewählte gespeicherte Dokumente
 *   profile/company: object                  — für Empfänger-Vorausfüllung
 *   entityType: 'profile' | 'company'
 *   entityId: uuid
 *   session: Supabase-Session
 *   onClose: () => void
 *   onSent: () => void
 */
export default function QuickSendModal({
  docs = [],
  profile = null,
  company = null,
  entityType = 'profile',
  entityId,
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

  const [signerName, setSignerName] = useState(defaultName)
  const [signerEmail, setSignerEmail] = useState(defaultEmail)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null) // [{ title, signerUrl }]
  const [copiedIdx, setCopiedIdx] = useState(null)

  const handleSend = async () => {
    if (!signerName.trim()) return
    setSending(true)
    try {
      const sends = []
      for (const doc of docs) {
        const body = {
          sourceUrl: doc.link,
          sourceTitle: doc.title || 'Dokument',
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim() || null,
          sendMode: 'view',
          recipientType: entityType === 'profile' ? 'fachkraft' : 'unternehmen',
        }
        if (entityType === 'profile') body.profileId = entityId
        else body.companyId = entityId

        const res = await fetch('/api/admin/dokumente/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Versand fehlgeschlagen')
        sends.push({ title: doc.title || 'Dokument', signerUrl: data.signerUrl })
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

  const docTypeIcon = (doc) => {
    if (doc.doc_type === 'upload') return <Upload className="h-3.5 w-3.5 text-gray-400" />
    return <Link2 className="h-3.5 w-3.5 text-gray-400" />
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-[#1a3a5c]" />
            {docs.length === 1 ? 'Dokument versenden' : `${docs.length} Dokumente versenden`}
          </DialogTitle>
        </DialogHeader>

        {results ? (
          /* ── Ergebnis ── */
          <div className="space-y-4 py-1">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Check className="h-4 w-4 shrink-0" />
              <span>
                {results.length === 1
                  ? 'Versendung erstellt!'
                  : `${results.length} Versendungen erstellt!`}
                {signerEmail ? ' E-Mail wurde gesendet.' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 truncate mb-1.5">{r.title}</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={r.signerUrl}
                      className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-gray-700 min-w-0"
                    />
                    <button
                      onClick={() => copyUrl(r.signerUrl, i)}
                      className="p-1.5 rounded-lg border border-gray-200 hover:border-[#1a3a5c] text-gray-400 hover:text-[#1a3a5c] transition-colors shrink-0"
                      title="Link kopieren"
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
        ) : (
          /* ── Versandformular ── */
          <div className="space-y-4 py-1">
            {/* Selected docs list */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Ausgewählte Dokumente
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {docs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    {docTypeIcon(doc)}
                    <span className="text-sm text-gray-700 truncate flex-1">{doc.title || '—'}</span>
                    <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shrink-0">
                      Ansicht
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Verlinkte Dokumente werden als "Nur ansehen" versendet. Für ausfüllbare Dokumente nutze die Vorlagen-Funktion.
              </p>
            </div>

            {/* Recipient */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Empfänger</p>
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

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button
                onClick={handleSend}
                disabled={!signerName.trim() || sending}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {sending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet…</>
                  : <><Send className="h-3.5 w-3.5 mr-1.5" />Link{docs.length > 1 ? 's' : ''} generieren</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
