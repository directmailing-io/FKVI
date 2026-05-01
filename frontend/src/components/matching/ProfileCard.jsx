import { useState } from 'react'
import { Heart, Lock, User, FileText, EyeOff, Video, LayoutList,
         CheckCircle2, MapPin, MessageSquare, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import VideoLightbox from '@/components/VideoLightbox'
import { getProfileSpecializations } from '@/lib/profileOptions'

const RECOGNITION = {
  anerkannt:       { label: 'Anerkannt in DE',      cls: 'bg-green-50/80 text-green-700 border-green-200' },
  in_bearbeitung:  { label: 'Anerkennung läuft',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  nicht_beantragt: { label: 'Nicht beantragt',      cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  abgelehnt:       { label: 'Abgelehnt',            cls: 'bg-red-50 text-red-600 border-red-200' },
}

export default function ProfileCard({ profile, isFavorite, onToggleFavorite, onViewDetail, isDemo, onRegister, isPlaced }) {
  const [videoOpen, setVideoOpen] = useState(false)

  const handleOpenCv    = (e) => { e.stopPropagation(); document.body.style.removeProperty('pointer-events'); window.open(`/lebenslauf/${profile.id}`, '_blank') }
  const handleOpenVideo = (e) => { e.stopPropagation(); setVideoOpen(true) }
  const handleDetail    = (e) => { e.stopPropagation(); onViewDetail?.(profile) }

  const specs = getProfileSpecializations(profile)
  const rec   = RECOGNITION[profile.german_recognition]
  const deutschLevel = (profile.language_skills || []).find(l => l.language === 'Deutsch')?.level
  const states = profile.state_preferences || []

  // ── Placed card ───────────────────────────────────────────────────────────
  if (isPlaced) {
    return (
      <div className="relative flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm grayscale opacity-50 select-none">
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 bg-green-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow">
            <CheckCircle2 className="h-3.5 w-3.5" />Erfolgreich vermittelt
          </div>
        </div>
        <div className="w-32 shrink-0 bg-gray-200" />
        <div className="flex-1 p-4">
          <p className="font-bold text-sm text-gray-400">{profile.nursing_education || 'Fachkraft'}</p>
          <p className="text-xs text-gray-300 mt-1">{[profile.gender, profile.age && `${profile.age} J.`, profile.nationality].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
    )
  }

  // ── Normal card ───────────────────────────────────────────────────────────
  return (
    <div className="group relative flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-200">

      {/* ── LEFT: Visual panel ─────────────────────────────────────────────── */}
      <div
        className="relative w-40 shrink-0 flex flex-col items-center justify-center gap-0 overflow-hidden"
        style={{ background: 'linear-gradient(170deg, #1a3a5c 0%, #154e4a 55%, #0d9488 100%)' }}
      >
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-16 opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5), transparent)' }} />

        {/* Nationality */}
        <p className="relative z-10 text-[9px] font-semibold text-white/40 uppercase tracking-widest mb-3 px-2 text-center">
          {profile.nationality || ''}
        </p>

        {/* Avatar */}
        <div className="relative z-10">
          <div className="w-[72px] h-[72px] rounded-full overflow-hidden ring-[2.5px] ring-white/25 shadow-xl bg-white/10">
            {profile.profile_image_url
              ? <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover object-top" />
              : <div className="w-full h-full flex items-center justify-center">
                  <User className="h-9 w-9 text-white/20" />
                </div>
            }
          </div>
        </div>

        {/* Experience stat */}
        {profile.total_experience_years && (
          <div className="relative z-10 mt-4 text-center">
            <p className="text-2xl font-black text-white leading-none">{profile.total_experience_years}</p>
            <p className="text-[9px] text-white/45 font-medium mt-0.5 uppercase tracking-wider leading-tight">
              Jahre<br/>Erfahrung
            </p>
          </div>
        )}

        {/* Anonymized */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap">
          <EyeOff className="h-2.5 w-2.5 text-white/30" />
          <span className="text-[8px] text-white/30 font-medium tracking-wide">Anonymisiert</span>
        </div>
      </div>

      {/* ── RIGHT: Info ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-4 py-3.5 min-w-0">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight">
              {profile.nursing_education || 'Pflegefachkraft'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {[profile.gender, profile.age && `${profile.age} J.`].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Favorite / Demo */}
          {isDemo ? (
            <button onClick={(e) => { e.stopPropagation(); onRegister?.() }}
              className="shrink-0 flex items-center gap-1 bg-fkvi-teal text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full hover:bg-fkvi-teal/85 transition-colors shadow-sm">
              <Lock className="h-3 w-3" />Zugang
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(profile.id) }}
              className={cn(
                'shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all',
                isFavorite ? 'bg-red-500 text-white shadow' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400'
              )}>
              <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-white')} />
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {rec && (
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', rec.cls)}>
              {profile.german_recognition === 'anerkannt' && <CheckCircle2 className="h-2.5 w-2.5" />}
              {rec.label}
            </span>
          )}
          {profile.work_time_preference && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
              {profile.work_time_preference}
            </span>
          )}
        </div>

        {/* Key info rows */}
        <div className="mt-3 space-y-1.5">
          {deutschLevel && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MessageSquare className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              Deutsch: <span className="font-semibold text-gray-800 ml-0.5">{deutschLevel}</span>
            </div>
          )}
          {(states.length > 0 || profile.nationwide) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              {profile.nationwide
                ? <span className="font-medium text-green-700">Bundesweit</span>
                : <span className="truncate">{states.slice(0, 2).join(', ')}{states.length > 2 ? ` +${states.length - 2}` : ''}</span>
              }
            </div>
          )}
        </div>

        {/* Specializations */}
        {specs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {specs.slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 bg-fkvi-blue/[0.07] text-fkvi-blue rounded-full text-[10px] font-medium">{s}</span>
            ))}
            {specs.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[10px]">+{specs.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-8" onClick={handleDetail}>
            <LayoutList className="h-3.5 w-3.5" />Profil
          </Button>
          {profile.vimeo_video_url && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 px-2.5" onClick={handleOpenVideo}>
              <Video className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" className="flex-1 gap-1.5 text-xs h-8 bg-fkvi-blue hover:bg-fkvi-blue/90" onClick={handleOpenCv}>
            <FileText className="h-3.5 w-3.5" />Lebenslauf
          </Button>
        </div>
      </div>

      <VideoLightbox url={profile.vimeo_video_url} open={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  )
}
