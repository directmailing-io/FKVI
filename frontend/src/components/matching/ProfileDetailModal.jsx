import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, Lock, User, CheckCircle2, FileText, EyeOff, Video,
         Clock, MapPin, Building2, Briefcase, Star, Languages, Info, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import VideoLightbox from '@/components/VideoLightbox'
import { getProfileSpecializations, getProfileEinrichtungstypen, getSpecializationsLabel } from '@/lib/profileOptions'

// IMPORTANT: Never early-return null inside Dialog — Radix cleanup won't fire.

const RECOGNITION = {
  anerkannt:       { label: 'Anerkannt in DE',                    cls: 'bg-green-50 text-green-700 border-green-200' },
  in_bearbeitung:  { label: 'Anerkennung läuft',                  cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  nicht_beantragt: { label: 'Anerkennung nicht beantragt',        cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  abgelehnt:       { label: 'Anerkennung abgelehnt',              cls: 'bg-red-50 text-red-600 border-red-200' },
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Tags({ items, color = 'gray' }) {
  const cls = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-100',
    teal: 'bg-teal-50 text-teal-700 border border-teal-100',
    gray: 'bg-gray-100 text-gray-600 border border-gray-200',
  }[color] || 'bg-gray-100 text-gray-600'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{item}</span>
      ))}
    </div>
  )
}

