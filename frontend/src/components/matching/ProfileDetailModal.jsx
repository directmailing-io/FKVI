import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, Lock, User, CheckCircle2, FileText, EyeOff, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import VideoLightbox from '@/components/VideoLightbox'
import { getProfileSpecializations, getProfileEinrichtungstypen, getSpecializationsLabel } from '@/lib/profileOptions'

// IMPORTANT: Never early-return null — Radix pointer-events cleanup won't fire.

const RECOGNITION = {
  anerkannt:       { label: 'Anerkannt in DE',             cls: 'bg-green-50 text-green-700 border-green-200' },
  in_bearbeitung:  { label: 'Anerkennung läuft',           cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  nicht_beantragt: { label: 'Noch nicht beantragt',        cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  abgelehnt:       { label: 'Anerkennung abgelehnt',       cls: 'bg-red-50 text-red-600 border-red-200' },
}

function Chip({ children, color = 'gray' }) {
  const cls = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }[color]
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>{children}</span>
}

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

export default function ProfileDetailModal({ profile, open, onClose, isFavorite, onToggleFavorite, isDemo, onRegister }) {
  const [videoOpen, setVideoOpen] = useState(false)

  const handleOpenCv = () => {
    document.body.style.removeProperty('pointer-events')
    onClose()
    window.open(`${window.location.origin}/lebenslauf/${profile?.id}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="max-w-2xl w-full p-0 gap-0 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => { if (videoOpen) e.preventDefault() }}
        onEscapeKeyDown={(e) => { if (videoOpen) e.preventDefault() }}
      >
        {profile && (() => {
          const specs         = getProfileSpecializations(profile)
          const einrichtungen = getProfileEinrichtungstypen(profile)
          const langs         = profile.language_skills || []
          const addQuals      = profile.additional_qualifications || []
          const expAreas      = profile.experience_areas || []
          const states        = profile.state_preferences || []
          const rec           = RECOGNITION[profile.german_recognition]

          const expLine = [
            profile.total_experience_years && `${profile.total_experience_years} J. gesamt`,
            profile.germany_experience_years && `${profile.germany_experience_years} J. in DE`,
          ].filter(Boolean).join(' · ')

          const personal = [
            profile.marital_status,
            profile.children_count === 0 ? 'Keine Kinder'
              : profile.children_count > 0 ? `${profile.children_count} Kind${profile.children_count > 1 ? 'er' : ''}` : null,
            profile.has_drivers_license ? 'Führerschein Kl. B' : null,
          ].filter(Boolean)

          return (
            <>
              {/* ── Cover + Avatar ──────────────────────────────────── */}
              <div className="relative shrink-0">
                {/* Cover band */}
                <div className="h-28"
                  style={{ background: 'linear-gradient(120deg, rgba(26,58,92,0.12) 0%, rgba(13,148,136,0.10) 50%, rgba(186,230,253,0.18) 100%)' }}>
                  {/* Subtle bokeh circles */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-2 left-1/3 w-24 h-24 rounded-full opacity-20"
                      style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.5), transparent)' }} />
                    <div className="absolute -top-4 right-1/4 w-32 h-32 rounded-full opacity-15"
                      style={{ background: 'radial-gradient(circle, rgba(26,58,92,0.6), transparent)' }} />
                  </div>
                </div>

                {/* Avatar – overlaps cover bottom */}
                <div className="absolute left-7 bottom-0 translate-y-1/2">
                  <div className="w-24 h-24 rounded-full p-[3px] shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #1a3a5c)' }}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                      {profile.profile_image_url
                        ? <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover object-top" />
                        : <div className="w-full h-full flex items-center justify-center bg-fkvi-blue/10">
                            <User className="h-11 w-11 text-fkvi-blue/25" />
                          </div>
                      }
                    </div>
                  </div>
                </div>

                {/* Action buttons top-right (leave gap for Radix close btn) */}
                <div className="absolute top-3 right-10 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleOpenCv}
                    className="h-8 text-xs gap-1.5 bg-white/90 backdrop-blur-sm border-white/60 shadow-sm hover:bg-white">
                    <FileText className="h-3.5 w-3.5" />Lebenslauf
                  </Button>
                  {isDemo ? (
                    <Button size="sm" onClick={onRegister}
                      className="h-8 text-xs gap-1.5 bg-fkvi-teal hover:bg-fkvi-teal/90 text-white shadow-sm">
                      <Lock className="h-3.5 w-3.5" />Zugang
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onToggleFavorite(profile.id)}
                      className={cn('h-8 text-xs gap-1.5 shadow-sm',
                        isFavorite
                          ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                          : 'bg-white/90 backdrop-blur-sm hover:bg-white')}
                      variant={isFavorite ? 'default' : 'outline'}>
                      <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-white')} />
                      {isFavorite ? 'Vorgemerkt' : 'Vormerken'}
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Identity block ──────────────────────────────────── */}
              <div className="px-7 pt-14 pb-5 border-b border-gray-100 shrink-0">
                <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
                  {profile.nursing_education || 'Pflegefachkraft'}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {[profile.gender, profile.age ? `${profile.age} J.` : null, profile.nationality].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {rec && <span className={cn('text-xs font-medium px-3 py-1 rounded-full border', rec.cls)}>{rec.label}</span>}
                  {profile.work_time_preference && (
                    <span className="text-xs font-medium px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                      {profile.work_time_preference}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200">
                    <EyeOff className="h-3 w-3" />Anonymisiert
                  </span>
                </div>
              </div>

              {/* ── Body – scrollable ───────────────────────────────── */}
              <div className="overflow-y-auto flex-1">

                {/* Video */}
                {profile.vimeo_video_url && (
                  <div className="px-7 pt-4">
                    <button onClick={() => setVideoOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-fkvi-teal/25 bg-teal-50/40 text-fkvi-teal text-sm font-medium hover:bg-teal-50 transition-colors">
                      <Video className="h-4 w-4" />Vorstellungsvideo ansehen
                    </button>
                  </div>
                )}

                {/* ── 2-col quick stats ── */}
                <div className="px-7 py-5 grid grid-cols-2 gap-x-8 gap-y-5 border-b border-gray-100">
                  {(states.length > 0 || profile.nationwide) && (
                    <InfoRow label="Region">
                      {profile.nationwide
                        ? <span className="font-medium text-green-700">Bundesweit</span>
                        : <div className="flex flex-wrap gap-1.5">{states.map(s => <Chip key={s}>{s}</Chip>)}</div>
                      }
                    </InfoRow>
                  )}
                  {expLine && (
                    <InfoRow label="Berufserfahrung">
                      <span className="font-semibold text-gray-900">{expLine}</span>
                    </InfoRow>
                  )}
                  {einrichtungen.length > 0 && (
                    <InfoRow label="Einrichtungstyp">
                      <div className="flex flex-wrap gap-1.5">{einrichtungen.map(e => <Chip key={e}>{e}</Chip>)}</div>
                    </InfoRow>
                  )}
                  {personal.length > 0 && (
                    <InfoRow label="Persönliches">
                      <span className="text-gray-600">{personal.join(' · ')}</span>
                    </InfoRow>
                  )}
                </div>

                {/* ── Tags section ── */}
                {(expAreas.length > 0 || specs.length > 0 || addQuals.length > 0 || langs.length > 0 || profile.fkvi_competency_proof) && (
                  <div className="px-7 py-5 space-y-5">
                    {expAreas.length > 0 && (
                      <InfoRow label="Erfahrungsbereiche">
                        <div className="flex flex-wrap gap-1.5">{expAreas.map(e => <Chip key={e}>{e}</Chip>)}</div>
                      </InfoRow>
                    )}
                    {specs.length > 0 && (
                      <InfoRow label={getSpecializationsLabel(profile.berufsgruppe)}>
                        <div className="flex flex-wrap gap-1.5">{specs.map(s => <Chip key={s} color="blue">{s}</Chip>)}</div>
                      </InfoRow>
                    )}
                    {addQuals.length > 0 && (
                      <InfoRow label="Zusatzqualifikationen">
                        <div className="flex flex-wrap gap-1.5">{addQuals.map(q => <Chip key={q} color="teal">{q}</Chip>)}</div>
                      </InfoRow>
                    )}
                    {langs.length > 0 && (
                      <InfoRow label="Sprachen">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {langs.map((l, i) => (
                            <span key={i} className="text-sm text-gray-800">
                              {l.language}{l.level && <span className="text-gray-400 text-xs ml-1">({l.level})</span>}
                            </span>
                          ))}
                        </div>
                      </InfoRow>
                    )}
                    {profile.fkvi_competency_proof && (
                      <InfoRow label="FKVI-Nachweis">
                        <span className="text-green-700 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />{profile.fkvi_competency_proof}
                        </span>
                      </InfoRow>
                    )}
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </DialogContent>

      <VideoLightbox url={profile?.vimeo_video_url} open={videoOpen} onClose={() => setVideoOpen(false)} />
    </Dialog>
  )
}
