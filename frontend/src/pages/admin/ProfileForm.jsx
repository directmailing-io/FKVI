import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  GERMAN_STATES, FACILITY_TYPES, WORK_TIME_OPTIONS,
  SPECIALIZATIONS, EXPERIENCE_AREAS, PROFILE_STATUS_LABELS, PROCESS_STATUS_LABELS, formatDateTime
} from '@/lib/utils'
import {
  ArrowLeft, Save, Loader2, Upload, X, Plus, Trash2,
  Video, CheckCircle2, AlertCircle, User, FlaskConical, Crop, AlertTriangle, Bookmark, Building2, ExternalLink, Mail, Lock, Unlink, ChevronRight, FileText, Pencil, Eye, EyeOff, Link2, Copy, Check, ClipboardCopy
} from 'lucide-react'
import VimeoPlayer from '@/components/VimeoPlayer'
import { toast } from '@/hooks/use-toast'

// ─── Field helper — defined OUTSIDE component to avoid focus-jumping bug ──────
const Field = ({ label, children, required }) => (
  <div className="space-y-1.5">
    <Label>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {children}
  </div>
)

// ─── Error translation ─────────────────────────────────────────────────────────
function translateError(msg) {
  if (!msg) return 'Unbekannter Fehler.'
  if (msg.includes('profiles_german_recognition_check'))
    return 'Bitte wähle einen gültigen Wert für "Anerkennung in Deutschland" aus.'
  if (msg.includes('profiles_gender_check'))
    return 'Bitte wähle ein Geschlecht aus.'
  if (msg.includes('profiles_marital_status_check'))
    return 'Bitte wähle einen Familienstand aus.'
  if (msg.includes('profiles_work_time_preference_check'))
    return 'Bitte wähle eine Arbeitszeitpräferenz aus.'
  if (msg.includes('profiles_status_check'))
    return 'Ungültiger Profilstatus.'
  if (msg.includes('duplicate key') || msg.includes('unique_violation'))
    return 'Ein Datensatz mit diesen Daten existiert bereits.'
  if (msg.includes('storage'))
    return 'Fehler beim Bildupload. Bitte prüfe das Dateiformat (JPG/PNG, max. 5 MB).'
  if (msg.includes('JWT') || msg.includes('auth'))
    return 'Sitzung abgelaufen – bitte neu einloggen.'
  return msg
}

// ─── Test data generator ──────────────────────────────────────────────────────
function generateTestData() {
  const firstNames = ['Maria', 'Ana', 'Elena', 'Sofia', 'Irina', 'Nguyen Thi', 'Priya', 'Fatima', 'Olga', 'Jana']
  const lastNames = ['Santos', 'Popescu', 'Kim', 'Müller-Reyes', 'Horvath', 'Tran', 'Patel', 'Al-Hassan', 'Novak', 'García']
  const nationalities = ['Philippinen', 'Rumänien', 'Vietnam', 'Indien', 'Mexiko', 'Ukraine', 'Bosnien', 'Tunesien', 'Georgien', 'Kosovo']
  const recognitions = ['anerkannt', 'in_bearbeitung', 'nicht_beantragt', 'abgelehnt']
  const genders = ['weiblich', 'männlich', 'divers']
  const maritalStatuses = ['ledig', 'verheiratet', 'geschieden', 'verwitwet']
  const workTimes = WORK_TIME_OPTIONS
  const states = GERMAN_STATES.slice(0, 4)
  const facilities = FACILITY_TYPES.slice(0, 3)
  const specs = SPECIALIZATIONS.slice(0, 3)
  const expAreas = EXPERIENCE_AREAS.slice(0, 4)

  const pick = arr => arr[Math.floor(Math.random() * arr.length)]
  const pickN = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n)
  const year = 1985 + Math.floor(Math.random() * 15)

  return {
    status: 'draft',
    first_name: pick(firstNames),
    last_name: pick(lastNames),
    gender: pick(genders),
    age: String(25 + Math.floor(Math.random() * 20)),
    nationality: pick(nationalities),
    marital_status: pick(maritalStatuses),
    children_count: String(Math.floor(Math.random() * 3)),
    has_drivers_license: Math.random() > 0.4,
    state_preferences: pickN(states, 2),
    nationwide: false,
    preferred_facility_types: pickN(facilities, 2),
    work_time_preference: pick(workTimes),
    profile_image_url: '',
    vimeo_video_url: '',
    vimeo_video_id: '',
    school_education: pick(['Abitur', 'Mittlere Reife', 'Hochschulreife', 'Berufsschule']),
    nursing_education: pick(['Gesundheits- und Krankenpfleger/in', 'Altenpfleger/in', 'Kinderkrankenpfleger/in', 'Pflegefachkraft']),
    education_duration: pick(['2 Jahre', '3 Jahre', '3,5 Jahre', '4 Jahre']),
    graduation_year: String(year),
    german_recognition: pick(recognitions),
    education_notes: 'Ausbildung erfolgreich abgeschlossen. Alle Zeugnisse liegen vor.',
    specializations: pickN(specs, 2),
    additional_qualifications: pickN(['Wundmanagement', 'Kinästhetik', 'Diabetes-Beratung', 'Palliative Care'], 2),
    total_experience_years: String(2 + Math.floor(Math.random() * 10)),
    germany_experience_years: String(Math.floor(Math.random() * 3)),
    experience_areas: pickN(expAreas, 3),
    language_skills: [
      { language: 'Deutsch', level: pick(['B1', 'B2', 'C1']) },
      { language: 'Englisch', level: pick(['A2', 'B1', 'B2']) },
    ],
    fkvi_competency_proof: `Bestanden am ${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}.0${Math.floor(Math.random() * 9) + 1}.2024`,
    internal_notes: 'Testdaten – bitte vor Veröffentlichung prüfen.',
  }
}

