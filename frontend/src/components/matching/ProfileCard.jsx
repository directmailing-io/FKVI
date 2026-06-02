import { useState } from 'react'
import { Heart, Lock, User, FileText, EyeOff, Video, LayoutList, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import VideoLightbox from '@/components/VideoLightbox'
import { getProfileSpecializations } from '@/lib/profileOptions'

// ─── Recognition config ───────────────────────────────────────────────────────
const RECOGNITION = {
  anerkannt:       { label: 'Anerkennung in DE: Anerkannt',           cls: 'bg-green-50 text-green-700 border-green-200' },
  in_bearbeitung:  { label: 'Anerkennung in DE: läuft',               cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  nicht_beantragt: { label: 'Anerkennung in DE: noch nicht beantragt', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  abgelehnt:       { label: 'Anerkennung in DE: abgelehnt',            cls: 'bg-red-50 text-red-600 border-red-200' },
}

export default function ProfileCard({ profile, isFavorite, onToggleFavorite, onViewDetail, isDemo, onRegister, isPlaced }) {
  const [videoOpen, setVideoOpen] = useState(false)

  const handleOpenCv    = (e) => { e.stopPropagation(); document.body.style.removeProperty('pointer-events'); window.open(`/lebenslauf/${profile.id}`, '_blank') }
  const handleOpenVideo = (e) => { e.stopPropagation(); setVideoOpen(true) }
  const handleViewDetail = (e) => { e.stopPropagation(); onViewDetail?.(profile) }

  const specs = getProfileSpecializations(profile)
  const rec   = RECOGNITION[profile.german_recognition]

  // ── Placed (grayed-out) card ──────────────────────────────────────────────
  if (isPlaced) {
    return (
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col grayscale opacity-55 select-none">
        <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-center gap-1.5 bg-green-600/90 backdrop-blur-sm py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
          <span className="text-white text-xs font-semibold tracking-wide">Erfolgreich vermittelt</span>
        </div>
        {/* Soft gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-100/80 via-gray-50/30 to-white pointer-events-none" />
        <div className="h-20 shrink-0" />
        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <div className="w-28 h-28 rounded-full p-[3px] bg-gray-300 shadow-md">
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
              {profile.profile_image_url
                ? <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover object-top" />
                : <div className="w-full h-full flex items-center justify-center bg-gray-200"><User className="h-9 w-9 text-gray-400" /></div>
              }
            </div>
          </div>
        </div>
        <div className="relative pt-16 pb-4 px-4 flex flex-col gap-2 pointer-events-none">
          <div className="text-center">
            <p className="font-semibold text-gray-500 text-sm">{profile.nursing_education || 'Fachkraft'}</p>
            <p className="text-xs text-gray-400">{[profile.gender, profile.age ? `${profile.age} J.` : null].filter(Boolean).join(' · ')}{profile.nationality ? ` · ${profile.nationality}` : ''}</p>
          </div>
          {profile.total_experience_years && (
            <p className="text-xs text-gray-400 text-center">{profile.total_experience_years} J. Berufserfahrung</p>
          )}
        </div>
      </div>
    )
  }

  // ── Normal card ───────────────────────────────────────────────────────────
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl hover:border-gray-200 transition-all duration-300 flex flex-col overflow-hidden">

      {/* Soft full-card gradient – fades from a hint of teal/blue at the top to pure white */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(170deg, rgba(13,148,136,0.07) 0%, rgba(26,58,92,0.04) 25%, rgba(255,255,255,0) 55%)' }}
      />

      {/* Top spacer for avatar */}
      <div className="h-20 shrink-0" />

      {/* Avatar */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <div
          className="w-28 h-28 rounded-full p-[3px] shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #1a3a5c 100%)' }}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
            {profile.profile_image_url
              ? <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover object-top" />
              : <div className="w-full h-full flex items-center justify-center bg-fkvi-blue/10"><User className="h-10 w-10 text-fkvi-blue/30" /></div>
            }
          </div>
        </div>
        {/* Anonymized pill */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800/75 backdrop-blur-sm rounded-full px-2.5 py-0.5 whitespace-nowrap">
          <EyeOff className="h-2.5 w-2.5 text-white/70" />
          <span className="text-[9px] text-white/80 font-medium tracking-wide">Anonymisiert</span>
        </div>
      </div>

      {/* Favorite / Register button */}
      {isDemo ? (
        <button
          onClick={(e) => { e.stopPropagation(); onRegister?.() }}
          className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-fkvi-teal text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full hover:bg-fkvi-teal/85 transition-colors z-10 shadow-sm"
        >
          <Lock className="h-3 w-3" />Zugang
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(profile.id) }}
          className={cn(
            "absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10",
            isFavorite
              ? "bg-red-500 text-white shadow-md"
              : "bg-white/90 text-gray-300 hover:text-red-400 hover:bg-white hover:shadow-sm"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-white")} />
        </button>
      )}

      {/* Content */}
      <div className="relative pt-14 pb-4 px-4 flex flex-col flex-1 gap-3">

        {/* Identity */}
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm leading-tight">{profile.nursing_education || 'Pflegefachkraft'}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {[profile.gender, profile.age ? `${profile.age} J.` : null, profile.nationality].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Recognition badge */}
        {rec && (
          <div className="flex justify-center">
            <span className={cn('text-[10px] font-medium px-2.5 py-0.5 rounded-full border', rec.cls)}>
              {rec.label}
            </span>
          </div>
        )}

        {/* Experience */}
        {profile.total_experience_years && (
          <p className="text-xs text-gray-600 text-center">
            <span className="font-semibold">{profile.total_experience_years} J.</span> Berufserfahrung
            {profile.germany_experience_years ? <span className="text-gray-400"> · {profile.germany_experience_years} J. in DE</span> : ''}
          </p>
        )}

        {/* Specialization tags */}
        {specs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {specs.slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 bg-fkvi-blue/8 text-fkvi-blue rounded-full text-[10px] font-medium">{s}</span>
            ))}
            {specs.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]">+{specs.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-1.5 mt-1">
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs px-2" onClick={handleViewDetail}>
            <LayoutList className="h-3.5 w-3.5" />Profil
          </Button>
          {profile.vimeo_video_url && (
            <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs px-2" onClick={handleOpenVideo}>
              <Video className="h-3.5 w-3.5" />Video
            </Button>
          )}
          <Button size="sm" className="flex-1 gap-1 text-xs px-2" onClick={handleOpenCv}>
            <FileText className="h-3.5 w-3.5" />Lebenslauf
          </Button>
        </div>
      </div>

      {/* Subtle bottom accent line on hover */}
      <div className="h-0.5 bg-gradient-to-r from-fkvi-teal/0 via-fkvi-teal/40 to-fkvi-teal/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <VideoLightbox url={profile.vimeo_video_url} open={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  )
}
