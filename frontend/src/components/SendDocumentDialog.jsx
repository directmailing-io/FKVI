import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, ClipboardCopy, Check, FileText, Loader2, Link2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Field component defined outside to avoid focus issues
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
 * Reusable dialog for sending a document template to a profile or company.
 *
 * Props:
 *   entityType: 'profile' | 'company'
 *   entityId: uuid string
 *   prefillData: object of { prefillKey: value } — e.g. { 'profile.first_name': 'Maria', 'company.company_name': 'ABC GmbH' }
 *   defaultSignerName: string — pre-fills the signer name field
 *   session: supabase session object
 *   onClose: () => void
 *   onSent: () => void — called after successful send
 */
export default function SendDocumentDialog({ entityType = 'profile', entityId, prefillData = {}, defaultSignerName = '', session, onClose, onSent }) {
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [sending, setSending] = useState(false)
  const [signerUrl, setSignerUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [checkboxPrefills, setCheckboxPrefills] = useState({})
  const [prefillMode, setPrefillMode] = useState('prefilled')
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false)
  const [disabledPrefillIds, setDisabledPrefillIds] = useState(new Set())

  // Reset when template changes
  useEffect(() => {
    setCheckboxPrefills({})
    setDisabledPrefillIds(new Set())
    setFieldPickerOpen(false)
  }, [selectedId])

  // Load templates on mount
  useEffect(() => {
    fetch('/api/admin/dokumente/list', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setTemplatesLoading(false) })
      .catch(() => setTemplatesLoading(false))
  }, [])

  // Load template fields when selection changes
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

  // Fields that can be auto-prefilled (text/date/initials with matching prefillKey)
  const prefillableFields = (selectedTemplate?.fields || []).filter(
    f => !['signature', 'checkbox'].includes(f.type) && f.prefillKey && prefillData[f.prefillKey]
  )

  const checkboxFields = (selectedTemplate?.fields || []).filter(
    f => f.type === 'checkbox' && Array.isArray(f.options) && f.options.length > 0
  )

  const activePrefillFieldIds = prefillableFields
    .filter(f => !disabledPrefillIds.has(f.id))
    .map(f => f.id)

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
        prefillData: { ...prefillData, ...checkboxPrefills },
        prefillMode,
      }
      // Attach entity ID
      if (entityType === 'profile') body.profileId = entityId
      if (entityType === 'company') body.companyId = entityId
      // Prefill field IDs
      if (prefillMode === 'prefilled') body.prefillFieldIds = activePrefillFieldIds

      const res = await fetch('/api/admin/dokumente/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')
      setSignerUrl(data.signerUrl)
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

  const hasPrefillableFields = prefillableFields.length > 0
  const activeCount = activePrefillFieldIds.length
  const totalCount = prefillableFields.length

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {signerUrl ? 'Signierlink generiert' : 'Dokument zum Signieren senden'}
          </DialogTitle>
        </DialogHeader>

        {signerUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Link für {signerName} erstellt
              </div>
              <p className="text-xs text-gray-500">
                Sende diesen Link an die unterzeichnende Person (E-Mail, WhatsApp, o.ä.):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-700 select-all">
                  {signerUrl}
                </code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyUrl}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={onClose}>Fertig</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-1">

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
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Signer name */}
            <Field label="Unterzeichner" required>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </Field>

            {/* Loading skeleton */}
            {selectedId && templateLoading && (
              <div className="h-20 animate-pulse bg-gray-100 rounded-lg" />
            )}

            {/* Dokument-Modus */}
            {selectedId && !templateLoading && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dokument-Modus</Label>
                <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

                  {/* Blank */}
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

                  {/* Prefilled */}
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
                        <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#0d9488]/10 text-[#0d9488] px-1.5 py-0.5 rounded">
                          Empfohlen
                        </span>
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

            {/* Checkbox prefill */}
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
        )}
      </DialogContent>
    </Dialog>
  )
}
