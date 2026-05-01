import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, Lock, User, CheckCircle2, FileText, EyeOff, Video, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import VideoLightbox from '@/components/VideoLightbox'
import { getProfileSpecializations, getProfileEinrichtungstypen, getSpecializationsLabel } from '@/lib/profileOptions'

// IMPORTANT: Never early-return null — Radix pointer-events cleanup won't fire.

const RECOGNITION = {
  anerkannt:       { label: 'Anerkannt in DE',              cls: 'bg-green-50 text-green-700 border-green-200' },
  in_bearbeitung:  { label: 'Anerkennung läuft',            cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  nicht_beantragt: { label: 'Anerkennung nicht beantragt',  cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  abgelehnt:       { label: 'Anerkennung abgelehnt',        cls: 'bg-red-50 text-red-600 border-red-200' },
}

function Row({ label, children, last }) {
  return (
    <div className={cn('grid grid-cols-[140px_1fr] gap-3 py-2.5', !last && 'border-b border-gray-100')}>
      <span className="text-xs text-gray-400 pt-0.5 leading-snug">{label}</span>
      <div className="text-sm text-gray-800 leading-snug">{children}</div>
    </div>
  )
}

function Tags({ items, color = 'gray' }) {
  const cls = {
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    gray: 'bg-gray-100 text-gray-600',
  }[color]
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item} className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{item}</span>
      ))}
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
        className="max-w-lg p-0 gap-0 rounded-2xl overflow-hidden max-h-[88vh] flex flex-col"
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

          const rows = [
            profile.work_time_preference && { label: 'Arbeitszeit', content: <span className="font-medium">{profile.work_time_preference}</span> },
            { label: 'Region', content: profile.nationwide
              ? <span className="text-green-700 font-medium">Bundesweit</span>
              : states.length > 0
                ? <Tags items={states} />
                : <span className="text-gray-400">–</span>
            },
            einrichtungen.length > 0 && { label: 'Einrichtungstyp', content: <Tags items={einrichtungen} /> },
            (profile.total_experience_years || profile.germany_experience_years) && {
              label: 'Berufserfahrung',
              content: <span className="font-medium">
                {[profile.total_experience_years && `${profile.total_experience_years} J. gesamt`,
                  profile.germany_experience_years && `${profile.germany_experience_years} J. in DE`].filter(Boolean).join(' · ')}
              </span>
            },
            expAreas.length > 0 && { label: 'Erfahrungsbereiche', content: <Tags items={expAreas} /> },
            specs.length > 0 && { label: getSpecializationsLabel(profile.berufsgruppe), content: <Tags items={specs} color="blue" /> },
            addQuals.length > 0 && { label: 'Zusatzqualifikationen', content: <Tags items={addQuals} color="teal" /> },
            langs.length > 0 && {
              label: 'Sprachen',
              content: <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {langs.map((l, i) => (
                  <span key={i} className="text-sm">
                    {l.language}{l.level && <span className="text-gray-400 text-xs ml-0.5">({l.level})</span>}
                  </span>
                ))}
              </div>
            },
            (() => {
              const parts = [
                profile.marital_status,
                profile.children_count === 0 ? 'Keine Kinder' : profile.children_count > 0 ? `${profile.children_count} Kind${profile.children_count > 1 ? 'er' : ''}` : null,
                profile.has_drivers_license ? 'Führerschein Kl. B' : null,
              ].filter(Boolean)
              return parts.length > 0 && { label: 'Persönliches', content: <span className="text-gray-600">{parts.join(' · ')}</span> }
            })(),
            profile.fkvi_competency_proof && {
              label: 'FKVI-Nachweis',
              content: <span className="text-green-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />{profile.fkvi_competency_proof}
              </span>
            },
          ].filter(Boolean)

          return (
            <>
              {/* ── Identity header ─────────────────────────────────── */}
              <div className="relative px-5 pt-5 pb-4 flex gap-4 items-start shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, rgba(26,58,92,0.04) 60%, transparent 100%)' }}>

                {/* Avatar */}
                <div className="shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-1 ring-gray-200">
                    {profile.profile_image_url
                      ? <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover object-top" />
                      : <div className="w-full h-full flex items-center justify-center bg-fkvi-blue/10">
                          <User className="h-9 w-9 text-fkvi-blue/30" />
                        </div>
                    }
                  </div>
                </div>

                {/* Identity text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <DialogTitle className="font-bold text-gray-900 text-base leading-tight">
                    {profile.nursing_education || 'Pflegefachkraft'}
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[profile.gender, profile.age ? `${profile.age} J.` : null, profile.nationality].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {rec && (
                      <span className={cn('text-[11px] font-medium px-2.5 py-0.5 rounded-full border', rec.cls)}>
                        {rec.label}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 bg-white/60">
                      <EyeOff className="h-3 w-3" />Anonymisiert
                    </span>
                  </div>
                </div>

                {/* Action buttons (beside the X which Radix places at absolute top-4 right-4) */}
                <div className="flex gap-2 shrink-0 mr-7">
                  <Button size="sm" variant="outline" onClick={handleOpenCv}
                    className="h-8 text-xs gap-1.5 bg-white shadow-sm">
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
                        isFavorite ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'bg-white shadow-sm'
                      )}
                      variant={isFavorite ? 'default' : 'outline'}
                    >
                      <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-white')} />
                      {isFavorite ? 'Vorgemerkt' : 'Vormerken'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Video */}
              {profile.vimeo_video_url && (
                <div className="px-5 shrink-0">
                  <button onClick={() => setVideoOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-fkvi-teal/25 bg-teal-50/40 text-fkvi-teal text-xs font-medium hover:bg-teal-50 transition-colors">
                    <Video className="h-3.5 w-3.5" />Vorstellungsvideo ansehen
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="mx-5 shrink-0 border-t border-gray-100 mt-1" />

              {/* ── Data table ──────────────────────────────────────── */}
              <div className="overflow-y-auto flex-1 px-5 py-1 pb-5">
                {rows.map((row, i) => (
                  <Row key={i} label={row.label} last={i === rows.length - 1}>
                    {row.content}
                  </Row>
                ))}
              </div>
            </>
          )
        })()}
      </DialogContent>

      <VideoLightbox url={profile?.vimeo_video_url} open={videoOpen} onClose={() => setVideoOpen(false)} />
    </Dialog>
  )
}
