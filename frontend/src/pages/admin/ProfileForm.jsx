import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  GERMAN_STATES, WORK_TIME_OPTIONS,
  EXPERIENCE_AREAS, PROFILE_STATUS_LABELS, PROCESS_STATUS_LABELS, formatDateTime
} from '@/lib/utils'
import {
  BERUFSGRUPPEN,
  SPECIALIZATIONS_BY_BERUFSGRUPPE,
  EINRICHTUNGSTYPEN_BY_BERUFSGRUPPE,
  FLEXIBEL_OPTION,
  ALL_SPECIALIZATION_FIELDS,
  getSpecializationsField,
  getEinrichtungstypenField,
  getSpecializationsLabel,
  getProfileSpecializations,
  getProfileEinrichtungstypen,
} from '@/lib/profileOptions'
import {
  ArrowLeft, Save, Loader2, Upload, X, Plus, Trash2,
  Video, CheckCircle2, AlertCircle, User, FlaskConical, Crop, AlertTriangle, Bookmark, Building2, ExternalLink, Mail, Lock, Unlink, ChevronRight, ChevronDown, FileText, Pencil, Eye, EyeOff, Link2, Copy, Check, ClipboardCopy, Download, Send, Clock, History
} from 'lucide-react'
import VimeoPlayer from '@/components/VimeoPlayer'
import DocSendDialog from '@/components/DocSendDialog'
import AddDocumentModal from '@/components/AddDocumentModal'
import CvPreviewModal from '@/components/CvPreviewModal'
import UnifiedSendDialog from '@/components/UnifiedSendDialog'
import { toast } from '@/hooks/use-toast'

// ─── Field helper — defined OUTSIDE component to avoid focus-jumping bug ──────
const Field = ({ label, children, required }) => (
  <div className="space-y-1.5">
    <Label>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {children}
  </div>
)

// ─── Error translation ─────────────────────────────────────────────────────────
function translateError(msg) {
  if (!msg) return 'Unbekannter Fehler.'
  if (msg.includes('profiles_german_recognition_check'))
    return 'Bitte wähle einen gültigen Wert für "Anerkennung in Deutschland" aus.'
  if (msg.includes('profiles_gender_check'))
    return 'Bitte wähle ein Geschlecht aus.'
  if (msg.includes('profiles_marital_status_check'))
    return 'Bitte wähle einen Familienstand aus.'
  if (msg.includes('profiles_work_time_preference_check'))
    return 'Bitte wähle eine Arbeitszeitpräferenz aus.'
  if (msg.includes('profiles_status_check'))
    return 'Ungültiger Profilstatus.'
  if (msg.includes('duplicate key') || msg.includes('unique_violation'))
    return 'Ein Datensatz mit diesen Daten existiert bereits.'
  if (msg.includes('storage'))
    return 'Fehler beim Bildupload. Bitte prüfe das Dateiformat (JPG/PNG, max. 5 MB).'
  if (msg.includes('JWT') || msg.includes('auth'))
    return 'Sitzung abgelaufen – bitte neu einloggen.'
  return msg
}

