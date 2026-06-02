// ─── Berufsgruppen ────────────────────────────────────────────────────────────
export const BERUFSGRUPPEN = [
  { value: 'pflegefachkraft', label: 'Pflegefachkraft (examiniert)' },
  { value: 'pflegeassistenz', label: 'Pflegeassistenz / Pflegehelfer' },
  { value: 'ota', label: 'OTA – Operationstechnische Assistenz' },
  { value: 'ata', label: 'ATA – Anästhesietechnische Assistenz' },
  { value: 'physiotherapie', label: 'Physiotherapeut/in' },
  { value: 'azubi_pflege', label: 'Auszubildende/r Pflege' },
]

// ─── Spezialisierungen pro Berufsgruppe ───────────────────────────────────────
export const SPECIALIZATIONS_BY_BERUFSGRUPPE = {
  pflegefachkraft: [
    // Langzeit
    'Altenpflege', 'Geriatrie', 'Demenzpflege', 'Palliativpflege', 'Hospizpflege',
    // Akut
    'Krankenpflege (allgemein)', 'Intensivpflege', 'IMC / Intermediate Care',
    'Stroke Unit', 'Notfallpflege', 'Innere Medizin', 'Chirurgie (Station)', 'Kardiologie',
    // Speziell
    'Kinderkrankenpflege', 'Neonatologie', 'Geburtshilfe / Wochenbett',
    'Psychiatrie', 'Gerontopsychiatrie', 'Neurologie', 'Onkologie', 'Dialyse', 'Wundmanagement',
    // Ambulant / Reha
    'Ambulante Pflege', 'Rehabilitationspflege', 'Beatmungspflege (außerklinisch)',
  ],
  pflegeassistenz: [
    'Altenpflegehilfe', 'Krankenpflegehilfe', 'Grundpflege',
    'Betreuungsassistenz (§ 43b SGB XI)', 'Demenzbetreuung', 'Alltagsbegleitung',
    'Hauswirtschaftliche Versorgung', 'Mobilisation / Kinästhetik',
    'Ambulante Pflegehilfe', 'Tagespflege / Begleitung',
  ],
  ota: [
    // Fachdisziplinen
    'Allgemein- und Viszeralchirurgie', 'Unfallchirurgie / Traumatologie', 'Orthopädie',
    'Gefäßchirurgie', 'Herzchirurgie', 'Thoraxchirurgie', 'Neurochirurgie',
    'Urologie', 'Gynäkologie / Geburtshilfe (Sectio)', 'HNO', 'MKG-Chirurgie',
    'Augenchirurgie', 'Kinderchirurgie', 'Plastische / Ästhetische Chirurgie',
    // Funktionsbereiche
    'Endoskopie', 'Herzkatheterlabor (HKL)', 'Zentrale Sterilgutversorgung (AEMP)',
    'Ambulantes OP-Zentrum', 'Notfall-/Schockraum-OP',
    // Technik / Rolle
    'Minimalinvasive Chirurgie / Laparoskopie', 'Robotik-Assistenz (z. B. DaVinci)',
    'Instrumentiertätigkeit', 'Springertätigkeit',
  ],
  ata: [
    // Verfahren
    'Allgemeinanästhesie', 'Regionalanästhesie',
    // Zielgruppen
    'Kinderanästhesie', 'Geburtshilfliche Anästhesie',
    // Fachbereiche
    'Herzchirurgische Anästhesie', 'Thorax- / Gefäßanästhesie', 'Neuroanästhesie',
    // Settings
    'Ambulante Anästhesie', 'Aufwachraum / PACU', 'Notfallanästhesie / Schockraum',
    // Spezial
    'Schmerztherapie / Schmerzambulanz', 'Intensivtransport / ITW',
  ],
  physiotherapie: [
    // Verfahren
    'Manuelle Therapie (MT)', 'Manuelle Lymphdrainage (MLD)', 'KG-Gerät (KGG)',
    'KG-ZNS Bobath (Erwachsene)', 'KG-ZNS Bobath (Kinder)', 'KG-ZNS Vojta', 'PNF',
    'CMD / Kiefergelenkstherapie', 'Atemtherapie',
    // Fachbereiche
    'Orthopädie / Traumatologie', 'Neurologie', 'Geriatrie', 'Pädiatrie',
    'Innere / Kardiologie', 'Onkologie', 'Sportphysiotherapie', 'Rheumatologie',
    // Settings
    'Praxis (ambulant)', 'Krankenhaus / Akut', 'Rehabilitationsklinik', 'Hausbesuche',
  ],
  azubi_pflege: [
    'Interesse: Altenpflege / Langzeit',
    'Interesse: Krankenhaus / Akut',
    'Interesse: Ambulante Pflege',
    'Interesse: Pädiatrie / Kinder',
    'Interesse: Psychiatrie',
    'Interesse: Intensiv- / Notfall',
    'Interesse: OP / Funktionsdienst',
    'Noch unentschlossen',
  ],
}

// ─── Einrichtungstypen pro Berufsgruppe ──────────────────────────────────────
export const FLEXIBEL_OPTION = 'Flexibel / Alle Einrichtungstypen'

