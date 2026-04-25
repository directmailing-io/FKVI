import { getProfileSpecializations, getSpecializationsLabel } from '@/lib/profileOptions'

// ─── Design tokens ────────────────────────────────────────────────────────────
const TEAL      = '#0d9488'
const DARK      = '#1a1a2e'
const LABEL_COL = '#9ca3af'  // gray for labels / dates
const TEXT      = '#1f2937'
const TEXT_MID  = '#4b5563'
const RULE      = '#e5e7eb'

// ─── Date helpers ─────────────────────────────────────────────────────────────
function fmtMonthYear(str) {
  if (!str) return ''
  const [y, m] = str.split('-')
  return `${m}/${y}`
}

function fmtBirthDate(str) {
  if (!str) return null
  try { return new Date(str).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return str }
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 3, height: 18, background: TEAL, borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 14, fontWeight: 700, color: DARK, letterSpacing: '-0.2px' }}>
          {title}
        </h2>
      </div>
      <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 10 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Two-column row (label | value) ──────────────────────────────────────────
const DATE_W = 130

function LabelRow({ label, children, blur }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 6, lineHeight: 1.5 }}>
      <span style={{ width: DATE_W, flexShrink: 0, fontSize: 12, color: LABEL_COL }}>{label}</span>
      <span style={{
        fontSize: 12, color: TEXT, flex: 1,
        ...(blur ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
      }}>
        {children}
      </span>
    </div>
  )
}

// ─── Timeline entry (date | company/institution block) ───────────────────────
function Entry({ period, title, subtitle, description, detail, isLast }) {
  const lines = description ? description.split('\n').filter(l => l.trim()) : []
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: isLast ? 0 : 14 }}>
      {/* Date column */}
      <span style={{
        width: DATE_W, flexShrink: 0,
        fontSize: 11, color: LABEL_COL, paddingTop: 1, lineHeight: 1.4,
      }}>
        {period}
      </span>
      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 1 }}>{title}</p>
        {subtitle && (
          <p style={{ fontSize: 12, color: TEXT_MID, marginBottom: lines.length ? 3 : 0 }}>{subtitle}</p>
        )}
        {detail && (
          <p style={{ fontSize: 11, color: LABEL_COL, fontStyle: 'italic', marginBottom: lines.length ? 3 : 0 }}>{detail}</p>
        )}
        {lines.map((line, i) => (
          <p key={i} style={{ fontSize: 11, color: TEXT_MID, paddingLeft: 10, marginBottom: 1 }}>
            · {line.replace(/^[•·\-]\s*/, '')}
          </p>
        ))}
      </div>
    </div>
  )
}

