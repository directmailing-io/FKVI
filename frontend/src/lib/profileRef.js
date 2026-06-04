// ─── FKVI Pseudonym-Referenznummer ────────────────────────────────────────────
//
// Format: FK-[NNNXNN]-[LAND]-[BEREICH]
// Beispiel: FK-727A08-PH-PF
//
// NNNXNN  = deterministischer Hash der Profil-UUID (3 Ziffern + 1 Buchstabe + 2 Ziffern)
// LAND    = ISO-3166-1 Alpha-2-Kürzel basierend auf der Staatsangehörigkeit
// BEREICH = Berufsfeld-Kürzel basierend auf der Berufsgruppe
// ──────────────────────────────────────────────────────────────────────────────

// FNV-1a 32-bit hash — deterministisch, kollisionsarm, kein externes Paket nötig
function fnv32a(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0 // unsigned 32-bit
}

// Alle 26 Großbuchstaben als Lookup-Array
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Wandelt eine Profil-UUID in eine stabile NNNXNN-Kennung um.
 * Gleiche UUID → immer gleicher Code. Keine DB-Abhängigkeit.
 *
 * Kombinationsraum: 1.000 × 26 × 100 = 2.600.000
 * → Kollisionswahrscheinlichkeit bei 10.000 Profilen: < 2 %
 */
function buildNNNXNN(profileId) {
  if (!profileId) return '000A00'
  const hash = fnv32a(profileId.replace(/-/g, ''))
  const nnn  = String(hash % 1000).padStart(3, '0')           // 000–999
  const x    = ALPHA[(hash >>> 10) % 26]                      // A–Z
  const nn   = String((hash >>> 20) % 100).padStart(2, '0')   // 00–99
  return `${nnn}${x}${nn}`
}

// ─── Staatsangehörigkeit (Deutsch) → ISO-3166-1 Alpha-2 ───────────────────────
// Vollständige Abdeckung aller Länder in COUNTRIES_LIST
const NATIONALITY_TO_ISO2 = {
  'Afghanistan':               'AF',
  'Ägypten':                   'EG',
  'Albanien':                  'AL',
  'Algerien':                  'DZ',
  'Angola':                    'AO',
  'Äthiopien':                 'ET',
  'Bangladesh':                'BD',
  'Bosnien und Herzegowina':   'BA',
  'Brasilien':                 'BR',
  'Bulgarien':                 'BG',
  'China':                     'CN',
  'Deutschland':               'DE',
  'Ghana':                     'GH',
  'Griechenland':              'GR',
  'Indien':                    'IN',
  'Indonesien':                'ID',
  'Irak':                      'IQ',
  'Iran':                      'IR',
  'Italien':                   'IT',
  'Jordanien':                 'JO',
  'Kambodscha':                'KH',
  'Kamerun':                   'CM',
  'Kasachstan':                'KZ',
  'Kenia':                     'KE',
  'Kolumbien':                 'CO',
  'Kosovo':                    'XK',
  'Kroatien':                  'HR',
  'Kuba':                      'CU',
  'Libanon':                   'LB',
  'Marokko':                   'MA',
  'Mexiko':                    'MX',
  'Moldau':                    'MD',
  'Myanmar':                   'MM',
  'Nepal':                     'NP',
  'Nigeria':                   'NG',
  'Nordmazedonien':            'MK',
  'Pakistan':                  'PK',
  'Peru':                      'PE',
  'Philippinen':               'PH',
  'Polen':                     'PL',
  'Portugal':                  'PT',
  'Rumänien':                  'RO',
  'Russland':                  'RU',
  'Serbien':                   'RS',
  'Slowakei':                  'SK',
  'Slowenien':                 'SI',
  'Spanien':                   'ES',
  'Sri Lanka':                 'LK',
  'Syrien':                    'SY',
  'Thailand':                  'TH',
  'Tschechien':                'CZ',
  'Tunesien':                  'TN',
  'Türkei':                    'TR',
  'Ukraine':                   'UA',
  'Ungarn':                    'HU',
  'Usbekistan':                'UZ',
  'Vietnam':                   'VN',
  'Weißrussland':              'BY',
  'Sonstiges':                 'XX',
}

// ─── Berufsgruppe → Berufsfeld-Kürzel ─────────────────────────────────────────
const BERUFSGRUPPE_TO_KUERZEL = {
  pflegefachkraft: 'PF',
  pflegeassistenz: 'PF',
  azubi_pflege:    'AZ',
  physiotherapie:  'PT',
  ota:             'OTA',
  ata:             'ATA',
  // Zukünftige Erweiterung: Koch/Küche würde hier als 'koch': 'KO' ergänzt
}

/**
 * Gibt die vollständige Ref-Kennung zurück.
 *
 * Fallback-Verhalten bei fehlenden Feldern:
 *   - Keine ID       → NNNXNN = "000A00"
 *   - Kein Land      → LAND   = "XX"
 *   - Kein Beruf     → BEREICH = "PF"
 *
 * @param {object} profile  Profil-Objekt mit id, nationality, berufsgruppe
 * @returns {string}        z. B. "FK-727A08-PH-PF"
 */
export function buildProfileRef(profile) {
  if (!profile) return 'FK-000A00-XX-PF'

  const nnnxnn  = buildNNNXNN(profile.id)
  const land    = NATIONALITY_TO_ISO2[profile.nationality] ?? 'XX'
  const bereich = BERUFSGRUPPE_TO_KUERZEL[profile.berufsgruppe] ?? 'PF'

  return `FK-${nnnxnn}-${land}-${bereich}`
}
