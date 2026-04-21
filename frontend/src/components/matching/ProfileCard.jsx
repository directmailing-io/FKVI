import { useState } from 'react'
import { Heart, Lock, User, Briefcase, GraduationCap, Clock, FileText, EyeOff, Video, LayoutList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, RECOGNITION_LABELS } from '@/lib/utils'
import VideoLightbox from '@/components/VideoLightbox'

export default function ProfileCard({ profile, isFavorite, onToggleFavorite, onViewDetail, isDemo, onRegister }) {
  const [videoOpen, setVideoOpen] = useState(false)

  const handleOpenCv = (e) => {
    e.stopPropagation()
    document.body.style.removeProperty('pointer-events')
    window.open(`/lebenslauf/${profile.id}`, '_blank')
  }
  const handleOpenVideo = (e) => {
    e.stopPropagation()
    setVideoOpen(true)
  }
  const handleViewDetail = (e) => { e.stopPropagation(); onViewDetail?.(profile) }

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all flex flex-col">

      {/* Top gradient band */}
      <div className="h-20 bg-gradient-to-br from-fkvi-blue/10 via-fkvi-teal/5 to-transparent shrink-0" />

      {/* Circular avatar — centered, overlapping the band */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div
          className="w-28 h-28 rounded-full p-[3px] shadow-md"
          style={{ background: 'linear-gradient(135deg, #0d9488, #1a3a5c)' }}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Profilbild"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-fkvi-blue/10">
                <User className="h-10 w-10 text-fkvi-blue/30" />
              </div>
            )}
          </div>
        </div>

        {/* Anonymized badge */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800/80 backdrop-blur-sm rounded-full px-2 py-0.5 whitespace-nowrap">
          <EyeOff className="h-2.5 w-2.5 text-white/70" />
          <span className="text-[9px] text-white/80 font-medium tracking-wide">Anonymisiert</span>
        </div>
      </div>

      {/* Top-right action: Favorite (normal) or Register CTA (demo) */}
      {isDemo ? (
        <button
          onClick={(e) => { e.stopPropagation(); onRegister?.() }}
          className="absolute top-3 right-3 flex items-center gap-1 bg-fkvi-teal text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full hover:bg-fkvi-teal/85 transition-colors z-10 shadow-sm"
        >
          <Lock className="h-3 w-3" />Zugang
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(profile.id) }}
          className={cn(
            "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10",
            isFavorite
              ? "bg-red-500 text-white shadow-md"
              : "bg-white/80 text-gray-300 hover:text-red-400 hover:bg-white hover:shadow-sm"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-white")} />
        </button>
      )}

      {/* Content */}
      <div className="pt-16 pb-4 px-4 flex flex-col flex-1 gap-2.5">

        {/* Name placeholder + identity */}
        <div className="text-center">
          <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1 mb-0.5">
            <span className="blur-sm select-none font-medium text-gray-600 text-xs">Vorname Nachname</span>
            <span className="text-[9px] bg-gray-100 text-gray-400 rounded px-1" style={{ filter: 'none' }}>anon.</span>
          </p>
          <p className="font-semibold text-gray-900 text-sm">
            {profile.gender || 'Fachkraft'}{profile.age ? `, ${profile.age} J.` : ''}
          </p>
          <p className="text-xs text-gray-500">{profile.nationality || '—'}</p>
        </div>

        {/* Recognition badge */}
        {profile.german_recognition && (
          <div className="flex justify-center">
            <Badge variant={profile.german_recognition === 'anerkannt' ? 'success' : 'warning'} className="text-[10px]">
              {RECOGNITION_LABELS[profile.german_recognition]}
            </Badge>
          </div>
        )}

        {/* Details */}
        <div className="space-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
          {profile.total_experience_years && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3 w-3 shrink-0 text-fkvi-teal" />
              <span>{profile.total_experience_years} Jahre Erfahrung
                {profile.germany_experience_years && (
                  <span className="text-gray-400"> ({profile.germany_experience_years} J. in DE)</span>
                )}
              </span>
            </div>
          )}
          {profile.work_time_preference && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0 text-fkvi-teal" />
              <span>{profile.work_time_preference}</span>
            </div>
          )}
          {profile.nursing_education && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3 shrink-0 text-fkvi-teal" />
              <span className="truncate">{profile.nursing_education}</span>
            </div>
          )}
        </div>

        {/* Specializations */}
        {(profile.specializations || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.specializations.slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 bg-fkvi-blue/8 text-fkvi-blue rounded-full text-[10px] font-medium">{s}</span>
            ))}
            {profile.specializations.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]">+{profile.specializations.length - 3}</span>
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

      {/* Hover teal accent */}
      <div className="h-0.5 bg-gradient-to-r from-fkvi-teal/0 via-fkvi-teal/50 to-fkvi-teal/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <VideoLightbox
        url={profile.vimeo_video_url}
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
      />
    </div>
  )
}
