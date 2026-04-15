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

export const FACILITY_TYPES = [
  'Stationäre Pflege / Pflegeheim',
  'Ambulante Pflege',
  'Intensivpflege',
  'Krankenhaus',
  'Rehabilitationszentrum',
  'Psychiatrie',
  'Hospiz',
  'Behinderteneinrichtung',
  'Tagespflege',
]

export const WORK_TIME_OPTIONS = [
  'Vollzeit',
  'Teilzeit',
  'Flexibel',
  'Frühdienst bevorzugt',
  'Spätdienst bevorzugt',
  'Nachtdienst möglich',
]

export const SPECIALIZATIONS = [
  'Altenpflege',
  'Krankenpflege',
  'Kinderkrankenpflege',
  'Intensivpflege',
  'Onkologie',
  'Palliativpflege',
  'Psychiatrie',
  'Neurologie',
  'Orthopädie',
  'Geriatrie',
  'Demenzpflege',
  'Wundmanagement',
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
