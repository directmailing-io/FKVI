import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  GERMAN_STATES, FACILITY_TYPES, WORK_TIME_OPTIONS,
  SPECIALIZATIONS, EXPERIENCE_AREAS, PROFILE_STATUS_LABELS
} from '@/lib/utils'
import {
  ArrowLeft, Save, Loader2, Upload, X, Plus, Trash2,
  Video, CheckCircle2, AlertCircle, User
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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

export default function ProfileForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'neu'
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [error, setError] = useState('')
  const imageRef = useRef()
  const videoRef = useRef()

  useEffect(() => {
    if (isEdit) fetchProfile()
  }, [id])

  const fetchProfile = async () => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single()
    const { data: docs } = await supabase.from('profile_documents').select('*').eq('profile_id', id).order('sort_order')
    if (p) {
      setProfile({ ...EMPTY_PROFILE, ...p })
      setImagePreview(p.profile_image_url)
    }
    setDocuments(docs || [])
    setLoading(false)
  }

  const set = (field, value) => setProfile(prev => ({ ...prev, [field]: value }))

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
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
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setVideoUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      let imageUrl = profile.profile_image_url

      // Upload image if new
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `profiles/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('profile-images').upload(path, imageFile)
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      const payload = {
        ...profile,
        profile_image_url: imageUrl,
        age: profile.age ? parseInt(profile.age) : null,
        children_count: profile.children_count ? parseInt(profile.children_count) : 0,
        graduation_year: profile.graduation_year ? parseInt(profile.graduation_year) : null,
        total_experience_years: profile.total_experience_years ? parseFloat(profile.total_experience_years) : null,
        germany_experience_years: profile.germany_experience_years ? parseFloat(profile.germany_experience_years) : null,
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

      // Save documents
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
      setError(err.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
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

  const Field = ({ label, children, required }) => (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/fachkraefte')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Profil bearbeiten' : 'Neue Fachkraft'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{isEdit ? `ID: ${id}` : 'Neues Profil anlegen'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={profile.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROFILE_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Speichern...</> : <><Save className="mr-2 h-4 w-4" />Speichern</>}
          </Button>
        </div>
      </div>

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

        {/* TAB: Person */}
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
                  <Upload className="h-3.5 w-3.5 mr-2" />Bild hochladen
                </Button>
                {imageFile && <p className="text-xs text-gray-500">{imageFile.name}</p>}
                <p className="text-xs text-gray-400">JPG, PNG, max. 5 MB</p>
              </div>
            </div>
          </div>

          {/* Personal Data */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Persönliche Daten</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vorname">
                <Input value={profile.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Vorname" />
              </Field>
              <Field label="Nachname">
                <Input value={profile.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Nachname" />
              </Field>
              <Field label="Geschlecht">
                <Select value={profile.gender} onValueChange={v => set('gender', v)}>
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
              <Field label="Nationalität">
                <Input value={profile.nationality} onChange={e => set('nationality', e.target.value)} placeholder="z.B. Philippinen" />
              </Field>
              <Field label="Familienstand">
                <Select value={profile.marital_status} onValueChange={v => set('marital_status', v)}>
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
              <Select value={profile.work_time_preference} onValueChange={v => set('work_time_preference', v)}>
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
                        {['A1','A2','B1','B2','C1','C2','Muttersprache'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
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

        {/* TAB: Ausbildung */}
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
                <Select value={profile.german_recognition} onValueChange={v => set('german_recognition', v)}>
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

        {/* TAB: Erfahrung */}
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

        {/* TAB: Medien */}
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

        {/* TAB: Dokumente */}
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
  )
}