// ─── Main CV Document ─────────────────────────────────────────────────────────
export default function CvDocument({ profile, expiresAt, showRealName = false, documents = [] }) {
  const refNr   = `FK-${profile.id.slice(0, 8).toUpperCase()}`
  const today   = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  const jobTitle = profile.nursing_education || 'Pflegefachkraft'

  const workEntries = (profile.work_experience  || []).slice().reverse()
  const eduEntries  = (profile.education_history || [])
  const specs       = getProfileSpecializations(profile)
  const skills      = profile.personal_skills || []
  const addQuals    = profile.additional_qualifications || []
  const langs       = profile.language_skills || []
  const langLevels  = ['A1','A2','B1','B2','C1','C2']

  // Education period helper
  const mainEduPeriod = (() => {
    const gradYear = parseInt(profile.graduation_year) || null
    const durYears = parseInt(profile.education_duration) || null
    if (!gradYear) return profile.education_duration ? `Dauer: ${profile.education_duration}` : null
    return durYears ? `${gradYear - durYears} – ${gradYear}` : String(gradYear)
  })()

  // Address
  const addressLines = [
    profile.street,
    [profile.postal_code, profile.city].filter(Boolean).join(' '),
  ].filter(Boolean)

  const hasWork   = workEntries.length > 0
  const hasEdu    = profile.nursing_education || profile.school_education || eduEntries.length > 0
  const hasSkills = langs.length > 0 || skills.length > 0 || addQuals.length > 0 || specs.length > 0
  const hasDocs   = documents.length > 0

  return (
    <div style={{
      background: 'white',
      fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      boxSizing: 'border-box',
      padding: '36px 44px 40px',
      color: TEXT,
    }}>

      {/* ── HEADER: Title + Photo ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h1 style={{
            fontSize: 34, fontWeight: 800, color: DARK,
            letterSpacing: '-0.5px', marginBottom: 2,
          }}>
            Lebenslauf
          </h1>
          {!showRealName && (
            <p style={{ fontSize: 10, color: LABEL_COL, letterSpacing: '0.08em' }}>
              Ref: {refNr} · anonymisiert
            </p>
          )}
        </div>

        {/* Photo */}
        {profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt="Foto"
            style={{
              width: 110, height: 140,
              objectFit: 'cover', objectPosition: 'top',
              borderRadius: 4,
              border: `1px solid ${RULE}`,
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: 110, height: 140, borderRadius: 4,
            background: '#f3f4f6', border: `1px solid ${RULE}`,
            flexShrink: 0,
          }} />
        )}
      </div>


      {/* ── PERSÖNLICHE DATEN ────────────────────────────────────────────── */}
      <Section title="Persönliche Daten">
        {/* Name */}
        <LabelRow label="Name" blur={!showRealName}>
          {showRealName
            ? (fullName || jobTitle)
            : <span>Vorname Nachname</span>
          }
        </LabelRow>

        {/* Berufsbezeichnung */}
        <LabelRow label="Berufsbezeichnung">
          {jobTitle}{profile.gender ? ` (${profile.gender})` : ''}
        </LabelRow>

        {/* Geburtsdatum */}
        {(profile.birth_date || profile.age) && (
          <LabelRow label="Geburtsdatum">
            {profile.birth_date
              ? `${fmtBirthDate(profile.birth_date)}${profile.nationality ? '' : ''}`
              : `${profile.age} Jahre`}
          </LabelRow>
        )}

        {/* Nationalität */}
        {profile.nationality && (
          <LabelRow label="Staatsangehörigkeit">{profile.nationality}</LabelRow>
        )}

        {/* Familienstand */}
        {profile.marital_status && (
          <LabelRow label="Familienstand">
            {profile.marital_status}
            {profile.children_count > 0
              ? `, ${profile.children_count} ${profile.children_count === 1 ? 'Kind' : 'Kinder'}`
              : profile.children_count === 0 ? ', keine Kinder' : ''}
          </LabelRow>
        )}

        {/* Adresse */}
        <LabelRow label="Adresse" blur={!showRealName}>
          {showRealName
            ? (addressLines.length > 0 ? addressLines.join(', ') : '—')
            : 'Musterstraße 12, 10115 Berlin'
          }
        </LabelRow>

        {/* Telefon */}
        <LabelRow label="Telefon" blur={!showRealName}>
          {showRealName
            ? (profile.phone || '—')
            : '+49 170 123 4567'
          }
        </LabelRow>

        {/* E-Mail */}
        <LabelRow label="E-Mail" blur={!showRealName}>
          {showRealName
            ? (profile.contact_email || '—')
            : 'vorname.nachname@example.com'
          }
        </LabelRow>

        {/* Führerschein */}
        {profile.has_drivers_license && (
          <LabelRow label="Führerschein">Klasse B</LabelRow>
        )}
      </Section>

      {/* ── BERUFSERFAHRUNG ──────────────────────────────────────────────── */}
      {hasWork && (
        <Section title="Berufserfahrung">
          {workEntries.map((e, i) => {
            const from = fmtMonthYear(e.start_date)
            const to   = e.is_current ? 'heute' : fmtMonthYear(e.end_date)
            const period = from ? (e.is_current ? `seit ${from}` : `${from} – ${to}`) : (e.is_current ? 'aktuell' : '')
            const subtitle = [e.company, e.department].filter(Boolean).join(' · ')
            const detail   = e.employment_type && e.employment_type !== 'Vollzeit' ? e.employment_type : null
            return (
              <Entry
                key={e.id || i}
                period={period}
                title={e.position || 'Position'}
                subtitle={subtitle || undefined}
                description={e.description || undefined}
                detail={detail}
                isLast={i === workEntries.length - 1}
              />
            )
          })}
        </Section>
      )}

      {/* ── AUSBILDUNG ───────────────────────────────────────────────────── */}
      {hasEdu && (
        <Section title="Ausbildung">
          {/* Main nursing education */}
          {profile.nursing_education && (
            <Entry
              period={mainEduPeriod}
              title={profile.nursing_education}
              subtitle={profile.school_education || undefined}
              description={profile.education_notes || undefined}
              isLast={!profile.school_education && eduEntries.length === 0}
            />
          )}
          {/* School education — only if no nursing_education */}
          {!profile.nursing_education && profile.school_education && (
            <Entry
              period={profile.graduation_year ? String(profile.graduation_year) : null}
              title={profile.school_education}
              isLast={eduEntries.length === 0}
            />
          )}
          {/* Additional education history entries */}
          {eduEntries.map((e, i) => {
            const from = fmtMonthYear(e.start_date)
            const to   = fmtMonthYear(e.end_date)
            const period = from ? `${from} – ${to || ''}` : null
            const title  = e.degree || e.institution || 'Abschluss'
            const subtitle = [
              e.institution !== title ? e.institution : null,
              e.field,
            ].filter(Boolean).join(' · ')
            return (
              <Entry
                key={e.id || i}
                period={period}
                title={title}
                subtitle={subtitle || undefined}
                description={e.notes || undefined}
                isLast={i === eduEntries.length - 1}
              />
            )
          })}
        </Section>
      )}

      {/* ── KENNTNISSE & SPRACHEN ────────────────────────────────────────── */}
      {hasSkills && (
        <Section title="Kenntnisse & Sprachen">
          {/* Languages */}
          {langs.length > 0 && (
            <LabelRow label="Sprachen">
              <span>
                {langs.map((l, i) => {
                  const isMother = !l.level || l.level === 'Muttersprache'
                  const levelIdx = langLevels.indexOf(l.level)
                  const labelStr = isMother ? 'Muttersprache' : l.level
                  return (
                    <span key={i}>
                      {i > 0 && ', '}
                      {l.language}
                      {labelStr ? ` (${labelStr})` : ''}
                    </span>
                  )
                })}
              </span>
            </LabelRow>
          )}

          {/* Personal skills */}
          {skills.length > 0 && (
            <LabelRow label="Persönliche Fähigkeiten">
              {skills.join(', ')}
            </LabelRow>
          )}

          {/* Specializations */}
          {specs.length > 0 && (
            <LabelRow label={getSpecializationsLabel(profile.berufsgruppe)}>
              {specs.join(', ')}
            </LabelRow>
          )}

          {/* Additional qualifications */}
          {addQuals.length > 0 && (
            <LabelRow label="Zusatzqualifikationen">
              {addQuals.join(', ')}
            </LabelRow>
          )}
        </Section>
      )}

      {/* ── DOKUMENTE ────────────────────────────────────────────────────── */}
      {hasDocs && (
        <Section title="Dokumente & Nachweise">
          {documents.map((doc, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < documents.length - 1 ? 6 : 0 }}>
              <span style={{ width: DATE_W, flexShrink: 0, fontSize: 11, color: LABEL_COL }}>
                {doc.doc_type || 'Dokument'}
              </span>
              <span style={{ fontSize: 12, color: TEXT, flex: 1 }}>
                {doc.title}
                {doc.link && (
                  <a href={doc.link} target="_blank" rel="noopener noreferrer"
                    style={{ marginLeft: 10, fontSize: 11, color: TEAL, textDecoration: 'none' }}>
                    Öffnen →
                  </a>
                )}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${RULE}`,
        marginTop: 28, paddingTop: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: LABEL_COL }}>
          FKVI · Fachkraft Vermittlung International GmbH &amp; Co. KG
          {!showRealName && ` · Ref: ${refNr}`}
        </span>
        <span style={{ fontSize: 10, color: LABEL_COL }}>
          {today}
          {expiresAt && ` · gültig bis ${new Date(expiresAt).toLocaleDateString('de-DE')}`}
        </span>
      </div>

    </div>
  )
}