// ─── Test data generator ──────────────────────────────────────────────────────
// 10 realistische Dummy-Fachkräfte aus verschiedenen Ländern
const TEST_PROFILES = [
  {
    // 1. Philippinische Pflegefachkraft – erfahren, Intensivstation
    first_name: 'Maria Cristina', last_name: 'Reyes', gender: 'weiblich',
    birth_date: '1990-03-14', nationality: 'Philippinen', marital_status: 'verheiratet',
    children_count: '2', has_drivers_license: true,
    phone: '+63 917 456 7890', city: 'Manila',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Intensivpflege', 'IMC / Intermediate Care', 'Kardiologie'],
    einrichtungstyp_pflegefachkraft: ['Intensivstation (ITS)', 'Krankenhaus (allgemein)'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Bayern', 'Baden-Württemberg'],
    school_education: 'Bachelor of Science in Nursing (BSN)',
    nursing_education: 'Registered Nurse (BSN) – Philippinen',
    education_duration: '4 Jahre',
    graduation_year: '2013',
    german_recognition: 'anerkannt',
    education_notes: 'Abschluss an der University of Santo Tomas, Manila. Philippinische Approbation. Anerkennung in Bayern abgeschlossen.',
    additional_qualifications: ['Kinästhetik', 'Intensivpflege-Weiterbildung', 'BLS/ACLS Zertifikat'],
    total_experience_years: '10',
    germany_experience_years: '0',
    experience_areas: ['Behandlungspflege', 'Beatmungspflege', 'Medikamentengabe', 'Infusionstherapie', 'Dokumentation'],
    language_skills: [
      { language: 'Deutsch', level: 'B2' },
      { language: 'Englisch', level: 'C1' },
      { language: 'Tagalog', level: 'Muttersprache' },
    ],
    personal_skills: ['Teamfähigkeit', 'Belastbarkeit', 'Einfühlungsvermögen', 'Präzision', 'Eigeninitiative'],
    work_experience: [
      { id: '1', company: 'Makati Medical Center', position: 'Staff Nurse – ICU', department: 'Intensivstation', employment_type: 'Vollzeit', start_date: '2013-07', end_date: '2019-12', is_current: false, description: 'Betreuung kritisch kranker Patienten auf einer 20-Bett-Intensivstation. Beatmungsmanagement, invasives Monitoring, Notfallversorgung.' },
      { id: '2', company: "St. Luke's Medical Center", position: 'Senior Staff Nurse – Cardiac ICU', department: 'Kardiologische Intensivstation', employment_type: 'Vollzeit', start_date: '2020-01', end_date: '', is_current: true, description: 'Leitung von Pflegeteams (4 Mitarbeitende), postoperative Herzchirurgie-Betreuung, ECMO-Monitoring.' },
    ],
    education_history: [
      { id: '1', institution: 'University of Santo Tomas', degree: 'Bachelor of Science in Nursing', field: 'Krankenpflege', start_date: '2009-06', end_date: '2013-04', notes: 'Abschluss mit Auszeichnung (Magna Cum Laude)' },
    ],
    fkvi_competency_proof: 'Bestanden am 12.03.2024',
    internal_notes: 'Sehr motivierte Bewerberin mit ausgezeichneten Englischkenntnissen. Deutschkurs läuft (aktuell B2). Anerkennungsbescheid liegt vor.',
  },
  {
    // 2. Rumänische Pflegefachkraft – Altenpflege, bereits Deutschland-Erfahrung
    first_name: 'Ioana', last_name: 'Constantin', gender: 'weiblich',
    birth_date: '1986-07-22', nationality: 'Rumänien', marital_status: 'ledig',
    children_count: '0', has_drivers_license: true,
    phone: '+40 721 345 678', city: 'Cluj-Napoca',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Altenpflege', 'Geriatrie', 'Demenzpflege', 'Palliativpflege'],
    einrichtungstyp_pflegefachkraft: ['Pflegeheim (vollstationär)', 'Geriatrische Reha'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Bayern', 'Nordrhein-Westfalen', 'Baden-Württemberg'],
    school_education: 'Baccalaureat (rumänisches Abitur)',
    nursing_education: 'Asistenta Medicala Generalista – 3-jährige Ausbildung',
    education_duration: '3 Jahre',
    graduation_year: '2008',
    german_recognition: 'anerkannt',
    education_notes: 'Ausbildung an der Facultatea de Medicina Cluj. Anerkennung durch Regierung Bayern abgeschlossen (2019).',
    additional_qualifications: ['Palliative Care Grundkurs', 'Demenz-Fachkraft', 'Wundmanagement'],
    total_experience_years: '15',
    germany_experience_years: '3',
    experience_areas: ['Grundpflege', 'Behandlungspflege', 'Demenzbetreuung', 'Palliative Care', 'Pflegeplanung', 'Dokumentation'],
    language_skills: [
      { language: 'Deutsch', level: 'C1' },
      { language: 'Englisch', level: 'B1' },
      { language: 'Rumänisch', level: 'Muttersprache' },
    ],
    personal_skills: ['Empathie', 'Geduld', 'Zuverlässigkeit', 'Kommunikationsstärke', 'Organisationstalent'],
    work_experience: [
      { id: '1', company: 'Spital Clinic Cluj-Napoca', position: 'Krankenschwester – Geriatrie', department: 'Geriatriestation', employment_type: 'Vollzeit', start_date: '2008-09', end_date: '2016-06', is_current: false, description: 'Pflege geriatrischer Patienten mit Multimorbidität. Sturzprophylaxe, Dekubitusprophylaxe, Zusammenarbeit mit Therapeuten.' },
      { id: '2', company: 'AWO Seniorenzentrum München', position: 'Pflegefachkraft', department: 'Wohnbereich Demenz', employment_type: 'Vollzeit', start_date: '2019-03', end_date: '2022-01', is_current: false, description: 'Vollstationäre Langzeitpflege demenzkranker Bewohner. Bezugspflege, Angehörigenberatung, Pflegedokumentation in DAN.' },
      { id: '3', company: 'Seniorenresidenz am Englischen Garten', position: 'Pflegefachkraft', department: 'Palliativbegleitung', employment_type: 'Vollzeit', start_date: '2022-03', end_date: '', is_current: true, description: 'Begleitung sterbender Bewohner, Schmerzmanagement, enge Kooperation mit Palliativmedizinern.' },
    ],
    education_history: [
      { id: '1', institution: 'Facultatea de Medicina Cluj-Napoca', degree: 'Asistenta Medicala Generalista', field: 'Allgemeine Krankenpflege', start_date: '2005-10', end_date: '2008-07', notes: 'Abschluss mit sehr gut' },
    ],
    fkvi_competency_proof: 'Bestanden am 05.09.2023',
    internal_notes: 'Erfahrene Fachkraft mit soliden Deutschkenntnissen (C1). Aktuell in Deutschland tätig – Wechselbereitschaft hoch.',
  },
  {
    // 3. Indischer Physiotherapeut – jung, ambitioniert
    first_name: 'Arjun', last_name: 'Sharma', gender: 'männlich',
    birth_date: '1997-11-05', nationality: 'Indien', marital_status: 'ledig',
    children_count: '0', has_drivers_license: false,
    phone: '+91 98765 43210', city: 'Pune',
    berufsgruppe: 'physiotherapie',
    specializations_physiotherapie: ['Manuelle Therapie (MT)', 'Orthopädie / Traumatologie', 'Sportphysiotherapie', 'KG-Gerät (KGG)'],
    einrichtungstyp_physiotherapie: ['Physiotherapie-Praxis (ambulant)', 'Krankenhaus / Akutklinik', 'Rehabilitationsklinik (stationär)'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Berlin', 'Hamburg', 'Hessen'],
    nationwide: true,
    school_education: 'Bachelor of Physiotherapy (BPT)',
    nursing_education: 'Bachelor of Physiotherapy – Symbiosis College of Physiotherapy',
    education_duration: '4,5 Jahre',
    graduation_year: '2020',
    german_recognition: 'in_bearbeitung',
    education_notes: 'Abschluss an der Symbiosis College of Physiotherapy, Pune. Anerkennung beim Regierungspräsidium Stuttgart beantragt (seit 02/2024).',
    additional_qualifications: ['Dry Needling', 'Kinesio-Taping', 'McKenzie-Methode Level A'],
    total_experience_years: '4',
    germany_experience_years: '0',
    experience_areas: ['Grundpflege', 'Dokumentation', 'Kinästhetik'],
    language_skills: [
      { language: 'Deutsch', level: 'B2' },
      { language: 'Englisch', level: 'C2' },
      { language: 'Hindi', level: 'Muttersprache' },
      { language: 'Marathi', level: 'Muttersprache' },
    ],
    personal_skills: ['Lernbereitschaft', 'Kommunikationsstärke', 'Sportaffinität', 'Präzision', 'Patientenorientierung'],
    work_experience: [
      { id: '1', company: 'Sahyadri Hospital', position: 'Junior Physiotherapist', department: 'Orthopädie & Sportmedizin', employment_type: 'Vollzeit', start_date: '2020-08', end_date: '2023-06', is_current: false, description: 'Behandlung orthopädischer und sporttraumatologischer Patienten. Manuelle Therapie, Elektrotherapie, Ganganalyse.' },
      { id: '2', company: 'Fit & Active Rehab Clinic', position: 'Senior Physiotherapist', department: 'Sportphysiotherapie', employment_type: 'Vollzeit', start_date: '2023-07', end_date: '', is_current: true, description: 'Betreuung von Profi- und Hobbysportlern. Reha-Programme nach Kreuzbandriss, Schulteroperationen, Muskelrupturen.' },
    ],
    education_history: [
      { id: '1', institution: 'Symbiosis College of Physiotherapy, Pune', degree: 'Bachelor of Physiotherapy', field: 'Physiotherapie', start_date: '2015-07', end_date: '2020-05', notes: 'Abschlussnote: First Class with Distinction' },
    ],
    fkvi_competency_proof: 'Bestanden am 18.01.2024',
    internal_notes: 'Hoch motiviert, deutschsprachige Stelle angestrebt. Anerkennungsverfahren läuft. Spricht fließend Englisch (C2). Sehr guter erster Eindruck.',
  },
  {
    // 4. Vietnamesische Pflegeassistenz – Anfängerin mit Berufserfahrung
    first_name: 'Nguyen Thi', last_name: 'Huong', gender: 'weiblich',
    birth_date: '1995-04-18', nationality: 'Vietnam', marital_status: 'ledig',
    children_count: '0', has_drivers_license: false,
    phone: '+84 903 567 890', city: 'Ho-Chi-Minh-Stadt',
    berufsgruppe: 'pflegeassistenz',
    specializations_pflegeassistenz: ['Grundpflege', 'Altenpflegehilfe', 'Demenzbetreuung', 'Alltagsbegleitung'],
    einrichtungstyp_pflegeassistenz: ['Pflegeheim (vollstationär)', 'Tagespflege', 'Ambulanter Pflegedienst'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Nordrhein-Westfalen', 'Niedersachsen', 'Hessen'],
    school_education: 'Trung hoc pho thong (Mittlere Reife)',
    nursing_education: 'Pflegehelfer/in – 1-jährige Ausbildung',
    education_duration: '1 Jahr',
    graduation_year: '2016',
    german_recognition: 'nicht_beantragt',
    education_notes: 'Pflegehilfe-Ausbildung im Krankenhaus Thu Duc abgeschlossen. Anerkennungsverfahren noch nicht eingeleitet.',
    additional_qualifications: ['Erste Hilfe Kurs', 'Hygieneschulung'],
    total_experience_years: '7',
    germany_experience_years: '0',
    experience_areas: ['Grundpflege', 'Demenzbetreuung', 'Dokumentation'],
    language_skills: [
      { language: 'Deutsch', level: 'B1' },
      { language: 'Englisch', level: 'A2' },
      { language: 'Vietnamesisch', level: 'Muttersprache' },
    ],
    personal_skills: ['Freundlichkeit', 'Geduld', 'Verlässlichkeit', 'Sorgfalt'],
    work_experience: [
      { id: '1', company: 'Benh Vien Thu Duc (Thu Duc Hospital)', position: 'Pflegehelferin', department: 'Allgemeinstation', employment_type: 'Vollzeit', start_date: '2016-09', end_date: '2021-04', is_current: false, description: 'Unterstützung bei Grundpflegemaßnahmen, Essensbegleitung, Mobilisation und Hygiene.' },
      { id: '2', company: 'Senior Care Saigon', position: 'Altenpflegehelferin', department: 'Stationäre Pflege', employment_type: 'Vollzeit', start_date: '2021-06', end_date: '', is_current: true, description: 'Betreuung älterer Menschen mit Demenz und eingeschränkter Mobilität. Alltagsstrukturierung, 24h-Begleitung.' },
    ],
    education_history: [
      { id: '1', institution: 'Benh Vien Thu Duc', degree: 'Pflegehelferin', field: 'Krankenpflegehilfe', start_date: '2015-09', end_date: '2016-07', notes: '' },
    ],
    fkvi_competency_proof: 'Bestanden am 22.06.2024',
    internal_notes: 'Engagierte junge Frau. Deutschkurs abgeschlossen (B1). Wünscht sich Langzeitstelle in Pflegeheim.',
  },
  {
    // 5. Ukrainischer OTA – erfahren, Unfallchirurgie
    first_name: 'Oleksiy', last_name: 'Petrenko', gender: 'männlich',
    birth_date: '1988-09-03', nationality: 'Ukraine', marital_status: 'verheiratet',
    children_count: '1', has_drivers_license: true,
    phone: '+380 50 234 5678', city: 'Lwiw',
    berufsgruppe: 'ota',
    specializations_ota: ['Unfallchirurgie / Traumatologie', 'Orthopädie', 'Allgemein- und Viszeralchirurgie', 'Instrumentiertätigkeit'],
    einrichtungstyp_ota: ['Krankenhaus / OP-Abteilung', 'Universitätsklinikum', 'Fachklinik (z. B. Herz-/Orthopädieklinik)'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Bayern', 'Baden-Württemberg', 'Nordrhein-Westfalen'],
    school_education: 'Abitur (ukrainisch)',
    nursing_education: 'OTA – Operationstechnische Assistenz, Medizinische Hochschule Lwiw',
    education_duration: '3 Jahre',
    graduation_year: '2011',
    german_recognition: 'in_bearbeitung',
    education_notes: 'Abschluss an der medizinischen Hochschule Lwiw. Anerkennung beim RP Karlsruhe beantragt.',
    additional_qualifications: ['Sterilgutversorgung DGSV', 'Laparoskopie-Assistenz', 'Notfallmanagement im OP'],
    total_experience_years: '13',
    germany_experience_years: '0',
    experience_areas: ['Behandlungspflege', 'Dokumentation', 'Infusionstherapie'],
    language_skills: [
      { language: 'Deutsch', level: 'B2' },
      { language: 'Englisch', level: 'B1' },
      { language: 'Ukrainisch', level: 'Muttersprache' },
      { language: 'Russisch', level: 'C1' },
    ],
    personal_skills: ['Stressresistenz', 'Teamgeist', 'Genauigkeit', 'Verantwortungsbewusstsein'],
    work_experience: [
      { id: '1', company: 'Lwiw Oblasne Klinichne Likarnya', position: 'OP-Assistent', department: 'Unfallchirurgie & Traumatologie', employment_type: 'Vollzeit', start_date: '2011-10', end_date: '2018-05', is_current: false, description: 'Instrumentierung und Springertätigkeit bei unfallchirurgischen Eingriffen. Versorgung von Extremitätenverletzungen, Osteosynthesen.' },
      { id: '2', company: 'Militärkrankenhaus Lwiw', position: 'Leitender OP-Assistent', department: 'Traumatologie', employment_type: 'Vollzeit', start_date: '2018-06', end_date: '', is_current: true, description: 'Leitung des OP-Teams bei komplexen Traumaoperationen. Einweisung neuer Mitarbeitender, Sterilgutmanagement, Notfallversorgung.' },
    ],
    education_history: [
      { id: '1', institution: 'Medizinische Hochschule Lwiw', degree: 'OTA – Operationstechnische Assistenz', field: 'OP-Pflege / Assistenz', start_date: '2008-09', end_date: '2011-06', notes: 'Abschluss mit Auszeichnung' },
    ],
    fkvi_competency_proof: 'Bestanden am 14.02.2024',
    internal_notes: 'Sehr erfahrener OTA. Wegen Kriegssituation auswanderungsbereit. Familie folgt nach. Anerkennung läuft.',
  },
  {
    // 6. Mexikanische Pflegefachkraft – Psychiatrie/Neurologie
    first_name: 'Valentina', last_name: 'Morales García', gender: 'weiblich',
    birth_date: '1992-01-28', nationality: 'Mexiko', marital_status: 'geschieden',
    children_count: '1', has_drivers_license: true,
    phone: '+52 55 1234 5678', city: 'Guadalajara',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Psychiatrie', 'Neurologie', 'Gerontopsychiatrie', 'Krankenpflege (allgemein)'],
    einrichtungstyp_pflegefachkraft: ['Psychiatrische Klinik', 'Krankenhaus (allgemein)', 'Universitätsklinikum'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Berlin', 'Hamburg', 'Nordrhein-Westfalen'],
    school_education: 'Preparatoria (mexikanisches Abitur)',
    nursing_education: 'Licenciatura en Enfermería – Universidad de Guadalajara',
    education_duration: '4 Jahre',
    graduation_year: '2015',
    german_recognition: 'in_bearbeitung',
    education_notes: 'Bachelor-Abschluss in Krankenpflege, Universität Guadalajara. Anerkennungsantrag in Berlin gestellt (03/2024).',
    additional_qualifications: ['Psychiatrische Intensivpflege', 'Krisenintervention', 'Deeskalationstraining'],
    total_experience_years: '9',
    germany_experience_years: '0',
    experience_areas: ['Behandlungspflege', 'Medikamentengabe', 'Pflegeplanung', 'Dokumentation'],
    language_skills: [
      { language: 'Deutsch', level: 'B2' },
      { language: 'Englisch', level: 'B2' },
      { language: 'Spanisch', level: 'Muttersprache' },
    ],
    personal_skills: ['Empathie', 'Deeskalationskompetenz', 'Belastbarkeit', 'Multikulturelle Kompetenz', 'Strukturiertes Arbeiten'],
    work_experience: [
      { id: '1', company: 'Hospital Civil de Guadalajara', position: 'Enfermera – Neurología', department: 'Neurologie', employment_type: 'Vollzeit', start_date: '2015-08', end_date: '2019-11', is_current: false, description: 'Pflege neurologischer Patienten (Schlaganfall, MS, Epilepsie). Medikamentenmanagement, Patientenedukation.' },
      { id: '2', company: 'Hospital Psiquiátrico "Dr. Miguel Silva"', position: 'Leitende Pflegefachkraft – Psychiatrie', department: 'Geschlossene Psychiatrie', employment_type: 'Vollzeit', start_date: '2020-01', end_date: '', is_current: true, description: 'Leitung eines Teams von 8 Pflegenden. Krisenintervention, Deeskalation, Betreuung akutpsychiatrischer Patienten.' },
    ],
    education_history: [
      { id: '1', institution: 'Universidad de Guadalajara', degree: 'Licenciatura en Enfermería', field: 'Krankenpflege', start_date: '2011-08', end_date: '2015-06', notes: 'Abschluss mit Auszeichnung (Mención Honorífica)' },
    ],
    fkvi_competency_proof: 'Bestanden am 07.04.2024',
    internal_notes: 'Spezialisierung Psychiatrie/Neurologie sehr gesucht. Alleinereisend. Motivationsschreiben liegt vor.',
  },
  {
    // 7. Georgischer ATA – junger Mann, OP-Erfahrung
    first_name: 'Giorgi', last_name: 'Kvaratskhelia', gender: 'männlich',
    birth_date: '1996-06-11', nationality: 'Georgien', marital_status: 'ledig',
    children_count: '0', has_drivers_license: true,
    phone: '+995 599 123 456', city: 'Tiflis',
    berufsgruppe: 'ata',
    specializations_ata: ['Allgemeinanästhesie', 'Regionalanästhesie', 'Kinderanästhesie', 'Aufwachraum / PACU'],
    einrichtungstyp_ata: ['Krankenhaus / Anästhesieabteilung', 'Ambulantes OP-Zentrum (AOZ)', 'Universitätsklinikum'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Bayern', 'Baden-Württemberg', 'Sachsen'],
    school_education: 'Sashualo Ganatleba (georgisches Abitur)',
    nursing_education: 'ATA – Anästhesietechnische Assistenz, Tbilisi State Medical University',
    education_duration: '3 Jahre',
    graduation_year: '2019',
    german_recognition: 'nicht_beantragt',
    education_notes: 'Abschluss an der Tbilisi State Medical University. Anerkennung noch nicht eingeleitet.',
    additional_qualifications: ['Airway-Management-Kurs', 'Narkosegerätekunde', 'BLS-Zertifikat'],
    total_experience_years: '5',
    germany_experience_years: '0',
    experience_areas: ['Behandlungspflege', 'Medikamentengabe', 'Dokumentation'],
    language_skills: [
      { language: 'Deutsch', level: 'B1' },
      { language: 'Englisch', level: 'C1' },
      { language: 'Georgisch', level: 'Muttersprache' },
      { language: 'Russisch', level: 'B2' },
    ],
    personal_skills: ['Belastbarkeit', 'Schnelle Auffassungsgabe', 'Teamfähigkeit', 'Ruhige Arbeitsweise'],
    work_experience: [
      { id: '1', company: "Iashvili Children's Central Hospital", position: 'Anästhesietechnischer Assistent', department: 'Kinderanästhesie', employment_type: 'Vollzeit', start_date: '2019-09', end_date: '2023-03', is_current: false, description: 'Vorbereitung und Überwachung von Kinderanästhesien. Atemwegsmanagement, Aufwachraumbetreuung.' },
      { id: '2', company: 'Aversi-Rational Clinic', position: 'ATA', department: 'Allgemeinanästhesie / OP', employment_type: 'Vollzeit', start_date: '2023-04', end_date: '', is_current: true, description: 'Betreuung von Patienten in allen Anästhesieformen. Regionalanästhesie-Assistenz, PACU-Überwachung.' },
    ],
    education_history: [
      { id: '1', institution: 'Tbilisi State Medical University', degree: 'ATA – Anästhesietechnische Assistenz', field: 'Anästhesiepflege', start_date: '2016-09', end_date: '2019-06', notes: '' },
    ],
    fkvi_competency_proof: 'Bestanden am 29.05.2024',
    internal_notes: 'Engagierter junger Mann. Deutschkurs in Tiflis läuft. Ziel: Deutschland innerhalb von 6 Monaten.',
  },
  {
    // 8. Tunesische Pflegefachkraft – Onkologie, Frau mit Familie
    first_name: 'Amira', last_name: 'Ben Salah', gender: 'weiblich',
    birth_date: '1984-12-09', nationality: 'Tunesien', marital_status: 'verheiratet',
    children_count: '3', has_drivers_license: true,
    phone: '+216 98 765 432', city: 'Tunis',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Onkologie', 'Palliativpflege', 'Innere Medizin', 'Wundmanagement'],
    einrichtungstyp_pflegefachkraft: ['Fachklinik', 'Krankenhaus (allgemein)', 'Hospiz'],
    work_time_preference: 'Teilzeit',
    state_preferences: ['Nordrhein-Westfalen', 'Hessen', 'Rheinland-Pfalz'],
    school_education: 'Baccalauréat (tunesisches Abitur)',
    nursing_education: 'Technicien Supérieur en Sciences Infirmières – Institut Supérieur des Sciences Infirmières de Tunis',
    education_duration: '3 Jahre',
    graduation_year: '2007',
    german_recognition: 'anerkannt',
    education_notes: 'Abschluss ISSI Tunis. Anerkennung in NRW abgeschlossen (2022). Berufliche Gleichwertigkeit festgestellt.',
    additional_qualifications: ['Palliative Care Zertifikat (WHO)', 'Port-Management', 'Ernährungsberatung onkologisch'],
    total_experience_years: '17',
    germany_experience_years: '2',
    experience_areas: ['Behandlungspflege', 'Wundversorgung', 'Infusionstherapie', 'Palliative Care', 'Stomapflege', 'Pflegeplanung'],
    language_skills: [
      { language: 'Deutsch', level: 'B2' },
      { language: 'Englisch', level: 'B1' },
      { language: 'Französisch', level: 'C1' },
      { language: 'Arabisch', level: 'Muttersprache' },
    ],
    personal_skills: ['Sensibilität', 'Palliativkompetenz', 'Wundheilungsexpertise', 'Mehrsprachigkeit'],
    work_experience: [
      { id: '1', company: 'Institut Salah Azaïez – Onkologiezentrum', position: 'Infirmière – Oncologie', department: 'Onkologie / Chemotherapie', employment_type: 'Vollzeit', start_date: '2007-10', end_date: '2020-07', is_current: false, description: 'Begleitung onkologischer Patienten durch Chemotherapiezyklen. Port-Pflege, Antiemese, Aufklärungsgespräche.' },
      { id: '2', company: 'Universitätsklinikum Köln', position: 'Pflegefachkraft Onkologie', department: 'Hämatologie / Onkologie', employment_type: 'Teilzeit', start_date: '2022-05', end_date: '', is_current: true, description: 'Betreuung hämatologisch-onkologischer Patienten. Zytostatika-Applikation, Patientenedukation, Palliativbegleitung.' },
    ],
    education_history: [
      { id: '1', institution: 'Institut Supérieur des Sciences Infirmières de Tunis', degree: 'Technicien Supérieur en Sciences Infirmières', field: 'Allgemeine Krankenpflege', start_date: '2004-09', end_date: '2007-06', notes: 'Mention Très Bien' },
    ],
    fkvi_competency_proof: 'Bestanden am 11.11.2023',
    internal_notes: 'Sehr erfahrene Onkologiepflegerin. Wünscht Teilzeit wegen 3 Kindern. Aktuell in Köln tätig – ggf. Wechsel möglich.',
  },
  {
    // 9. Bosnischer Pflege-Azubi – junger Mann
    first_name: 'Amir', last_name: 'Hadžić', gender: 'männlich',
    birth_date: '2002-08-17', nationality: 'Bosnien-Herzegowina', marital_status: 'ledig',
    children_count: '0', has_drivers_license: false,
    phone: '+387 61 234 567', city: 'Sarajevo',
    berufsgruppe: 'azubi_pflege',
    bereichswunsch_azubi: ['Interesse: Krankenhaus / Akut', 'Interesse: Intensiv- / Notfall'],
    einrichtungstyp_azubi_pflege: ['Krankenhaus (Ausbildungsträger)', 'Universitätsklinikum'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Bayern', 'Baden-Württemberg'],
    school_education: 'Matura (bosnisches Abitur)',
    nursing_education: 'Noch keine abgeschlossene Pflegeausbildung – Ausbildungsbeginn angestrebt',
    education_duration: '3 Jahre',
    graduation_year: '2021',
    german_recognition: 'nicht_beantragt',
    education_notes: 'Matura 2021. Freiwilliges Praktikum im Kantonspital Sarajevo (3 Monate). Interessiert an generalistische Pflegeausbildung in Deutschland.',
    additional_qualifications: ['Erste Hilfe Kurs', 'Freiwilliges Praktikum Krankenhaus'],
    total_experience_years: '0',
    germany_experience_years: '0',
    experience_areas: ['Grundpflege'],
    language_skills: [
      { language: 'Deutsch', level: 'B2' },
      { language: 'Englisch', level: 'B1' },
      { language: 'Bosnisch', level: 'Muttersprache' },
    ],
    personal_skills: ['Motiviert', 'Lernbereit', 'Teamfähigkeit', 'Verantwortungsbewusstsein'],
    work_experience: [
      { id: '1', company: 'Kantonalna bolnica Sarajevo', position: 'Praktikant Krankenpflege', department: 'Allgemeinstation', employment_type: 'Praktikum', start_date: '2022-06', end_date: '2022-08', is_current: false, description: 'Begleitung des Pflegepersonals. Unterstützung bei Grundpflege, Verbandswechsel, Patientenbegleitung.' },
    ],
    education_history: [
      { id: '1', institution: 'Prva bošnjačka gymnasium Sarajevo', degree: 'Matura', field: 'Allgemeinbildend', start_date: '2017-09', end_date: '2021-06', notes: 'Durchschnitt 4,2/5,0' },
    ],
    fkvi_competency_proof: 'Bestanden am 03.03.2024',
    internal_notes: 'Junger motivierter Bewerber. Deutschkurs B2 abgeschlossen. Sucht Ausbildungsplatz zur Pflegefachkraft. Sehr sympathisch im Gespräch.',
  },
  {
    // 10. Kosovarische Pflegefachkraft – Chirurgie, bereits B2
    first_name: 'Fjolla', last_name: 'Krasniqi', gender: 'weiblich',
    birth_date: '1993-05-30', nationality: 'Kosovo', marital_status: 'ledig',
    children_count: '0', has_drivers_license: true,
    phone: '+383 44 123 456', city: 'Pristina',
    berufsgruppe: 'pflegefachkraft',
    specializations_pflegefachkraft: ['Chirurgie (Station)', 'Notfallpflege', 'Krankenpflege (allgemein)', 'Wundmanagement'],
    einrichtungstyp_pflegefachkraft: ['Krankenhaus (allgemein)', 'Notaufnahme / ZNA', 'Fachklinik'],
    work_time_preference: 'Vollzeit',
    state_preferences: ['Bayern', 'Baden-Württemberg', 'Hessen'],
    school_education: 'Matura (kosovarisches Abitur)',
    nursing_education: 'Bachelor of Nursing – Universität Pristina',
    education_duration: '4 Jahre',
    graduation_year: '2016',
    german_recognition: 'in_bearbeitung',
    education_notes: 'Bachelor-Abschluss Universität Pristina. Anerkennung beim RP Stuttgart eingereicht (01/2024).',
    additional_qualifications: ['Notfallpflege-Grundkurs', 'Wundmanagement-Zertifikat', 'Infusionstherapie'],
    total_experience_years: '8',
    germany_experience_years: '0',
    experience_areas: ['Behandlungspflege', 'Wundversorgung', 'Medikamentengabe', 'Infusionstherapie', 'Dokumentation', 'Pflegeplanung'],
    language_skills: [
      { language: 'Deutsch', level: 'B2' },
      { language: 'Englisch', level: 'B2' },
      { language: 'Albanisch', level: 'Muttersprache' },
      { language: 'Serbisch', level: 'B1' },
    ],
    personal_skills: ['Belastbarkeit', 'Schnelle Entscheidungsfähigkeit', 'Kommunikationsstärke', 'Zuverlässigkeit'],
    work_experience: [
      { id: '1', company: 'Klinike Universitare të Kosovës (QKUK)', position: 'Infermiere – Kirurgji', department: 'Chirurgie / Notaufnahme', employment_type: 'Vollzeit', start_date: '2016-09', end_date: '2021-12', is_current: false, description: 'Prä- und postoperative Pflege chirurgischer Patienten. Notfallversorgung, Wundmanagement, OP-Vorbereitung.' },
      { id: '2', company: 'Klinika Rezonanca Pristina', position: 'Leitende Pflegefachkraft', department: 'Chirurgie / Tagesklinik', employment_type: 'Vollzeit', start_date: '2022-01', end_date: '', is_current: true, description: 'Leitung des Pflegeteams (6 Mitarbeitende). Qualitätssicherung, Einarbeitung neuer Kollegen, Patientenedukation.' },
    ],
    education_history: [
      { id: '1', institution: 'Universiteti i Prishtinës – Fakulteti i Mjekësisë', degree: 'Bachelor of Nursing', field: 'Krankenpflege', start_date: '2012-09', end_date: '2016-07', notes: 'Sehr gut' },
    ],
    fkvi_competency_proof: 'Bestanden am 20.12.2023',
    internal_notes: 'Sehr gute Kandidatin. Leitungserfahrung, solide Deutschkenntnisse. Anerkennung läuft. Verfügbar ab sofort.',
  },
]

function generateTestData() {
  const profile = TEST_PROFILES[Math.floor(Math.random() * TEST_PROFILES.length)]
  return {
    status: 'draft',
    internal_notes: 'Testdaten – bitte vor Veröffentlichung prüfen.',
    ...profile,
  }
}

// ─── Image Cropper Dialog ─────────────────────────────────────────────────────
function ImageCropperDialog({ src, onDone, onCancel }) {
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  const onImageLoad = useCallback((e) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
      width,
      height
    )
    setCrop(initialCrop)
  }, [])

  const handleApply = () => {
    const image = imgRef.current
    const canvas = canvasRef.current
    if (!completedCrop || !image || !canvas) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const ctx = canvas.getContext('2d')

    const pixelRatio = window.devicePixelRatio
    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio)
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio)

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    )

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      onDone(file, url)
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Crop className="h-4 w-4" />Bild zuschneiden
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500">Ziehe den Rahmen, um das Profilbild zuzuschneiden (1:1 Format).</p>
        <div className="flex justify-center max-h-80 overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, pct) => setCrop(pct)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop={false}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Zuschneiden"
              onLoad={onImageLoad}
              style={{ maxHeight: '320px', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button onClick={handleApply} disabled={!completedCrop}>
            <Crop className="h-4 w-4 mr-2" />Zuschnitt übernehmen
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Document components ──────────────────────────────────────────────────────
const DOC_TYPES = ['Zeugnis', 'Anerkennungsbescheid', 'Sprachzertifikat', 'Lebenslauf', 'Referenz', 'Sonstiges']

const DOC_TYPE_COLORS = {
  'Zeugnis': 'bg-blue-50 text-blue-700',
  'Anerkennungsbescheid': 'bg-purple-50 text-purple-700',
  'Sprachzertifikat': 'bg-green-50 text-green-700',
  'Lebenslauf': 'bg-orange-50 text-orange-700',
  'Referenz': 'bg-pink-50 text-pink-700',
  'Sonstiges': 'bg-gray-100 text-gray-600',
}

function DocEditDialog({ doc, onSave, onClose }) {
  const [form, setForm] = useState({ title: '', doc_type: '', description: '', link: '', is_internal: false, ...doc })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {doc.title ? 'Dokument bearbeiten' : 'Neues Dokument'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Titel" required>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="z.B. Abschlusszeugnis" autoFocus />
            </Field>
            <Field label="Typ">
              <Select value={form.doc_type} onValueChange={v => set('doc_type', v)}>
                <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Beschreibung">
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kurze Beschreibung (optional)..." rows={2} />
          </Field>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {form.is_internal
                ? <EyeOff className="h-4 w-4 text-amber-500" />
                : <Eye className="h-4 w-4 text-green-500" />}
              <div>
                <p className="text-sm font-medium">{form.is_internal ? 'Internes Dokument' : 'Für Unternehmen sichtbar'}</p>
                <p className="text-xs text-gray-400">{form.is_internal ? 'Nur für Admins' : 'Im Statustracker sichtbar'}</p>
              </div>
            </div>
            <Switch checked={!!form.is_internal} onCheckedChange={v => set('is_internal', v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title?.trim()}>
            <Save className="h-3.5 w-3.5 mr-1.5" />Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empty profile defaults ───────────────────────────────────────────────────
const EMPTY_PROFILE = {
  status: 'draft',
  first_name: '', last_name: '', gender: '', age: '',
  nationality: '', marital_status: '', children_count: '0', has_drivers_license: false,
  state_preferences: [], nationwide: false,
  berufsgruppe: '',
  specializations_pflegefachkraft: [], specializations_pflegeassistenz: [],
  specializations_ota: [], specializations_ata: [], specializations_physiotherapie: [],
  bereichswunsch_azubi: [],
  einrichtungstyp_pflegefachkraft: [], einrichtungstyp_pflegeassistenz: [],
  einrichtungstyp_ota: [], einrichtungstyp_ata: [], einrichtungstyp_physiotherapie: [],
  einrichtungstyp_azubi_pflege: [],
  work_time_preference: '',
  profile_image_url: '', vimeo_video_url: '', vimeo_video_id: '',
  school_education: '', nursing_education: '', education_duration: '',
  graduation_year: '', german_recognition: '', education_notes: '',
  additional_qualifications: [],
  total_experience_years: '', germany_experience_years: '',
  experience_areas: [], language_skills: [],
  fkvi_competency_proof: '', internal_notes: '',
  // CV fields
  birth_date: '', phone: '', contact_email: '',
  street: '', city: '', postal_code: '', country: 'Deutschland',
  work_experience: [], education_history: [], personal_skills: [],
}

// ─── ZusageDialog (Step 4) ────────────────────────────────────────────────────
function ZusageDialogPF({ open, onClose, reservation, session, onConfirm, onGoToDocuments }) {
  const [profileDocs, setProfileDocs] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open || !reservation?.profile_id) return
    setLoadingDocs(true)
    setSelectedKeys([])
    supabase
      .from('profile_documents')
      .select('*')
      .eq('profile_id', reservation.profile_id)
      .eq('is_internal', false)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { setProfileDocs(data || []); setLoadingDocs(false) })
  }, [open, reservation?.profile_id])

  const toggleDoc = (key) =>
    setSelectedKeys(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])

  const sendEmail = async (docs) => {
    const c = reservation.companies
    const res = await fetch('/api/admin/company-docs/create-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        reservationId: reservation.id,
        profileId: reservation.profile_id,
        companyEmail: c?.email,
        companyName: c?.company_name,
        documents: docs,
        expiresInDays: parseInt(expiresInDays, 10),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Fehler beim Senden')
    return data
  }

  const handleSendWithDocs = async () => {
    setSending(true)
    try {
      const docs = profileDocs
        .filter(d => selectedKeys.includes(d.link || d.title))
        .map(d => ({ title: d.title, doc_type: d.doc_type || '', link: d.link || '' }))
      await sendEmail(docs)
      toast({ title: 'E-Mail gesendet', description: `Dokumente an ${reservation.companies?.email} versendet.`, variant: 'success' })
      onClose(); onConfirm()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally { setSending(false) }
  }

  const handleSendWithoutDocs = async () => {
    setSending(true)
    try {
      await sendEmail([])
      toast({ title: 'Zusage-E-Mail gesendet', description: `E-Mail an ${reservation.companies?.email} versendet.`, variant: 'success' })
      onClose(); onConfirm()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally { setSending(false) }
  }

  const c = reservation?.companies
  const hasDocs = !loadingDocs && profileDocs.length > 0
  const noDocs = !loadingDocs && profileDocs.length === 0
  const canSendWithDocs = hasDocs && selectedKeys.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Send className="h-4 w-4 text-green-600" />
            </div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Zusage erteilen – Schritt 4
            </DialogTitle>
          </div>
          <p className="text-sm text-gray-500 pl-11">
            Möchtest du <strong className="text-gray-700">{c?.company_name}</strong> eine E-Mail mit Unterlagen der Fachkraft senden?
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {loadingDocs ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : noDocs ? (
            /* ── No-docs state: 3 clear options ── */
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Keine Dokumente hinterlegt – wähle eine Option:</p>

              {/* Option 1: Go upload */}
              <button
                type="button"
                onClick={() => { onClose(); onGoToDocuments?.() }}
                disabled={sending}
                className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-green-100 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                  <FileText className="h-3.5 w-3.5 text-gray-400 group-hover:text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-700 group-hover:text-green-700">Dokumente hochladen</p>
                  <p className="text-xs text-gray-400 mt-0.5">Zuerst Unterlagen im Profil hinterlegen, dann E-Mail versenden</p>
                </div>
              </button>

              {/* Option 2: Send without docs */}
              <button
                type="button"
                onClick={handleSendWithoutDocs}
                disabled={sending}
                className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center shrink-0 mt-0.5">
                  {sending ? <Loader2 className="h-3.5 w-3.5 text-green-700 animate-spin" /> : <Send className="h-3.5 w-3.5 text-green-700" />}
                </div>
                <div>
                  <p className="font-medium text-sm text-green-800">Ohne Dokumente versenden</p>
                  <p className="text-xs text-green-600 mt-0.5">Zusage-E-Mail an {c?.email} senden, ohne Dateianhang</p>
                </div>
              </button>

              {/* Option 3: No email */}
              <button
                type="button"
                onClick={() => { onClose(); onConfirm() }}
                disabled={sending}
                className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-600">Keine E-Mail versenden</p>
                  <p className="text-xs text-gray-400 mt-0.5">Schritt 4 aktivieren ohne E-Mail</p>
                </div>
              </button>
            </div>
          ) : (
            /* ── Has docs: document selection ── */
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Dokumente auswählen</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {profileDocs.map(doc => {
                  const key = doc.link || doc.title
                  const isOn = selectedKeys.includes(key)
                  return (
                    <label key={key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isOn ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="checkbox" checked={isOn} onChange={() => toggleDoc(key)}
                        className="h-4 w-4 rounded border-gray-300 accent-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{doc.title}</p>
                        {doc.doc_type && <p className="text-xs text-gray-400">{doc.doc_type}</p>}
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                <label className="text-xs text-gray-500 shrink-0">Gültig für</label>
                <select value={expiresInDays} onChange={e => setExpiresInDays(e.target.value)}
                  className="flex-1 h-8 text-sm border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  {[7, 14, 30, 90].map(d => <option key={d} value={d}>{d} Tage</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer – only shown when docs are available */}
        {hasDocs && (
          <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={sending} className="text-gray-400">
              Abbrechen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { onClose(); onConfirm() }} disabled={sending}>
                Ohne E-Mail weiter
              </Button>
              <Button size="sm" onClick={handleSendWithDocs} disabled={sending || !canSendWithDocs}
                className="bg-green-600 hover:bg-green-700 text-white">
                {sending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Senden...</>
                  : <><Send className="h-3.5 w-3.5 mr-1.5" />E-Mail senden & weiter</>}
              </Button>
            </div>
          </div>
        )}

        {/* Cancel link for no-docs state */}
        {noDocs && (
          <div className="px-6 pb-5 text-center">
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Abbrechen
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'neu'
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuthStore()

  const reserveFor = new URLSearchParams(location.search).get('reserveFor')

  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)   // raw image waiting to be cropped
  const [videoFile, setVideoFile] = useState(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // null | 0-100
  const [videoMode, setVideoMode] = useState('upload') // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null) // { idx: number|null, doc: {} } — null idx = new doc
  const [deletingDocIdx, setDeletingDocIdx] = useState(null)
  const [docSaving, setDocSaving] = useState(false)
  const [reserveDialog, setReserveDialog] = useState(false)
  const [companies, setCompanies] = useState([])
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [reserving, setReserving] = useState(false)
  const [reserveForCompany, setReserveForCompany] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [docSends, setDocSends] = useState([])
  const [docSendsLoading, setDocSendsLoading] = useState(false)
  const [sendTemplateDialog, setSendTemplateDialog] = useState(false)
  const [sendDocInitial, setSendDocInitial] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCvModal, setShowCvModal] = useState(false)
  const [selectedDocIndices, setSelectedDocIndices] = useState(new Set())
  const [cvSelected, setCvSelected] = useState(false)
  const [showUnifiedSend, setShowUnifiedSend] = useState(false)
  const [deletingSendId, setDeletingSendId] = useState(null) // id being confirmed for deletion
  const [expandedSendIds, setExpandedSendIds] = useState(new Set())
  const toggleSendHistory = (id) => setExpandedSendIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const [deletingSendBusy, setDeletingSendBusy] = useState(false)
  const [downloadingSendId, setDownloadingSendId] = useState(null)
  const [reservationHistory, setReservationHistory] = useState([])
  const [advancing, setAdvancing] = useState(false)
  const [decoupling, setDecoupling] = useState(false)
  const [decoupleDialog, setDecoupleDialog] = useState(false)
  const [pendingAdvance, setPendingAdvance] = useState(null) // { newStatus, needsDate, emailAlreadySent }
  const [stepDate, setStepDate] = useState('')
  const [resendEmail, setResendEmail] = useState(false)

  const EMAIL_TRIGGER_STEPS = new Set([2, 4, 8, 9])
  const DATE_STEPS = new Set([2, 7, 9, 10, 11])
  const [zusageDialog, setZusageDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const imageRef = useRef()
  const videoRef = useRef()

  useEffect(() => {
    if (isEdit) { fetchProfile(); loadDocSends() }
  }, [id, session])

  // Auto-refresh Versandhistorie every 15s when there are pending/opened sends
  useEffect(() => {
    if (!isEdit) return
    const interval = setInterval(() => {
      const hasPending = docSends.some(s => s.status === 'pending' || s.status === 'opened')
      if (hasPending) loadDocSends()
    }, 15000)
    return () => clearInterval(interval)
  }, [isEdit, docSends])

  useEffect(() => {
    if (!reserveFor) return
    supabase.from('companies').select('id, company_name').eq('id', reserveFor).single()
      .then(({ data }) => { if (data) setReserveForCompany(data) })
  }, [reserveFor])

  const fetchProfile = async () => {
    const [{ data: p }, { data: docs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('profile_documents').select('*').eq('profile_id', id).order('sort_order'),
    ])
    if (p) {
      setProfile({ ...EMPTY_PROFILE, ...p })
      setImagePreview(p.profile_image_url)
      if (p.status === 'reserved') {
        const { data: res } = await supabase
          .from('reservations')
          .select('id, process_status, company_id, companies (id, company_name, email, company_type)')
          .eq('profile_id', id)
          .single()
        setReservation(res || null)
        if (res) {
          const { data: hist } = await supabase
            .from('process_status_history')
            .select('*')
            .eq('reservation_id', res.id)
            .order('created_at', { ascending: false })
          setReservationHistory(hist || [])
        }
      } else {
        setReservation(null)
        setReservationHistory([])
      }
    }
    setDocuments(docs || [])
    setLoading(false)
  }

  const set = (field, value) => setProfile(prev => ({ ...prev, [field]: value }))

  // CV helpers — work experience
  const newWorkEntry = () => ({ id: Date.now().toString(), company: '', position: '', department: '', employment_type: 'Vollzeit', start_date: '', end_date: '', is_current: false, description: '' })
  const addWork    = () => set('work_experience', [...(profile.work_experience || []), newWorkEntry()])
  const setWork    = (id, f, v) => set('work_experience', (profile.work_experience || []).map(e => e.id === id ? { ...e, [f]: v } : e))
  const removeWork = (id)        => set('work_experience', (profile.work_experience || []).filter(e => e.id !== id))

  // CV helpers — education history
  const newEduEntry = () => ({ id: Date.now().toString(), institution: '', degree: '', field: '', start_date: '', end_date: '', notes: '' })
  const addEdu    = () => set('education_history', [...(profile.education_history || []), newEduEntry()])
  const setEdu    = (id, f, v) => set('education_history', (profile.education_history || []).map(e => e.id === id ? { ...e, [f]: v } : e))
  const removeEdu = (id)        => set('education_history', (profile.education_history || []).filter(e => e.id !== id))

  // CV helpers — personal skills tag input
  const addSkill    = (skill) => { const s = skill.trim(); if (s && !(profile.personal_skills || []).includes(s)) set('personal_skills', [...(profile.personal_skills || []), s]) }
  const removeSkill = (skill) => set('personal_skills', (profile.personal_skills || []).filter(s => s !== skill))

  // Raw file selected → open crop dialog
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    // reset input so same file can be selected again
    e.target.value = ''
  }

  // Crop completed → set cropped file + preview
  const handleCropDone = (croppedFile, croppedUrl) => {
    setImageFile(croppedFile)
    setImagePreview(croppedUrl)
    setCropSrc(null)
  }

  const handleVideoUpload = async () => {
    if (!videoFile || !isEdit) return
    setVideoUploading(true)
    setUploadProgress(0)
    try {
      // Step 1: Create upload slot on Vimeo via backend
      const initRes = await fetch('/api/admin/vimeo/init-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: id,
          fileName: videoFile.name,
          fileSize: videoFile.size,
        }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error(initData.error)

      const { uploadLink, videoId, embedUrl } = initData

      // Step 2: Upload file directly to Vimeo via TUS (PATCH with offset 0)
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PATCH', uploadLink, true)
        xhr.setRequestHeader('Tus-Resumable', '1.0.0')
        xhr.setRequestHeader('Upload-Offset', '0')
        xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload fehlgeschlagen: HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'))
        xhr.send(videoFile)
      })

      // Step 3: Save video URL to Supabase
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ vimeo_video_url: embedUrl, vimeo_video_id: videoId })
        .eq('id', id)
      if (updateErr) throw updateErr

      setProfile(prev => ({ ...prev, vimeo_video_url: embedUrl, vimeo_video_id: videoId }))
      setVideoFile(null)
      setUploadProgress(null)
      toast({ title: 'Video hochgeladen', description: 'Das Video wurde erfolgreich zu Vimeo hochgeladen.', variant: 'success' })
    } catch (err) {
      setUploadProgress(null)
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setVideoUploading(false)
    }
  }

  const handleUrlSave = async () => {
    if (!urlInput.trim() || !isEdit) return
    const trimmed = urlInput.trim()
    // Accept full Vimeo URLs or bare IDs
    const idMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/) ||
      trimmed.match(/^(\d+)$/)
    if (!idMatch) {
      toast({ title: 'Ungültige URL', description: 'Bitte eine gültige Vimeo-URL oder Video-ID eingeben.', variant: 'destructive' })
      return
    }
    const videoId = idMatch[1]
    const embedUrl = `https://player.vimeo.com/video/${videoId}`
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ vimeo_video_url: embedUrl, vimeo_video_id: videoId })
      .eq('id', id)
    if (updateErr) {
      toast({ title: 'Fehler', description: updateErr.message, variant: 'destructive' })
      return
    }
    setProfile(prev => ({ ...prev, vimeo_video_url: embedUrl, vimeo_video_id: videoId }))
    setUrlInput('')
    toast({ title: 'Video gespeichert', description: 'Vimeo-Video wurde verknüpft.', variant: 'success' })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      let imageUrl = profile.profile_image_url

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `profiles/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('profile-images').upload(path, imageFile)
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      // Convert empty enum strings to null to avoid DB CHECK constraint violations
      const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v)

      const payload = {
        ...profile,
        profile_image_url: imageUrl,
        age: profile.age ? parseInt(profile.age) : null,
        children_count: profile.children_count ? parseInt(profile.children_count) : 0,
        graduation_year: profile.graduation_year ? parseInt(profile.graduation_year) : null,
        total_experience_years: profile.total_experience_years ? parseFloat(profile.total_experience_years) : null,
        germany_experience_years: profile.germany_experience_years ? parseFloat(profile.germany_experience_years) : null,
        gender: nullIfEmpty(profile.gender),
        marital_status: nullIfEmpty(profile.marital_status),
        work_time_preference: nullIfEmpty(profile.work_time_preference),
        german_recognition: nullIfEmpty(profile.german_recognition),
      }
      delete payload.id
      delete payload.created_at
      delete payload.updated_at

      let profileId = id
      if (isEdit) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('profiles').insert(payload).select().single()
        if (error) throw error
        profileId = data.id
      }

      // Save documents via service-role API to guarantee write access regardless of RLS
      const docsRes = await fetch('/api/admin/save-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ profileId, documents }),
      })
      if (!docsRes.ok) {
        const docsErr = await docsRes.json().catch(() => ({}))
        throw new Error(docsErr.error || 'Dokumente konnten nicht gespeichert werden')
      }

      toast({ title: 'Gespeichert', description: 'Das Profil wurde erfolgreich gespeichert.', variant: 'success' })
      if (!isEdit) navigate(`/admin/fachkraefte/${profileId}`)
    } catch (err) {
      setError(translateError(err.message || 'Speichern fehlgeschlagen'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProfile = async () => {
    setDeleteDialog(false)
    try {
      // Delete image from storage if exists
      if (profile.profile_image_url) {
        const path = profile.profile_image_url.split('/profile-images/')[1]
        if (path) await supabase.storage.from('profile-images').remove([path])
      }
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Profil gelöscht', description: 'Das Profil wurde dauerhaft gelöscht.' })
      navigate('/admin/fachkraefte')
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  const openReserveDialog = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, company_name, email, status, first_name, last_name')
      .order('company_name')
    setCompanies(data || [])
    setSelectedCompanyId('')
    setCompanySearch('')
    setReserveDialog(true)
  }

  const handleReserve = async () => {
    if (!selectedCompanyId) return
    setReserving(true)
    try {
      const res = await fetch('/api/admin/create-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profileId: id, companyId: selectedCompanyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReserveDialog(false)
      toast({ title: 'Vermittlung gestartet', description: 'Die Fachkraft wurde reserviert und Schritt 1 gestartet.' })
      // Refresh profile to show new status
      fetchProfile()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setReserving(false)
    }
  }

  const handleReserveFor = async () => {
    if (!reserveFor) return
    setReserving(true)
    try {
      const res = await fetch('/api/admin/create-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profileId: id, companyId: reserveFor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Reserviert', description: `Fachkraft wurde für ${reserveForCompany?.company_name || 'das Unternehmen'} reserviert.` })
      fetchProfile()
      navigate(`/admin/crm/${reserveFor}`)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setReserving(false)
    }
  }

  const handleAdvanceStatus = (direction) => {
    if (!reservation) return
    const newStatus = direction === 'forward'
      ? Math.min(reservation.process_status + 1, 11)
      : Math.max(reservation.process_status - 1, 1)
    if (newStatus === reservation.process_status) return

    // Step 4 (Zusage) opens the document-selection dialog
    if (newStatus === 4 && direction === 'forward') {
      setZusageDialog(true)
      return
    }

    const needsDate = direction === 'forward' && DATE_STEPS.has(newStatus)
    const emailAlreadySent = EMAIL_TRIGGER_STEPS.has(newStatus) &&
      reservationHistory.some(h => h.new_status === newStatus)

    if (needsDate || emailAlreadySent) {
      setStepDate('')
      setResendEmail(false)
      setPendingAdvance({ newStatus, needsDate, emailAlreadySent })
    } else {
      doAdvanceStatus(newStatus, null, false)
    }
  }

  const doAdvanceStatus = async (newStatus, date, skipEmail) => {
    setAdvancing(true)
    try {
      const res = await fetch('/api/admin/update-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          reservationId: reservation.id,
          newStatus,
          notes: null,
          stepDate: date || null,
          skipEmail: !!skipEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReservation(prev => ({ ...prev, process_status: newStatus }))
      const { data: hist } = await supabase
        .from('process_status_history')
        .select('*')
        .eq('reservation_id', reservation.id)
        .order('created_at', { ascending: false })
      setReservationHistory(hist || [])
      toast({ title: `Schritt ${newStatus}/11`, description: PROCESS_STATUS_LABELS[newStatus] })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setAdvancing(false)
      setPendingAdvance(null)
      setStepDate('')
      setResendEmail(false)
    }
  }

  const handleDecouple = async () => {
    if (!reservation) return
    setDecoupling(true)
    try {
      const res = await fetch('/api/admin/decouple-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ reservationId: reservation.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Entkoppelt', description: 'Fachkraft und Unternehmen wurden getrennt.' })
      setDecoupleDialog(false)
      fetchProfile()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setDecoupling(false)
    }
  }

  const fillTestData = () => {
    const data = generateTestData()
    setProfile(prev => ({ ...prev, ...data }))
    toast({ title: 'Testdaten eingefüllt', description: 'Alle Felder wurden mit Beispieldaten befüllt.' })
  }

  const addLanguage = () => {
    set('language_skills', [...(profile.language_skills || []), { language: '', level: '' }])
  }

  const updateLanguage = (idx, field, value) => {
    const langs = [...(profile.language_skills || [])]
    langs[idx] = { ...langs[idx], [field]: value }
    set('language_skills', langs)
  }

  const removeLanguage = (idx) => {
    set('language_skills', (profile.language_skills || []).filter((_, i) => i !== idx))
  }

  // ── Document helpers ──────────────────────────────────────────────────────────
  const loadDocSends = async () => {
    if (!id || !session) return
    setDocSendsLoading(true)
    try {
      const res = await fetch(`/api/admin/dokumente/sends-list?profileId=${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setDocSends(data.sends || [])
    } catch {
      // non-critical
    } finally {
      setDocSendsLoading(false)
    }
  }

  const handleDeleteSend = async (sendId) => {
    setDeletingSendBusy(true)
    try {
      const res = await fetch('/api/admin/dokumente/delete-send', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ sendId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Fehler')
      setDocSends(prev => prev.filter(s => s.id !== sendId))
      toast({ title: 'Signierlink gelöscht', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler beim Löschen', description: err.message, variant: 'destructive' })
    } finally {
      setDeletingSendId(null)
      setDeletingSendBusy(false)
    }
  }

  const handleDownloadSend = async (sendId) => {
    setDownloadingSendId(sendId)
    try {
      const res = await fetch(`/api/admin/dokumente/sends-detail?sendId=${sendId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (data.signedPdfUrl) {
        window.open(data.signedPdfUrl, '_blank')
      } else {
        toast({ title: 'Download nicht verfügbar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Download fehlgeschlagen', variant: 'destructive' })
    } finally {
      setDownloadingSendId(null)
    }
  }

  const saveDocumentsToApi = async (docs) => {
    if (!id) return // only for edit mode
    setDocSaving(true)
    try {
      const res = await fetch('/api/admin/save-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ profileId: id, documents: docs }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Dokumente konnten nicht gespeichert werden')
      }
      toast({ title: 'Dokumente gespeichert', variant: 'success' })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setDocSaving(false)
    }
  }

  const handleSaveDoc = async (form) => {
    let updated
    if (editingDoc.idx === null) {
      // New document
      updated = [...documents, form]
    } else {
      // Edit existing
      updated = documents.map((d, i) => i === editingDoc.idx ? form : d)
    }
    setDocuments(updated)
    setEditingDoc(null)
    if (isEdit) await saveDocumentsToApi(updated)
  }

  const handleRemoveDoc = async (idx) => {
    const updated = documents.filter((_, i) => i !== idx)
    setDocuments(updated)
    if (isEdit) await saveDocumentsToApi(updated)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
      <div className="h-96 animate-pulse bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <>
      {/* Image crop dialog */}
      {cropSrc && (
        <ImageCropperDialog
          src={cropSrc}
          onDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Zusage dialog (step 4) */}
      {zusageDialog && (
        <ZusageDialogPF
          open={zusageDialog}
          onClose={() => setZusageDialog(false)}
          reservation={reservation}
          session={session}
          onConfirm={() => doAdvanceStatus(4, null, true)}
          onGoToDocuments={() => { setZusageDialog(false); setActiveTab('documents') }}
        />
      )}

      {/* Decouple confirmation dialog */}
      <Dialog open={decoupleDialog} onOpenChange={setDecoupleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Unlink className="h-5 w-5" />Fachkraft entkoppeln?
            </DialogTitle>
            <DialogDescription>
              Die Verbindung zwischen dieser Fachkraft und <strong>{reservation?.companies?.company_name}</strong> wird aufgehoben.
              Die Fachkraft wird wieder auf "Veröffentlicht" gesetzt und die Vermittlung beendet.
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecoupleDialog(false)} disabled={decoupling}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDecouple} disabled={decoupling}>
              {decoupling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
              Entkoppeln
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step advance dialog (date + email resend) */}
      <Dialog open={!!pendingAdvance} onOpenChange={open => { if (!open) { setPendingAdvance(null); setStepDate(''); setResendEmail(false) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schritt {pendingAdvance?.newStatus}/11: {PROCESS_STATUS_LABELS[pendingAdvance?.newStatus]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pendingAdvance?.needsDate && (
              <div className="space-y-1.5">
                <Label>Datum <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  type="date"
                  value={stepDate}
                  onChange={e => setStepDate(e.target.value)}
                  autoFocus={pendingAdvance?.needsDate}
                />
              </div>
            )}
            {pendingAdvance?.emailAlreadySent && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Mail className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-amber-800">E-Mail bereits versandt</p>
                  <p className="text-xs text-amber-700">Für diesen Schritt wurde bereits eine automatische E-Mail verschickt. Soll erneut eine Benachrichtigung gesendet werden?</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      id="resend-email"
                      checked={resendEmail}
                      onCheckedChange={setResendEmail}
                    />
                    <Label htmlFor="resend-email" className="text-sm cursor-pointer">
                      {resendEmail ? 'E-Mail erneut versenden' : 'Keine E-Mail senden'}
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingAdvance(null); setStepDate(''); setResendEmail(false) }}>Abbrechen</Button>
            <Button
              onClick={() => doAdvanceStatus(
                pendingAdvance.newStatus,
                stepDate || null,
                pendingAdvance.emailAlreadySent && !resendEmail
              )}
              disabled={advancing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {advancing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/fachkraefte')} className="shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {isEdit ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Profil bearbeiten' : 'Neue Fachkraft'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {profile.gender && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{profile.gender}</span>}
                {profile.age && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{profile.age} J.</span>}
                {profile.nationality && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{profile.nationality}</span>}
                {profile.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    profile.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' :
                    profile.status === 'reserved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    profile.status === 'draft' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {PROFILE_STATUS_LABELS[profile.status] || profile.status}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-1.5 font-mono">{isEdit ? id : 'Neues Profil'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Button variant="ghost" size="icon" onClick={fillTestData} title="Testdaten" className="text-gray-400 hover:text-gray-600">
                <FlaskConical className="h-4 w-4" />
              </Button>
              {isEdit && (
                <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(true)} className="text-red-400 hover:text-red-600 hover:bg-red-50" title="Löschen">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="relative">
                <Select
                  value={profile.status}
                  disabled={profile.status === 'reserved'}
                  onValueChange={v => {
                    if (v === 'reserved' && isEdit && profile.status !== 'reserved') {
                      openReserveDialog()
                    } else {
                      set('status', v)
                    }
                  }}
                >
                  <SelectTrigger className={`w-40 ${profile.status === 'reserved' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <SelectValue />
                    {profile.status === 'reserved' && <Lock className="h-3 w-3 ml-1 text-blue-400 shrink-0" />}
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROFILE_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profile.status === 'reserved' && (
                  <p className="absolute -bottom-4 left-0 text-[10px] text-blue-500 whitespace-nowrap font-medium">
                    Zuerst entkoppeln
                  </p>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Speichern...</>
                  : <><Save className="mr-2 h-4 w-4" />Speichern</>}
              </Button>
            </div>
          </div>
        </div>

        {reservation && reservation.companies && (
          <>
          {/* ── Company card ────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-300" />
                <span className="text-slate-300 text-xs font-semibold uppercase tracking-wide">Zugewiesenes Unternehmen</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                reservation.companies.company_type === 'customer' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                reservation.companies.company_type === 'lead' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {reservation.companies.company_type === 'customer' ? 'Kunde' :
                 reservation.companies.company_type === 'lead' ? 'Lead' : 'Inaktiv'}
              </span>
            </div>
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base truncate">{reservation.companies.company_name}</p>
                {reservation.companies.email && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />{reservation.companies.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/crm/${reservation.companies.id}`)}
                  className="text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />CRM
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDecoupleDialog(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-1.5"
                >
                  <Unlink className="h-3.5 w-3.5" />Entkoppeln
                </Button>
              </div>
            </div>
          </div>

          {/* ── Vermittlungsprozess card ─────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-green-300 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-white" />
                <div>
                  <p className="text-white font-bold text-base">Vermittlung aktiv</p>
                  <p className="text-green-100 text-sm">{reservation.companies.company_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">{reservation.process_status}/11</p>
                <p className="text-green-100 text-xs">Schritt</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Steps + Actions */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Prozessschritte</p>
                  <div className="space-y-0.5">
                    {Object.entries(PROCESS_STATUS_LABELS).map(([s, label]) => {
                      const num = Number(s)
                      const done = num < reservation.process_status
                      const active = num === reservation.process_status
                      return (
                        <div key={s} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-sm ${active ? 'bg-green-50' : ''}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            done ? 'bg-green-500 text-white' :
                            active ? 'bg-green-600 text-white' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {done ? '✓' : num}
                          </div>
                          <span className={`flex-1 ${done ? 'text-gray-400 line-through' : active ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                            {label}
                          </span>
                          {EMAIL_TRIGGER_STEPS.has(num) && (
                            <span title="E-Mail wird automatisch versendet" className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                              active ? 'bg-blue-100 text-blue-600' : done ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-400'
                            }`}>
                              <Mail className="h-2.5 w-2.5" />E-Mail
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Advance/Back buttons */}
                {reservation.process_status < 11 && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {reservation.process_status > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdvanceStatus('back')}
                        disabled={advancing}
                        className="flex-1 text-gray-500"
                      >
                        ← Schritt zurück
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus('forward')}
                      disabled={advancing}
                      className={`flex-1 text-white ${reservation.process_status === 10 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {advancing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      {reservation.process_status === 10
                        ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Vermittlung abschließen</>
                        : reservation.process_status === 3
                          ? <><Send className="h-3.5 w-3.5 mr-1" />Zusage senden & weiter →</>
                          : `Weiter zu Schritt ${reservation.process_status + 1} →`}
                    </Button>
                  </div>
                )}
                {reservation.process_status === 11 && (
                  <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-emerald-700 text-sm">Vermittlung abgeschlossen</p>
                    <p className="text-emerald-600 text-xs">Alle Schritte erfolgreich durchlaufen.</p>
                  </div>
                )}
              </div>

              {/* Right: History */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Verlauf</p>
                {reservationHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">Noch kein Verlauf.</p>
                ) : (
                  <div className="space-y-0">
                    {reservationHistory.map((entry, i) => (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          {i < reservationHistory.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                        </div>
                        <div className="pb-3 min-w-0">
                          <p className="font-medium text-gray-800 text-xs">
                            {entry.old_status ? `Schritt ${entry.old_status} → ${entry.new_status}` : `Start: Schritt ${entry.new_status}`}
                          </p>
                          <p className="text-[11px] text-gray-500">{PROCESS_STATUS_LABELS[entry.new_status]}</p>
                          {entry.notes && <p className="text-[11px] text-blue-600 mt-0.5">📅 {entry.notes}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </> /* end reservation two-card block */
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="personal">Person</TabsTrigger>
            <TabsTrigger value="lebenslauf">Lebenslauf</TabsTrigger>
            <TabsTrigger value="experience">Erfahrung</TabsTrigger>
            <TabsTrigger value="media">Medien</TabsTrigger>
            <TabsTrigger value="documents">Dokumente</TabsTrigger>
            <TabsTrigger value="versandhistorie" className="relative">
              Versandhistorie
              {isEdit && docSends.length > 0 && (
                <span className="ml-1.5 bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{docSends.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Person ────────────────────────────────────────────── */}
          <TabsContent value="personal" className="space-y-6 mt-6">

            {/* Profile Image */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Profilbild</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profilbild" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="space-y-2">
                  <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <Button variant="outline" size="sm" onClick={() => imageRef.current.click()}>
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    {imagePreview ? 'Bild ändern' : 'Bild hochladen'}
                  </Button>
                  {imageFile && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Crop className="h-3 w-3" />{imageFile.name} (zugeschnitten)
                    </p>
                  )}
                  <p className="text-xs text-gray-400">JPG, PNG, max. 5 MB · wird automatisch zugeschnitten</p>
                </div>
              </div>
            </div>

            {/* Personal Data */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Persönliche Daten</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Vorname" required>
                  <Input value={profile.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Vorname" />
                </Field>
                <Field label="Nachname" required>
                  <Input value={profile.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Nachname" />
                </Field>
                <Field label="Geschlecht">
                  <Select value={profile.gender || ''} onValueChange={v => set('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="männlich">Männlich</SelectItem>
                      <SelectItem value="weiblich">Weiblich</SelectItem>
                      <SelectItem value="divers">Divers</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Alter">
                  <Input type="number" value={profile.age} onChange={e => set('age', e.target.value)} placeholder="z.B. 32" min="18" max="70" />
                </Field>
                <Field label="Nationalität" required>
                  <Input value={profile.nationality} onChange={e => set('nationality', e.target.value)} placeholder="z.B. Philippinen" />
                </Field>
                <Field label="Familienstand">
                  <Select value={profile.marital_status || ''} onValueChange={v => set('marital_status', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ledig">Ledig</SelectItem>
                      <SelectItem value="verheiratet">Verheiratet</SelectItem>
                      <SelectItem value="geschieden">Geschieden</SelectItem>
                      <SelectItem value="verwitwet">Verwitwet</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Anzahl Kinder">
                  <Input type="number" value={profile.children_count} onChange={e => set('children_count', e.target.value)} min="0" />
                </Field>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={profile.has_drivers_license} onCheckedChange={v => set('has_drivers_license', v)} />
                <Label>Führerschein Klasse B</Label>
              </div>
            </div>

            {/* Kontakt & Adresse */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Kontaktdaten & Adresse</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Geburtsdatum">
                  <Input type="date" value={profile.birth_date || ''} onChange={e => set('birth_date', e.target.value)} />
                </Field>
                <Field label="Telefon">
                  <Input type="tel" value={profile.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+49 170 123 4567" />
                </Field>
                <Field label="E-Mail (Kontakt)">
                  <Input type="email" value={profile.contact_email || ''} onChange={e => set('contact_email', e.target.value)} placeholder="name@example.com" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Straße & Hausnummer">
                  <Input value={profile.street || ''} onChange={e => set('street', e.target.value)} placeholder="Musterstraße 12" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="PLZ">
                    <Input value={profile.postal_code || ''} onChange={e => set('postal_code', e.target.value)} placeholder="10115" maxLength={10} />
                  </Field>
                  <Field label="Ort">
                    <Input value={profile.city || ''} onChange={e => set('city', e.target.value)} placeholder="Berlin" />
                  </Field>
                </div>
              </div>
              <Field label="Land">
                <Input value={profile.country || ''} onChange={e => set('country', e.target.value)} placeholder="Deutschland" />
              </Field>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Präferenzen</h3>
              <Field label="Berufsgruppe" required>
                <Select value={profile.berufsgruppe || ''} onValueChange={v => set('berufsgruppe', v)}>
                  <SelectTrigger><SelectValue placeholder="Berufsgruppe auswählen" /></SelectTrigger>
                  <SelectContent>
                    {BERUFSGRUPPEN.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-3">
                <Switch checked={profile.nationwide} onCheckedChange={v => set('nationwide', v)} />
                <Label>Bundesweit einsetzbar</Label>
              </div>
              {!profile.nationwide && (
                <Field label="Bevorzugte Bundesländer">
                  <MultiSelect
                    options={GERMAN_STATES}
                    value={profile.state_preferences}
                    onChange={v => set('state_preferences', v)}
                    placeholder="Bundesländer auswählen..."
                  />
                </Field>
              )}
              {profile.berufsgruppe && (() => {
                const field = getEinrichtungstypenField(profile.berufsgruppe)
                const options = EINRICHTUNGSTYPEN_BY_BERUFSGRUPPE[profile.berufsgruppe] || []
                const current = profile[field] || []
                const isFlexibel = current.includes(FLEXIBEL_OPTION)
                return (
                  <Field label="Bevorzugter Einrichtungstyp">
                    <MultiSelect
                      options={options}
                      value={current}
                      onChange={v => {
                        // Flexibel is mutually exclusive with others
                        const hadFlexibel = current.includes(FLEXIBEL_OPTION)
                        const nowFlexibel = v.includes(FLEXIBEL_OPTION)
                        let next = v
                        if (!hadFlexibel && nowFlexibel) next = [FLEXIBEL_OPTION]
                        else if (hadFlexibel && nowFlexibel && v.length > 1) next = v.filter(x => x !== FLEXIBEL_OPTION)
                        set(field, next)
                      }}
                      placeholder="Einrichtungstypen auswählen..."
                    />
                  </Field>
                )
              })()}
              <Field label="Arbeitszeitpräferenz">
                <Select value={profile.work_time_preference || ''} onValueChange={v => set('work_time_preference', v)}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    {WORK_TIME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Language Skills */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Sprachkenntnisse</h3>
                <Button variant="outline" size="sm" onClick={addLanguage}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Sprache
                </Button>
              </div>
              {(profile.language_skills || []).length === 0 ? (
                <p className="text-sm text-gray-400">Noch keine Sprachkenntnisse erfasst.</p>
              ) : (
                <div className="space-y-3">
                  {(profile.language_skills || []).map((lang, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <Input
                        value={lang.language}
                        onChange={e => updateLanguage(idx, 'language', e.target.value)}
                        placeholder="Sprache (z.B. Deutsch)"
                        className="flex-1"
                      />
                      <Select value={lang.level} onValueChange={v => updateLanguage(idx, 'level', v)}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Niveau" /></SelectTrigger>
                        <SelectContent>
                          {['A1','A2','B1','B2','C1','C2','Muttersprache'].map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => removeLanguage(idx)} className="shrink-0">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 space-y-3">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />Interne Bemerkungen
              </h3>
              <p className="text-xs text-amber-700">Diese Notizen sind nur für FKVI-Admins sichtbar und werden nie an Unternehmen weitergegeben.</p>
              <Textarea
                value={profile.internal_notes}
                onChange={e => set('internal_notes', e.target.value)}
                placeholder="Interne Anmerkungen, Besonderheiten..."
                rows={3}
              />
            </div>
          </TabsContent>

          {/* ── TAB: Lebenslauf ─────────────────────────────────────────── */}
          <TabsContent value="lebenslauf" className="space-y-6 mt-6">

            {/* Berufserfahrung */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Berufserfahrung</h3>
                <Button size="sm" variant="outline" onClick={addWork}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Hinzufügen
                </Button>
              </div>
              {(profile.work_experience || []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Noch keine Einträge. Klicke auf „Hinzufügen".</p>
              )}
              <div className="space-y-4">
                {(profile.work_experience || []).map((e, idx) => (
                  <div key={e.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stelle {idx + 1}</span>
                      <button type="button" onClick={() => removeWork(e.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Unternehmen / Einrichtung">
                        <Input value={e.company} onChange={ev => setWork(e.id, 'company', ev.target.value)} placeholder="Klinikum Berlin GmbH" />
                      </Field>
                      <Field label="Position / Berufsbezeichnung">
                        <Input value={e.position} onChange={ev => setWork(e.id, 'position', ev.target.value)} placeholder="Pflegefachkraft" />
                      </Field>
                      <Field label="Abteilung (optional)">
                        <Input value={e.department} onChange={ev => setWork(e.id, 'department', ev.target.value)} placeholder="Intensivstation" />
                      </Field>
                      <Field label="Beschäftigungsart">
                        <Select value={e.employment_type} onValueChange={v => setWork(e.id, 'employment_type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Vollzeit', 'Teilzeit', 'Minijob', 'Praktikum', 'Ausbildung', 'Freiberuflich', 'Sonstiges'].map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Von (Monat/Jahr)">
                        <Input type="month" value={e.start_date} onChange={ev => setWork(e.id, 'start_date', ev.target.value)} />
                      </Field>
                      <div className="space-y-1.5">
                        <Field label="Bis (Monat/Jahr)">
                          <Input type="month" value={e.end_date} onChange={ev => setWork(e.id, 'end_date', ev.target.value)} disabled={e.is_current} />
                        </Field>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input type="checkbox" checked={!!e.is_current} onChange={ev => { setWork(e.id, 'is_current', ev.target.checked); if (ev.target.checked) setWork(e.id, 'end_date', '') }} className="rounded" />
                          <span className="text-xs text-gray-500">Aktuelle Stelle</span>
                        </label>
                      </div>
                    </div>
                    <Field label="Tätigkeitsbeschreibung (optional)">
                      <Textarea value={e.description} onChange={ev => setWork(e.id, 'description', ev.target.value)} placeholder="Kurze Beschreibung der Aufgaben und Verantwortlichkeiten..." rows={2} />
                    </Field>
                  </div>
                ))}
              </div>
            </div>

            {/* Ausbildung & Weiterbildung */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Ausbildung & Weiterbildung</h3>

              {/* Hauptausbildung — statische Zusammenfassung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <Field label="Schulbildung">
                  <Input value={profile.school_education} onChange={e => set('school_education', e.target.value)} placeholder="z.B. Abitur" />
                </Field>
                <Field label="Pflegeausbildung">
                  <Input value={profile.nursing_education} onChange={e => set('nursing_education', e.target.value)} placeholder="z.B. Gesundheits- und Krankenpfleger/in" />
                </Field>
                <Field label="Ausbildungsdauer">
                  <Input value={profile.education_duration} onChange={e => set('education_duration', e.target.value)} placeholder="z.B. 3 Jahre" />
                </Field>
                <Field label="Abschlussjahr">
                  <Input type="number" value={profile.graduation_year} onChange={e => set('graduation_year', e.target.value)} placeholder="z.B. 2018" min="1990" max="2030" />
                </Field>
                <Field label="Anerkennung in Deutschland">
                  <Select value={profile.german_recognition || ''} onValueChange={v => set('german_recognition', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anerkannt">Anerkannt</SelectItem>
                      <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                      <SelectItem value="nicht_beantragt">Nicht beantragt</SelectItem>
                      <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Bemerkungen zur Ausbildung">
                <Textarea value={profile.education_notes} onChange={e => set('education_notes', e.target.value)} placeholder="Weitere Details zur Ausbildung..." rows={2} />
              </Field>

              {/* Weitere Einträge (dynamisch) */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium text-gray-700">Weitere Einträge</p>
                <Button size="sm" variant="outline" onClick={addEdu}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Hinzufügen
                </Button>
              </div>
              {(profile.education_history || []).length === 0 && (
                <p className="text-sm text-gray-400">Noch keine weiteren Einträge.</p>
              )}
              <div className="space-y-4">
                {(profile.education_history || []).map((e, idx) => (
                  <div key={e.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Eintrag {idx + 1}</span>
                      <button type="button" onClick={() => removeEdu(e.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Schule / Hochschule / Institution">
                        <Input value={e.institution} onChange={ev => setEdu(e.id, 'institution', ev.target.value)} placeholder="Pflegeschule Berlin" />
                      </Field>
                      <Field label="Abschluss / Qualifikation">
                        <Input value={e.degree} onChange={ev => setEdu(e.id, 'degree', ev.target.value)} placeholder="Gesundheits- und Krankenpfleger/in" />
                      </Field>
                      <Field label="Fachbereich (optional)">
                        <Input value={e.field} onChange={ev => setEdu(e.id, 'field', ev.target.value)} placeholder="Gesundheit & Pflege" />
                      </Field>
                      <div className="hidden sm:block" />
                      <Field label="Von (Monat/Jahr)">
                        <Input type="month" value={e.start_date} onChange={ev => setEdu(e.id, 'start_date', ev.target.value)} />
                      </Field>
                      <Field label="Bis (Monat/Jahr)">
                        <Input type="month" value={e.end_date} onChange={ev => setEdu(e.id, 'end_date', ev.target.value)} />
                      </Field>
                    </div>
                    <Field label="Anmerkungen (optional)">
                      <Textarea value={e.notes} onChange={ev => setEdu(e.id, 'notes', ev.target.value)} placeholder="z.B. Schwerpunkte, Auszeichnungen..." rows={2} />
                    </Field>
                  </div>
                ))}
              </div>
            </div>

            {/* Persönliche Fähigkeiten */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Persönliche Fähigkeiten & Kompetenzen</h3>
              <p className="text-xs text-gray-500">Gib eine Fähigkeit ein und drücke Enter oder Komma zum Hinzufügen.</p>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-gray-200 rounded-lg bg-gray-50">
                {(profile.personal_skills || []).map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1.5 bg-[#1a3a5c]/10 text-[#1a3a5c] text-sm font-medium px-3 py-1 rounded-full">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="text-[#1a3a5c]/50 hover:text-[#1a3a5c] transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-gray-400"
                  placeholder="z.B. Wundversorgung, Palliativpflege..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addSkill(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  onBlur={e => {
                    if (e.target.value.trim()) {
                      addSkill(e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>
            </div>

          </TabsContent>

          {/* ── TAB: Erfahrung ──────────────────────────────────────────── */}
          <TabsContent value="experience" className="space-y-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Berufserfahrung</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Berufserfahrung gesamt (Jahre)">
                  <Input type="number" value={profile.total_experience_years} onChange={e => set('total_experience_years', e.target.value)} placeholder="z.B. 5" min="0" step="0.5" />
                </Field>
                <Field label="Davon in Deutschland (Jahre)">
                  <Input type="number" value={profile.germany_experience_years} onChange={e => set('germany_experience_years', e.target.value)} placeholder="z.B. 2" min="0" step="0.5" />
                </Field>
              </div>
              <Field label="Erfahrung in Bereichen">
                <MultiSelect options={EXPERIENCE_AREAS} value={profile.experience_areas} onChange={v => set('experience_areas', v)} placeholder="Erfahrungsbereiche auswählen..." />
              </Field>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Qualifikationen</h3>
              {profile.berufsgruppe && (() => {
                const field = getSpecializationsField(profile.berufsgruppe)
                const options = SPECIALIZATIONS_BY_BERUFSGRUPPE[profile.berufsgruppe] || []
                const label = getSpecializationsLabel(profile.berufsgruppe)
                return (
                  <Field label={label}>
                    <MultiSelect options={options} value={profile[field] || []} onChange={v => set(field, v)} placeholder={`${label} auswählen...`} />
                  </Field>
                )
              })()}
              <Field label="Zusatzqualifikationen">
                <MultiSelect
                  options={['Wundmanagement', 'Kinästhetik', 'Diabetes-Beratung', 'Palliative Care', 'Basale Stimulation', 'Aromapflege', 'Sturzprävention']}
                  value={profile.additional_qualifications}
                  onChange={v => set('additional_qualifications', v)}
                  placeholder="Zusatzqualifikationen auswählen..."
                />
              </Field>
              <Field label="Pflegekompetenznachweis FKVI">
                <Input value={profile.fkvi_competency_proof} onChange={e => set('fkvi_competency_proof', e.target.value)} placeholder="z.B. Bestanden am 01.01.2024" />
              </Field>
            </div>
          </TabsContent>

          {/* ── TAB: Medien ─────────────────────────────────────────────── */}
          <TabsContent value="media" className="space-y-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Video className="h-5 w-5 text-fkvi-teal" />Präsentationsvideo (Vimeo)
              </h3>

              {/* ── Video already saved ── */}
              {profile.vimeo_video_url ? (
                <div className="space-y-4">
                  <VimeoPlayer url={profile.vimeo_video_url} showToggle />
                  <div className="flex items-center gap-2 pt-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-700 flex-1">Video verknüpft</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await supabase.from('profiles').update({ vimeo_video_url: '', vimeo_video_id: '' }).eq('id', id)
                        set('vimeo_video_url', '')
                        set('vimeo_video_id', '')
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />Video entfernen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isEdit ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Speichern Sie das Profil zuerst, um ein Video hinzuzufügen.</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Mode toggle */}
                      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                          onClick={() => setVideoMode('upload')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${videoMode === 'upload' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Upload className="h-3.5 w-3.5" />Datei hochladen
                        </button>
                        <button
                          onClick={() => setVideoMode('url')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${videoMode === 'url' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Link2 className="h-3.5 w-3.5" />Vimeo-URL eingeben
                        </button>
                      </div>

                      {/* Upload mode */}
                      {videoMode === 'upload' && (
                        <div className="space-y-3">
                          <div
                            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-fkvi-teal/50 hover:bg-fkvi-teal/5 transition-colors"
                            onClick={() => !videoUploading && videoRef.current.click()}
                          >
                            <Video className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 mb-1">Video direkt zu Vimeo hochladen</p>
                            <p className="text-xs text-gray-400 mb-3">Hochformat (9:16) und Querformat werden unterstützt</p>
                            <input
                              ref={videoRef}
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={e => { setVideoFile(e.target.files[0]); setUploadProgress(null) }}
                              disabled={videoUploading}
                            />
                            <Button variant="outline" size="sm" disabled={videoUploading} onClick={e => { e.stopPropagation(); videoRef.current.click() }}>
                              <Upload className="h-3.5 w-3.5 mr-1.5" />Datei auswählen
                            </Button>
                            {videoFile && (
                              <p className="text-xs text-gray-600 mt-2 font-medium">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                            )}
                          </div>

                          {/* Progress bar */}
                          {videoUploading && uploadProgress !== null && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Wird hochgeladen…</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-fkvi-teal rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {videoFile && !videoUploading && (
                            <Button
                              onClick={handleVideoUpload}
                              className="w-full bg-fkvi-teal hover:bg-fkvi-teal/90 text-white"
                            >
                              <Upload className="mr-2 h-4 w-4" />Video zu Vimeo hochladen
                            </Button>
                          )}

                          {videoUploading && (
                            <Button disabled className="w-full">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />Upload läuft…
                            </Button>
                          )}
                        </div>
                      )}

                      {/* URL mode */}
                      {videoMode === 'url' && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500">Bereits bei Vimeo hochgeladenes Video verknüpfen</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://vimeo.com/123456789 oder Video-ID"
                              value={urlInput}
                              onChange={e => setUrlInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleUrlSave()}
                              className="flex-1"
                            />
                            <Button onClick={handleUrlSave} className="bg-fkvi-teal hover:bg-fkvi-teal/90 text-white shrink-0">
                              Speichern
                            </Button>
                          </div>
                          <p className="text-xs text-gray-400">Beispiele: vimeo.com/123456789 · player.vimeo.com/video/123456789 · 123456789</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: Dokumente ──────────────────────────────────────────── */}
          <TabsContent value="documents" className="space-y-4 mt-6">
            {/* Edit dialog */}
            {editingDoc && (
              <DocEditDialog
                doc={editingDoc.doc}
                onSave={handleSaveDoc}
                onClose={() => setEditingDoc(null)}
              />
            )}

            {/* Delete stored doc confirmation */}
            {deletingDocIdx !== null && (
              <Dialog open onOpenChange={open => !open && setDeletingDocIdx(null)}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />Dokument löschen?
                    </DialogTitle>
                    <DialogDescription>
                      <strong>„{documents[deletingDocIdx]?.title || 'Dieses Dokument'}"</strong> wird unwiderruflich entfernt.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletingDocIdx(null)}>Abbrechen</Button>
                    <Button variant="destructive" onClick={() => { handleRemoveDoc(deletingDocIdx); setDeletingDocIdx(null) }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Löschen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* ── Unified documents card ── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Dokumente
                  {documents.length > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {documents.length}
                    </span>
                  )}
                  {(docSaving || (isEdit && docSendsLoading)) && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                </h3>
                <div className="flex items-center gap-2">
                  {(selectedDocIndices.size > 0 || cvSelected) && (
                    <>
                      <span className="text-xs text-[#1a3a5c] font-medium">
                        {selectedDocIndices.size + (cvSelected ? 1 : 0)} ausgewählt
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-500"
                        onClick={() => { setSelectedDocIndices(new Set()); setCvSelected(false) }}
                      >
                        <X className="h-3 w-3 mr-1" />Auswahl
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#0d9488] hover:bg-[#0d9488]/90 text-white"
                        onClick={() => setShowUnifiedSend(true)}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />Versenden ({selectedDocIndices.size + (cvSelected ? 1 : 0)})
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Hinzufügen
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {/* ── Auto-Lebenslauf (selectable) ── */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${cvSelected ? 'bg-blue-50/60' : 'bg-teal-50/40 hover:bg-teal-50/70'}`}
                  onClick={() => setCvSelected(v => !v)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${cvSelected ? 'bg-[#1a3a5c] border-[#1a3a5c]' : 'border-gray-300 group-hover:border-[#1a3a5c]/40'}`}>
                    {cvSelected && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">Lebenslauf</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[profile.first_name, profile.last_name].filter(Boolean).join(' ')}
                      {profile.beruf ? ` · ${profile.beruf}` : ''}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-100 px-2 py-1 rounded-full font-medium shrink-0">
                    <CheckCircle2 className="h-3 w-3" />Immer aktuell
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setShowCvModal(true) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors shrink-0"
                    title="Lebenslauf als PDF ansehen"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* ── Gespeicherte Dokumente ── */}
                {documents.map((doc, idx) => {
                  const isSelected = selectedDocIndices.has(idx)
                  const toggleSelect = () => {
                    setSelectedDocIndices(prev => {
                      const next = new Set(prev)
                      isSelected ? next.delete(idx) : next.add(idx)
                      return next
                    })
                  }
                  // Find latest signed send for this template doc
                  const templateId = doc.doc_type === 'template' && doc.link?.startsWith('template:')
                    ? doc.link.replace('template:', '')
                    : null
                  const signedSend = templateId
                    ? docSends.find(s => s.template_id === templateId && (s.status === 'submitted' || s.status === 'signed'))
                    : null
                  const pendingSend = templateId
                    ? docSends.find(s => s.template_id === templateId && (s.status === 'pending' || s.status === 'opened'))
                    : null
                  const isSendRef = doc.doc_type === 'send_ref'
                  const sendRefId = isSendRef ? doc.link?.replace('send:', '') : null

                  // Determine icon
                  const iconBg = signedSend ? 'bg-green-100' : isSendRef ? 'bg-green-50' : doc.doc_type === 'template' ? 'bg-violet-50' : 'bg-blue-50'
                  const iconEl = signedSend
                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                    : isSendRef ? <FileText className="h-4 w-4 text-green-600" />
                    : doc.doc_type === 'upload' ? <Upload className="h-4 w-4 text-fkvi-blue" />
                    : doc.doc_type === 'template' ? <FileText className="h-4 w-4 text-violet-500" />
                    : <Link2 className="h-4 w-4 text-fkvi-blue" />

                  const subtitleEl = signedSend
                    ? <span className="text-green-600 font-medium">Unterzeichnet – {new Date(signedSend.signed_at || signedSend.submitted_at).toLocaleDateString('de-DE')} {new Date(signedSend.signed_at || signedSend.submitted_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                    : pendingSend
                    ? <span className="text-amber-600">{pendingSend.status === 'opened' ? 'Geöffnet, noch nicht ausgefüllt' : 'Versendet, noch ausstehend'}</span>
                    : isSendRef
                    ? <span className="text-green-600">Signiertes Dokument</span>
                    : doc.description || (doc.doc_type === 'template' ? 'Vorlage' : 'Hochgeladen')

                  // Build tooltip content
                  const childSend = signedSend?.child_send || null
                  const tooltipLines = []
                  if (signedSend) {
                    const d = new Date(signedSend.signed_at || signedSend.submitted_at)
                    tooltipLines.push(`Fachkraft ausgefüllt: ${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`)
                    if (signedSend.signer_name) tooltipLines.push(`Von: ${signedSend.signer_name}`)
                  }
                  if (childSend && (childSend.status === 'submitted' || childSend.status === 'signed')) {
                    const dc = new Date(childSend.signed_at || childSend.submitted_at)
                    tooltipLines.push(`Unternehmen ausgefüllt: ${dc.toLocaleDateString('de-DE')} ${dc.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`)
                    if (childSend.signer_name) tooltipLines.push(`Von: ${childSend.signer_name}`)
                  }

                  return (
                    <div
                      key={idx}
                      className={`relative flex items-center gap-3 px-4 py-3 transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50/60' : (signedSend || isSendRef) ? 'bg-green-50/30 hover:bg-green-50/50' : 'hover:bg-gray-50/50'}`}
                      onClick={toggleSelect}
                    >
                      {/* Hover tooltip */}
                      {tooltipLines.length > 0 && (
                        <div className="absolute left-12 bottom-full mb-1.5 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                          {tooltipLines.map((line, i) => <p key={i}>{line}</p>)}
                          <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                        </div>
                      )}
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#1a3a5c] border-[#1a3a5c]' : 'border-gray-300 group-hover:border-[#1a3a5c]/40'}`}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                        {iconEl}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{doc.title || <span className="text-gray-400 italic">Kein Titel</span>}</p>
                        <p className="text-xs text-gray-400 truncate">{subtitleEl}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {signedSend ? (
                          <button
                            onClick={() => handleDownloadSend(signedSend.id)}
                            disabled={downloadingSendId === signedSend.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-green-700 bg-green-100 hover:bg-green-200 transition-colors text-xs font-medium"
                            title="Unterzeichnetes PDF herunterladen"
                          >
                            {downloadingSendId === signedSend.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            PDF
                          </button>
                        ) : isSendRef && sendRefId ? (
                          <button
                            onClick={() => handleDownloadSend(sendRefId)}
                            disabled={downloadingSendId === sendRefId}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-green-700 bg-green-100 hover:bg-green-200 transition-colors text-xs font-medium"
                            title="Signiertes PDF herunterladen"
                          >
                            {downloadingSendId === sendRefId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            PDF
                          </button>
                        ) : doc.link && !doc.link.startsWith('template:') ? (
                          <a href={doc.link} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-fkvi-blue hover:bg-blue-50 transition-colors" title="Öffnen">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                        <button onClick={() => setEditingDoc({ idx, doc })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Bearbeiten">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeletingDocIdx(idx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Löschen">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}


                {/* ── Empty state ── */}
                {documents.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm font-medium text-gray-500">Noch keine Dokumente hinzugefügt</p>
                    <p className="text-xs mt-1">Klicke auf „Hinzufügen" um loszulegen, dann Dokument(e) auswählen und versenden.</p>
                  </div>
                )}
              </div>

              {/* ── Send hint ── */}
              {isEdit && documents.length === 0 && !cvSelected && selectedDocIndices.size === 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-400">Dokumente auswählen und dann „Versenden" klicken, oder über „Hinzufügen" neue hinzufügen.</p>
                </div>
              )}

            </div>

            {!isEdit && documents.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                Dokumente werden beim Speichern des Profils gespeichert.
              </p>
            )}

            {/* AddDocumentModal */}
            {showAddModal && (
              <AddDocumentModal
                profileId={id}
                session={session}
                onAddDoc={async (doc) => {
                  const updated = [...documents, doc]
                  setDocuments(updated)
                  if (isEdit) await saveDocumentsToApi(updated)
                }}
                onSendTemplate={() => { setSendDocInitial({ fixedSource: 'template' }); setSendTemplateDialog(true) }}
                onClose={() => setShowAddModal(false)}
              />
            )}

            {/* UnifiedSendDialog */}
            {showUnifiedSend && (selectedDocIndices.size > 0 || cvSelected) && (
              <UnifiedSendDialog
                docs={[
                  ...(cvSelected ? [{ title: 'Lebenslauf', link: `cv:${id}`, doc_type: 'cv', isCv: true }] : []),
                  ...[...selectedDocIndices].map(i => documents[i]).filter(Boolean),
                ]}
                profile={profile}
                entityType="profile"
                entityId={id}
                session={session}
                onClose={() => { setShowUnifiedSend(false); setSelectedDocIndices(new Set()); setCvSelected(false) }}
                onSent={loadDocSends}
              />
            )}

            {/* DocSendDialog for templates with form fields */}
            {sendTemplateDialog && (
              <DocSendDialog
                entityType="profile"
                entityId={id}
                profile={profile}
                activeVermittlungen={[]}
                session={session}
                fixedSource={sendDocInitial?.fixedSource || null}
                onClose={() => { setSendTemplateDialog(false); setSendDocInitial(null) }}
                onSent={loadDocSends}
              />
            )}
          </TabsContent>

          {/* ── TAB: Versandhistorie ─────────────────────────────────── */}
          <TabsContent value="versandhistorie" className="space-y-4 mt-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <Send className="h-4 w-4 text-gray-400" />
                  Versandhistorie
                  {docSends.length > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{docSends.length}</span>
                  )}
                  {docSendsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                </h3>
                <button onClick={loadDocSends} disabled={docSendsLoading} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 disabled:opacity-50">
                  <Loader2 className={`h-3 w-3 ${docSendsLoading ? 'animate-spin' : ''}`} />Aktualisieren
                </button>
              </div>

              {docSends.length === 0 && !docSendsLoading ? (
                <div className="text-center py-12 text-gray-400">
                  <Send className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">Noch keine Dokumente versendet</p>
                  <p className="text-xs mt-1">Versendete Dokumente erscheinen hier mit Öffnungs- und Ausfüll-Status.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dokument</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Versendet</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Geöffnet</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ausgefüllt</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {docSends.map(send => {
                        const isSigned = send.status === 'submitted' || send.status === 'signed'
                        const isRevoked = send.status === 'revoked'
                        const isConfirmingDelete = deletingSendId === send.id
                        const isHistoryOpen = expandedSendIds.has(send.id)
                        return (
                          <>
                          <tr key={send.id} className={`transition-colors ${isSigned ? 'bg-green-50/30' : 'hover:bg-gray-50/40'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSigned ? 'bg-green-100' : 'bg-violet-50'}`}>
                                  <FileText className={`h-3.5 w-3.5 ${isSigned ? 'text-green-600' : 'text-violet-500'}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-800 truncate max-w-[200px]">{send.display_title || send.template_name || send.bundle_title || '–'}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {send.signer_name && <span className="text-[11px] text-gray-400">{send.signer_name}</span>}
                                    {send.send_mode === 'view' && <span className="text-[10px] text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">Ansehen</span>}
                                    {isRevoked && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Widerrufen</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs text-gray-700">{new Date(send.created_at).toLocaleDateString('de-DE')}</p>
                              <p className="text-[11px] text-gray-400">{new Date(send.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {send.first_opened_at ? (
                                <>
                                  <p className="text-xs text-blue-700">{new Date(send.first_opened_at).toLocaleDateString('de-DE')}</p>
                                  <p className="text-[11px] text-blue-400">{new Date(send.first_opened_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                    {send.open_count > 1 && <span className="ml-1 text-gray-400">({send.open_count}×)</span>}
                                  </p>
                                </>
                              ) : (
                                <span className="text-xs text-gray-300">–</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isSigned ? (
                                <>
                                  <p className="text-xs text-green-700 font-medium">{new Date(send.signed_at || send.submitted_at).toLocaleDateString('de-DE')}</p>
                                  <p className="text-[11px] text-green-500">{new Date(send.signed_at || send.submitted_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                </>
                              ) : send.status === 'opened' ? (
                                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Geöffnet</span>
                              ) : isRevoked ? null : (
                                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Ausstehend</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5 justify-end">
                                {isConfirmingDelete ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleDeleteSend(send.id)} disabled={deletingSendBusy}
                                      className="text-xs text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">
                                      {deletingSendBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Löschen'}
                                    </button>
                                    <span className="text-gray-300 text-xs">|</span>
                                    <button onClick={() => setDeletingSendId(null)} className="text-xs text-gray-500 hover:text-gray-700">Nein</button>
                                  </div>
                                ) : (
                                  <>
                                    {isSigned && send.send_mode !== 'view' && (
                                      <button onClick={() => handleDownloadSend(send.id)} disabled={downloadingSendId === send.id}
                                        className="p-1.5 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-100 transition-colors inline-flex" title="PDF herunterladen">
                                        {downloadingSendId === send.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                      </button>
                                    )}
                                    {!isSigned && send.signer_url && (
                                      <a href={send.signer_url} target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a3a5c] hover:bg-blue-50 transition-colors inline-flex" title="Link öffnen">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                    <button onClick={() => toggleSendHistory(send.id)}
                                      className={`p-1.5 rounded-lg transition-colors inline-flex ${isHistoryOpen ? 'text-[#1a3a5c] bg-blue-50' : 'text-gray-300 hover:text-[#1a3a5c] hover:bg-blue-50'}`}
                                      title="Historie anzeigen">
                                      <History className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => setDeletingSendId(send.id)}
                                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors inline-flex" title="Löschen">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isHistoryOpen && (
                            <tr key={`${send.id}-history`} className="bg-gray-50/70">
                              <td colSpan={5} className="px-6 py-3">
                                <div className="flex items-start gap-6 flex-wrap">
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-full mb-1">Dokumenten-Historie</p>
                                  {/* Step: Sent */}
                                  <div className="flex items-start gap-2 min-w-[120px]">
                                    <div className="w-5 h-5 rounded-full bg-[#1a3a5c]/10 flex items-center justify-center shrink-0 mt-0.5">
                                      <Send className="h-2.5 w-2.5 text-[#1a3a5c]" />
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold text-gray-600">Versendet</p>
                                      <p className="text-[11px] text-gray-400">{new Date(send.created_at).toLocaleDateString('de-DE')} {new Date(send.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                      {send.signer_name && <p className="text-[11px] text-gray-400">an {send.signer_name}</p>}
                                    </div>
                                  </div>
                                  {/* Step: Opened */}
                                  <div className="flex items-start gap-2 min-w-[120px]">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${send.first_opened_at ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                      <Eye className={`h-2.5 w-2.5 ${send.first_opened_at ? 'text-blue-600' : 'text-gray-300'}`} />
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold text-gray-600">Geöffnet</p>
                                      {send.first_opened_at ? (
                                        <>
                                          <p className="text-[11px] text-blue-600">{new Date(send.first_opened_at).toLocaleDateString('de-DE')} {new Date(send.first_opened_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                          {send.open_count > 1 && <p className="text-[11px] text-gray-400">{send.open_count}× geöffnet</p>}
                                        </>
                                      ) : <p className="text-[11px] text-gray-300">Noch nicht geöffnet</p>}
                                    </div>
                                  </div>
                                  {/* Step: Filled */}
                                  <div className="flex items-start gap-2 min-w-[120px]">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSigned ? 'bg-green-100' : 'bg-gray-100'}`}>
                                      <CheckCircle2 className={`h-2.5 w-2.5 ${isSigned ? 'text-green-600' : 'text-gray-300'}`} />
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold text-gray-600">Ausgefüllt</p>
                                      {isSigned ? (
                                        <>
                                          <p className="text-[11px] text-green-600 font-medium">{new Date(send.signed_at || send.submitted_at).toLocaleDateString('de-DE')} {new Date(send.signed_at || send.submitted_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                          {send.signer_name && <p className="text-[11px] text-gray-400">von {send.signer_name}</p>}
                                        </>
                                      ) : <p className="text-[11px] text-gray-300">Noch ausstehend</p>}
                                    </div>
                                  </div>
                                  {/* Parent send step (chain) */}
                                  {send.parent_send && (
                                    <div className="flex items-start gap-2 min-w-[120px]">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${send.parent_send.status === 'submitted' || send.parent_send.status === 'signed' ? 'bg-teal-100' : 'bg-gray-100'}`}>
                                        <User className={`h-2.5 w-2.5 ${send.parent_send.status === 'submitted' || send.parent_send.status === 'signed' ? 'text-teal-600' : 'text-gray-300'}`} />
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-semibold text-gray-600">Von FK ausgefüllt</p>
                                        {(send.parent_send.status === 'submitted' || send.parent_send.status === 'signed') ? (
                                          <>
                                            <p className="text-[11px] text-teal-600">{new Date(send.parent_send.signed_at || send.parent_send.submitted_at).toLocaleDateString('de-DE')} {new Date(send.parent_send.signed_at || send.parent_send.submitted_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                            {send.parent_send.signer_name && <p className="text-[11px] text-gray-400">{send.parent_send.signer_name}</p>}
                                          </>
                                        ) : <p className="text-[11px] text-gray-300">Noch nicht ausgefüllt</p>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {docSends.some(s => s.status === 'submitted' || s.status === 'signed') && (
                <div className="px-4 py-3 border-t border-gray-100 bg-green-50/50 flex items-center gap-2 text-xs text-green-700">
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  Unterzeichnete Dokumente sind auch im <strong className="mx-1">Postfach</strong> verfügbar.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />Profil unwiderruflich löschen?
            </DialogTitle>
            <DialogDescription>
              Das Profil von <strong>{profile.first_name} {profile.last_name}</strong> wird dauerhaft gelöscht inkl. aller Dokumente.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteProfile}>
              <Trash2 className="h-4 w-4 mr-2" />Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CV preview modal */}
      {showCvModal && (
        <CvPreviewModal
          profile={profile}
          documents={documents}
          onClose={() => setShowCvModal(false)}
        />
      )}

      {/* Reserve dialog */}
      <Dialog open={reserveDialog} onOpenChange={setReserveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-fkvi-blue" />Unternehmen zuordnen
            </DialogTitle>
            <DialogDescription>
              Wähle ein freigeschaltetes Unternehmen, dem <strong>{profile.first_name} {profile.last_name}</strong> zugeordnet werden soll.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Input
              placeholder="Suche nach Firma, Ansprechpartner oder E-Mail..."
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
              autoFocus
            />
            {companies.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Keine Unternehmen gefunden. Bitte zuerst ein Unternehmen im CRM anlegen.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-1">
                {companies
                  .filter(c => {
                    const q = companySearch.toLowerCase()
                    if (!q) return true
                    return (
                      c.company_name?.toLowerCase().includes(q) ||
                      c.email?.toLowerCase().includes(q) ||
                      `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q)
                    )
                  })
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCompanyId(c.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                        selectedCompanyId === c.id
                          ? 'bg-fkvi-blue text-white'
                          : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {c.company_name}
                        {c.email && (
                          <span className={`font-normal ml-1 ${selectedCompanyId === c.id ? 'text-white/70' : 'text-gray-400'}`}>
                            ({c.email})
                          </span>
                        )}
                      </p>
                      {(c.first_name || c.last_name) && (
                        <p className={`text-xs mt-0.5 ${selectedCompanyId === c.id ? 'text-white/60' : 'text-gray-400'}`}>
                          {`${c.first_name || ''} ${c.last_name || ''}`.trim()}
                        </p>
                      )}
                    </button>
                  ))}
                {companies.filter(c => {
                  const q = companySearch.toLowerCase()
                  if (!q) return true
                  return (
                    c.company_name?.toLowerCase().includes(q) ||
                    c.email?.toLowerCase().includes(q) ||
                    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q)
                  )
                }).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Treffer für „{companySearch}"</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialog(false)}>Abbrechen</Button>
            <Button onClick={handleReserve} disabled={!selectedCompanyId || reserving}>
              {reserving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bookmark className="h-4 w-4 mr-2" />}
              Vermittlung starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
