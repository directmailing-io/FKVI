import { Heart, User, MapPin, Briefcase, GraduationCap, Clock, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, RECOGNITION_LABELS } from '@/lib/utils'

export default function ProfileCard({ profile, isFavorite, onToggleFavorite, onViewDetail }) {
  const initials = profile.gender === 'männlich' ? 'M' : profile.gender === 'weiblich' ? 'W' : '?'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group">
      {/* Image area */}
      <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt="Profilbild"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center">
              <User className="h-8 w-8 text-slate-400" />
            </div>
          </div>
        )}
        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(profile.id) }}
          className={cn(
            "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all",
            isFavorite
              ? "bg-red-500 text-white shadow-md"
              : "bg-white/80 text-gray-400 hover:text-red-400 hover:bg-white opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-white")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {profile.gender || 'Fachkraft'}, {profile.age ? `${profile.age} Jahre` : ''}
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
          {(profile.preferred_facility_types || []).length > 0 && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{profile.preferred_facility_types[0]}</span>
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
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onViewDetail(profile)}
          >
            Profil ansehen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-2.5 text-gray-500 hover:text-gray-800"
            title="Lebenslauf öffnen"
            onClick={(e) => { e.stopPropagation(); window.open(`/lebenslauf/${profile.id}`, '_blank') }}
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