export default function ProfileDetailModal({ profile, open, onClose, isFavorite, onToggleFavorite, isDemo, onRegister }) {
  const [videoOpen, setVideoOpen] = useState(false)

  const cvUrl = profile ? `${window.location.origin}/lebenslauf/${profile.id}` : ''

  const handleOpenCv = () => {
    document.body.style.removeProperty('pointer-events')
    onClose()
    window.open(cvUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="max-w-xl p-0 gap-0 max-h-[92vh] overflow-y-auto rounded-2xl"
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

          const expYears = [
            profile.total_experience_years ? `${profile.total_experience_years} J. gesamt` : null,
            profile.germany_experience_years ? `${profile.germany_experience_years} J. in DE` : null,
          ].filter(Boolean).join(' · ')

          const personal = [
            profile.marital_status,
            profile.children_count === 0 ? 'Keine Kinder'
              : profile.children_count > 0 ? `${profile.children_count} ${profile.children_count === 1 ? 'Kind' : 'Kinder'}` : null,
            profile.has_drivers_license ? 'Führerschein Kl. B' : null,
          ].filter(Boolean)

          return (
            <>
              {/* ── Hero banner ────────────────────────────────────────── */}
              <div
                className="relative h-36 shrink-0 rounded-t-2xl overflow-visible"
                style={{ background: 'linear-gradient(150deg, rgba(13,148,136,0.18) 0%, rgba(26,58,92,0.12) 45%, rgba(240,249,255,0.3) 100%)' }}
              >
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(13,148,136,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(26,58,92,0.2) 0%, transparent 50%)' }} />

                {/* Action buttons – top right (leave space for Radix close button at far right) */}
                <div className="absolute top-3 right-10 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleOpenCv}
                    className="bg-white/90 text-gray-800 hover:bg-white border border-gray-200 shadow-sm text-xs h-8 gap-1.5 font-medium"
                    variant="outline"
                  >
                    <FileText className="h-3.5 w-3.5 text-fkvi-blue" />Lebenslauf
                  </Button>
                  {isDemo ? (
                    <Button size="sm" onClick={onRegister}
                      className="bg-fkvi-teal hover:bg-fkvi-teal/90 text-white shadow-sm text-xs h-8 gap-1.5">
                      <Lock className="h-3.5 w-3.5" />Zugang
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onToggleFavorite(profile.id)}
                      className={cn(
                        'text-xs h-8 gap-1.5 shadow-sm',
                        isFavorite
                          ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                          : 'bg-white/90 hover:bg-white text-gray-800 border border-gray-200'
                      )}
                      variant="outline"
                    >
                      <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-white text-white')} />
                      {isFavorite ? 'Vorgemerkt' : 'Vormerken'}
                    </Button>
                  )}
                </div>

                {/* Avatar – centered, overlapping hero bottom */}
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
                  <div
                    className="w-28 h-28 rounded-full p-[3.5px] shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #0d9488 0%, #1a3a5c 100%)' }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                      {profile.profile_image_url
                        ? <img src={profile.profile_image_url} alt="Profilbild" className="w-full h-full object-cover object-top" />
                        : <div className="w-full h-full flex items-center justify-center bg-fkvi-blue/10">
                            <User className="h-12 w-12 text-fkvi-blue/25" />
                          </div>
                      }
                    </div>
                  </div>
                  {/* Anonymized badge */}
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800/80 backdrop-blur-sm rounded-full px-2.5 py-0.5 whitespace-nowrap shadow-md">
                    <EyeOff className="h-2.5 w-2.5 text-white/70" />
                    <span className="text-[9px] text-white/80 font-medium tracking-wide">Anonymisiert</span>
                  </div>
                </div>
              </div>

              {/* ── Identity ───────────────────────────────────────────── */}
              <div className="pt-16 pb-5 px-6 text-center border-b border-gray-100">
                {/* Accessible title (visually integrated) */}
                <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
                  {profile.nursing_education || 'Pflegefachkraft'}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {[profile.gender, profile.age ? `${profile.age} J.` : null, profile.nationality].filter(Boolean).join(' · ')}
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  {rec && (
                    <span className={cn('text-xs font-medium px-3 py-1 rounded-full border', rec.cls)}>
                      {rec.label}
                    </span>
                  )}
                  {profile.work_time_preference && (
                    <span className="text-xs font-medium px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1">
                      <Clock className="h-3 w-3" />{profile.work_time_preference}
                    </span>
                  )}
                </div>
              </div>

              {/* Video CTA */}
              {profile.vimeo_video_url && (
                <div className="px-6 pt-4">
                  <button
                    onClick={() => setVideoOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-fkvi-teal/30 bg-teal-50/50 text-fkvi-teal text-sm font-medium hover:bg-teal-50 transition-colors"
                  >
                    <Video className="h-4 w-4" />Vorstellungsvideo ansehen
                  </button>
                </div>
              )}

              {/* ── Data sections ──────────────────────────────────────── */}
              <div className="px-6 pt-5 pb-7 space-y-5">

                {/* Region + Einrichtung in 2-col */}
                <div className="grid grid-cols-2 gap-4">
                  <Section icon={MapPin} title="Region">
                    {profile.nationwide
                      ? <span className="text-sm font-medium text-green-700">Bundesweit</span>
                      : states.length > 0
                        ? <div className="flex flex-wrap gap-1">
                            {states.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">{s}</span>
                            ))}
                          </div>
                        : <span className="text-sm text-gray-400">Keine Angabe</span>
                    }
                  </Section>

                  {expYears ? (
                    <Section icon={Briefcase} title="Berufserfahrung">
                      <p className="text-sm font-semibold text-gray-900">{expYears}</p>
                    </Section>
                  ) : <div />}
                </div>

                {einrichtungen.length > 0 && (
                  <Section icon={Building2} title="Einrichtungstyp">
                    <Tags items={einrichtungen} />
                  </Section>
                )}

                {expAreas.length > 0 && (
                  <Section icon={Star} title="Erfahrungsbereiche">
                    <Tags items={expAreas} />
                  </Section>
                )}

                {specs.length > 0 && (
                  <Section icon={CheckCircle2} title={getSpecializationsLabel(profile.berufsgruppe)}>
                    <Tags items={specs} color="blue" />
                  </Section>
                )}

                {addQuals.length > 0 && (
                  <Section icon={Award} title="Zusatzqualifikationen">
                    <Tags items={addQuals} color="teal" />
                  </Section>
                )}

                {langs.length > 0 && (
                  <Section icon={Languages} title="Sprachen">
                    <div className="flex flex-wrap gap-2">
                      {langs.map((l, i) => (
                        <div key={i} className="flex items-baseline gap-1">
                          <span className="text-sm font-medium text-gray-900">{l.language}</span>
                          {l.level && <span className="text-xs text-gray-400 font-medium">({l.level})</span>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {(personal.length > 0 || profile.fkvi_competency_proof) && (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-2">
                    {personal.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500">{personal.join(' · ')}</span>
                      </div>
                    )}
                    {profile.fkvi_competency_proof && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="text-xs text-green-700 font-medium">FKVI-Nachweis: {profile.fkvi_competency_proof}</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )
        })()}
      </DialogContent>

      <VideoLightbox
        url={profile?.vimeo_video_url}
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
      />
    </Dialog>
  )
}
