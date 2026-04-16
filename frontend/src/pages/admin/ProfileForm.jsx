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
  Video, CheckCircle2, AlertCircle, User, FlaskConical, Crop, AlertTriangle, Bookmark, Building2, ExternalLink
} from 'lucide-react'
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
  const [error, setError] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [reserveDialog, setReserveDialog] = useState(false)
  const [companies, setCompanies] = useState([])
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [reserving, setReserving] = useState(false)
  const [reserveForCompany, setReserveForCompany] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [reservationHistory, setReservationHistory] = useState([])
  const [advancing, setAdvancing] = useState(false)
  const imageRef = useRef()
  const videoRef = useRef()

  useEffect(() => {
    if (isEdit) fetchProfile()
  }, [id])

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
          .select('id, process_status, companies (id, company_name)')
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
    try {
      const formData = new FormData()
      formData.append('video', videoFile)
      const res = await fetch(`/api/vimeo/upload/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfile(prev => ({ ...prev, vimeo_video_url: data.embedUrl, vimeo_video_id: data.videoId }))
      setVideoFile(null)
      toast({ title: 'Video hochgeladen', description: 'Das Video wurde erfolgreich zu Vimeo hochgeladen.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler', description: translateError(err.message), variant: 'destructive' })
    } finally {
      setVideoUploading(false)
    }
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

      if (isEdit) {
        await supabase.from('profile_documents').delete().eq('profile_id', profileId)
      }
      if (documents.length > 0) {
        await supabase.from('profile_documents').insert(
          documents.map((doc, i) => ({ ...doc, profile_id: profileId, sort_order: i }))
        )
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

  const handleAdvanceStatus = async (direction) => {
    if (!reservation) return
    const newStatus = direction === 'forward'
      ? Math.min(reservation.process_status + 1, 11)
      : Math.max(reservation.process_status - 1, 1)
    if (newStatus === reservation.process_status) return
    setAdvancing(true)
    try {
      const res = await fetch('/api/admin/update-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ reservationId: reservation.id, newStatus, notes: null }),
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

  const addDocument = () => {
    setDocuments(prev => [...prev, { title: '', doc_type: '', description: '', link: '' }])
  }

  const updateDocument = (idx, field, value) => {
    setDocuments(prev => prev.map((doc, i) => i === idx ? { ...doc, [field]: value } : doc))
  }

  const removeDocument = (idx) => {
    setDocuments(prev => prev.filter((_, i) => i !== idx))
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
              <Select
                value={profile.status}
                onValueChange={v => {
                  if (v === 'reserved' && isEdit && profile.status !== 'reserved') {
                    openReserveDialog()
                  } else {
                    set('status', v)
                  }
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROFILE_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Speichern...</>
                  : <><Save className="mr-2 h-4 w-4" />Speichern</>}
              </Button>
            </div>
          </div>
        </div>

        {reservation && reservation.companies && (
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
                          <span className={done ? 'text-gray-400 line-through' : active ? 'text-green-700 font-semibold' : 'text-gray-400'}>
                            {label}
                          </span>
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
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {advancing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Weiter zu Schritt {reservation.process_status + 1} →
                    </Button>
                  </div>
                )}
                {reservation.process_status === 11 && (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium pt-2 border-t border-gray-100">
                    <CheckCircle2 className="h-4 w-4" />Vermittlung abgeschlossen!
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
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Video className="h-5 w-5" />Präsentationsvideo (Vimeo)
              </h3>
              {profile.vimeo_video_url ? (
                <div className="space-y-3">
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <iframe
                      src={profile.vimeo_video_url}
                      className="w-full h-full"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">Video vorhanden</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => set('vimeo_video_url', '')}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      Video entfernen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isEdit && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Speichern Sie das Profil zuerst, um ein Video hochzuladen.</AlertDescription>
                    </Alert>
                  )}
                  {isEdit && (
                    <>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <Video className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-3">Video auswählen und zu Vimeo hochladen</p>
                        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => setVideoFile(e.target.files[0])} />
                        <Button variant="outline" onClick={() => videoRef.current.click()}>
                          <Upload className="h-4 w-4 mr-2" />Video auswählen
                        </Button>
                        {videoFile && <p className="text-xs text-gray-500 mt-2">{videoFile.name}</p>}
                      </div>
                      {videoFile && (
                        <Button
                          onClick={handleVideoUpload}
                          disabled={videoUploading}
                          className="w-full"
                          variant="teal"
                        >
                          {videoUploading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Upload läuft...</>
                            : <><Upload className="mr-2 h-4 w-4" />Video zu Vimeo hochladen</>
                          }
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: Dokumente ──────────────────────────────────────────── */}
          <TabsContent value="documents" className="space-y-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Dokumente</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Externe Links zu Dokumenten (z.B. Google Drive)</p>
                </div>
                <Button variant="outline" size="sm" onClick={addDocument}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Dokument
                </Button>
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Noch keine Dokumente verknüpft.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Dokument {idx + 1}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeDocument(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Titel">
                          <Input value={doc.title} onChange={e => updateDocument(idx, 'title', e.target.value)} placeholder="z.B. Abschlusszeugnis" />
                        </Field>
                        <Field label="Typ">
                          <Select value={doc.doc_type} onValueChange={v => updateDocument(idx, 'doc_type', v)}>
                            <SelectTrigger><SelectValue placeholder="Typ auswählen" /></SelectTrigger>
                            <SelectContent>
                              {['Zeugnis', 'Anerkennungsbescheid', 'Sprachzertifikat', 'Lebenslauf', 'Referenz', 'Sonstiges'].map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <Field label="Link (Google Drive o.ä.)">
                        <Input value={doc.link} onChange={e => updateDocument(idx, 'link', e.target.value)} placeholder="https://drive.google.com/..." type="url" />
                      </Field>
                      <Field label="Beschreibung">
                        <Textarea value={doc.description} onChange={e => updateDocument(idx, 'description', e.target.value)} placeholder="Kurze Beschreibung..." rows={2} />
                      </Field>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
