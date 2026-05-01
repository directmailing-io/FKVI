import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, Lock, User, CheckCircle2, FileText, EyeOff, Video,
         MapPin, MessageSquare, Clock, Building2, Star, Award, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import VideoLightbox from '@/components/VideoLightbox'
import { getProfileSpecializations, getProfileEinrichtungstypen, getSpecializationsLabel } from '@/lib/profileOptions'

// IMPORTANT: Never early-return null — Radix pointer-events cleanup won't fire.

const RECOGNITION = {
  anerkannt:       { label: 'Anerkannt in DE',            cls: 'bg-green-50 text-green-700 border-green-200' },
  in_bearbeitung:  { label: 'Anerkennung läuft',          cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  nicht_beantragt: { label: 'Noch nicht beantragt',       cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  abgelehnt:       { label: 'Anerkennung abgelehnt',      cls: 'bg-red-50 text-red-600 border-red-200' },
}

function Chip({ children, color = 'gray' }) {
  const cls = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }[color]
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>{children}</span>
}

function DataRow({ label, children }) {
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
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
        className="max-w-4xl w-full p-0 gap-0 rounded-2xl overflow-hidden"
        style={{ maxHeight: '88vh' }}
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
          const deutschLevel  = langs.find(l => l.language === 'Deutsch')?.level

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
            <div className="flex" style={{ maxHeight: '88vh' }}>

              {/* ══ LEFT COLUMN — Photo + Identity ══════════════════════════ */}
              <div
                className="w-72 shrink-0 flex flex-col relative overflow-hidden"
                style={{ background: 'linear-gradient(170deg, #1a3a5c 0%, #134a46 55%, #0d9488 100%)' }}
              >
                {/* Top glow */}
                <div className="absolute top-0 inset-x-0 h-32 opacity-25 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(255,255,255,0.4), transparent)' }} />

                {/* Action buttons top right (leave room for Radix X) */}
                <div className="relative z-10 flex items-center gap-2 pt-4 pr-12 pl-4 justify-end">
                  <Button size="sm" onClick={handleOpenCv}
                    className="h-8 text-xs gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm">
                    <FileText className="h-3.5 w-3.5" />Lebenslauf
                  </Button>
                  {isDemo ? (
                    <Button size="sm" onClick={onRegister}
                      className="h-8 text-xs gap-1.5 bg-fkvi-teal hover:bg-fkvi-teal/90 text-white">
                      <Lock className="h-3.5 w-3.5" />Zugang
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onToggleFavorite(profile.id)}
                      className={cn('h-8 text-xs gap-1.5',
                        isFavorite ? 'bg-red-500 hover:bg-red-600 text-white border-transparent'
                          : 'bg-white/15 hover:bg-white/25 text-white border border-white/20')}
                      variant="outline">
                      <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-white')} />
                      {isFavorite ? 'Vorgemerkt' : 'Vormerken'}
                    </Button>
                  )}
                </div>

                {/* Large photo */}
                <div className="relative z-10 flex justify-center pt-6 pb-5">
                  <div className="relative">
                    <div className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl bg-white/10">
                      {profile.profile_image_url
                        ? <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover object-top" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <User className="h-16 w-16 text-white/20" />
                          </div>
                      }
                    </div>
                    {/* Anonymized badge */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-0.5 whitespace-nowrap">
                      <EyeOff className="h-2.5 w-2.5 text-white/60" />
                      <span className="text-[9px] text-white/60 font-medium">Anonymisiert</span>
                    </div>
                  </div>
                </div>

                {/* Name + basics */}
                <div className="relative z-10 px-5 pb-5 text-center">
                  <DialogTitle className="text-lg font-bold text-white leading-tight">
                    {profile.nursing_education || 'Pflegefachkraft'}
                  </DialogTitle>
                  <p className="text-sm text-white/55 mt-1">
                    {[profile.gender, profile.age && `${profile.age} J.`, profile.nationality].filter(Boolean).join(' · ')}
                  </p>

                  {/* Recognition */}
                  {rec && (
                    <div className="mt-3">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border', rec.cls)}>
                        {profile.german_recognition === 'anerkannt' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {rec.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Key stats */}
                <div className="relative z-10 mx-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 divide-y divide-white/10">
                  {expLine && (
                    <div className="px-4 py-3 text-center">
                      <p className="text-2xl font-black text-white leading-none">{profile.total_experience_years || '–'}</p>
                      <p className="text-[10px] text-white/45 mt-0.5">Jahre Berufserfahrung</p>
                      {profile.germany_experience_years && (
                        <p className="text-[10px] text-white/45">{profile.germany_experience_years} J. davon in DE</p>
                      )}
                    </div>
                  )}
                  {deutschLevel && (
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-white/45">Deutsch</span>
                      <span className="text-sm font-bold text-white">{deutschLevel}</span>
                    </div>
                  )}
                  {profile.work_time_preference && (
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-white/45">Arbeitszeit</span>
                      <span className="text-xs font-semibold text-white text-right max-w-[100px] leading-tight">{profile.work_time_preference}</span>
                    </div>
                  )}
                </div>

                {/* Video link */}
                {profile.vimeo_video_url && (
                  <button onClick={() => setVideoOpen(true)}
                    className="relative z-10 mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white/70 text-xs hover:bg-white/20 hover:text-white transition-colors">
                    <Video className="h-3.5 w-3.5" />Vorstellungsvideo
                  </button>
                )}

                <div className="flex-1" />
              </div>

              {/* ══ RIGHT COLUMN — Detailed info ════════════════════════════ */}
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="px-7 py-6 space-y-0">

                  {/* Region + Einrichtung side by side */}
                  <div className="grid grid-cols-2 gap-x-6 border-b border-gray-100 pb-4 mb-0">
                    <DataRow label="Region">
                      {profile.nationwide
                        ? <span className="font-medium text-green-700">Bundesweit</span>
                        : states.length > 0
                          ? <div className="flex flex-wrap gap-1.5">{states.map(s => <Chip key={s}>{s}</Chip>)}</div>
                          : <span className="text-gray-400">–</span>
                      }
                    </DataRow>
                    {einrichtungen.length > 0 && (
                      <DataRow label="Einrichtungstyp">
                        <div className="flex flex-wrap gap-1.5">{einrichtungen.map(e => <Chip key={e}>{e}</Chip>)}</div>
                      </DataRow>
                    )}
                  </div>

                  {expAreas.length > 0 && (
                    <DataRow label="Erfahrungsbereiche">
                      <div className="flex flex-wrap gap-1.5">{expAreas.map(e => <Chip key={e}>{e}</Chip>)}</div>
                    </DataRow>
                  )}

                  {specs.length > 0 && (
                    <DataRow label={getSpecializationsLabel(profile.berufsgruppe)}>
                      <div className="flex flex-wrap gap-1.5">{specs.map(s => <Chip key={s} color="blue">{s}</Chip>)}</div>
                    </DataRow>
                  )}

                  {addQuals.length > 0 && (
                    <DataRow label="Zusatzqualifikationen">
                      <div className="flex flex-wrap gap-1.5">{addQuals.map(q => <Chip key={q} color="teal">{q}</Chip>)}</div>
                    </DataRow>
                  )}

                  {langs.length > 0 && (
                    <DataRow label="Sprachen">
                      <div className="flex flex-wrap gap-x-5 gap-y-1">
                        {langs.map((l, i) => (
                          <span key={i} className="text-sm text-gray-800">
                            {l.language}{l.level && <span className="text-gray-400 text-xs ml-1">({l.level})</span>}
                          </span>
                        ))}
                      </div>
                    </DataRow>
                  )}

                  {personal.length > 0 && (
                    <DataRow label="Persönliches">
                      <span className="text-gray-600">{personal.join(' · ')}</span>
                    </DataRow>
                  )}

                  {profile.fkvi_competency_proof && (
                    <DataRow label="FKVI-Nachweis">
                      <span className="text-green-700 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />{profile.fkvi_competency_proof}
                      </span>
                    </DataRow>
                  )}

                </div>
              </div>

            </div>
          )
        })()}
      </DialogContent>

      <VideoLightbox url={profile?.vimeo_video_url} open={videoOpen} onClose={() => setVideoOpen(false)} />
    </Dialog>
  )
}
