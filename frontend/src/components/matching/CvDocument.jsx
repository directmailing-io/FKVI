import { RECOGNITION_LABELS } from '@/lib/utils'

const ACCENT = '#1e3a5f'
const GRAY_DARK = '#111827'
const GRAY_MID = '#6b7280'
const GRAY_LIGHT = '#f3f4f6'
const BORDER = '#e5e7eb'

function Section({ title, children }) {
  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: 28 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1.5px solid ${BORDER}`, paddingBottom: 6, marginBottom: 12,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: GRAY_MID,
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
    <div style={{ display: 'flex', gap: 16, paddingBottom: 6, marginBottom: 6, borderBottom: `1px solid ${GRAY_LIGHT}` }}>
      <span style={{ fontSize: 12, color: GRAY_MID, width: 180, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: GRAY_DARK, fontWeight: 500 }}>{String(value)}</span>
    </div>
  )
}

function Tags({ items = [], bg = GRAY_LIGHT, color = '#374151', border = BORDER }) {
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
export default function CvDocument({ profile, expiresAt, showRealName = false, documents = [] }) {
  const refNr = `FK-${profile.id.slice(0, 8).toUpperCase()}`
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const recLabel = RECOGNITION_LABELS[profile.german_recognition]
  const isRecognized = profile.german_recognition === 'anerkannt'
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()

  const hasExperience = profile.total_experience_years || (profile.experience_areas || []).length > 0
  const hasQuals = (profile.specializations || []).length > 0 || (profile.additional_qualifications || []).length > 0
  const hasLanguages = (profile.language_skills || []).length > 0
  const hasPersonal = profile.marital_status || profile.children_count != null || profile.has_drivers_license != null || profile.work_time_preference
  const hasPref = profile.nationwide || (profile.state_preferences || []).length > 0 || (profile.preferred_facility_types || []).length > 0
  const hasDocs = documents.length > 0

  return (
    <div style={{ background: 'white', fontFamily: "'Segoe UI', Arial, sans-serif", width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      {/* Top accent line */}
      <div style={{ height: 5, background: ACCENT }} />

      <div style={{ padding: '36px 48px 28px', display: 'flex', gap: 28, alignItems: 'flex-start', borderBottom: `1px solid ${BORDER}` }}>

        {/* Photo */}
        <div style={{ flexShrink: 0 }}>
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt="Profilbild"
              style={{ width: 96, height: 96, borderRadius: 10, objectFit: 'cover', border: `1px solid ${BORDER}` }}
            />
          ) : (
            <div style={{
              width: 96, height: 96, borderRadius: 10,
              background: GRAY_LIGHT, border: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 32, color: '#d1d5db', lineHeight: 1 }}>👤</span>
            </div>
          )}
        </div>

        {/* Identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9, color: GRAY_MID, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            Lebenslauf{!showRealName && ` · Ref: ${refNr}`}
          </p>

          {showRealName ? (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: GRAY_DARK, marginBottom: 3, letterSpacing: '-0.3px' }}>
                {fullName || 'Fachkraft'}
              </h1>
              <p style={{ fontSize: 14, color: ACCENT, fontWeight: 600, marginBottom: 10 }}>
                {profile.nursing_education || 'Pflegefachkraft'}{profile.gender ? ` · ${profile.gender}` : ''}
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY_DARK, marginBottom: 3 }}>
                Pflegefachkraft{profile.gender ? ` (${profile.gender})` : ''}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  color: GRAY_MID, fontSize: 14, fontWeight: 500,
                  filter: 'blur(5px)', userSelect: 'none', letterSpacing: 1,
                }}>
                  Vorname Nachname
                </span>
                <span style={{
                  fontSize: 9, color: GRAY_MID, background: GRAY_LIGHT,
                  border: `1px solid ${BORDER}`, borderRadius: 4, padding: '1px 6px',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  anonymisiert
                </span>
              </div>
            </>
          )}

          <p style={{ fontSize: 13, color: GRAY_MID, marginBottom: 14 }}>
            {[profile.age ? `${profile.age} Jahre` : null, profile.nationality].filter(Boolean).join(' · ')}
          </p>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recLabel && (
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
                background: isRecognized ? '#f0fdf4' : '#fffbeb',
                color: isRecognized ? '#15803d' : '#92400e',
                border: `1px solid ${isRecognized ? '#bbf7d0' : '#fde68a'}`,
              }}>
                {isRecognized ? '✓ ' : '⏳ '}{recLabel}
              </span>
            )}
            {profile.fkvi_competency_proof && (
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 500,
                background: '#eff6ff', color: ACCENT,
                border: `1px solid #bfdbfe`,
              }}>
                ★ FKVI Kompetenznachweis: {profile.fkvi_competency_proof}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '36px 48px' }}>

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
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
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
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe',
              }}>
                <span style={{ fontSize: 14, color: ACCENT }}>★</span>
                <p style={{ fontSize: 12, fontWeight: 500, color: ACCENT }}>
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
                background: GRAY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8,
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
                  bg="#eff6ff"
                  color={ACCENT}
                  border="#bfdbfe"
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
                    padding: '8px 0', borderBottom: `1px solid ${GRAY_LIGHT}`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: GRAY_DARK, width: 160 }}>
                      {lang.language}
                    </span>
                    {isMother ? (
                      <span style={{ fontSize: 11, color: GRAY_MID, fontStyle: 'italic' }}>Muttersprache</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {levels.map((lvl, li) => (
                            <div key={lvl} style={{
                              width: 20, height: 5, borderRadius: 3,
                              background: li <= levelIdx ? ACCENT : BORDER,
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, width: 24, textAlign: 'right' }}>
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
                <span style={{ color: ACCENT, fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: ACCENT }}>Bundesweit einsetzbar</span>
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

        {/* 8. Dokumente */}
        {hasDocs && (
          <Section title="Dokumente & Nachweise">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map((doc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: GRAY_LIGHT, border: `1px solid ${BORDER}`,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: GRAY_DARK, marginBottom: 1 }}>
                      {doc.title || 'Dokument'}
                    </p>
                    {(doc.doc_type || doc.description) && (
                      <p style={{ fontSize: 11, color: GRAY_MID }}>
                        {[doc.doc_type, doc.description].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {doc.link && (
                    <a
                      href={doc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11, color: ACCENT, fontWeight: 600,
                        textDecoration: 'none', flexShrink: 0,
                        padding: '4px 10px', borderRadius: 6,
                        border: `1px solid #bfdbfe`, background: '#eff6ff',
                      }}
                    >
                      Öffnen →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 36px' }}>
        <div style={{
          borderTop: `1px solid ${BORDER}`, paddingTop: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: ACCENT, fontSize: 13 }}>FKVI</span>
            <span style={{ color: '#d1d5db', fontSize: 11 }}>·</span>
            <span style={{ color: GRAY_MID, fontSize: 11 }}>Fachkraft Vermittlung International GmbH &amp; Co. KG</span>
            {!showRealName && (
              <>
                <span style={{ color: '#d1d5db', fontSize: 11 }}>·</span>
                <span style={{ color: GRAY_MID, fontSize: 11 }}>Ref: {refNr}</span>
              </>
            )}
          </div>
          <span style={{ color: GRAY_MID, fontSize: 11 }}>Erstellt am {today}</span>
        </div>
        <p style={{ color: '#d1d5db', fontSize: 10, marginTop: 4 }}>
          Dieses Dokument ist vertraulich und ausschließlich für autorisierte FKVI-Partner bestimmt.
          {expiresAt && ` · Link gültig bis: ${new Date(expiresAt).toLocaleDateString('de-DE')}`}
        </p>
      </div>

    </div>
  )
}
