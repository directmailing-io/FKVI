import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function formatDateTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen'
]

export const WORK_TIME_OPTIONS = [
  'Vollzeit',
  'Teilzeit',
  'Flexibel',
  'Frühdienst bevorzugt',
  'Spätdienst bevorzugt',
  'Nachtdienst möglich',
]

export const EXPERIENCE_AREAS = [
  'Grundpflege',
  'Behandlungspflege',
  'Wundversorgung',
  'Medikamentengabe',
  'Infusionstherapie',
  'Beatmungspflege',
  'Stomapflege',
  'Kinästhetik',
  'Palliative Care',
  'Demenzbetreuung',
  'Dokumentation',
  'Pflegeplanung',
]

export const COUNTRIES_LIST = [
  'Afghanistan', 'Ägypten', 'Albanien', 'Algerien', 'Angola', 'Äthiopien',
  'Bangladesh', 'Bosnien und Herzegowina', 'Brasilien', 'Bulgarien',
  'China', 'Deutschland', 'Ghana', 'Griechenland', 'Indien', 'Indonesien',
  'Irak', 'Iran', 'Italien', 'Jordanien', 'Kambodscha', 'Kamerun',
  'Kasachstan', 'Kenia', 'Kolumbien', 'Kroatien', 'Kuba',
  'Libanon', 'Marokko', 'Mexiko', 'Moldau', 'Myanmar', 'Nepal',
  'Nigeria', 'Nordmazedonien', 'Pakistan', 'Peru', 'Philippinen',
  'Polen', 'Portugal', 'Rumänien', 'Russland', 'Serbien',
  'Slowakei', 'Slowenien', 'Spanien', 'Sri Lanka', 'Syrien',
  'Thailand', 'Tunesien', 'Türkei', 'Tschechien', 'Ukraine',
  'Ungarn', 'Usbekistan', 'Vietnam', 'Weißrussland', 'Kosovo',
  'Sonstiges',
]

export const LANGUAGES_LIST = [
  'Albanisch', 'Amharisch', 'Arabisch', 'Bengalisch', 'Bosnisch',
  'Bulgarisch', 'Chinesisch (Mandarin)', 'Chinesisch (Kantonesisch)',
  'Deutsch', 'Englisch', 'Farsi / Persisch', 'Filipino / Tagalog',
  'Französisch', 'Griechisch', 'Hindi', 'Indonesisch', 'Italienisch',
  'Khmer', 'Kroatisch', 'Kurdisch', 'Malay', 'Mazedonisch',
  'Nepalesisch', 'Polnisch', 'Portugiesisch', 'Rumänisch',
  'Russisch', 'Serbisch', 'Singhalesisch', 'Slowakisch', 'Slowenisch',
  'Spanisch', 'Swahili', 'Tamilisch', 'Thai', 'Tschechisch',
  'Türkisch', 'Ukrainisch', 'Ungarisch', 'Urdu', 'Usbekisch',
  'Vietnamesisch', 'Sonstiges',
]

export const NURSING_EDUCATION_OPTIONS = [
  'Gesundheits- und Krankenpfleger/in',
  'Gesundheits- und Kinderkrankenpfleger/in',
  'Altenpfleger/in',
  'Pflegefachmann / Pflegefachfrau (generalistisch)',
  'Pflegeassistent/in',
  'Krankenpflegehelfer/in',
  'Altenpflegehelfer/in',
  'Rettungssanitäter/in',
  'Operationstechnische/r Assistent/in (OTA)',
  'Anästhesietechnische/r Assistent/in (ATA)',
  'Physiotherapeut/in',
  'Sonstiges',
]

export const PROCESS_STATUS_LABELS = {
  1: 'Kennenlernen gestartet',
  2: 'Kennenlerngespräch terminiert',
  3: 'Kennenlerngespräch durchgeführt',
  4: 'Zusage erfolgt',
  5: 'Vertrag unterzeichnet',
  6: 'Visumverfahren läuft',
  7: 'Botschaftstermin erfolgt',
  8: 'Visum erteilt',
  9: 'Einreise geplant',
  10: 'Eingereist',
  11: 'Arbeitsstart erfolgt',
}

export const PROFILE_STATUS_LABELS = {
  draft: 'Entwurf',
  published: 'Veröffentlicht',
  reserved: 'Reserviert',
  completed: 'Abgeschlossen',
}

export const PROFILE_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  reserved: 'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700',
}

export const RECOGNITION_LABELS = {
  anerkannt: 'Anerkannt',
  in_bearbeitung: 'In Bearbeitung',
  nicht_beantragt: 'Nicht beantragt',
  abgelehnt: 'Abgelehnt',
}
