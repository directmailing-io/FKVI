import { RECOGNITION_LABELS } from '@/lib/utils'
import {
  GraduationCap, Briefcase, Globe, MapPin, User,
  CheckCircle2, Award, Clock, Car, Heart,
} from 'lucide-react'

const BLUE = '#1e3a5f'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-7 break-inside-avoid-page">
      <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `2px solid ${BLUE}` }}>
        {Icon && <Icon size={15} style={{ color: BLUE }} />}
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: BLUE }}>{title}</h2>
      </div>
      <div className="pl-1">{children}</div>
    </div>
  )
}

function Row({ label, value, icon: Icon }) {
  if (value == null || value === '' || value === false) return null
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1.5 w-48 shrink-0">
        {Icon && <Icon size={13} className="text-gray-400 shrink-0" />}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className="text-sm text-gray-900 font-medium">{String(value)}</span>
    </div>
  )
}

function TagList({ items = [], colorClass = 'bg-gray-100 text-gray-700 border-gray-200' }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colorClass}`}>{item}</span>
      ))}
    </div>
  )
}

// ─── Main CV Document ─────────────────────────────────────────────────────────

export default function CvDocument({ profile }) {
  const refNr = `FK-${profile.id.slice(0, 8).toUpperCase()}`
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const recLabel = RECOGNITION_LABELS[profile.german_recognition]
  const isRecognized = profile.german_recognition === 'anerkannt'

  const hasEducation = profile.nursing_education || profile.education_duration || profile.graduation_year || profile.education_notes
  const hasExperience = profile.total_experience_years || (profile.experience_areas || []).length > 0
  const hasQuals = (profile.specializations || []).length > 0 || (profile.additional_qualifications || []).length > 0
  const hasLanguages = (profile.language_skills || []).length > 0
  const hasPersonal = profile.marital_status || profile.children_count != null || profile.has_drivers_license != null || profile.work_time_preference
  const hasPref = profile.nationwide || (profile.state_preferences || []).length > 0 || (profile.preferred_facility_types || []).length > 0

  return (
    <div className="bg-white font-sans" style={{ maxWidth: 794 }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{ background: BLUE }} className="px-10 py-8">
        <div className="flex items-start gap-6">

          {/* Photo */}
          <div className="shrink-0">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Profilbild"
                className="w-24 h-24 rounded-xl object-cover border-2 border-white/25"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl flex items-center justify-center border-2 border-white/20"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <User size={36} className="text-white/30" />
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Fachkraft-Profil · {refNr}</p>
                <h1 className="text-white text-2xl font-bold leading-tight">
                  Pflegefachkraft
                  {profile.gender ? ` (${profile.gender})` : ''}
                </h1>
                <p className="text-white/65 text-sm mt-1">
                  {[profile.age ? `${profile.age} Jahre` : null, profile.nationality].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Recognition badge */}
              {recLabel && (
                <div className={`text-xs px-3 py-1.5 rounded-lg font-semibold border shrink-0 ${
                  isRecognized
                    ? 'bg-green-400/15 text-green-200 border-green-400/30'
                    : 'bg-amber-400/15 text-amber-200 border-amber-400/30'
                }`}>
                  {isRecognized ? '✓ ' : '⏳ '}{recLabel}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              {profile.total_experience_years && (
                <span className="text-xs text-white/70 flex items-center gap-1.5">
                  <Briefcase size={12} />{profile.total_experience_years} Jahre Erfahrung
                </span>
              )}
              {profile.work_time_preference && (
                <span className="text-xs text-white/70 flex items-center gap-1.5">
                  <Clock size={12} />{profile.work_time_preference}
                </span>
              )}
              {profile.nationwide && (
                <span className="text-xs text-white/70 flex items-center gap-1.5">
                  <MapPin size={12} />Bundesweit einsetzbar
                </span>
              )}
              {profile.fkvi_competency_proof && (
                <span className="text-xs text-white/70 flex items-center gap-1.5">
                  <Award size={12} />FKVI Kompetenznachweis: {profile.fkvi_competency_proof}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className="px-10 py-8">

        {/* Ausbildung */}
        {hasEducation && (
          <Section icon={GraduationCap} title="Ausbildung">
            <div className="space-y-0">
              <Row label="Pflegeausbildung" value={profile.nursing_education} />
              <Row label="Ausbildungsdauer" value={profile.education_duration} />
              <Row label="Abschlussjahr" value={profile.graduation_year} />
            </div>
            {profile.education_notes && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 leading-relaxed">
                {profile.education_notes}
              </p>
            )}
          </Section>
        )}

        {/* Berufserfahrung */}
        {hasExperience && (
          <Section icon={Briefcase} title="Berufserfahrung">
            <div className="space-y-0 mb-4">
              <Row label="Gesamterfahrung" value={profile.total_experience_years ? `${profile.total_experience_years} Jahre` : null} />
              <Row label="Erfahrung in Deutschland" value={profile.germany_experience_years ? `${profile.germany_experience_years} Jahre` : null} />
            </div>
            {(profile.experience_areas || []).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Erfahrungsbereiche</p>
                <TagList items={profile.experience_areas} colorClass="bg-gray-100 text-gray-700 border-gray-200" />
              </div>
            )}
          </Section>
        )}

        {/* Qualifikationen */}
        {hasQuals && (
          <Section icon={Award} title="Qualifikationen & Spezialisierungen">
            {(profile.specializations || []).length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Spezialisierungen</p>
                <TagList
                  items={profile.specializations}
                  colorClass="border-blue-200 text-blue-800"
                />
              </div>
            )}
            {(profile.additional_qualifications || []).length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Zusatzqualifikationen</p>
                <TagList items={profile.additional_qualifications} colorClass="bg-teal-50 text-teal-700 border-teal-100" />
              </div>
            )}
            {profile.fkvi_competency_proof && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm"
                style={{ background: '#f0f4f9', borderColor: BLUE + '30', color: BLUE }}>
                <CheckCircle2 size={16} />
                <span className="font-medium">FKVI Pflegekompetenznachweis: {profile.fkvi_competency_proof}</span>
              </div>
            )}
          </Section>
        )}

        {/* Sprachkenntnisse */}
        {hasLanguages && (
          <Section icon={Globe} title="Sprachkenntnisse">
            <div className="divide-y divide-gray-100">
              {(profile.language_skills || []).map((lang, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-gray-900">{lang.language}</span>
                  {lang.level && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {['A1','A2','B1','B2','C1','C2'].map(lvl => {
                          const levels = ['A1','A2','B1','B2','C1','C2']
                          const filled = levels.indexOf(lang.level) >= levels.indexOf(lvl)
                          return (
                            <div key={lvl} className="w-6 h-1.5 rounded-full"
                              style={{ background: filled ? BLUE : '#e5e7eb' }} />
                          )
                        })}
                      </div>
                      <span className="text-sm font-bold w-6 text-right" style={{ color: BLUE }}>{lang.level}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Persönliche Angaben */}
        {hasPersonal && (
          <Section icon={User} title="Persönliche Angaben">
            <div className="space-y-0">
              <Row label="Familienstand" value={profile.marital_status} />
              <Row
                label="Kinder"
                value={profile.children_count != null ? (profile.children_count === 0 ? 'Keine' : String(profile.children_count)) : null}
              />
              <Row
                icon={Car}
                label="Führerschein"
                value={profile.has_drivers_license != null
                  ? (profile.has_drivers_license ? 'Vorhanden (Klasse B)' : 'Nicht vorhanden')
                  : null}
              />
              <Row icon={Clock} label="Arbeitszeitpräferenz" value={profile.work_time_preference} />
            </div>
          </Section>
        )}

        {/* Einsatzpräferenzen */}
        {hasPref && (
          <Section icon={MapPin} title="Einsatzpräferenzen">
            {profile.nationwide ? (
              <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: BLUE }}>
                <CheckCircle2 size={15} />Bundesweit einsetzbar
              </div>
            ) : (profile.state_preferences || []).length > 0 ? (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Bevorzugte Bundesländer</p>
                <TagList items={profile.state_preferences} colorClass="bg-gray-100 text-gray-700 border-gray-200" />
              </div>
            ) : null}
            {(profile.preferred_facility_types || []).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Bevorzugte Einrichtungsarten</p>
                <TagList items={profile.preferred_facility_types} colorClass="bg-gray-100 text-gray-700 border-gray-200" />
              </div>
            )}
          </Section>
        )}

      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="px-10 pb-8">
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: BLUE }}>FKVI</span>
            <span>· Fachkraft Vermittlung International</span>
            <span>· Profil-Referenz: {refNr}</span>
          </div>
          <span>Erstellt am {today}</span>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">
          Dieses Dokument ist vertraulich und ausschließlich für den internen Gebrauch bestimmt.
        </p>
      </footer>

    </div>
  )
}
