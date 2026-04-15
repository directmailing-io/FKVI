import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Heart, User, MapPin, Briefcase, GraduationCap, Clock, Globe, CheckCircle2 } from 'lucide-react'
import { cn, RECOGNITION_LABELS, PROCESS_STATUS_LABELS } from '@/lib/utils'

export default function ProfileDetailModal({ profile, open, onClose, isFavorite, onToggleFavorite }) {
  if (!profile) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Profil-Details</span>
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleFavorite(profile.id)}
              className={cn(isFavorite && "bg-red-500 hover:bg-red-600 border-red-500")}
            >
              <Heart className={cn("h-4 w-4 mr-1.5", isFavorite && "fill-white")} />
              {isFavorite ? 'Vorgemerkt' : 'Vormerken'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">
                {profile.gender || 'Fachkraft'}{profile.age ? `, ${profile.age} Jahre` : ''}
              </h2>
              <p className="text-gray-500">{profile.nationality}</p>
              {profile.german_recognition && (
                <Badge variant={profile.german_recognition === 'anerkannt' ? 'success' : 'warning'} className="mt-1">
                  Anerkennung: {RECOGNITION_LABELS[profile.german_recognition]}
                </Badge>
              )}
            </div>
          </div>

          {/* Video */}
          {profile.vimeo_video_url && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 text-sm">Vorstellungsvideo</h3>
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={profile.vimeo_video_url}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Personal */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Familienstand', value: profile.marital_status },
              { label: 'Kinder', value: profile.children_count != null ? profile.children_count : null },
              { label: 'Führerschein', value: profile.has_drivers_license ? 'Ja (Klasse B)' : 'Nein' },
              { label: 'Arbeitszeitpräferenz', value: profile.work_time_preference },
            ].filter(i => i.value != null && i.value !== '').map(item => (
              <div key={item.label}>
                <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                <p className="font-medium text-gray-900">{String(item.value)}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Ausbildung */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Ausbildung</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Pflegeausbildung', value: profile.nursing_education },
                { label: 'Ausbildungsdauer', value: profile.education_duration },
                { label: 'Abschlussjahr', value: profile.graduation_year },
              ].filter(i => i.value).map(item => (
                <div key={item.label}>
                  <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                  <p className="font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
            {profile.education_notes && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{profile.education_notes}</p>
            )}
          </div>

          {/* Qualifikationen */}
          {((profile.specializations || []).length > 0 || (profile.additional_qualifications || []).length > 0) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Qualifikationen</h3>
                {(profile.specializations || []).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Spezialisierungen</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.specializations.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(profile.additional_qualifications || []).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Zusatzqualifikationen</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.additional_qualifications.map(q => (
                        <span key={q} className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">{q}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.fkvi_competency_proof && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Pflegekompetenznachweis FKVI: {profile.fkvi_competency_proof}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Erfahrung */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Berufserfahrung</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {profile.total_experience_years && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Gesamt</p>
                  <p className="font-medium">{profile.total_experience_years} Jahre</p>
                </div>
              )}
              {profile.germany_experience_years && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">In Deutschland</p>
                  <p className="font-medium">{profile.germany_experience_years} Jahre</p>
                </div>
              )}
            </div>
            {(profile.experience_areas || []).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Erfahrungsbereiche</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.experience_areas.map(a => (
                    <span key={a} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sprachen */}
          {(profile.language_skills || []).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Sprachkenntnisse</h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.language_skills || []).map((lang, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border text-sm">
                      <Globe className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">{lang.language}</span>
                      {lang.level && <Badge variant="outline" className="text-[10px] py-0">{lang.level}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Präferenzen */}
          <Separator />
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-gray-900">Einsatzpräferenzen</h3>
            {profile.nationwide && (
              <p className="text-green-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />Bundesweit einsetzbar
              </p>
            )}
            {!profile.nationwide && (profile.state_preferences || []).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Bevorzugte Bundesländer</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.state_preferences.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
