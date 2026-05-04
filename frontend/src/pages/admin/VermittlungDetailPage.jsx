import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PROCESS_STATUS_LABELS, formatDateTime, cn } from '@/lib/utils'
import { getProfileSpecializations, ALL_SPECIALIZATION_FIELDS } from '@/lib/profileOptions'
import {
  ArrowLeft, User, Building2, Mail, Phone, CheckCircle2,
  Circle, Loader2, AlertTriangle, Send, Clock, ChevronRight,
  ExternalLink, FileText, Upload, X, MailX, MailCheck, FolderOpen,
  ClipboardList, Save
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Steps that trigger an AUTOMATIC email via update-reservation (no dialog)
// Step 4 is handled separately via ZusageDialog → create-link API
const EMAIL_TRIGGER_STEPS = new Set([2, 8, 9])

// ─── Step dot ─────────────────────────────────────────────────────────────────
function StepDot({ step, current }) {
  const done   = step < current
  const active = step === current
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
      done   ? 'bg-green-500 text-white shadow-sm' :
      active ? 'bg-fkvi-blue text-white shadow-md ring-4 ring-fkvi-blue/20' :
               'bg-gray-100 text-gray-400'
    }`}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : step}
    </div>
  )
}

// ─── Process step row ─────────────────────────────────────────────────────────
function StepRow({ step, label, current }) {
  const done   = step < current
  const active = step === current
  const future = step > current
  const hasEmail = EMAIL_TRIGGER_STEPS.has(step)

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
      active ? 'bg-fkvi-blue/5' : 'hover:bg-gray-50'
    }`}>
      <StepDot step={step} current={current} />
      <span className={`flex-1 text-sm leading-tight ${
        done ? 'text-gray-400 line-through' : active ? 'text-fkvi-blue font-semibold' : 'text-gray-500'
      }`}>
        {label}
      </span>
      {hasEmail && (
        <span title="E-Mail wird automatisch ausgelöst"
          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${
            done || active ? 'border-blue-200 text-blue-500 bg-blue-50' : 'border-gray-200 text-gray-300'
          }`}>
          ✉
        </span>
      )}
      {active && <ChevronRight className="h-3.5 w-3.5 text-fkvi-blue shrink-0" />}
    </div>
  )
}

// ─── History entry ────────────────────────────────────────────────────────────
function HistoryEntry({ entry }) {
  return (
    <div className="flex gap-3 text-sm">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-fkvi-blue mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>
      <div className="pb-4 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-gray-800">
            {entry.old_status ? `Schritt ${entry.old_status} → ${entry.new_status}` : `Start: Schritt ${entry.new_status}`}
          </span>
          <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
          {EMAIL_TRIGGER_STEPS.has(entry.new_status) && (
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded">E-Mail gesendet</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{PROCESS_STATUS_LABELS[entry.new_status]}</p>
        {entry.notes && (
          <p className="text-xs text-gray-400 mt-1 italic bg-gray-50 rounded px-2 py-1">{entry.notes}</p>
        )}
      </div>
    </div>
  )
}

// ─── Zusage Dialog (Step 4) ───────────────────────────────────────────────────
const ZUSAGE_TABS = [
  { key: 'profile', label: 'Fachkraft-Dokumente', Icon: User },
  { key: 'templates', label: 'Vorlagen',           Icon: FolderOpen },
  { key: 'upload',   label: 'Dateien hochladen',   Icon: Upload },
]

function ZusageDialog({ open, onClose, reservation, session, onConfirm }) {
  // Email toggle
  const [sendEmail, setSendEmail] = useState(true)
  // Doc sources
  const [docTab,      setDocTab]      = useState('profile')
  const [profileDocs, setProfileDocs] = useState([])
  const [templates,   setTemplates]   = useState([])
  const [uploadFiles, setUploadFiles] = useState([]) // [{ file, name, uploading, url, error }]
  // Selected docs (unified): [{ title, doc_type, link }]
  const [selectedDocs, setSelectedDocs] = useState([])
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [loadingProfile, setLoadingProfile]     = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef(null)

  // Reset when dialog opens
  useEffect(() => {
    if (!open) return
    setSendEmail(true)
    setDocTab('profile')
    setSelectedDocs([])
    setUploadFiles([])
    setExpiresInDays('30')
    loadProfileDocs()
  }, [open, reservation?.profile_id])

  const loadProfileDocs = async () => {
    if (!reservation?.profile_id) return
    setLoadingProfile(true)
    const { data } = await supabase
      .from('profile_documents')
      .select('*')
      .eq('profile_id', reservation.profile_id)
      .eq('is_internal', false)
      .order('sort_order', { ascending: true })
    setProfileDocs(data || [])
    setLoadingProfile(false)
  }

  const loadTemplates = async () => {
    if (templates.length > 0) return // already loaded
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/admin/company-docs/list-templates', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      toast({ title: 'Fehler', description: 'Vorlagen konnten nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleTabChange = (tab) => {
    setDocTab(tab)
    if (tab === 'templates') loadTemplates()
  }

  // Toggle a doc in/out of selectedDocs (by title as key)
  const toggleDoc = (doc) => {
    setSelectedDocs(prev => {
      const exists = prev.some(d => d.title === doc.title && d.link === doc.link)
      return exists ? prev.filter(d => !(d.title === doc.title && d.link === doc.link)) : [...prev, doc]
    })
  }
  const isSelected = (doc) => selectedDocs.some(d => d.title === doc.title && d.link === doc.link)

  // File upload handling
  const handleFilesPicked = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadFiles(prev => [
      ...prev,
      ...files.map(f => ({ file: f, name: f.name, uploading: false, url: null, error: null })),
    ])
    e.target.value = ''
  }

  const uploadFile = async (idx) => {
    const item = uploadFiles[idx]
    if (!item || item.uploading || item.url) return

    setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, uploading: true, error: null } : f))
    try {
      // 1. Get presigned upload URL
      const prepRes = await fetch('/api/admin/company-docs/prepare-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ filename: item.name }),
      })
      const prepData = await prepRes.json()
      if (!prepRes.ok) throw new Error(prepData.error || 'Upload-Vorbereitung fehlgeschlagen')

      // 2. Upload file directly to Supabase storage via presigned URL
      const uploadRes = await fetch(prepData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': item.file.type || 'application/octet-stream' },
        body: item.file,
      })
      if (!uploadRes.ok) throw new Error('Datei-Upload fehlgeschlagen')

      // 3. Mark as uploaded with download URL
      setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, uploading: false, url: prepData.downloadUrl } : f))
      // Auto-add to selectedDocs
      setSelectedDocs(prev => {
        const doc = { title: item.name, doc_type: 'Hochgeladen', link: prepData.downloadUrl }
        return prev.some(d => d.link === prepData.downloadUrl) ? prev : [...prev, doc]
      })
    } catch (err) {
      setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, uploading: false, error: err.message } : f))
    }
  }

  const removeUploadFile = (idx) => {
    const item = uploadFiles[idx]
    if (item?.url) {
      setSelectedDocs(prev => prev.filter(d => d.link !== item.url))
    }
    setUploadFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSkip = () => { onClose(); onConfirm({ emailSent: false }) }

  const handleSend = async () => {
    setSending(true)
    try {
      const c = reservation.companies
      if (!c?.email) throw new Error('Kein E-Mail für dieses Unternehmen hinterlegt')
      const res = await fetch('/api/admin/company-docs/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          reservationId: reservation.id,
          profileId: reservation.profile_id,
          companyEmail: c.email,
          companyName: c.company_name,
          documents: selectedDocs,
          expiresInDays: parseInt(expiresInDays, 10),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden')
      onClose()
      onConfirm({ emailSent: true })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const c = reservation?.companies
  const pendingUploads = uploadFiles.filter(f => !f.url && !f.error).length

  return (
    <Dialog open={open} onOpenChange={open => { if (!open && !sending) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Zusage erteilen – Schritt 4</DialogTitle>
          <DialogDescription>
            Empfänger: <strong>{c?.company_name || 'Unternehmen'}</strong>
            {c?.email && <span className="text-gray-400"> · {c.email}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── E-Mail Toggle ── */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setSendEmail(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                !sendEmail ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MailX className="h-4 w-4" />
              Keine E-Mail
            </button>
            <button
              onClick={() => setSendEmail(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                sendEmail ? 'bg-white shadow-sm text-[#1a3a5c]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MailCheck className="h-4 w-4" />
              E-Mail senden
            </button>
          </div>

          {/* ── Email options ── */}
          {sendEmail && (
            <div className="space-y-3">
              {/* Source tabs */}
              <div className="flex border-b border-gray-200">
                {ZUSAGE_TABS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                      docTab === key
                        ? 'border-[#1a3a5c] text-[#1a3a5c]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Fachkraft-Dokumente */}
              {docTab === 'profile' && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {loadingProfile ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  ) : profileDocs.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Keine öffentlichen Dokumente für diese Fachkraft.</p>
                  ) : profileDocs.map(doc => {
                    const docObj = { title: doc.title, doc_type: doc.doc_type || '', link: doc.link || '' }
                    const on = isSelected(docObj)
                    return (
                      <label key={doc.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${on ? 'border-[#1a3a5c] bg-[#1a3a5c]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="checkbox" checked={on} onChange={() => toggleDoc(docObj)} className="h-4 w-4 rounded border-gray-300 accent-[#1a3a5c]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                          {doc.doc_type && <p className="text-xs text-gray-400">{doc.doc_type}</p>}
                        </div>
                        <FileText className="h-4 w-4 text-gray-300 shrink-0" />
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Tab: Vorlagen */}
              {docTab === 'templates' && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  ) : templates.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Keine Vorlagen verfügbar.</p>
                  ) : templates.map(t => {
                    const docObj = { title: t.name, doc_type: 'Vorlage', link: t.url }
                    const on = isSelected(docObj)
                    return (
                      <label key={t.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${on ? 'border-[#1a3a5c] bg-[#1a3a5c]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="checkbox" checked={on} onChange={() => toggleDoc(docObj)} className="h-4 w-4 rounded border-gray-300 accent-[#1a3a5c]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                          {t.label && <p className="text-xs text-gray-400 capitalize">{t.label}</p>}
                        </div>
                        <FileText className="h-4 w-4 text-gray-300 shrink-0" />
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Tab: Dateien hochladen */}
              {docTab === 'upload' && (
                <div className="space-y-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#1a3a5c]/40 hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Klicken oder Dateien hierher ziehen</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, Bilder – mehrere Dateien möglich</p>
                  </div>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesPicked} />

                  {uploadFiles.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {uploadFiles.map((f, idx) => (
                        <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${f.url ? 'border-green-200 bg-green-50' : f.error ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                          <FileText className={`h-4 w-4 shrink-0 ${f.url ? 'text-green-500' : f.error ? 'text-red-400' : 'text-gray-400'}`} />
                          <span className="flex-1 truncate text-gray-700">{f.name}</span>
                          {f.url && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                          {f.error && <span className="text-xs text-red-500 shrink-0">{f.error}</span>}
                          {!f.url && !f.uploading && !f.error && (
                            <button onClick={() => uploadFile(idx)} className="text-xs text-[#1a3a5c] font-medium hover:underline shrink-0">
                              Hochladen
                            </button>
                          )}
                          {f.uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" />}
                          <button onClick={() => removeUploadFile(idx)} className="text-gray-300 hover:text-gray-500 shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected docs summary */}
              {selectedDocs.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">{selectedDocs.length} Dokument{selectedDocs.length > 1 ? 'e' : ''} ausgewählt:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDocs.map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-[#1a3a5c]/8 text-[#1a3a5c] border border-[#1a3a5c]/20 rounded-full px-2 py-0.5">
                        {d.title}
                        <button onClick={() => setSelectedDocs(prev => prev.filter((_, j) => j !== i))} className="opacity-60 hover:opacity-100">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Link expiry */}
              <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Link gültig für</label>
                <select
                  value={expiresInDays}
                  onChange={e => setExpiresInDays(e.target.value)}
                  className="h-8 text-sm border border-gray-200 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                >
                  {[7, 14, 30, 90].map(d => <option key={d} value={d}>{d} Tage</option>)}
                </select>
                <span className="text-xs text-gray-400">(Dokumente-Zugangslink)</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={sending} className="mr-auto">
            Abbrechen
          </Button>
          {sendEmail ? (
            <Button
              onClick={handleSend}
              disabled={sending || pendingUploads > 0}
              className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
            >
              {sending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird gesendet…</>
                : <><Send className="h-4 w-4 mr-2" />{selectedDocs.length > 0 ? `E-Mail senden (${selectedDocs.length} Dok.) & weiter` : 'E-Mail senden & weiter'}</>
              }
            </Button>
          ) : (
            <Button onClick={handleSkip} disabled={sending} className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
              Ohne E-Mail weiter →
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VermittlungDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const [reservation, setReservation] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [note, setNote] = useState('')
  const [stopDialog, setStopDialog] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [zusageDialog, setZusageDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('prozess')
  const [foerderfall, setFoerderfall] = useState({ arbeitsverhaeltnis: {}, verguetung: {}, massnahme: {}, foerderung: {} })
  const [savingFF, setSavingFF] = useState(false)

  useEffect(() => { fetchData() }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resRes, histRes] = await Promise.all([
        supabase
          .from('reservations')
          .select(`
            id, process_status, created_at, updated_at,
            profile_id, company_id,
            arbeitsverhaeltnis, verguetung, massnahme, foerderung,
            profiles (
              id, first_name, last_name, gender, age, nationality,
              profile_image_url, nursing_education,
              total_experience_years, german_recognition,
              ${ALL_SPECIALIZATION_FIELDS.join(', ')}
            ),
            companies (
              id, company_name, email, phone, first_name, last_name
            )
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('process_status_history')
          .select('*')
          .eq('reservation_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (resRes.data) {
        setReservation(resRes.data)
        setFoerderfall({
          arbeitsverhaeltnis: resRes.data.arbeitsverhaeltnis || {},
          verguetung: resRes.data.verguetung || {},
          massnahme: resRes.data.massnahme || {},
          foerderung: resRes.data.foerderung || {},
        })
      }
      setHistory(histRes.data || [])
    } catch {
      // reservation will remain null, showing "not found" state
    } finally {
      setLoading(false)
    }
  }

  // emailSent = true  → came from ZusageDialog with email
  // emailSent = false → came from ZusageDialog without email
  // emailSent = null  → normal advance (auto-email via update-reservation)
  const handleAdvance = async ({ emailSent = null } = {}) => {
    if (!reservation) return
    const newStatus = reservation.process_status + 1
    if (newStatus > 11) return
    setAdvancing(true)
    try {
      const res = await fetch('/api/admin/update-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ reservationId: id, newStatus, notes: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // For step 4 the email is handled by ZusageDialog → use its result
      // For other email-trigger steps, show the auto-send notice
      const autoEmail = emailSent === null && EMAIL_TRIGGER_STEPS.has(newStatus)
      const desc = emailSent === true
        ? `${PROCESS_STATUS_LABELS[newStatus]} — Zusage-E-Mail mit Dokumenten-Link gesendet.`
        : emailSent === false
          ? `${PROCESS_STATUS_LABELS[newStatus]} — Ohne E-Mail weitergeführt.`
          : autoEmail
            ? `${PROCESS_STATUS_LABELS[newStatus]} — E-Mail automatisch an das Unternehmen gesendet.`
            : PROCESS_STATUS_LABELS[newStatus]

      toast({ title: `Weiter zu Schritt ${newStatus}`, description: desc, variant: 'success' })
      setNote('')
      await fetchData()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setAdvancing(false)
    }
  }

  const handleBack = async () => {
    if (!reservation || reservation.process_status <= 1) return
    const newStatus = reservation.process_status - 1
    setAdvancing(true)
    try {
      const res = await fetch('/api/admin/update-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ reservationId: id, newStatus, notes: `Schritt zurückgesetzt. ${note.trim()}`.trim() }),
      })
      if (!res.ok) throw new Error()
      toast({ title: `Zurück zu Schritt ${newStatus}`, description: PROCESS_STATUS_LABELS[newStatus] })
      setNote('')
      await fetchData()
    } catch {
      toast({ title: 'Fehler', description: 'Zurücksetzen fehlgeschlagen.', variant: 'destructive' })
    } finally {
      setAdvancing(false)
    }
  }

  const handleStop = async () => {
    setStopping(true)
    try {
      // Set profile back to published
      await supabase.from('profiles').update({ status: 'published' }).eq('id', reservation.profile_id)
      // Delete reservation
      await supabase.from('process_status_history').delete().eq('reservation_id', id)
      await supabase.from('reservations').delete().eq('id', id)
      toast({ title: 'Vermittlung beendet', description: 'Das Profil ist wieder als verfügbar markiert.' })
      navigate('/admin/vermittlungen')
    } catch {
      toast({ title: 'Fehler', description: 'Beenden fehlgeschlagen.', variant: 'destructive' })
    } finally {
      setStopping(false)
    }
  }

  // ── Förderfall helpers ────────────────────────────────────────────────────
  const setFF = (section, key, value) =>
    setFoerderfall(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }))

  const handleSaveFF = async () => {
    setSavingFF(true)
    const { error } = await supabase
      .from('reservations')
      .update({
        arbeitsverhaeltnis: foerderfall.arbeitsverhaeltnis,
        verguetung: foerderfall.verguetung,
        massnahme: foerderfall.massnahme,
        foerderung: foerderfall.foerderung,
      })
      .eq('id', id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Förderfall gespeichert', variant: 'success' })
    }
    setSavingFF(false)
  }

  if (loading) return (
    <div className="space-y-4 max-w-5xl">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )

  if (!reservation) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Vermittlung nicht gefunden.</p>
      <Button variant="outline" onClick={() => navigate('/admin/vermittlungen')} className="mt-4">
        Zurück zur Übersicht
      </Button>
    </div>
  )

  const p = reservation.profiles
  const c = reservation.companies
  const step = reservation.process_status
  const isDone = step === 11
  const nextStep = step + 1
  const nextEmailTrigger = EMAIL_TRIGGER_STEPS.has(nextStep)
  const pct = Math.round((step / 11) * 100)

  return (
    <>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/vermittlungen')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.gender || 'Fachkraft' : '—'}
              {' '}<span className="text-gray-400 font-normal">→</span>{' '}
              {c?.company_name || '—'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Gestartet: {formatDateTime(reservation.created_at)} · Schritt {step}/11
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStopDialog(true)}
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Vermittlung beenden
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold text-gray-700">{PROCESS_STATUS_LABELS[step]}</span>
            <span className="text-gray-400">{pct} %</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${isDone ? 'bg-green-500' : 'bg-fkvi-blue'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isDone && (
            <div className="mt-3 flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle2 className="h-4 w-4" />Vermittlung erfolgreich abgeschlossen!
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200">
          {[
            { id: 'prozess', label: 'Prozessübersicht' },
            { id: 'foerderfall', label: 'Förderfall-Daten' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-[#1a3a5c] text-[#1a3a5c]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'foerderfall' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={handleSaveFF} disabled={savingFF}>
              {savingFF ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Speichern...</> : <><Save className="h-4 w-4 mr-2" />Förderfall speichern</>}
            </Button>
          </div>

          {/* Arbeitsverhältnis */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />Daten zum Arbeitsverhältnis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Beginn des Beschäftigungsverhältnisses</Label>
                <Input type="date" value={foerderfall.arbeitsverhaeltnis.beginn || ''} onChange={e => setFF('arbeitsverhaeltnis', 'beginn', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Befristung</Label>
                <Select value={foerderfall.arbeitsverhaeltnis.befristung || ''} onValueChange={v => setFF('arbeitsverhaeltnis', 'befristung', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unbefristet">Unbefristet</SelectItem>
                    <SelectItem value="befristet">Befristet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {foerderfall.arbeitsverhaeltnis.befristung === 'befristet' && (
                <div className="space-y-1.5">
                  <Label>Ende der Befristung</Label>
                  <Input type="date" value={foerderfall.arbeitsverhaeltnis.befristung_bis || ''} onChange={e => setFF('arbeitsverhaeltnis', 'befristung_bis', e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Berufsbezeichnung / Branche</Label>
                <Input value={foerderfall.arbeitsverhaeltnis.berufsbezeichnung || ''} onChange={e => setFF('arbeitsverhaeltnis', 'berufsbezeichnung', e.target.value)} placeholder="z.B. Gesundheits- und Krankenpfleger/in" />
              </div>
              <div className="space-y-1.5">
                <Label>Arbeitszeit-Art</Label>
                <Select value={foerderfall.arbeitsverhaeltnis.arbeitszeit_art || ''} onValueChange={v => setFF('arbeitsverhaeltnis', 'arbeitszeit_art', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vollzeit">Vollzeit</SelectItem>
                    <SelectItem value="teilzeit">Teilzeit</SelectItem>
                    <SelectItem value="geringfuegig">Geringfügig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stunden pro Woche</Label>
                <Input type="number" value={foerderfall.arbeitsverhaeltnis.stunden_woche || ''} onChange={e => setFF('arbeitsverhaeltnis', 'stunden_woche', e.target.value)} placeholder="z.B. 40" min="0" max="60" />
              </div>
              <div className="space-y-1.5">
                <Label>Stunden pro Monat</Label>
                <Input type="number" value={foerderfall.arbeitsverhaeltnis.stunden_monat || ''} onChange={e => setFF('arbeitsverhaeltnis', 'stunden_monat', e.target.value)} placeholder="z.B. 174" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Urlaubsanspruch (Arbeitstage/Jahr)</Label>
                <Input type="number" value={foerderfall.arbeitsverhaeltnis.urlaubstage || ''} onChange={e => setFF('arbeitsverhaeltnis', 'urlaubstage', e.target.value)} placeholder="z.B. 28" min="0" max="50" />
              </div>
              <div className="space-y-1.5">
                <Label>Arbeitsort</Label>
                <Select value={foerderfall.arbeitsverhaeltnis.arbeitsort || ''} onValueChange={v => setFF('arbeitsverhaeltnis', 'arbeitsort', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arbeitgebersitz">Entspricht Arbeitgebersitz</SelectItem>
                    <SelectItem value="wechselnd">Wechselnd</SelectItem>
                    <SelectItem value="abweichend">Abweichende Adresse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                { key: 'sv_pflichtig', label: 'Sozialversicherungspflichtiges Arbeitsverhältnis' },
                { key: 'sv_pflicht_de', label: 'SV-Pflicht in Deutschland' },
                { key: 'arbeitnehmerueberlassung', label: 'Arbeitnehmerüberlassung' },
                { key: 'ueberstundenpflicht', label: 'Überstundenpflicht' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={!!foerderfall.arbeitsverhaeltnis[key]} onCheckedChange={v => setFF('arbeitsverhaeltnis', key, v)} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Vergütung */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Vergütung</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Grundgehalt brutto (€)</Label>
                <Input type="number" value={foerderfall.verguetung.grundgehalt || ''} onChange={e => setFF('verguetung', 'grundgehalt', e.target.value)} placeholder="z.B. 3200" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Einheit</Label>
                <Select value={foerderfall.verguetung.grundgehalt_einheit || ''} onValueChange={v => setFF('verguetung', 'grundgehalt_einheit', v)}>
                  <SelectTrigger><SelectValue placeholder="pro..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monat">pro Monat</SelectItem>
                    <SelectItem value="stunde">pro Stunde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Entgeltart</Label>
                <Select value={foerderfall.verguetung.entgeltart || ''} onValueChange={v => setFF('verguetung', 'entgeltart', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tariflich">Tariflich</SelectItem>
                    <SelectItem value="ortsuesblich">Ortsüblich</SelectItem>
                    <SelectItem value="frei">Frei verhandelt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Entgeltgruppe (bei Tarifbindung)</Label>
                <Input value={foerderfall.verguetung.entgeltgruppe || ''} onChange={e => setFF('verguetung', 'entgeltgruppe', e.target.value)} placeholder="z.B. P8 TVöD" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Weitere Gehaltsbestandteile</Label>
                <Input value={foerderfall.verguetung.weitere_bestandteile || ''} onChange={e => setFF('verguetung', 'weitere_bestandteile', e.target.value)} placeholder="z.B. Zulagen, Boni (Bezeichnung + Betrag)" />
              </div>
            </div>
          </div>

          {/* Weiterbildungsmaßnahme */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Weiterbildungsmaßnahme</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Maßnahmeziel / Bezeichnung der Weiterbildung</Label>
                <Input value={foerderfall.massnahme.bezeichnung || ''} onChange={e => setFF('massnahme', 'bezeichnung', e.target.value)} placeholder="z.B. Anpassungsqualifizierung Pflegefachkraft" />
              </div>
              <div className="space-y-1.5">
                <Label>Maßnahmenummer</Label>
                <Input value={foerderfall.massnahme.massnahmenummer || ''} onChange={e => setFF('massnahme', 'massnahmenummer', e.target.value)} placeholder="123/45678/2023" />
              </div>
              <div className="space-y-1.5">
                <Label>Bildungsgutscheinnummer</Label>
                <Input value={foerderfall.massnahme.bildungsgutschein_nr || ''} onChange={e => setFF('massnahme', 'bildungsgutschein_nr', e.target.value)} placeholder="123A456789-01 (optional)" />
              </div>
              <div className="space-y-1.5">
                <Label>Beginn</Label>
                <Input type="date" value={foerderfall.massnahme.beginn || ''} onChange={e => setFF('massnahme', 'beginn', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Voraussichtliches Ende</Label>
                <Input type="date" value={foerderfall.massnahme.ende || ''} onChange={e => setFF('massnahme', 'ende', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Umfang (Zeitstunden)</Label>
                <Input type="number" value={foerderfall.massnahme.zeitstunden || ''} onChange={e => setFF('massnahme', 'zeitstunden', e.target.value)} placeholder="z.B. 160" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Freistellungsstunden</Label>
                <Input type="number" value={foerderfall.massnahme.freistellungsstunden || ''} onChange={e => setFF('massnahme', 'freistellungsstunden', e.target.value)} placeholder="Stunden während Weiterbildung" min="0" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Bildungsträger (Name)</Label>
                <Input value={foerderfall.massnahme.bildungstraeger_name || ''} onChange={e => setFF('massnahme', 'bildungstraeger_name', e.target.value)} placeholder="Name des Maßnahmeträgers" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Bildungsträger (Adresse)</Label>
                <Input value={foerderfall.massnahme.bildungstraeger_adresse || ''} onChange={e => setFF('massnahme', 'bildungstraeger_adresse', e.target.value)} placeholder="Straße, PLZ, Ort" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                { key: 'azav_zugelassen', label: 'AZAV-zugelassen' },
                { key: 'dauer_gt120h', label: 'Dauer > 120 Stunden' },
                { key: 'ueber_anpassung', label: 'Vermittelt Inhalte über Anpassungsfortbildung hinaus' },
                { key: 'fuehrt_zu_abschluss', label: 'Führt zu Berufsabschluss (≥ 2-jährige Ausbildung)' },
                { key: 'verzicht_bildungsgutschein', label: 'Verzicht auf Bildungsgutschein' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={!!foerderfall.massnahme[key]} onCheckedChange={v => setFF('massnahme', key, v)} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Anerkennungsverfahren */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Anerkennungsverfahren (Drittstaatsangehörige)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Art des Verfahrens</Label>
                <Select value={foerderfall.massnahme.anerk_art || ''} onValueChange={v => setFF('massnahme', 'anerk_art', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="betriebliche_quali">Betriebliche Qualifizierung</SelectItem>
                    <SelectItem value="beschaeftigung_neben">Beschäftigung neben Qualifizierung</SelectItem>
                    <SelectItem value="anerkennungspartnerschaft">Anerkennungspartnerschaft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Antragsart</Label>
                <Select value={foerderfall.massnahme.anerk_antragsart || ''} onValueChange={v => setFF('massnahme', 'anerk_antragsart', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gleichwertigkeit">Gleichwertigkeit</SelectItem>
                    <SelectItem value="berufsausuebungserlaubnis">Berufsausübungserlaubnis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Name der Anerkennungsbehörde</Label>
                <Input value={foerderfall.massnahme.anerk_behoerde_name || ''} onChange={e => setFF('massnahme', 'anerk_behoerde_name', e.target.value)} placeholder="z.B. Regierungspräsidium Stuttgart" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Adresse Anerkennungsbehörde</Label>
                <Input value={foerderfall.massnahme.anerk_behoerde_adresse || ''} onChange={e => setFF('massnahme', 'anerk_behoerde_adresse', e.target.value)} placeholder="Straße, PLZ, Ort" />
              </div>
              <div className="space-y-1.5">
                <Label>Zielberuf nach Anerkennung</Label>
                <Input value={foerderfall.massnahme.anerk_zielberuf || ''} onChange={e => setFF('massnahme', 'anerk_zielberuf', e.target.value)} placeholder="z.B. Gesundheits- und Krankenpfleger/in" />
              </div>
              <div className="space-y-1.5">
                <Label>Zeitraum Nachqualifizierung von</Label>
                <Input type="date" value={foerderfall.massnahme.anerk_nachquali_von || ''} onChange={e => setFF('massnahme', 'anerk_nachquali_von', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Zeitraum Nachqualifizierung bis</Label>
                <Input type="date" value={foerderfall.massnahme.anerk_nachquali_bis || ''} onChange={e => setFF('massnahme', 'anerk_nachquali_bis', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                { key: 'anerk_unterschiede', label: 'Wesentliche Unterschiede festgestellt' },
                { key: 'anerk_ausgleich_erforderlich', label: 'Ausgleichsmaßnahmen erforderlich' },
                { key: 'anerk_teilbescheid', label: '(Teil-)Anerkennungsbescheid liegt vor' },
                { key: 'anerk_berufserlaubnis_erforderlich', label: 'Berufsausübungserlaubnis erforderlich' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={!!foerderfall.massnahme[key]} onCheckedChange={v => setFF('massnahme', key, v)} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Förderungs- / Antragsdaten */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Förderungs- / Antragsdaten</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'transferkug', label: 'Anspruch auf Transferkurzarbeitergeld' },
                { key: 'kug_beantragt', label: 'Kurzarbeitergeld beantragt' },
                { key: 'eingliederungszuschuss', label: 'Eingliederungszuschuss beantragt' },
                { key: 'zuschuss_andere_stelle', label: 'Zuschuss von anderer Stelle' },
                { key: 'zuwendungen_dritter', label: 'Zuwendungen Dritter zu Weiterbildungskosten' },
                { key: 'bundesrechtl_verpflichtung', label: 'Bundes-/landesrechtliche Verpflichtung zur Weiterbildung' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={!!foerderfall.foerderung[key]} onCheckedChange={v => setFF('foerderung', key, v)} />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
            {foerderfall.foerderung.zuschuss_andere_stelle && (
              <div className="space-y-1.5">
                <Label>Stellenbezeichnung (andere Stelle)</Label>
                <Input value={foerderfall.foerderung.zuschuss_andere_stelle_bezeichnung || ''} onChange={e => setFF('foerderung', 'zuschuss_andere_stelle_bezeichnung', e.target.value)} placeholder="Bezeichnung der anderen Stelle" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Anspruch gegenüber anderer öffentl.-rechtl. Stelle</Label>
              <Input value={foerderfall.foerderung.anspruch_oeffentlich || ''} onChange={e => setFF('foerderung', 'anspruch_oeffentlich', e.target.value)} placeholder="z.B. Rentenversicherung / Stelle + Aktenzeichen (optional)" />
            </div>
          </div>

          <div className="flex justify-end pb-4">
            <Button onClick={handleSaveFF} disabled={savingFF}>
              {savingFF ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Speichern...</> : <><Save className="h-4 w-4 mr-2" />Förderfall speichern</>}
            </Button>
          </div>
        </div>
        )}

        {activeTab === 'prozess' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Info + History ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Profil + Firma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Profil */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />Fachkraft
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                    {p?.profile_image_url
                      ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                      : <User className="h-5 w-5 text-gray-300" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.gender || '—' : '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {[p?.nationality, p?.age ? `${p.age} J.` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {p?.nursing_education && <p>🎓 {p.nursing_education}</p>}
                  {p?.total_experience_years && <p>⏱ {p.total_experience_years} Jahre Erfahrung</p>}
                  {getProfileSpecializations(p).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getProfileSpecializations(p).slice(0, 3).map(s => (
                        <span key={s} className="bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                {p?.id && (
                  <Link to={`/admin/fachkraefte/${p.id}`}
                    className="text-xs text-fkvi-blue hover:underline flex items-center gap-1">
                    Profil öffnen <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {/* Unternehmen */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400" />Unternehmen
                </h3>
                <div>
                  <p className="font-semibold text-gray-900">{c?.company_name || '—'}</p>
                </div>
                <div className="text-xs text-gray-500 space-y-2">
                  {(c?.first_name || c?.last_name) && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gray-300" />
                      {c.first_name} {c.last_name}
                    </div>
                  )}
                  {c?.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-fkvi-blue hover:underline">
                      <Mail className="h-3.5 w-3.5" />{c.email}
                    </a>
                  )}
                  {c?.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-300" />{c.phone}
                    </div>
                  )}
                </div>
                {c?.id && (
                  <Link to={`/admin/crm/${c.id}`}
                    className="text-xs text-fkvi-blue hover:underline flex items-center gap-1">
                    CRM-Eintrag <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Prozesshistorie */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />Prozesshistorie
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400">Noch keine Einträge.</p>
              ) : (
                <div>
                  {history.map(entry => (
                    <HistoryEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: 11-Step Tracker + Actions ───────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Prozessschritte</h3>

              <div className="space-y-0.5 mb-5">
                {Object.entries(PROCESS_STATUS_LABELS).map(([s, label]) => (
                  <StepRow key={s} step={Number(s)} label={label} current={step} />
                ))}
              </div>

              {!isDone && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {/* Note */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Notiz (optional)</label>
                    <Textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Anmerkung zum nächsten Schritt..."
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>

                  {/* Email hint */}
                  {nextStep === 4 ? (
                    <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 text-xs text-teal-700">
                      <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Du wirst gefragt, ob und welche Dokumente per sicherem Link an <strong>{c?.email || 'das Unternehmen'}</strong> gesendet werden sollen.</span>
                    </div>
                  ) : nextEmailTrigger ? (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                      <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Bei Schritt {nextStep} wird automatisch eine E-Mail an {c?.email || 'das Unternehmen'} gesendet.</span>
                    </div>
                  ) : null}

                  {/* Advance button */}
                  <Button
                    onClick={nextStep === 4 ? () => setZusageDialog(true) : handleAdvance}
                    disabled={advancing}
                    className="w-full"
                  >
                    {advancing
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird gespeichert...</>
                      : nextStep === 4
                        ? <><Send className="h-4 w-4 mr-2" />Zusage senden & weiter →</>
                        : <>Weiter zu Schritt {nextStep} →</>}
                  </Button>

                  {/* Back button */}
                  {step > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      disabled={advancing}
                      className="w-full text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ← Zurück zu Schritt {step - 1}
                    </Button>
                  )}
                </div>
              )}

              {isDone && (
                <div className="border-t border-gray-100 pt-4 text-center">
                  <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />Abgeschlossen
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Zusage dialog (step 4) */}
      <ZusageDialog
        open={zusageDialog}
        onClose={() => setZusageDialog(false)}
        reservation={reservation}
        session={session}
        onConfirm={({ emailSent }) => handleAdvance({ emailSent })}
      />

      {/* Stop confirmation */}
      <Dialog open={stopDialog} onOpenChange={setStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />Vermittlung beenden?
            </DialogTitle>
            <DialogDescription>
              Die Vermittlung von <strong>{p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'dieser Fachkraft'}</strong> an{' '}
              <strong>{c?.company_name}</strong> wird beendet. Das Profil wird wieder als verfügbar markiert.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleStop} disabled={stopping}>
              {stopping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
              Vermittlung beenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
