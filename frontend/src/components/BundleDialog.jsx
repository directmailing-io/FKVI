import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ClipboardCopy, Check, Package, Loader2, Mail, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

/**
 * Dialog to create a document bundle (Paket) with multiple templates.
 *
 * Props:
 *   entityType: 'profile' | 'company'
 *   entityId: uuid
 *   prefillData: object
 *   defaultSignerName: string
 *   defaultEmail: string
 *   session: supabase session
 *   onClose: () => void
 *   onSent: () => void
 */
export default function BundleDialog({ entityType = 'profile', entityId, prefillData = {}, defaultSignerName = '', defaultEmail = '', session, onClose, onSent }) {
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [bundleTitle, setBundleTitle] = useState('')
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

  useEffect(() => {
    fetch('/api/admin/dokumente/list', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setTemplatesLoading(false) })
      .catch(() => setTemplatesLoading(false))
  }, [])

  const toggleTemplate = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (selectedIds.size === 0 || !signerName.trim()) return
    setCreating(true)
    try {
      const body = {
        templateIds: [...selectedIds],
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
      onSent?.()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(bundleUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {bundleUrl ? 'Paket-Link generiert' : 'Dokument-Paket erstellen'}
          </DialogTitle>
        </DialogHeader>

        {bundleUrl ? (
          <div className="space-y-4">
            {/* Link */}
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Paket für {signerName} erstellt – {selectedIds.size} {selectedIds.size === 1 ? 'Dokument' : 'Dokumente'}
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
                        Keine E-Mail-Adresse hinterlegt
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
                      placeholder="Hier einen eigenen Begleittext eingeben..."
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
          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-1">

            {/* Signer name */}
            <div className="space-y-1.5">
              <Label>Unterzeichner <span className="text-red-500">*</span></Label>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </div>

            {/* Optional title */}
            <div className="space-y-1.5">
              <Label className="text-sm">Paket-Titel <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={bundleTitle}
                onChange={e => setBundleTitle(e.target.value)}
                placeholder="z. B. Unterlagen für Arbeitsvermittlung"
              />
            </div>

            {/* Template selection */}
            <div className="space-y-2">
              <Label>Vorlagen auswählen <span className="text-red-500">*</span></Label>
              {templatesLoading ? (
                <div className="h-32 animate-pulse bg-gray-100 rounded-lg" />
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Keine aktiven Vorlagen vorhanden.</p>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {templates.map(t => {
                    const checked = selectedIds.has(t.id)
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${checked ? 'bg-[#1a3a5c]/[0.04]' : 'bg-white hover:bg-gray-50/60'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTemplate(t.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#1a3a5c]"
                        />
                        <span className="flex-1 text-sm text-gray-800">{t.name}</span>
                        {checked && (
                          <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
              {selectedIds.size > 0 && (
                <p className="text-xs text-[#1a3a5c] font-medium">
                  {selectedIds.size} {selectedIds.size === 1 ? 'Vorlage' : 'Vorlagen'} ausgewählt
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button
                onClick={handleCreate}
                disabled={selectedIds.size === 0 || !signerName.trim() || creating}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {creating
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Erstelle Paket...</>
                  : <><Package className="h-3.5 w-3.5 mr-1.5" />Paket generieren</>
                }
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