// ─── Image Cropper Dialog ─────────────────────────────────────────────────────
function ImageCropperDialog({ src, onDone, onCancel }) {
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  const onImageLoad = useCallback((e) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
      width,
      height
    )
    setCrop(initialCrop)
  }, [])

  const handleApply = () => {
    const image = imgRef.current
    const canvas = canvasRef.current
    if (!completedCrop || !image || !canvas) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const ctx = canvas.getContext('2d')

    const pixelRatio = window.devicePixelRatio
    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio)
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio)

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    )

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      onDone(file, url)
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Crop className="h-4 w-4" />Bild zuschneiden
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500">Ziehe den Rahmen, um das Profilbild zuzuschneiden (1:1 Format).</p>
        <div className="flex justify-center max-h-80 overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, pct) => setCrop(pct)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop={false}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Zuschneiden"
              onLoad={onImageLoad}
              style={{ maxHeight: '320px', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button onClick={handleApply} disabled={!completedCrop}>
            <Crop className="h-4 w-4 mr-2" />Zuschnitt übernehmen
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Document components ──────────────────────────────────────────────────────
const DOC_TYPES = ['Zeugnis', 'Anerkennungsbescheid', 'Sprachzertifikat', 'Lebenslauf', 'Referenz', 'Sonstiges']

const DOC_TYPE_COLORS = {
  'Zeugnis': 'bg-blue-50 text-blue-700',
  'Anerkennungsbescheid': 'bg-purple-50 text-purple-700',
  'Sprachzertifikat': 'bg-green-50 text-green-700',
  'Lebenslauf': 'bg-orange-50 text-orange-700',
  'Referenz': 'bg-pink-50 text-pink-700',
  'Sonstiges': 'bg-gray-100 text-gray-600',
}

function DocEditDialog({ doc, onSave, onClose }) {
  const [form, setForm] = useState({ title: '', doc_type: '', description: '', link: '', is_internal: false, ...doc })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {doc.title ? 'Dokument bearbeiten' : 'Neues Dokument'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Titel" required>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="z.B. Abschlusszeugnis" autoFocus />
            </Field>
            <Field label="Typ">
              <Select value={form.doc_type} onValueChange={v => set('doc_type', v)}>
                <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Link (Google Drive, Dropbox, o.ä.)" required>
            <Input value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://drive.google.com/..." type="url" />
          </Field>
          <Field label="Beschreibung">
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kurze Beschreibung (optional)..." rows={2} />
          </Field>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {form.is_internal
                ? <EyeOff className="h-4 w-4 text-amber-500" />
                : <Eye className="h-4 w-4 text-green-500" />}
              <div>
                <p className="text-sm font-medium">{form.is_internal ? 'Internes Dokument' : 'Für Unternehmen sichtbar'}</p>
                <p className="text-xs text-gray-400">{form.is_internal ? 'Nur für Admins' : 'Im Statustracker sichtbar'}</p>
              </div>
            </div>
            <Switch checked={!!form.is_internal} onCheckedChange={v => set('is_internal', v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={() => onSave(form)} disabled={!form.link?.trim()}>
            <Save className="h-3.5 w-3.5 mr-1.5" />Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── SendTemplateDialog ───────────────────────────────────────────────────────
function SendTemplateDialog({ profileId, profile, session, onClose, onSent }) {
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [signerName, setSignerName] = useState(
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
  )
  const [sending, setSending] = useState(false)
  const [signerUrl, setSignerUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  // Profile → prefill data map
  const prefillData = {
    'profile.first_name': profile?.first_name || '',
    'profile.last_name': profile?.last_name || '',
    'profile.nationality': profile?.nationality || '',
    'profile.education': profile?.nursing_education || '',
    'signer.name': `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
  }

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

  const prefilledFields = (selectedTemplate?.fields || []).filter(
    f => f.prefillKey && prefillData[f.prefillKey]
  )

  const handleCreate = async () => {
    if (!selectedId || !signerName.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/dokumente/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          templateId: selectedId,
          profileId,
          signerName: signerName.trim(),
          signerEmail: null,
          prefillData,
        }),
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

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {signerUrl ? 'Signierlink generiert' : 'Vorlage für Fachkraft erstellen'}
          </DialogTitle>
        </DialogHeader>

        {signerUrl ? (
          /* ── URL success state ── */
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Link für {signerName} erstellt
              </div>
              <p className="text-xs text-gray-500">
                Sende diesen Link manuell an die Fachkraft (E-Mail, WhatsApp, o.ä.):
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
          /* ── Form state ── */
          <div className="space-y-4 py-1">
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
            <Field label="Unterzeichner (Fachkraft)" required>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </Field>

            {/* Pre-fill preview */}
            {selectedId && templateLoading && (
              <div className="h-8 animate-pulse bg-gray-100 rounded" />
            )}
            {selectedId && !templateLoading && prefilledFields.length > 0 && (
              <div className="rounded-lg bg-[#1a3a5c]/5 border border-[#1a3a5c]/15 p-3 space-y-1.5">
                <p className="text-xs font-medium text-[#1a3a5c]">Vorausgefüllte Felder aus Profil:</p>
                {prefilledFields.map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 shrink-0 w-28 truncate">{f.label}:</span>
                    <span className="text-gray-700 font-medium truncate">{prefillData[f.prefillKey]}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedId && !templateLoading && prefilledFields.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                Keine automatisch vorausfüllbaren Felder in dieser Vorlage.
              </p>
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

// ─── Empty profile defaults ───────────────────────────────────────────────────
const EMPTY_PROFILE = {
  status: 'draft',
  first_name: '', last_name: '', gender: '', age: '',
  nationality: '', marital_status: '', children_count: '0', has_drivers_license: false,
  state_preferences: [], nationwide: false,
  preferred_facility_types: [], work_time_preference: '',
  profile_image_url: '', vimeo_video_url: '', vimeo_video_id: '',
  school_education: '', nursing_education: '', education_duration: '',
  graduation_year: '', german_recognition: '', education_notes: '',
  specializations: [], additional_qualifications: [],
  total_experience_years: '', germany_experience_years: '',
  experience_areas: [], language_skills: [],
  fkvi_competency_proof: '', internal_notes: '',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'neu'
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuthStore()

  const reserveFor = new URLSearchParams(location.search).get('reserveFor')

  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)   // raw image waiting to be cropped
  const [videoFile, setVideoFile] = useState(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // null | 0-100
  const [videoMode, setVideoMode] = useState('upload') // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null) // { idx: number|null, doc: {} } — null idx = new doc
  const [deletingDocIdx, setDeletingDocIdx] = useState(null)
  const [docSaving, setDocSaving] = useState(false)
  const [reserveDialog, setReserveDialog] = useState(false)
  const [companies, setCompanies] = useState([])
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [reserving, setReserving] = useState(false)
  const [reserveForCompany, setReserveForCompany] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [docSends, setDocSends] = useState([])
  const [docSendsLoading, setDocSendsLoading] = useState(false)
  const [sendTemplateDialog, setSendTemplateDialog] = useState(false)
  const [reservationHistory, setReservationHistory] = useState([])
  const [advancing, setAdvancing] = useState(false)
  const [decoupling, setDecoupling] = useState(false)
  const [decoupleDialog, setDecoupleDialog] = useState(false)
  const [pendingAdvance, setPendingAdvance] = useState(null) // { newStatus, needsDate, emailAlreadySent }
  const [stepDate, setStepDate] = useState('')
  const [resendEmail, setResendEmail] = useState(false)

  const EMAIL_TRIGGER_STEPS = new Set([2, 8, 9])
  const DATE_STEPS = new Set([2, 7, 9, 10, 11])
  const imageRef = useRef()
  const videoRef = useRef()

  useEffect(() => {
    if (isEdit) { fetchProfile(); loadDocSends() }
  }, [id, session])

  useEffect(() => {
    if (!reserveFor) return
    supabase.from('companies').select('id, company_name').eq('id', reserveFor).single()
      .then(({ data }) => { if (data) setReserveForCompany(data) })
  }, [reserveFor])

  const fetchProfile = async () => {
    const [{ data: p }, { data: docs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('profile_documents').select('*').eq('profile_id', id).order('sort_order'),
    ])
    if (p) {
      setProfile({ ...EMPTY_PROFILE, ...p })
      setImagePreview(p.profile_image_url)
      if (p.status === 'reserved') {
        const { data: res } = await supabase
          .from('reservations')
          .select('id, process_status, company_id, companies (id, company_name, email, company_type)')
          .eq('profile_id', id)
          .single()
        setReservation(res || null)
        if (res) {
          const { data: hist } = await supabase
            .from('process_status_history')
            .select('*')
            .eq('reservation_id', res.id)
            .order('created_at', { ascending: false })
          setReservationHistory(hist || [])
        }
      } else {
        setReservation(null)
        setReservationHistory([])
      }
    }
    setDocuments(docs || [])
    setLoading(false)
  }

  const set = (field, value) => setProfile(prev => ({ ...prev, [field]: value }))

  // Raw file selected → open crop dialog
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    // reset input so same file can be selected again
    e.target.value = ''
  }

  // Crop completed → set cropped file + preview
  const handleCropDone = (croppedFile, croppedUrl) => {
    setImageFile(croppedFile)
    setImagePreview(croppedUrl)
    setCropSrc(null)
  }

  const handleVideoUpload = async () => {
    if (!videoFile || !isEdit) return
    setVideoUploading(true)
    setUploadProgress(0)
    try {
      // Step 1: Create upload slot on Vimeo via backend
      const initRes = await fetch('/api/admin/vimeo/init-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: id,
          fileName: videoFile.name,
          fileSize: videoFile.size,
        }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error(initData.error)

      const { uploadLink, videoId, embedUrl } = initData

      // Step 2: Upload file directly to Vimeo via TUS (PATCH with offset 0)
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PATCH', uploadLink, true)
        xhr.setRequestHeader('Tus-Resumable', '1.0.0')
        xhr.setRequestHeader('Upload-Offset', '0')
        xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload fehlgeschlagen: HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'))
        xhr.send(videoFile)
      })

      // Step 3: Save video URL to Supabase
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ vimeo_video_url: embedUrl, vimeo_video_id: videoId })
        .eq('id', id)
      if (updateErr) throw updateErr

      setProfile(prev => ({ ...prev, vimeo_video_url: embedUrl, vimeo_video_id: videoId }))
      setVideoFile(null)
      setUploadProgress(null)
      toast({ title: 'Video hochgeladen', description: 'Das Video wurde erfolgreich zu Vimeo hochgeladen.', variant: 'success' })
    } catch (err) {
      setUploadProgress(null)
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setVideoUploading(false)
    }
  }

  const handleUrlSave = async () => {
    if (!urlInput.trim() || !isEdit) return
    const trimmed = urlInput.trim()
    // Accept full Vimeo URLs or bare IDs
    const idMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/) ||
      trimmed.match(/^(\d+)$/)
    if (!idMatch) {
      toast({ title: 'Ungültige URL', description: 'Bitte eine gültige Vimeo-URL oder Video-ID eingeben.', variant: 'destructive' })
      return
    }
    const videoId = idMatch[1]
    const embedUrl = `https://player.vimeo.com/video/${videoId}`
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ vimeo_video_url: embedUrl, vimeo_video_id: videoId })
      .eq('id', id)
    if (updateErr) {
      toast({ title: 'Fehler', description: updateErr.message, variant: 'destructive' })
      return
    }
    setProfile(prev => ({ ...prev, vimeo_video_url: embedUrl, vimeo_video_id: videoId }))
    setUrlInput('')
    toast({ title: 'Video gespeichert', description: 'Vimeo-Video wurde verknüpft.', variant: 'success' })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      let imageUrl = profile.profile_image_url

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `profiles/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('profile-images').upload(path, imageFile)
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      // Convert empty enum strings to null to avoid DB CHECK constraint violations
      const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v)

      const payload = {
        ...profile,
        profile_image_url: imageUrl,
        age: profile.age ? parseInt(profile.age) : null,
        children_count: profile.children_count ? parseInt(profile.children_count) : 0,
        graduation_year: profile.graduation_year ? parseInt(profile.graduation_year) : null,
        total_experience_years: profile.total_experience_years ? parseFloat(profile.total_experience_years) : null,
        germany_experience_years: profile.germany_experience_years ? parseFloat(profile.germany_experience_years) : null,
        gender: nullIfEmpty(profile.gender),
        marital_status: nullIfEmpty(profile.marital_status),
        work_time_preference: nullIfEmpty(profile.work_time_preference),
        german_recognition: nullIfEmpty(profile.german_recognition),
      }
      delete payload.id
      delete payload.created_at
      delete payload.updated_at

      let profileId = id
      if (isEdit) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('profiles').insert(payload).select().single()
        if (error) throw error
        profileId = data.id
      }

      // Save documents via service-role API to guarantee write access regardless of RLS
      const docsRes = await fetch('/api/admin/save-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ profileId, documents }),
      })
      if (!docsRes.ok) {
        const docsErr = await docsRes.json().catch(() => ({}))
        throw new Error(docsErr.error || 'Dokumente konnten nicht gespeichert werden')
      }

      toast({ title: 'Gespeichert', description: 'Das Profil wurde erfolgreich gespeichert.', variant: 'success' })
      if (!isEdit) navigate(`/admin/fachkraefte/${profileId}`)
    } catch (err) {
      setError(translateError(err.message || 'Speichern fehlgeschlagen'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProfile = async () => {
    setDeleteDialog(false)
    try {
      // Delete image from storage if exists
      if (profile.profile_image_url) {
        const path = profile.profile_image_url.split('/profile-images/')[1]
        if (path) await supabase.storage.from('profile-images').remove([path])
      }
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Profil gelöscht', description: 'Das Profil wurde dauerhaft gelöscht.' })
      navigate('/admin/fachkraefte')
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  const openReserveDialog = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, company_name, email, status, first_name, last_name')
      .order('company_name')
    setCompanies(data || [])
    setSelectedCompanyId('')
    setCompanySearch('')
    setReserveDialog(true)
  }

  const handleReserve = async () => {
    if (!selectedCompanyId) return
    setReserving(true)
    try {
      const res = await fetch('/api/admin/create-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profileId: id, companyId: selectedCompanyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReserveDialog(false)
      toast({ title: 'Vermittlung gestartet', description: 'Die Fachkraft wurde reserviert und Schritt 1 gestartet.' })
      // Refresh profile to show new status
      fetchProfile()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setReserving(false)
    }
  }

  const handleReserveFor = async () => {
    if (!reserveFor) return
    setReserving(true)
    try {
      const res = await fetch('/api/admin/create-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profileId: id, companyId: reserveFor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Reserviert', description: `Fachkraft wurde für ${reserveForCompany?.company_name || 'das Unternehmen'} reserviert.` })
      fetchProfile()
      navigate(`/admin/crm/${reserveFor}`)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setReserving(false)
    }
  }

  const handleAdvanceStatus = (direction) => {
    if (!reservation) return
    const newStatus = direction === 'forward'
      ? Math.min(reservation.process_status + 1, 11)
      : Math.max(reservation.process_status - 1, 1)
    if (newStatus === reservation.process_status) return

    const needsDate = direction === 'forward' && DATE_STEPS.has(newStatus)
    const emailAlreadySent = EMAIL_TRIGGER_STEPS.has(newStatus) &&
      reservationHistory.some(h => h.new_status === newStatus)

    if (needsDate || emailAlreadySent) {
      setStepDate('')
      setResendEmail(false) // default: don't resend if already sent
      setPendingAdvance({ newStatus, needsDate, emailAlreadySent })
    } else {
      doAdvanceStatus(newStatus, null, false)
    }
  }

  const doAdvanceStatus = async (newStatus, date, skipEmail) => {
    setAdvancing(true)
    try {
      const res = await fetch('/api/admin/update-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          reservationId: reservation.id,
          newStatus,
          notes: null,
          stepDate: date || null,
          skipEmail: !!skipEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReservation(prev => ({ ...prev, process_status: newStatus }))
      const { data: hist } = await supabase
        .from('process_status_history')
        .select('*')
        .eq('reservation_id', reservation.id)
        .order('created_at', { ascending: false })
      setReservationHistory(hist || [])
      toast({ title: `Schritt ${newStatus}/11`, description: PROCESS_STATUS_LABELS[newStatus] })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setAdvancing(false)
      setPendingAdvance(null)
      setStepDate('')
      setResendEmail(false)
    }
  }

  const handleDecouple = async () => {
    if (!reservation) return
    setDecoupling(true)
    try {
      const res = await fetch('/api/admin/decouple-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ reservationId: reservation.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Entkoppelt', description: 'Fachkraft und Unternehmen wurden getrennt.' })
      setDecoupleDialog(false)
      fetchProfile()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setDecoupling(false)
    }
  }

  const fillTestData = () => {
    const data = generateTestData()
    setProfile(prev => ({ ...prev, ...data }))
    toast({ title: 'Testdaten eingefüllt', description: 'Alle Felder wurden mit Beispieldaten befüllt.' })
  }

  const addLanguage = () => {
    set('language_skills', [...(profile.language_skills || []), { language: '', level: '' }])
  }

  const updateLanguage = (idx, field, value) => {
    const langs = [...(profile.language_skills || [])]
    langs[idx] = { ...langs[idx], [field]: value }
    set('language_skills', langs)
  }

  const removeLanguage = (idx) => {
    set('language_skills', (profile.language_skills || []).filter((_, i) => i !== idx))
  }

  // ── Document helpers ──────────────────────────────────────────────────────────
  const loadDocSends = async () => {
    if (!id || !session) return
    setDocSendsLoading(true)
    try {
      const res = await fetch(`/api/admin/dokumente/sends-list?profileId=${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setDocSends(data.sends || [])
    } catch {
      // non-critical
    } finally {
      setDocSendsLoading(false)
    }
  }

  const saveDocumentsToApi = async (docs) => {
    if (!id) return // only for edit mode
    setDocSaving(true)
    try {
      const res = await fetch('/api/admin/save-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ profileId: id, documents: docs }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Dokumente konnten nicht gespeichert werden')
      }
      toast({ title: 'Dokumente gespeichert', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setDocSaving(false)
    }
  }

  const handleSaveDoc = async (form) => {
    let updated
    if (editingDoc.idx === null) {
      // New document
      updated = [...documents, form]
    } else {
      // Edit existing
      updated = documents.map((d, i) => i === editingDoc.idx ? form : d)
    }
    setDocuments(updated)
    setEditingDoc(null)
    if (isEdit) await saveDocumentsToApi(updated)
  }

  const handleRemoveDoc = async (idx) => {
    const updated = documents.filter((_, i) => i !== idx)
    setDocuments(updated)
    if (isEdit) await saveDocumentsToApi(updated)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
      <div className="h-96 animate-pulse bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <>
      {/* Image crop dialog */}
      {cropSrc && (
        <ImageCropperDialog
          src={cropSrc}
          onDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Decouple confirmation dialog */}
      <Dialog open={decoupleDialog} onOpenChange={setDecoupleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Unlink className="h-5 w-5" />Fachkraft entkoppeln?
            </DialogTitle>
            <DialogDescription>
              Die Verbindung zwischen dieser Fachkraft und <strong>{reservation?.companies?.company_name}</strong> wird aufgehoben.
              Die Fachkraft wird wieder auf "Veröffentlicht" gesetzt und die Vermittlung beendet.
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecoupleDialog(false)} disabled={decoupling}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDecouple} disabled={decoupling}>
              {decoupling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
              Entkoppeln
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step advance dialog (date + email resend) */}
      <Dialog open={!!pendingAdvance} onOpenChange={open => { if (!open) { setPendingAdvance(null); setStepDate(''); setResendEmail(false) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schritt {pendingAdvance?.newStatus}/11: {PROCESS_STATUS_LABELS[pendingAdvance?.newStatus]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pendingAdvance?.needsDate && (
              <div className="space-y-1.5">
                <Label>Datum <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  type="date"
                  value={stepDate}
                  onChange={e => setStepDate(e.target.value)}
                  autoFocus={pendingAdvance?.needsDate}
                />
              </div>
            )}
            {pendingAdvance?.emailAlreadySent && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Mail className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-amber-800">E-Mail bereits versandt</p>
                  <p className="text-xs text-amber-700">Für diesen Schritt wurde bereits eine automatische E-Mail verschickt. Soll erneut eine Benachrichtigung gesendet werden?</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      id="resend-email"
                      checked={resendEmail}
                      onCheckedChange={setResendEmail}
                    />
                    <Label htmlFor="resend-email" className="text-sm cursor-pointer">
                      {resendEmail ? 'E-Mail erneut versenden' : 'Keine E-Mail senden'}
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingAdvance(null); setStepDate(''); setResendEmail(false) }}>Abbrechen</Button>
            <Button
              onClick={() => doAdvanceStatus(
                pendingAdvance.newStatus,
                stepDate || null,
                pendingAdvance.emailAlreadySent && !resendEmail
              )}
              disabled={advancing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {advancing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/fachkraefte')} className="shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {isEdit ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Profil bearbeiten' : 'Neue Fachkraft'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {profile.gender && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{profile.gender}</span>}
                {profile.age && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{profile.age} J.</span>}
                {profile.nationality && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{profile.nationality}</span>}
                {profile.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    profile.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' :
                    profile.status === 'reserved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    profile.status === 'draft' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {PROFILE_STATUS_LABELS[profile.status] || profile.status}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-1.5 font-mono">{isEdit ? id : 'Neues Profil'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Button variant="ghost" size="icon" onClick={fillTestData} title="Testdaten" className="text-gray-400 hover:text-gray-600">
                <FlaskConical className="h-4 w-4" />
              </Button>
              {isEdit && (
                <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(true)} className="text-red-400 hover:text-red-600 hover:bg-red-50" title="Löschen">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="relative">
                <Select
                  value={profile.status}
                  disabled={profile.status === 'reserved'}
                  onValueChange={v => {
                    if (v === 'reserved' && isEdit && profile.status !== 'reserved') {
                      openReserveDialog()
                    } else {
                      set('status', v)
                    }
                  }}
                >
                  <SelectTrigger className={`w-40 ${profile.status === 'reserved' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <SelectValue />
                    {profile.status === 'reserved' && <Lock className="h-3 w-3 ml-1 text-blue-400 shrink-0" />}
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROFILE_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profile.status === 'reserved' && (
                  <p className="absolute -bottom-4 left-0 text-[10px] text-blue-500 whitespace-nowrap font-medium">
                    Zuerst entkoppeln
                  </p>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Speichern...</>
                  : <><Save className="mr-2 h-4 w-4" />Speichern</>}
              </Button>
            </div>
          </div>
        </div>

        {reservation && reservation.companies && (
          <>
          {/* ── Company card ────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-300" />
                <span className="text-slate-300 text-xs font-semibold uppercase tracking-wide">Zugewiesenes Unternehmen</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                reservation.companies.company_type === 'customer' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                reservation.companies.company_type === 'lead' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {reservation.companies.company_type === 'customer' ? 'Kunde' :
                 reservation.companies.company_type === 'lead' ? 'Lead' : 'Inaktiv'}
              </span>
            </div>
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base truncate">{reservation.companies.company_name}</p>
                {reservation.companies.email && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />{reservation.companies.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/crm/${reservation.companies.id}`)}
                  className="text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />CRM
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDecoupleDialog(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-1.5"
                >
                  <Unlink className="h-3.5 w-3.5" />Entkoppeln
                </Button>
              </div>
            </div>
          </div>

          {/* ── Vermittlungsprozess card ─────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-green-300 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-white" />
                <div>
                  <p className="text-white font-bold text-base">Vermittlung aktiv</p>
                  <p className="text-green-100 text-sm">{reservation.companies.company_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">{reservation.process_status}/11</p>
                <p className="text-green-100 text-xs">Schritt</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Steps + Actions */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Prozessschritte</p>
                  <div className="space-y-0.5">
                    {Object.entries(PROCESS_STATUS_LABELS).map(([s, label]) => {
                      const num = Number(s)
                      const done = num < reservation.process_status
                      const active = num === reservation.process_status
                      return (
                        <div key={s} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-sm ${active ? 'bg-green-50' : ''}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            done ? 'bg-green-500 text-white' :
                            active ? 'bg-green-600 text-white' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {done ? '✓' : num}
                          </div>
                          <span className={`flex-1 ${done ? 'text-gray-400 line-through' : active ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                            {label}
                          </span>
                          {EMAIL_TRIGGER_STEPS.has(num) && (
                            <span title="E-Mail wird automatisch versendet" className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                              active ? 'bg-blue-100 text-blue-600' : done ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-400'
                            }`}>
                              <Mail className="h-2.5 w-2.5" />E-Mail
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Advance/Back buttons */}
                {reservation.process_status < 11 && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {reservation.process_status > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdvanceStatus('back')}
                        disabled={advancing}
                        className="flex-1 text-gray-500"
                      >
                        ← Schritt zurück
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus('forward')}
                      disabled={advancing}
                      className={`flex-1 text-white ${reservation.process_status === 10 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {advancing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      {reservation.process_status === 10
                        ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Vermittlung abschließen</>
                        : `Weiter zu Schritt ${reservation.process_status + 1} →`}
                    </Button>
                  </div>
                )}
                {reservation.process_status === 11 && (
                  <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-emerald-700 text-sm">Vermittlung abgeschlossen</p>
                    <p className="text-emerald-600 text-xs">Alle Schritte erfolgreich durchlaufen.</p>
                  </div>
                )}
              </div>

              {/* Right: History */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Verlauf</p>
                {reservationHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">Noch kein Verlauf.</p>
                ) : (
                  <div className="space-y-0">
                    {reservationHistory.map((entry, i) => (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          {i < reservationHistory.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                        </div>
                        <div className="pb-3 min-w-0">
                          <p className="font-medium text-gray-800 text-xs">
                            {entry.old_status ? `Schritt ${entry.old_status} → ${entry.new_status}` : `Start: Schritt ${entry.new_status}`}
                          </p>
                          <p className="text-[11px] text-gray-500">{PROCESS_STATUS_LABELS[entry.new_status]}</p>
                          {entry.notes && <p className="text-[11px] text-blue-600 mt-0.5">📅 {entry.notes}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </> /* end reservation two-card block */
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="personal">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Person</TabsTrigger>
            <TabsTrigger value="education">Ausbildung</TabsTrigger>
            <TabsTrigger value="experience">Erfahrung</TabsTrigger>
            <TabsTrigger value="media">Medien</TabsTrigger>
            <TabsTrigger value="documents">Dokumente</TabsTrigger>
          </TabsList>

          {/* ── TAB: Person ────────────────────────────────────────────── */}
          <TabsContent value="personal" className="space-y-6 mt-6">

            {/* Profile Image */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Profilbild</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profilbild" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="space-y-2">
                  <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <Button variant="outline" size="sm" onClick={() => imageRef.current.click()}>
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    {imagePreview ? 'Bild ändern' : 'Bild hochladen'}
                  </Button>
                  {imageFile && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Crop className="h-3 w-3" />{imageFile.name} (zugeschnitten)
                    </p>
                  )}
                  <p className="text-xs text-gray-400">JPG, PNG, max. 5 MB · wird automatisch zugeschnitten</p>
                </div>
              </div>
            </div>

            {/* Personal Data */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Persönliche Daten</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Vorname" required>
                  <Input value={profile.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Vorname" />
                </Field>
                <Field label="Nachname" required>
                  <Input value={profile.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Nachname" />
                </Field>
                <Field label="Geschlecht">
                  <Select value={profile.gender || ''} onValueChange={v => set('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="männlich">Männlich</SelectItem>
                      <SelectItem value="weiblich">Weiblich</SelectItem>
                      <SelectItem value="divers">Divers</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Alter">
                  <Input type="number" value={profile.age} onChange={e => set('age', e.target.value)} placeholder="z.B. 32" min="18" max="70" />
                </Field>
                <Field label="Nationalität" required>
                  <Input value={profile.nationality} onChange={e => set('nationality', e.target.value)} placeholder="z.B. Philippinen" />
                </Field>
                <Field label="Familienstand">
                  <Select value={profile.marital_status || ''} onValueChange={v => set('marital_status', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ledig">Ledig</SelectItem>
                      <SelectItem value="verheiratet">Verheiratet</SelectItem>
                      <SelectItem value="geschieden">Geschieden</SelectItem>
                      <SelectItem value="verwitwet">Verwitwet</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Anzahl Kinder">
                  <Input type="number" value={profile.children_count} onChange={e => set('children_count', e.target.value)} min="0" />
                </Field>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={profile.has_drivers_license} onCheckedChange={v => set('has_drivers_license', v)} />
                <Label>Führerschein Klasse B</Label>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Präferenzen</h3>
              <div className="flex items-center gap-3">
                <Switch checked={profile.nationwide} onCheckedChange={v => set('nationwide', v)} />
                <Label>Bundesweit einsetzbar</Label>
              </div>
              {!profile.nationwide && (
                <Field label="Bevorzugte Bundesländer">
                  <MultiSelect
                    options={GERMAN_STATES}
                    value={profile.state_preferences}
                    onChange={v => set('state_preferences', v)}
                    placeholder="Bundesländer auswählen..."
                  />
                </Field>
              )}
              <Field label="Bevorzugter Einrichtungstyp">
                <MultiSelect
                  options={FACILITY_TYPES}
                  value={profile.preferred_facility_types}
                  onChange={v => set('preferred_facility_types', v)}
                  placeholder="Einrichtungstypen auswählen..."
                />
              </Field>
              <Field label="Arbeitszeitpräferenz">
                <Select value={profile.work_time_preference || ''} onValueChange={v => set('work_time_preference', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    {WORK_TIME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Language Skills */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Sprachkenntnisse</h3>
                <Button variant="outline" size="sm" onClick={addLanguage}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Sprache
                </Button>
              </div>
              {(profile.language_skills || []).length === 0 ? (
                <p className="text-sm text-gray-400">Noch keine Sprachkenntnisse erfasst.</p>
              ) : (
                <div className="space-y-3">
                  {(profile.language_skills || []).map((lang, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <Input
                        value={lang.language}
                        onChange={e => updateLanguage(idx, 'language', e.target.value)}
                        placeholder="Sprache (z.B. Deutsch)"
                        className="flex-1"
                      />
                      <Select value={lang.level} onValueChange={v => updateLanguage(idx, 'level', v)}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Niveau" /></SelectTrigger>
                        <SelectContent>
                          {['A1','A2','B1','B2','C1','C2','Muttersprache'].map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => removeLanguage(idx)} className="shrink-0">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 space-y-3">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />Interne Bemerkungen
              </h3>
              <p className="text-xs text-amber-700">Diese Notizen sind nur für FKVI-Admins sichtbar und werden nie an Unternehmen weitergegeben.</p>
              <Textarea
                value={profile.internal_notes}
                onChange={e => set('internal_notes', e.target.value)}
                placeholder="Interne Anmerkungen, Besonderheiten..."
                rows={3}
              />
            </div>
          </TabsContent>

          {/* ── TAB: Ausbildung ─────────────────────────────────────────── */}
          <TabsContent value="education" className="space-y-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Schulbildung & Ausbildung</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Schulbildung">
                  <Input value={profile.school_education} onChange={e => set('school_education', e.target.value)} placeholder="z.B. Abitur" />
                </Field>
                <Field label="Pflegeausbildung">
                  <Input value={profile.nursing_education} onChange={e => set('nursing_education', e.target.value)} placeholder="z.B. Gesundheits- und Krankenpfleger/in" />
                </Field>
                <Field label="Ausbildungsdauer">
                  <Input value={profile.education_duration} onChange={e => set('education_duration', e.target.value)} placeholder="z.B. 3 Jahre" />
                </Field>
                <Field label="Abschlussjahr">
                  <Input type="number" value={profile.graduation_year} onChange={e => set('graduation_year', e.target.value)} placeholder="z.B. 2018" min="1990" max="2030" />
                </Field>
                <Field label="Anerkennung in Deutschland">
                  <Select value={profile.german_recognition || ''} onValueChange={v => set('german_recognition', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anerkannt">Anerkannt</SelectItem>
                      <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                      <SelectItem value="nicht_beantragt">Nicht beantragt</SelectItem>
                      <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Bemerkungen zur Ausbildung">
                <Textarea
                  value={profile.education_notes}
                  onChange={e => set('education_notes', e.target.value)}
                  placeholder="Weitere Details zur Ausbildung..."
                  rows={3}
                />
              </Field>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Qualifikationen</h3>
              <Field label="Spezialisierungen">
                <MultiSelect
                  options={SPECIALIZATIONS}
                  value={profile.specializations}
                  onChange={v => set('specializations', v)}
                  placeholder="Spezialisierungen auswählen..."
                />
              </Field>
              <Field label="Zusatzqualifikationen">
                <MultiSelect
                  options={['Wundmanagement', 'Kinästhetik', 'Diabetes-Beratung', 'Palliative Care', 'Basale Stimulation', 'Aromapflege', 'Sturzprävention']}
                  value={profile.additional_qualifications}
                  onChange={v => set('additional_qualifications', v)}
                  placeholder="Zusatzqualifikationen auswählen..."
                />
              </Field>
              <Field label="Pflegekompetenznachweis FKVI">
                <Input
                  value={profile.fkvi_competency_proof}
                  onChange={e => set('fkvi_competency_proof', e.target.value)}
                  placeholder="z.B. Bestanden am 01.01.2024"
                />
              </Field>
            </div>
          </TabsContent>

          {/* ── TAB: Erfahrung ──────────────────────────────────────────── */}
          <TabsContent value="experience" className="space-y-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Berufserfahrung</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Berufserfahrung gesamt (Jahre)">
                  <Input
                    type="number"
                    value={profile.total_experience_years}
                    onChange={e => set('total_experience_years', e.target.value)}
                    placeholder="z.B. 5"
                    min="0"
                    step="0.5"
                  />
                </Field>
                <Field label="Davon in Deutschland (Jahre)">
                  <Input
                    type="number"
                    value={profile.germany_experience_years}
                    onChange={e => set('germany_experience_years', e.target.value)}
                    placeholder="z.B. 2"
                    min="0"
                    step="0.5"
                  />
                </Field>
              </div>
              <Field label="Erfahrung in Bereichen">
                <MultiSelect
                  options={EXPERIENCE_AREAS}
                  value={profile.experience_areas}
                  onChange={v => set('experience_areas', v)}
                  placeholder="Erfahrungsbereiche auswählen..."
                />
              </Field>
            </div>
          </TabsContent>

          {/* ── TAB: Medien ─────────────────────────────────────────────── */}
          <TabsContent value="media" className="space-y-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Video className="h-5 w-5 text-fkvi-teal" />Präsentationsvideo (Vimeo)
              </h3>

              {/* ── Video already saved ── */}
              {profile.vimeo_video_url ? (
                <div className="space-y-4">
                  <VimeoPlayer url={profile.vimeo_video_url} showToggle />
                  <div className="flex items-center gap-2 pt-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-700 flex-1">Video verknüpft</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await supabase.from('profiles').update({ vimeo_video_url: '', vimeo_video_id: '' }).eq('id', id)
                        set('vimeo_video_url', '')
                        set('vimeo_video_id', '')
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />Video entfernen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isEdit ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Speichern Sie das Profil zuerst, um ein Video hinzuzufügen.</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Mode toggle */}
                      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                          onClick={() => setVideoMode('upload')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${videoMode === 'upload' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Upload className="h-3.5 w-3.5" />Datei hochladen
                        </button>
                        <button
                          onClick={() => setVideoMode('url')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${videoMode === 'url' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Link2 className="h-3.5 w-3.5" />Vimeo-URL eingeben
                        </button>
                      </div>

                      {/* Upload mode */}
                      {videoMode === 'upload' && (
                        <div className="space-y-3">
                          <div
                            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-fkvi-teal/50 hover:bg-fkvi-teal/5 transition-colors"
                            onClick={() => !videoUploading && videoRef.current.click()}
                          >
                            <Video className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 mb-1">Video direkt zu Vimeo hochladen</p>
                            <p className="text-xs text-gray-400 mb-3">Hochformat (9:16) und Querformat werden unterstützt</p>
                            <input
                              ref={videoRef}
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={e => { setVideoFile(e.target.files[0]); setUploadProgress(null) }}
                              disabled={videoUploading}
                            />
                            <Button variant="outline" size="sm" disabled={videoUploading} onClick={e => { e.stopPropagation(); videoRef.current.click() }}>
                              <Upload className="h-3.5 w-3.5 mr-1.5" />Datei auswählen
                            </Button>
                            {videoFile && (
                              <p className="text-xs text-gray-600 mt-2 font-medium">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                            )}
                          </div>

                          {/* Progress bar */}
                          {videoUploading && uploadProgress !== null && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Wird hochgeladen…</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-fkvi-teal rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {videoFile && !videoUploading && (
                            <Button
                              onClick={handleVideoUpload}
                              className="w-full bg-fkvi-teal hover:bg-fkvi-teal/90 text-white"
                            >
                              <Upload className="mr-2 h-4 w-4" />Video zu Vimeo hochladen
                            </Button>
                          )}

                          {videoUploading && (
                            <Button disabled className="w-full">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />Upload läuft…
                            </Button>
                          )}
                        </div>
                      )}

                      {/* URL mode */}
                      {videoMode === 'url' && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500">Bereits bei Vimeo hochgeladenes Video verknüpfen</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://vimeo.com/123456789 oder Video-ID"
                              value={urlInput}
                              onChange={e => setUrlInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleUrlSave()}
                              className="flex-1"
                            />
                            <Button onClick={handleUrlSave} className="bg-fkvi-teal hover:bg-fkvi-teal/90 text-white shrink-0">
                              Speichern
                            </Button>
                          </div>
                          <p className="text-xs text-gray-400">Beispiele: vimeo.com/123456789 · player.vimeo.com/video/123456789 · 123456789</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: Dokumente ──────────────────────────────────────────── */}
          <TabsContent value="documents" className="space-y-4 mt-6">
            {/* Edit/Add dialog */}
            {editingDoc && (
              <DocEditDialog
                doc={editingDoc.doc}
                onSave={handleSaveDoc}
                onClose={() => setEditingDoc(null)}
              />
            )}

            {deletingDocIdx !== null && (
              <Dialog open onOpenChange={open => !open && setDeletingDocIdx(null)}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />Dokument löschen?
                    </DialogTitle>
                    <DialogDescription>
                      <strong>„{documents[deletingDocIdx]?.title || 'Dieses Dokument'}"</strong> wird unwiderruflich entfernt.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletingDocIdx(null)}>Abbrechen</Button>
                    <Button variant="destructive" onClick={() => { handleRemoveDoc(deletingDocIdx); setDeletingDocIdx(null) }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Löschen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    Dokumente
                    {documents.length > 0 && (
                      <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{documents.length}</span>
                    )}
                    {docSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Google Drive, Dropbox oder andere externe Links</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setEditingDoc({ idx: null, doc: { title: '', doc_type: '', description: '', link: '', is_internal: false } })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Dokument hinzufügen
                </Button>
              </div>

              {/* List */}
              {documents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">Noch keine Dokumente</p>
                  <p className="text-xs mt-1">Füge Links zu Zeugnissen, Lebensläufen oder anderen Dokumenten hinzu.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setEditingDoc({ idx: null, doc: { title: '', doc_type: '', description: '', link: '', is_internal: false } })}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Erstes Dokument hinzufügen
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Dokument</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">Typ</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Sichtbarkeit</th>
                      <th className="px-3 py-2.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-fkvi-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{doc.title || <span className="text-gray-400 italic">Kein Titel</span>}</p>
                              {doc.description && <p className="text-xs text-gray-400 truncate">{doc.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          {doc.doc_type
                            ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${DOC_TYPE_COLORS[doc.doc_type] || 'bg-gray-100 text-gray-600'}`}>{doc.doc_type}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {doc.is_internal
                            ? <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                                <EyeOff className="h-3 w-3" />Intern
                              </span>
                            : <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                <Eye className="h-3 w-3" />Sichtbar
                              </span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {doc.link && (
                              <a
                                href={doc.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-fkvi-blue hover:bg-blue-50 transition-colors"
                                title="Link öffnen"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setEditingDoc({ idx, doc })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              title="Bearbeiten"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingDocIdx(idx)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!isEdit && documents.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                Dokumente werden beim Speichern des Profils gespeichert.
              </p>
            )}

            {/* ── Signierlinks ── */}
            {isEdit && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      Signierlinks
                      {docSends.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{docSends.length}</span>
                      )}
                      {docSendsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Vorlage auswählen → Link generieren → teilen</p>
                  </div>
                  <Button size="sm" onClick={() => setSendTemplateDialog(true)} className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Vorlage senden
                  </Button>
                </div>
                {docSends.length === 0 && !docSendsLoading ? (
                  <div className="text-center py-10 text-gray-400">
                    <FileText className="h-7 w-7 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm font-medium text-gray-500">Noch keine Signierlinks erstellt</p>
                    <p className="text-xs mt-1">Wähle eine Vorlage aus der Mediathek und sende sie an die Fachkraft.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Vorlage</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Unterzeichner</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="px-3 py-2.5 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {docSends.map(send => (
                        <tr key={send.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3">
                            <p className="font-medium text-gray-900 text-sm">{send.template_name || '–'}</p>
                            <p className="text-xs text-gray-400">{new Date(send.created_at).toLocaleDateString('de-DE')}</p>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{send.signer_name}</td>
                          <td className="px-3 py-3">
                            {send.status === 'signed' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />Unterschrieben
                              </span>
                            ) : send.status === 'opened' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full font-medium">
                                Geöffnet
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                                Ausstehend
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {send.signer_url && (
                              <a
                                href={send.signer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-fkvi-blue hover:bg-blue-50 transition-colors inline-flex"
                                title="Signierlink öffnen"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Send template dialog */}
            {sendTemplateDialog && (
              <SendTemplateDialog
                profileId={id}
                profile={profile}
                session={session}
                onClose={() => setSendTemplateDialog(false)}
                onSent={loadDocSends}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />Profil unwiderruflich löschen?
            </DialogTitle>
            <DialogDescription>
              Das Profil von <strong>{profile.first_name} {profile.last_name}</strong> wird dauerhaft gelöscht inkl. aller Dokumente.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteProfile}>
              <Trash2 className="h-4 w-4 mr-2" />Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reserve dialog */}
      <Dialog open={reserveDialog} onOpenChange={setReserveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-fkvi-blue" />Unternehmen zuordnen
            </DialogTitle>
            <DialogDescription>
              Wähle ein freigeschaltetes Unternehmen, dem <strong>{profile.first_name} {profile.last_name}</strong> zugeordnet werden soll.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Input
              placeholder="Suche nach Firma, Ansprechpartner oder E-Mail..."
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
              autoFocus
            />
            {companies.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Keine Unternehmen gefunden. Bitte zuerst ein Unternehmen im CRM anlegen.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-1">
                {companies
                  .filter(c => {
                    const q = companySearch.toLowerCase()
                    if (!q) return true
                    return (
                      c.company_name?.toLowerCase().includes(q) ||
                      c.email?.toLowerCase().includes(q) ||
                      `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q)
                    )
                  })
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCompanyId(c.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                        selectedCompanyId === c.id
                          ? 'bg-fkvi-blue text-white'
                          : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {c.company_name}
                        {c.email && (
                          <span className={`font-normal ml-1 ${selectedCompanyId === c.id ? 'text-white/70' : 'text-gray-400'}`}>
                            ({c.email})
                          </span>
                        )}
                      </p>
                      {(c.first_name || c.last_name) && (
                        <p className={`text-xs mt-0.5 ${selectedCompanyId === c.id ? 'text-white/60' : 'text-gray-400'}`}>
                          {`${c.first_name || ''} ${c.last_name || ''}`.trim()}
                        </p>
                      )}
                    </button>
                  ))}
                {companies.filter(c => {
                  const q = companySearch.toLowerCase()
                  if (!q) return true
                  return (
                    c.company_name?.toLowerCase().includes(q) ||
                    c.email?.toLowerCase().includes(q) ||
                    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q)
                  )
                }).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Treffer für „{companySearch}"</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialog(false)}>Abbrechen</Button>
            <Button onClick={handleReserve} disabled={!selectedCompanyId || reserving}>
              {reserving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bookmark className="h-4 w-4 mr-2" />}
              Vermittlung starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