export const EINRICHTUNGSTYPEN_BY_BERUFSGRUPPE = {
  pflegefachkraft: [
    FLEXIBEL_OPTION,
    // Langzeit
    'Pflegeheim (vollstationär)', 'Kurzzeitpflege', 'Tagespflege', 'Nachtpflege',
    'Betreutes Wohnen', 'Hospiz', 'Behinderteneinrichtung',
    // Ambulant
    'Ambulanter Pflegedienst', 'Sozialstation', 'Ambulante Intensivpflege / WG',
    // Akut
    'Krankenhaus (allgemein)', 'Universitätsklinikum', 'Fachklinik',
    'Intensivstation (ITS)', 'IMC / Intermediate Care', 'Notaufnahme / ZNA',
    'Stroke Unit', 'Psychiatrische Klinik',
    // Reha
    'Rehabilitationsklinik', 'Geriatrische Reha',
  ],
  pflegeassistenz: [
    FLEXIBEL_OPTION,
    'Pflegeheim (vollstationär)', 'Kurzzeitpflege', 'Tagespflege', 'Betreutes Wohnen',
    'Behinderteneinrichtung', 'Hospiz',
    'Ambulanter Pflegedienst', 'Sozialstation',
    'Krankenhaus (Station)',
    'Rehabilitationsklinik',
  ],
  ota: [
    FLEXIBEL_OPTION,
    'Krankenhaus / OP-Abteilung', 'Universitätsklinikum', 'Fachklinik (z. B. Herz-/Orthopädieklinik)',
    'Ambulantes OP-Zentrum (AOZ)', 'Tagesklinik / MVZ mit OP',
    'Endoskopie-Abteilung', 'Herzkatheterlabor (HKL)', 'Zentrale Sterilgutversorgung (AEMP)',
    'Augen-OP-Zentrum', 'MKG- / HNO-Praxis mit OP',
  ],
  ata: [
    FLEXIBEL_OPTION,
    'Krankenhaus / Anästhesieabteilung', 'Universitätsklinikum', 'Fachklinik',
    'Ambulantes OP-Zentrum (AOZ)', 'Tagesklinik / MVZ mit Anästhesie',
    'Anästhesiepraxis (niedergelassen)',
    'Aufwachraum / PACU', 'Schmerzambulanz / Schmerzklinik',
    'Intensivtransport / ITW', 'Reha-Klinik mit Anästhesie',
  ],
  physiotherapie: [
    FLEXIBEL_OPTION,
    'Physiotherapie-Praxis (ambulant)', 'Therapiezentrum / interdisziplinär', 'MVZ mit Physiotherapie',
    'Krankenhaus / Akutklinik', 'Universitätsklinikum',
    'Rehabilitationsklinik (stationär)', 'Ambulante Reha-Einrichtung',
    'Geriatrische Reha', 'Neurologische Reha',
    'Pflegeheim (Hausbesuche / angestellt)', 'Hausbesuche (mobil)',
    'Sport- / Leistungsdiagnostik', 'Kurklinik / Thermalbad',
  ],
  azubi_pflege: [
    FLEXIBEL_OPTION,
    'Pflegeheim (Ausbildungsträger)', 'Krankenhaus (Ausbildungsträger)', 'Universitätsklinikum',
    'Ambulanter Pflegedienst', 'Sozialstation',
    'Rehabilitationsklinik', 'Psychiatrische Klinik',
    'Behinderteneinrichtung', 'Kinderkrankenhaus / Pädiatrie',
  ],
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/** DB column name for specializations */
export const getSpecializationsField = (berufsgruppe) => {
  if (!berufsgruppe) return null
  if (berufsgruppe === 'azubi_pflege') return 'bereichswunsch_azubi'
  return `specializations_${berufsgruppe}`
}

/** DB column name for einrichtungstypen */
export const getEinrichtungstypenField = (berufsgruppe) => {
  if (!berufsgruppe) return null
  return `einrichtungstyp_${berufsgruppe}`
}

/** UI label for the specializations field */
export const getSpecializationsLabel = (berufsgruppe) =>
  berufsgruppe === 'azubi_pflege' ? 'Wunschbereich Ausbildung' : 'Spezialisierungen'

/** Get the active specializations array from a profile object */
export const getProfileSpecializations = (profile) => {
  const field = getSpecializationsField(profile?.berufsgruppe)
  return field ? (profile[field] || []) : []
}

/** Get the active einrichtungstypen array from a profile object */
export const getProfileEinrichtungstypen = (profile) => {
  const field = getEinrichtungstypenField(profile?.berufsgruppe)
  return field ? (profile[field] || []) : []
}

/** All DB column names for new fields (for SELECT queries) */
export const ALL_SPECIALIZATION_FIELDS = [
  'berufsgruppe',
  'specializations_pflegefachkraft',
  'specializations_pflegeassistenz',
  'specializations_ota',
  'specializations_ata',
  'specializations_physiotherapie',
  'bereichswunsch_azubi',
  'einrichtungstyp_pflegefachkraft',
  'einrichtungstyp_pflegeassistenz',
  'einrichtungstyp_ota',
  'einrichtungstyp_ata',
  'einrichtungstyp_physiotherapie',
  'einrichtungstyp_azubi_pflege',
]
