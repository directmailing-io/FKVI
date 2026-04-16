import { RECOGNITION_LABELS } from '@/lib/utils'

const BLUE = '#1e3a5f'
const BLUE_LIGHT = '#e8f0fa'

// ─── Print-safe page-break helpers ───────────────────────────────────────────
// Sections use break-inside-avoid so content never splits mid-section.

function Section({ title, children }) {
  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: 28 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `2px solid ${BLUE}`, paddingBottom: 5, marginBottom: 12,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: BLUE,
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div style={{ display: 'flex', gap: 16, paddingBottom: 6, marginBottom: 6, borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: 12, color: '#6b7280', width: 180, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#111827', fontWeight: 500 }}>{String(value)}</span>
    </div>
  )
}

function Tags({ items = [], bg = '#f3f4f6', color = '#374151', border = '#e5e7eb' }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {items.map(item => (
        <span key={item} style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 20,
          background: bg, color, border: `1px solid ${border}`, fontWeight: 500,
        }}>
          {item}
        </span>
      ))}
    </div>
  )
}

function SubLabel({ text }) {
  return (
    <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, marginTop: 12 }}>
      {text}
    </p>
  )
}

// ─── Main CV Document ─────────────────────────────────────────────────────────
export default function CvDocument({ profile, expiresAt }) {
  const refNr = `FK-${profile.id.slice(0, 8).toUpperCase()}`
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const recLabel = RECOGNITION_LABELS[profile.german_recognition]
  const isRecognized = profile.german_recognition === 'anerkannt'

  const hasExperience = profile.total_experience_years || (profile.experience_areas || []).length > 0
  const hasQuals = (profile.specializations || []).length > 0 || (profile.additional_qualifications || []).length > 0
  const hasLanguages = (profile.language_skills || []).length > 0
  const hasPersonal = profile.marital_status || profile.children_count != null || profile.has_drivers_license != null || profile.work_time_preference
  const hasPref = profile.nationwide || (profile.state_preferences || []).length > 0 || (profile.preferred_facility_types || []).length > 0

  return (
    <div style={{ background: 'white', fontFamily: "'Segoe UI', Arial, sans-serif", maxWidth: 794 }}>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{ background: BLUE, padding: '36px 48px', display: 'flex', gap: 28, alignItems: 'flex-start' }}>

        {/* Photo */}
        <div style={{ flexShrink: 0 }}>
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt="Profilbild"
              style={{ width: 96, height: 96, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
            />
          ) : (
            <div style={{
              width: 96, height: 96, borderRadius: 12,
              background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 36, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>?</span>
            </div>
          )}
        </div>

        {/* Identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
            Lebenslauf · Profil-Referenz: {refNr}
          </p>

          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
            Pflegefachkraft{profile.gender ? ` (${profile.gender})` : ''}
          </h1>

          {/* Blurred name placeholder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500,
              filter: 'blur(5px)', userSelect: 'none', letterSpacing: 1,
            }}>
              Vorname Nachname
            </span>
            <span style={{
              fontSize: 9, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 6px',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              anonymisiert
            </span>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
            {[profile.age ? `${profile.age} Jahre` : null, profile.nationality].filter(Boolean).join(' · ')}
          </p>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recLabel && (
              <span style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 6, fontWeight: 600,
                background: isRecognized ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
                color: isRecognized ? '#86efac' : '#fde68a',
                border: `1px solid ${isRecognized ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
              }}>
                {isRecognized ? '✓ ' : '⏳ '}{recLabel}
              </span>
            )}
            {profile.fkvi_competency_proof && (
              <span style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 6, fontWeight: 500,
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
                FKVI Kompetenznachweis: {profile.fkvi_competency_proof}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '40px 48px' }}>

        {/* 1. Persönliche Daten */}
        {hasPersonal && (
          <Section title="Persönliche Daten">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
              {profile.age && <Row label="Alter" value={`${profile.age} Jahre`} />}
              {profile.nationality && <Row label="Staatsangehörigkeit" value={profile.nationality} />}
              {profile.marital_status && <Row label="Familienstand" value={profile.marital_status} />}
              {profile.children_count != null && (
                <Row label="Kinder" value={profile.children_count === 0 ? 'Keine' : String(profile.children_count)} />
              )}
              {profile.has_drivers_license != null && (
                <Row label="Führerschein" value={profile.has_drivers_license ? 'Vorhanden (Klasse B)' : 'Nicht vorhanden'} />
              )}
              {profile.work_time_preference && <Row label="Arbeitszeitmodell" value={profile.work_time_preference} />}
            </div>
          </Section>
        )}

        {/* 2. Anerkennungsstatus */}
        {(profile.german_recognition || profile.fkvi_competency_proof) && (
          <Section title="Anerkennungsstatus">
            {profile.german_recognition && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                borderRadius: 8, background: isRecognized ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${isRecognized ? '#bbf7d0' : '#fde68a'}`,
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 16 }}>{isRecognized ? '✓' : '⏳'}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: isRecognized ? '#15803d' : '#92400e', marginBottom: 1 }}>
                    Berufsanerkennung in Deutschland: {recLabel}
                  </p>
                  <p style={{ fontSize: 11, color: isRecognized ? '#166534' : '#78350f' }}>
                    {isRecognized
                      ? 'Die Qualifikation ist in Deutschland vollständig anerkannt.'
                      : 'Das Anerkennungsverfahren ist in Bearbeitung.'}
                  </p>
                </div>
              </div>
            )}
            {profile.fkvi_competency_proof && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                borderRadius: 8, background: BLUE_LIGHT, border: `1px solid ${BLUE}22`,
              }}>
                <span style={{ fontSize: 14, color: BLUE }}>★</span>
                <p style={{ fontSize: 12, fontWeight: 500, color: BLUE }}>
                  FKVI Pflegekompetenznachweis: <strong>{profile.fkvi_competency_proof}</strong>
                </p>
              </div>
            )}
          </Section>
        )}

        {/* 3. Berufserfahrung */}
        {hasExperience && (
          <Section title="Berufserfahrung">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginBottom: 12 }}>
              {profile.total_experience_years && (
                <Row label="Gesamterfahrung" value={`${profile.total_experience_years} Jahre`} />
              )}
              {profile.germany_experience_years && (
                <Row label="Davon in Deutschland" value={`${profile.germany_experience_years} Jahre`} />
              )}
            </div>
            {(profile.experience_areas || []).length > 0 && (
              <>
                <SubLabel text="Erfahrungsbereiche" />
                <Tags items={profile.experience_areas} />
              </>
            )}
          </Section>
        )}

        {/* 4. Ausbildung */}
        {(profile.nursing_education || profile.education_duration || profile.graduation_year || profile.education_notes) && (
          <Section title="Ausbildung & Qualifikation">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginBottom: 8 }}>
              {profile.nursing_education && <Row label="Berufsbezeichnung" value={profile.nursing_education} />}
              {profile.education_duration && <Row label="Ausbildungsdauer" value={profile.education_duration} />}
              {profile.graduation_year && <Row label="Abschlussjahr" value={String(profile.graduation_year)} />}
            </div>
            {profile.education_notes && (
              <div style={{
                background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
                padding: '10px 14px', fontSize: 12, color: '#374151', lineHeight: 1.6, marginTop: 8,
              }}>
                {profile.education_notes}
              </div>
            )}
          </Section>
        )}

        {/* 5. Spezialisierungen & Qualifikationen */}
        {hasQuals && (
          <Section title="Spezialisierungen & Zusatzqualifikationen">
            {(profile.specializations || []).length > 0 && (
              <>
                <SubLabel text="Fachliche Spezialisierungen" />
                <Tags
                  items={profile.specializations}
                  bg={BLUE_LIGHT}
                  color={BLUE}
                  border={`${BLUE}30`}
                />
              </>
            )}
            {(profile.additional_qualifications || []).length > 0 && (
              <>
                <SubLabel text="Zusatzqualifikationen" />
                <Tags
                  items={profile.additional_qualifications}
                  bg="#f0fdfa"
                  color="#0f766e"
                  border="#99f6e4"
                />
              </>
            )}
          </Section>
        )}

        {/* 6. Sprachkenntnisse */}
        {hasLanguages && (
          <Section title="Sprachkenntnisse">
            <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              {(profile.language_skills || []).map((lang, i) => {
                const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
                const levelIdx = levels.indexOf(lang.level)
                const isMother = !lang.level || lang.level === 'Muttersprache'
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid #f3f4f6',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', width: 160 }}>
                      {lang.language}
                    </span>
                    {isMother ? (
                      <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>Muttersprache</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {levels.map((lvl, li) => (
                            <div key={lvl} style={{
                              width: 20, height: 6, borderRadius: 3,
                              background: li <= levelIdx ? BLUE : '#e5e7eb',
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, width: 24, textAlign: 'right' }}>
                          {lang.level}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* 7. Einsatzpräferenzen */}
        {hasPref && (
          <Section title="Einsatzpräferenzen">
            {profile.nationwide ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ color: BLUE, fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: BLUE }}>Bundesweit einsetzbar</span>
              </div>
            ) : (profile.state_preferences || []).length > 0 ? (
              <>
                <SubLabel text="Bevorzugte Bundesländer" />
                <Tags items={profile.state_preferences} />
              </>
            ) : null}
            {(profile.preferred_facility_types || []).length > 0 && (
              <>
                <SubLabel text="Bevorzugte Einrichtungsarten" />
                <Tags items={profile.preferred_facility_types} />
              </>
            )}
          </Section>
        )}

      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 40px' }}>
        <div style={{
          borderTop: '1px solid #e5e7eb', paddingTop: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: BLUE, fontSize: 13 }}>FKVI</span>
            <span style={{ color: '#d1d5db', fontSize: 11 }}>·</span>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>Fachkraft Vermittlung International</span>
            <span style={{ color: '#d1d5db', fontSize: 11 }}>·</span>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>Ref: {refNr}</span>
          </div>
          <span style={{ color: '#9ca3af', fontSize: 11 }}>Erstellt am {today}</span>
        </div>
        <p style={{ color: '#d1d5db', fontSize: 10, marginTop: 4 }}>
          Dieses Dokument ist vertraulich und ausschließlich für autorisierte FKVI-Partner bestimmt.
          {expiresAt && ` · Link gültig bis: ${new Date(expiresAt).toLocaleDateString('de-DE')}`}
        </p>
      </div>

    </div>
  )
}
