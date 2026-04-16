import { Heart, User, Briefcase, GraduationCap, Clock, FileText, EyeOff, Video, LayoutList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, RECOGNITION_LABELS } from '@/lib/utils'

export default function ProfileCard({ profile, isFavorite, onToggleFavorite, onViewDetail }) {
  const handleOpenCv = (e) => {
    e.stopPropagation()
    document.body.style.removeProperty('pointer-events')
    window.open(`/lebenslauf/${profile.id}`, '_blank')
  }
  const handleOpenVideo = (e) => {
    e.stopPropagation()
    document.body.style.removeProperty('pointer-events')
    window.open(profile.vimeo_video_url, '_blank')
  }
  const handleViewDetail = (e) => { e.stopPropagation(); onViewDetail?.(profile) }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group">
      {/* Image area */}
      <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {profile.profile_image_url ? (
          <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center">
              <User className="h-8 w-8 text-slate-400" />
            </div>
          </div>
        )}

        {/* Anonymized badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
          <EyeOff className="h-2.5 w-2.5 text-white/70" />
          <span className="text-[9px] text-white/80 font-medium tracking-wide">Anonymisiert</span>
        </div>

        {/* Favorite button — always visible so it stays clickable after focus changes */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(profile.id) }}
          className={cn(
            "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all",
            isFavorite
              ? "bg-red-500 text-white shadow-md"
              : "bg-white/70 text-gray-300 hover:text-red-400 hover:bg-white hover:shadow-sm"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-white")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* Blurred name placeholder */}
            <p className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1">
              <span className="blur-sm select-none font-medium text-gray-600 text-xs">Vorname Nachname</span>
              <span className="text-[9px] bg-gray-100 text-gray-400 rounded px-1 not-italic no-blur" style={{ filter: 'none' }}>
                anon.
              </span>
            </p>
            <p className="font-semibold text-gray-900 text-sm">
              {profile.gender || 'Fachkraft'}{profile.age ? `, ${profile.age} J.` : ''}
            </p>
            <p className="text-xs text-gray-500">{profile.nationality || '—'}</p>
          </div>
          {profile.german_recognition && (
            <Badge variant={profile.german_recognition === 'anerkannt' ? 'success' : 'warning'} className="text-[10px] shrink-0">
              {RECOGNITION_LABELS[profile.german_recognition]}
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-gray-500">
          {profile.total_experience_years && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span>{profile.total_experience_years} Jahre Erfahrung</span>
              {profile.germany_experience_years && (
                <span className="text-gray-400">({profile.germany_experience_years} J. in DE)</span>
              )}
            </div>
          )}
          {profile.work_time_preference && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{profile.work_time_preference}</span>
            </div>
          )}
          {profile.nursing_education && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3 shrink-0" />
              <span className="truncate">{profile.nursing_education}</span>
            </div>
          )}
        </div>

        {/* Specializations */}
        {(profile.specializations || []).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {profile.specializations.slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium">{s}</span>
            ))}
            {profile.specializations.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]">+{profile.specializations.length - 3}</span>
            )}
          </div>
        )}

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
    </div>
  )
}
