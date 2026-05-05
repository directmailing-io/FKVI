import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'

import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Type, CheckSquare, PenLine, Calendar,
  Trash2, Save, ChevronLeft, ChevronRight, Loader2,
  ArrowLeft, AlertCircle, Plus, CheckCircle2, X, ChevronDown, Search,
} from 'lucide-react'

function XBoxIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  )
}

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// ─── Constants ────────────────────────────────────────────────────────────────

// Fachkraft = grün, Unternehmen = blau — gilt für alle Feldtypen
const AUD = {
  fachkraft:   { border: 'border-green-500', bg: 'bg-green-50',  text: 'text-green-700', ring: 'ring-green-400', labelBorder: 'border-green-200', labelIcon: 'text-green-500', labelText: 'text-green-700', dashedSelected: 'border-green-500 bg-green-50/60',  dashedNormal: 'border-green-400 bg-green-50/20 hover:bg-green-50/40',  optionSelected: 'border-green-500 bg-green-100', optionNormal: 'border-green-400 bg-green-50 hover:bg-green-100', optionInner: 'border-green-500', optionLabel: 'text-green-600' },
  unternehmen: { border: 'border-blue-500',  bg: 'bg-blue-50',   text: 'text-blue-700',  ring: 'ring-blue-400',  labelBorder: 'border-blue-200',  labelIcon: 'text-blue-500',  labelText: 'text-blue-700',  dashedSelected: 'border-blue-500 bg-blue-50/60',   dashedNormal: 'border-blue-400 bg-blue-50/20 hover:bg-blue-50/40',   optionSelected: 'border-blue-500 bg-blue-100',   optionNormal: 'border-blue-400 bg-blue-50 hover:bg-blue-100',   optionInner: 'border-blue-500',  optionLabel: 'text-blue-600'  },
}

const FIELD_TYPES = [
  { key: 'text',         label: 'Text',           icon: Type,        fachkraft: AUD.fachkraft, unternehmen: AUD.unternehmen },
  { key: 'boolean_mark', label: 'Ja/Nein-Kreuz',  icon: XBoxIcon,    fachkraft: AUD.fachkraft, unternehmen: AUD.unternehmen },
  { key: 'checkbox',     label: 'Checkbox',        icon: CheckSquare, fachkraft: AUD.fachkraft, unternehmen: AUD.unternehmen },
  { key: 'signature',    label: 'Unterschrift',    icon: PenLine,     fachkraft: AUD.fachkraft, unternehmen: AUD.unternehmen },
  { key: 'date',         label: 'Datum',           icon: Calendar,    fachkraft: AUD.fachkraft, unternehmen: AUD.unternehmen },
]

const FIELD_TYPE_MAP = Object.fromEntries(FIELD_TYPES.map(t => [t.key, t]))

// ─── Prefill data ─────────────────────────────────────────────────────────────
// Each entry: { value, label, group, isMark? }
const ALL_PREFILL = [
  // ── Allgemein ──
  { value: '',             label: 'Kein Vorausfüllen',        group: null },
  { value: 'today',        label: 'Heutiges Datum',           group: '📅 Allgemein' },
  { value: 'signer.name',  label: 'Name Unterzeichner',       group: '📅 Allgemein' },

  // ── Fachkraft: Stammdaten ──
  { value: 'profile.full_name',              label: 'Vollständiger Name (Vor- und Nachname)', group: '👤 Stammdaten' },
  { value: 'profile.first_name',             label: 'Vorname',                          group: '👤 Stammdaten' },
  { value: 'profile.last_name',              label: 'Nachname',                         group: '👤 Stammdaten' },
  { value: 'profile.gender',                 label: 'Geschlecht',                       group: '👤 Stammdaten' },
  { value: 'profile.birth_date',             label: 'Geburtsdatum',                     group: '👤 Stammdaten' },
  { value: 'profile.birth_city',             label: 'Geburtsort',                       group: '👤 Stammdaten' },
  { value: 'profile.age',                    label: 'Alter',                            group: '👤 Stammdaten' },
  { value: 'profile.nationality',            label: 'Nationalität',                     group: '👤 Stammdaten' },
  { value: 'profile.country',               label: 'Herkunftsland',                    group: '👤 Stammdaten' },
  { value: 'profile.contact_email',          label: 'E-Mail',                           group: '👤 Stammdaten' },
  { value: 'profile.phone',                  label: 'Telefon',                          group: '👤 Stammdaten' },
  { value: 'profile.marital_status',         label: 'Familienstand',                    group: '👤 Stammdaten' },
  { value: 'profile.children_count',         label: 'Anzahl Kinder',                    group: '👤 Stammdaten' },

  // ── Fachkraft: Adresse ──
  { value: 'profile.street',                label: 'Straße',                           group: '🏠 Adresse FK' },
  { value: 'profile.house_number',          label: 'Hausnummer',                       group: '🏠 Adresse FK' },
  { value: 'profile.postal_code',           label: 'PLZ',                              group: '🏠 Adresse FK' },
  { value: 'profile.city',                  label: 'Stadt',                            group: '🏠 Adresse FK' },
  { value: 'profile.residence_since',       label: 'Wohnsitz seit',                    group: '🏠 Adresse FK' },

  // ── Fachkraft: Erw. Stammdaten ──
  { value: 'profile.social_security_number', label: 'Rentenversicherungsnummer',        group: '📋 Erw. Stammdaten FK' },
  { value: 'profile.ba_customer_number',     label: 'Kundennummer BA (FK)',             group: '📋 Erw. Stammdaten FK' },
  { value: 'profile.aufenthaltstitel',       label: 'Aufenthaltstitel',                 group: '📋 Erw. Stammdaten FK' },
  { value: 'profile.aufenthaltstitel_bis',   label: 'Aufenthaltstitel gültig bis',      group: '📋 Erw. Stammdaten FK' },
  { value: 'profile.disability',             label: 'Schwerbehinderung (Text: Ja/Nein)',group: '📋 Erw. Stammdaten FK' },

  // ── Fachkraft: Berufsqualifikation ──
  { value: 'profile.berufsgruppe',           label: 'Berufsgruppe',                     group: '🎓 Berufsqualifikation' },
  { value: 'profile.nursing_education',      label: 'Ausbildungsbezeichnung',           group: '🎓 Berufsqualifikation' },
  { value: 'profile.education_duration',     label: 'Ausbildungsdauer',                 group: '🎓 Berufsqualifikation' },
  { value: 'profile.graduation_year',        label: 'Abschlussjahr',                    group: '🎓 Berufsqualifikation' },
  { value: 'profile.german_recognition',     label: 'Anerkennung in Deutschland',       group: '🎓 Berufsqualifikation' },
  { value: 'profile.total_experience_years', label: 'Berufserfahrung gesamt (Jahre)',   group: '🎓 Berufsqualifikation' },
  { value: 'profile.germany_experience_years', label: 'Erfahrung in Deutschland (J.)', group: '🎓 Berufsqualifikation' },
  { value: 'profile.work_time_preference',   label: 'Arbeitszeitpräferenz',             group: '🎓 Berufsqualifikation' },

  // ── Fachkraft: Qualifikation JSONB ──
  { value: 'profile.qualifikation.berufsbezeichnung',        label: 'Qual.: Berufsbezeichnung',          group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.ausbildungseinrichtung',   label: 'Qual.: Ausbildungseinrichtung',     group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.studiengang',              label: 'Qual.: Studiengang',                group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.zeugnis_datum',            label: 'Qual.: Zeugnisdatum',               group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.ausbildung_von',           label: 'Qual.: Ausbildung von',             group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.ausbildung_bis',           label: 'Qual.: Ausbildung bis',             group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.anerkennungsnachweis',     label: 'Qual.: Art des Anerkennungsnachweises', group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.ungelernt_seit',           label: 'Qual.: Ungelernt tätig seit',       group: '📄 Qualifikation (JSONB)' },
  { value: 'profile.qualifikation.sonstige',                 label: 'Qual.: Sonstige Qualifikationen',   group: '📄 Qualifikation (JSONB)' },

  // ── Fachkraft: Ja/Nein-Kreuz ──
  { value: 'profile.disability_mark',                              label: 'Schwerbehinderung',              group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.has_drivers_license_mark',                     label: 'Führerschein vorhanden',         group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.qualifikation.berufsabschluss_vorhanden_mark', label: 'Berufsabschluss vorhanden',      group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.qualifikation.hochschulabschluss_vorhanden_mark', label: 'Hochschulabschluss vorhanden', group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.qualifikation.im_erlernten_beruf_taetig_mark', label: 'Im erlernten Beruf tätig',       group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.qualifikation.mehr_4_jahre_ungelernt_mark',    label: 'Mehr als 4 J. ungelernt',        group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.soziales.sprachzertifikat_vorhanden_mark',     label: 'Sprachzertifikat vorhanden',     group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.soziales.buergergeld_bezug_mark',              label: 'Bürgergeld-Bezug / SGB II',      group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },
  { value: 'profile.soziales.bedarfsgemeinschaft_mark',            label: 'Bedarfsgemeinschaft',            group: '☑ Ja/Nein-Kreuz (FK)', isMark: true },

  // ── Unternehmen: Kontakt & Adresse ──
  { value: 'company.company_name',       label: 'Unternehmensname',              group: '🏢 Unternehmen' },
  { value: 'company.contact_name',       label: 'Ansprechpartner (vollständig)', group: '🏢 Unternehmen' },
  { value: 'company.contact_first_name', label: 'Ansprechpartner Vorname',       group: '🏢 Unternehmen' },
  { value: 'company.contact_last_name',  label: 'Ansprechpartner Nachname',      group: '🏢 Unternehmen' },
  { value: 'company.email',              label: 'E-Mail (Unternehmen)',           group: '🏢 Unternehmen' },
  { value: 'company.phone',              label: 'Telefon (Unternehmen)',          group: '🏢 Unternehmen' },
  { value: 'company.address',            label: 'Straße (Unternehmen)',           group: '🏢 Unternehmen' },
  { value: 'company.house_number',       label: 'Hausnummer (Unternehmen)',       group: '🏢 Unternehmen' },
  { value: 'company.adresszusatz',       label: 'Adresszusatz',                  group: '🏢 Unternehmen' },
  { value: 'company.city',               label: 'Stadt (Unternehmen)',            group: '🏢 Unternehmen' },
  { value: 'company.postal_code',        label: 'PLZ (Unternehmen)',              group: '🏢 Unternehmen' },
  { value: 'company.betriebsnummer',     label: 'Betriebsnummer (BA)',            group: '🏢 Unternehmen' },
  { value: 'company.ba_kundennummer',    label: 'Kundennummer BA (Unternehmen)',  group: '🏢 Unternehmen' },

  // ── Unternehmen: Klassifizierung ──
  { value: 'company.klassifizierung.kmu_kategorie',            label: 'KMU-Kategorie',               group: '🏭 Klassifizierung' },
  { value: 'company.klassifizierung.beschaeftigte_gesamt',     label: 'Beschäftigte gesamt',         group: '🏭 Klassifizierung' },
  { value: 'company.klassifizierung.jahresumsatz',             label: 'Jahresumsatz',                group: '🏭 Klassifizierung' },
  { value: 'company.klassifizierung.tarifvertrag_bezeichnung', label: 'Tarifvertragsbezeichnung',    group: '🏭 Klassifizierung' },

  // ── Unternehmen: Ja/Nein-Kreuz ──
  { value: 'company.klassifizierung.betriebsvereinbarung_wb_mark', label: 'Betriebsvereinbarung Weiterbildung',   group: '☑ Ja/Nein-Kreuz (UN)', isMark: true },
  { value: 'company.klassifizierung.tarifvertrag_wb_mark',         label: 'Tarifvertrag mit betr. Weiterbildung', group: '☑ Ja/Nein-Kreuz (UN)', isMark: true },
  { value: 'company.klassifizierung.tarifgebunden_mark',           label: 'Tarifgebundenheit (§3/§5 TVG)',        group: '☑ Ja/Nein-Kreuz (UN)', isMark: true },
  { value: 'company.klassifizierung.gegruendet_24m_mark',          label: 'Gegründet in letzten 24 Monaten',      group: '☑ Ja/Nein-Kreuz (UN)', isMark: true },

  // ── Vermittlung: Arbeitsverhältnis ──
  { value: 'vermittlung.beginn',              label: 'Beginn Arbeitsverhältnis',  group: '📋 Vermittlung' },
  { value: 'vermittlung.berufsbezeichnung',   label: 'Berufsbezeichnung',         group: '📋 Vermittlung' },
  { value: 'vermittlung.befristung',          label: 'Befristung',                group: '📋 Vermittlung' },
  { value: 'vermittlung.stunden_woche',       label: 'Stunden/Woche',             group: '📋 Vermittlung' },
  { value: 'vermittlung.stunden_monat',       label: 'Stunden/Monat',             group: '📋 Vermittlung' },
  { value: 'vermittlung.urlaubstage',         label: 'Urlaubstage/Jahr',          group: '📋 Vermittlung' },
  { value: 'vermittlung.arbeitszeit_art',     label: 'Arbeitszeit (Voll-/Teilzeit)', group: '📋 Vermittlung' },
  { value: 'vermittlung.arbeitsort',          label: 'Arbeitsort',                group: '📋 Vermittlung' },
  // ── Vermittlung: Vergütung ──
  { value: 'vermittlung.grundgehalt',         label: 'Grundgehalt (brutto)',       group: '📋 Vermittlung' },
  { value: 'vermittlung.grundgehalt_einheit', label: 'Grundgehalt Einheit',       group: '📋 Vermittlung' },
  { value: 'vermittlung.entgeltart',          label: 'Entgeltart',                group: '📋 Vermittlung' },
  { value: 'vermittlung.entgeltgruppe',       label: 'Entgeltgruppe',             group: '📋 Vermittlung' },
  { value: 'vermittlung.weitere_bestandteile', label: 'Weitere Vergütungsbestandteile', group: '📋 Vermittlung' },
  // ── Vermittlung: Maßnahme ──
  { value: 'vermittlung.massnahme_bezeichnung', label: 'Maßnahme-Bezeichnung (fix vorausgefüllt)', group: '📋 Vermittlung' },
  { value: 'vermittlung.massnahme_nummer',    label: 'Maßnahmennummer',           group: '📋 Vermittlung' },
  { value: 'vermittlung.massnahme_beginn',    label: 'Maßnahme Beginn',           group: '📋 Vermittlung' },
  { value: 'vermittlung.massnahme_ende',      label: 'Maßnahme Ende',             group: '📋 Vermittlung' },
  { value: 'vermittlung.bildungstraeger',     label: 'Bildungsträger',            group: '📋 Vermittlung' },
  { value: 'vermittlung.bildungstraeger_adresse', label: 'Bildungsträger Adresse', group: '📋 Vermittlung' },
  { value: 'vermittlung.massnahme_zeitstunden', label: 'Maßnahme Zeitstunden',   group: '📋 Vermittlung' },
]

// Derived helpers
const PREFILL_FACHKRAFT = ALL_PREFILL.filter(o =>
  o.group === null ||
  ['📅 Allgemein', '👤 Stammdaten', '🏠 Adresse FK', '📋 Erw. Stammdaten FK',
   '🎓 Berufsqualifikation', '📄 Qualifikation (JSONB)', '☑ Ja/Nein-Kreuz (FK)', '📋 Vermittlung']
    .includes(o.group)
)
const PREFILL_UNTERNEHMEN = ALL_PREFILL.filter(o =>
  o.group === null ||
  ['📅 Allgemein', '🏢 Unternehmen', '🏭 Klassifizierung', '☑ Ja/Nein-Kreuz (UN)', '📋 Vermittlung']
    .includes(o.group)
)
const BOOLEAN_MARK_KEYS = new Set(ALL_PREFILL.filter(o => o.isMark).map(o => o.value))

// ─── Drag / resize handle geometry ────────────────────────────────────────────
const HANDLE_POSITIONS = {
  nw: { top: 0,     left: 0 },     n:  { top: 0,     left: '50%' }, ne: { top: 0,     left: '100%' },
  e:  { top: '50%', left: '100%' }, se: { top: '100%',left: '100%' }, s:  { top: '100%',left: '50%' },
  sw: { top: '100%',left: 0 },     w:  { top: '50%', left: 0 },
}
const HANDLE_CURSORS = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
}

function cfg(type, audience = 'fachkraft') {
  const t = FIELD_TYPE_MAP[type] || FIELD_TYPES[0]
  const colors = t[audience] || t.fachkraft
  return { ...colors, icon: t.icon, label: t.label, key: t.key }
}

// ─── Section header with expandable help panel ────────────────────────────────
function SectionTip({ label, labelClass = 'text-[10px] font-semibold text-slate-500 uppercase tracking-widest', children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5">
        <p className={labelClass}>{label}</p>
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex-shrink-0 transition-colors rounded ${open ? 'text-[#1a3a5c]' : 'text-gray-300 hover:text-gray-500'}`}
          title={open ? 'Hilfe schließen' : 'Hilfe anzeigen'}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
        </button>
      </div>
      {open && (
        <div className="mt-1.5 bg-[#1a3a5c] text-white text-[11px] rounded-xl p-3 space-y-2 leading-relaxed shadow-lg">
          {children}
          <button onClick={() => setOpen(false)} className="block text-white/50 hover:text-white text-[10px] mt-1 underline underline-offset-2">Schließen</button>
        </div>
      )}
    </div>
  )
}

// ─── Inline naming popup (Portal) ─────────────────────────────────────────────
// Appears directly on-canvas after field is drawn, pre-focused

function FieldNamePopup({ x, y, label, onChange, onDone, isCheckboxGroup }) {
  const inputRef = useRef(null)

  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 30)
  }, [])

  return createPortal(
    <div
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999, pointerEvents: 'all' }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="bg-white rounded-xl shadow-2xl border-2 border-[#1a3a5c] p-3 w-64">
        <p className="text-xs font-semibold text-[#1a3a5c] mb-2">
          {isCheckboxGroup ? '🗂 Gruppenname (z. B. Geschlecht)' : '✏️ Wie soll das Feld heißen?'}
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={e => onChange(e.target.value)}
            placeholder={isCheckboxGroup ? 'Gruppenname...' : 'Feldname...'}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onDone() }}
          />
          <button
            onClick={onDone}
            className="shrink-0 bg-[#1a3a5c] text-white rounded-lg w-9 h-9 flex items-center justify-center hover:bg-[#1a3a5c]/90 transition-colors font-bold"
          >
            ✓
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Enter oder ✓ zum Bestätigen</p>
      </div>
    </div>,
    document.body
  )
}

// ─── Option name popup (for checkbox option after drawing) ────────────────────

function OptionNamePopup({ x, y, label, onChange, onDone }) {
  const inputRef = useRef(null)

  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 30)
  }, [])

  return createPortal(
    <div
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999, pointerEvents: 'all' }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="bg-white rounded-xl shadow-2xl border-2 border-orange-400 p-3 w-56">
        <p className="text-xs font-semibold text-orange-700 mb-2">☑ Option benennen</p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={e => onChange(e.target.value)}
            placeholder="z. B. männlich..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onDone() }}
          />
          <button
            onClick={onDone}
            className="shrink-0 bg-orange-500 text-white rounded-lg w-9 h-9 flex items-center justify-center hover:bg-orange-600 transition-colors font-bold"
          >
            ✓
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Field overlay on canvas ──────────────────────────────────────────────────

function FieldOverlay({ field, isSelected, onClick, onDelete, onDragStart }) {
  const c = cfg(field.type, field.audience)
  const Icon = c.icon
  // Move: available on all fields when a drag handler is provided (no pre-select needed)
  const canMove   = !!onDragStart
  // Resize handles: only shown when the field is selected
  const canResize = isSelected && !!onDragStart

  const style = {
    position: 'absolute',
    left: `${field.x}%`, top: `${field.y}%`,
    width: `${field.width}%`, height: `${field.height}%`,
    userSelect: 'none',
    cursor: canMove ? (isSelected ? 'move' : 'grab') : 'pointer',
  }

  // mousedown on the field body → start a move drag (also selects the field via onDragStart)
  const bodyDown = canMove ? (e) => {
    e.stopPropagation(); e.preventDefault()
    onDragStart(field.id, field.page - 1, null, e)
  } : undefined

  // 8 resize handles, rendered only when selected
  const resizeHandles = canResize ? Object.entries(HANDLE_POSITIONS).map(([handle, pos]) => (
    <div
      key={handle}
      style={{
        position: 'absolute', top: pos.top, left: pos.left,
        width: 9, height: 9, transform: 'translate(-50%, -50%)',
        background: 'white', border: '1.5px solid #1a3a5c', borderRadius: 2,
        cursor: HANDLE_CURSORS[handle], zIndex: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }}
      onMouseDown={e => {
        e.stopPropagation(); e.preventDefault()
        onDragStart(field.id, field.page - 1, handle, e)
      }}
    />
  )) : null

  const deleteBtn = isSelected ? (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onDelete(field.id) }}
      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-30 text-[11px] leading-none shadow"
    >×</button>
  ) : null

  const commonCls = `border-2 rounded transition-colors ${c.border} ${c.bg} ${c.text} ${
    isSelected ? `ring-2 ${c.ring} ring-offset-1` : 'opacity-80 hover:opacity-100'
  }`

  if (field.type === 'boolean_mark') {
    return (
      <div style={style} onClick={e => { e.stopPropagation(); onClick(field.id) }} onMouseDown={bodyDown} className={commonCls}>
        <div className="w-full h-full flex items-center justify-center gap-0.5 px-1 pointer-events-none">
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            style={{ width: '50%', height: '50%', flexShrink: 0, opacity: 0.7 }}>
            <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
          </svg>
          {field.label && <span className="text-[10px] font-medium truncate leading-none">{field.label}</span>}
        </div>
        {deleteBtn}{resizeHandles}
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div style={style} onClick={e => { e.stopPropagation(); onClick(field.id) }} onMouseDown={bodyDown}
        className={`border-2 border-dashed rounded transition-colors ${isSelected ? c.dashedSelected : c.dashedNormal}`}
      >
        <div className={`absolute -top-5 left-0 flex items-center gap-1 bg-white/90 rounded px-1.5 py-0.5 border ${c.labelBorder} shadow-sm pointer-events-none`}>
          <Icon className={`h-2.5 w-2.5 ${c.labelIcon} shrink-0`} />
          <span className={`text-[9px] font-semibold ${c.labelText} whitespace-nowrap truncate max-w-[100px]`}>
            {field.label || 'Checkbox-Gruppe'}
          </span>
        </div>
        {deleteBtn}{resizeHandles}
      </div>
    )
  }

  return (
    <div style={style} onClick={e => { e.stopPropagation(); onClick(field.id) }} onMouseDown={bodyDown} className={commonCls}>
      <div className="w-full h-full flex items-center justify-center gap-1 px-1 pointer-events-none">
        <Icon className="h-3 w-3 shrink-0 opacity-60" />
        {field.label && <span className="text-[10px] font-medium truncate leading-none">{field.label}</span>}
      </div>
      {deleteBtn}{resizeHandles}
    </div>
  )
}

// ─── Option marker (positioned checkbox option on canvas) ─────────────────────

function OptionMarker({ option, field, isGroupSelected, onClick }) {
  const c = cfg(field.type, field.audience)
  return (
    <div
      style={{
        position: 'absolute',
        left: `${option.x}%`, top: `${option.y}%`,
        width: `${option.width}%`, height: `${option.height}%`,
        userSelect: 'none',
      }}
      onClick={e => { e.stopPropagation(); onClick(field.id) }}
      className={`cursor-pointer border-2 rounded flex items-center justify-center transition-all ${
        isGroupSelected ? c.optionSelected : c.optionNormal
      }`}
      title={option.label}
    >
      <div className={`w-3/5 h-3/5 border-2 ${c.optionInner} bg-white ${field.multiple ? 'rounded-sm' : 'rounded-full'}`} />
      {option.label && (
        <span className={`absolute -bottom-4 left-0 text-[8px] ${c.optionLabel} whitespace-nowrap bg-white/80 px-0.5 rounded`}>
          {option.label}
        </span>
      )}
    </div>
  )
}

// ─── Searchable prefill picker ─────────────────────────────────────────────────

function PrefillPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
    else setQuery('')
  }, [open])

  const current = options.find(o => o.value === value)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter(o => o.label.toLowerCase().includes(q) || (o.group ?? '').toLowerCase().includes(q))
    : options

  // Build ordered group list (preserving order of first appearance)
  const groupMap = new Map()
  filtered.forEach(o => {
    const key = o.group ?? '__none__'
    if (!groupMap.has(key)) groupMap.set(key, { group: o.group, items: [] })
    groupMap.get(key).items.push(o)
  })
  const groups = [...groupMap.values()]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-8 text-sm border border-input rounded-md px-2.5 text-left flex items-center justify-between gap-1 bg-background hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
      >
        <span className={`truncate flex-1 ${current?.value ? 'text-gray-800' : 'text-gray-400'}`}>
          {current ? current.label : 'Feld wählen…'}
        </span>
        {current?.isMark && (
          <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded shrink-0 font-medium">☑</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Suchen…"
              className="flex-1 text-sm h-6 focus:outline-none bg-transparent"
              onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {groups.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Keine Treffer</p>
            )}
            {groups.map(({ group, items }) => (
              <div key={group ?? '__none__'}>
                {group && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0 border-b border-gray-100">
                    {group}
                  </div>
                )}
                {items.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                      o.value === value
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.isMark && (
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded shrink-0">☑</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sidebar field properties ──────────────────────────────────────────────────

function FieldProperties({ field, onChange, onDelete }) {
  if (!field) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>Kein Feld ausgewählt</p>
        <p className="text-xs mt-1">Feld zeichnen oder anklicken</p>
      </div>
    )
  }

  const audience = field.audience || 'fachkraft'
  const c = cfg(field.type, audience)
  const Icon = c.icon
  // Prefill-Quelle ist unabhängig vom Audience: ein UN-Feld kann mit FK-Daten vorausgefüllt werden
  const prefillOptions = ALL_PREFILL.filter(o => o.group !== null || o.value === '')
  const prefillActive = !!(field.prefillKey)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded flex items-center justify-center ${c.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${c.text}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {field.type === 'checkbox' ? 'Checkbox-Gruppe' : `${c.label}-Feld`}
        </span>
      </div>

      {/* 1. Beschriftung */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">
          {field.type === 'checkbox' ? 'Gruppenname' : 'Beschriftung'}
        </Label>
        <input
          value={field.label || ''}
          onChange={e => onChange({ ...field, label: e.target.value })}
          placeholder={field.type === 'checkbox' ? 'z. B. Geschlecht...' : 'Feldname...'}
          className="w-full h-8 text-sm border border-input rounded-md px-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* 2. Wer soll das ausfüllen? */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Wer soll das ausfüllen?</Label>
        <div className="flex gap-1.5">
          {[
            { val: 'fachkraft',   label: 'Fachkraft',   color: 'border-blue-400 bg-blue-50 text-blue-700' },
            { val: 'unternehmen', label: 'Unternehmen', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
          ].map(({ val, label, color }) => (
            <button key={val} type="button"
              onClick={() => onChange({ ...field, audience: val })}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border-2 transition-all ${
                audience === val ? color : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* 3. Vorausfüllen — toggle + searchable picker */}
      {field.type !== 'checkbox' && field.type !== 'signature' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-gray-500 flex-1">Vorausfüllen</Label>
            <button
              type="button"
              onClick={() => onChange({ ...field, prefillKey: prefillActive ? '' : (prefillOptions.find(o => o.value)?.value || 'today') })}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${prefillActive ? 'bg-[#0d9488]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefillActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {prefillActive && (
            <>
              <PrefillPicker
                value={field.prefillKey || ''}
                options={prefillOptions}
                onChange={v => onChange({ ...field, prefillKey: v })}
              />
              {field.type !== 'boolean_mark' && BOOLEAN_MARK_KEYS.has(field.prefillKey) && (
                <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  ☑ Tipp: Verwende den Feldtyp <strong>Ja/Nein-Kreuz</strong> für dieses Ja/Nein-Feld.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* 4. Pflichtfeld */}
      <div className="flex items-center gap-3">
        <Label className="text-xs text-gray-500 flex-1">Pflichtfeld</Label>
        <button
          type="button"
          onClick={() => onChange({ ...field, required: !field.required })}
          className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${field.required ? 'bg-[#0d9488]' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${field.required ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Checkbox options */}
      {field.type === 'checkbox' && (
        <>
          <div className="flex gap-1.5">
            {[{ val: false, label: 'Einfachauswahl' }, { val: true, label: 'Mehrfachauswahl' }].map(({ val, label }) => (
              <button key={String(val)} type="button"
                onClick={() => onChange({ ...field, multiple: val })}
                className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-medium border transition-all ${
                  field.multiple === val ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >{label}</button>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Optionen</Label>
            <div className="rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-2 text-[10px] text-orange-700 flex items-start gap-1.5">
              <CheckSquare className="h-3 w-3 shrink-0 mt-0.5" />
              <span>Einfach auf dem PDF zeichnen um eine neue Option mit Position hinzuzufügen.</span>
            </div>
            {(field.options || []).length === 0 && (
              <p className="text-xs text-gray-400 italic py-1">Noch keine Optionen</p>
            )}
            <ul className="space-y-2">
              {(field.options || []).map((opt) => (
                <li key={opt.id} className="rounded-lg border border-gray-100 p-2 space-y-1.5 bg-gray-50">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 border border-gray-300 shrink-0 ${field.multiple ? 'rounded-sm' : 'rounded-full'}`} />
                    <input
                      value={opt.label || ''}
                      onChange={e => onChange({
                        ...field,
                        options: field.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o),
                      })}
                      placeholder="Option..."
                      className="h-6 text-xs flex-1 border border-input rounded px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button type="button"
                      onClick={() => onChange({ ...field, options: field.options.filter(o => o.id !== opt.id) })}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    ><X className="h-3 w-3" /></button>
                  </div>
                  {opt.x !== undefined ? (
                    <div className="flex items-center gap-1 text-[10px] text-green-600 pl-1">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Seite {opt.page} · positioniert</span>
                      <button type="button"
                        onClick={() => {
                          const { x, y, width, height, page, ...rest } = opt
                          onChange({ ...field, options: field.options.map(o => o.id === opt.id ? rest : o) })
                        }}
                        className="ml-auto text-gray-400 hover:text-red-400"
                      >entfernen</button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-orange-500 pl-1 italic">Noch keine Position — auf PDF zeichnen</p>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onChange({ ...field, options: [...(field.options || []), { id: crypto.randomUUID(), label: '' }] })}
              className="w-full text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" />Option ohne Position hinzufügen
            </button>
          </div>
        </>
      )}


      {/* Position & Größe */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Position & Größe (%)</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {[{ k: 'x', l: 'X' }, { k: 'y', l: 'Y' }, { k: 'width', l: 'Breite' }, { k: 'height', l: 'Höhe' }].map(({ k, l }) => (
            <div key={k}>
              <label className="text-[10px] text-gray-400 block mb-0.5">{l}</label>
              <input
                type="number" step="0.1" min="0" max="100"
                value={+(field[k] || 0).toFixed(1)}
                onChange={e => onChange({ ...field, [k]: parseFloat(e.target.value) || 0 })}
                className="w-full h-7 text-xs border border-input rounded px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDelete(field.id)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />Feld löschen
      </button>
    </div>
  )
}

// ─── Compute popup position near a drawn field ─────────────────────────────────
function computePopupPos(overlayEl, xPct, yPct, wPct, hPct) {
  const rect = overlayEl.getBoundingClientRect()
  const fieldLeft = rect.left + (xPct / 100) * rect.width
  const fieldBottom = rect.top + ((yPct + hPct) / 100) * rect.height
  const fieldTop = rect.top + (yPct / 100) * rect.height

  const popupH = 110
  const popupW = 270
  let top = fieldBottom + 8
  if (top + popupH > window.innerHeight - 16) top = fieldTop - popupH - 8
  top = Math.max(70, top)
  const left = Math.min(Math.max(8, fieldLeft), window.innerWidth - popupW - 8)
  return { x: left, y: top }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const { session } = useAuthStore()

  const [template, setTemplate] = useState(null)
  const [templateType, setTemplateType] = useState('fachkraft')
  const [fields, setFields] = useState([])
  const [pdfUrl, setPdfUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // PDF
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageAspects, setPageAspects] = useState([])
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pageRendering, setPageRendering] = useState(false)

  const canvasRefs = useRef([])
  const renderTasksRef = useRef([])

  // Interaction
  const [activeTool, setActiveTool] = useState(null)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [drawing, setDrawing] = useState(null)
  const [dragging, setDragging] = useState(null)
  // { type: 'move'|'resize', fieldId, pageIdx, startX, startY, startFx, startFy, startFw, startFh, handle }

  // Inline popup after placing a field
  const [fieldPopup, setFieldPopup] = useState(null)
  // { fieldId, x, y, isCheckboxGroup }

  // Option placement mode + popup
  const [placingOption, setPlacingOption] = useState(null)
  // { fieldId, optionId, label }
  const [optionPopup, setOptionPopup] = useState(null)
  // { fieldId, optionId, label, x, y }

  // ── Load template ──────────────────────────────────────────────────────────
  useEffect(() => { if (templateId && session) loadTemplate() }, [templateId, session])

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/dokumente/get?templateId=${templateId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Vorlage konnte nicht geladen werden')
      setTemplate(data.template)
      setTemplateType(data.template?.template_type || 'fachkraft')
      setFields(Array.isArray(data.template?.fields) ? data.template.fields : [])
      setPdfUrl(data.pdfSignedUrl)
    } catch (err) { setLoadError(err.message) }
  }

  // ── Load PDF ───────────────────────────────────────────────────────────────
  useEffect(() => { if (pdfUrl) loadPdf() }, [pdfUrl])

  const loadPdf = async () => {
    setPdfLoading(true)
    try {
      renderTasksRef.current.forEach(t => t.cancel?.())
      renderTasksRef.current = []
      const doc = await pdfjsLib.getDocument(pdfUrl).promise
      setPdfDoc(doc)
      setNumPages(doc.numPages)
      setCurrentPage(1)
      const aspects = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 1 })
        aspects.push({ width: vp.width, height: vp.height })
      }
      setPageAspects(aspects)
    } catch { toast({ title: 'PDF-Fehler', variant: 'destructive' }) }
    finally { setPdfLoading(false) }
  }

  // ── Render pages ───────────────────────────────────────────────────────────
  useEffect(() => { if (pdfDoc && pageAspects.length > 0) renderAllPages() }, [pdfDoc, pageAspects])

  const renderAllPages = async () => {
    if (!pdfDoc) return
    setPageRendering(true)
    renderTasksRef.current.forEach(t => t.cancel?.())
    renderTasksRef.current = []
    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const canvas = canvasRefs.current[i - 1]
        if (!canvas || !pageAspects[i - 1]) continue
        const aspect = pageAspects[i - 1]
        const displayWidth = canvas.parentElement?.clientWidth || 800
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.round(displayWidth * dpr)
        canvas.height = Math.round(displayWidth * (aspect.height / aspect.width) * dpr)
        const page = await pdfDoc.getPage(i)
        const scale = (displayWidth / aspect.width) * dpr
        const viewport = page.getViewport({ scale })
        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
        renderTasksRef.current.push(task)
        try { await task.promise } catch (e) { if (e?.name !== 'RenderingCancelledException') throw e }
      }
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException')
        toast({ title: 'Render-Fehler', variant: 'destructive' })
    } finally { setPageRendering(false) }
  }

  // These must be declared BEFORE the useEffect that uses them in its dependency array
  const selectedField = fields.find(f => f.id === selectedFieldId) || null
  const activeCheckboxField = selectedField?.type === 'checkbox' ? selectedField : null
  const isDrawing = !!activeTool || !!placingOption || !!activeCheckboxField

  // ── Global mouse events for drawing ───────────────────────────────────────
  useEffect(() => {
    if (!drawing) return

    const getOverlay = (pageIdx) => document.querySelector(`[data-po="${pageIdx}"]`)

    const pct = (clientX, clientY, pageIdx) => {
      const rect = getOverlay(pageIdx)?.getBoundingClientRect()
      if (!rect) return null
      return {
        x: Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)),
        y: Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)),
      }
    }

    const onMove = (e) => {
      const c = pct(e.clientX, e.clientY, drawing.pageIdx)
      if (c) setDrawing(prev => prev ? { ...prev, cx: c.x, cy: c.y } : null)
    }

    const onUp = (e) => {
      if (!drawing) return
      const c = pct(e.clientX, e.clientY, drawing.pageIdx)
      const ex = c?.x ?? drawing.cx
      const ey = c?.y ?? drawing.cy

      const fx = Math.min(drawing.sx, ex)
      const fy = Math.min(drawing.sy, ey)
      const fw = Math.abs(ex - drawing.sx)
      const fh = Math.abs(ey - drawing.sy)

      const overlay = getOverlay(drawing.pageIdx)

      if (placingOption) {
        // Finalize option position (legacy: from sidebar "Im Dokument einzeichnen" flow)
        const safeW = Math.max(fw, 1.5)
        const safeH = Math.max(fh, 1)
        const { fieldId, optionId } = placingOption
        setFields(prev => prev.map(f => {
          if (f.id !== fieldId) return f
          return {
            ...f,
            options: (f.options || []).map(opt =>
              opt.id === optionId
                ? { ...opt, page: drawing.pageIdx + 1, x: fx, y: fy, width: safeW, height: safeH }
                : opt
            ),
          }
        }))
        // Show option name popup
        if (overlay) {
          const pos = computePopupPos(overlay, fx, fy, safeW, safeH)
          const currentLabel = fields.find(f => f.id === fieldId)?.options?.find(o => o.id === optionId)?.label || ''
          setOptionPopup({ fieldId, optionId, label: currentLabel, x: pos.x, y: pos.y })
        }
        setPlacingOption(null)
      } else if (activeCheckboxField && !activeTool) {
        // Drawing on PDF while a checkbox field is selected → add a new option with position
        const safeW = Math.max(fw, 1.5)
        const safeH = Math.max(fh, 1)
        const newOptId = crypto.randomUUID()
        const fieldId = activeCheckboxField.id
        setFields(prev => prev.map(f => {
          if (f.id !== fieldId) return f
          return {
            ...f,
            options: [...(f.options || []), {
              id: newOptId,
              label: '',
              page: drawing.pageIdx + 1,
              x: fx, y: fy, width: safeW, height: safeH,
            }],
          }
        }))
        // Show option name popup immediately
        if (overlay) {
          const pos = computePopupPos(overlay, fx, fy, safeW, safeH)
          setOptionPopup({ fieldId, optionId: newOptId, label: '', x: pos.x, y: pos.y })
        }
      } else if (activeTool) {
        // Default sizes on click (tiny draw)
        let finalX = fx, finalY = fy, finalW = fw, finalH = fh
        if (fw < 1 || fh < 0.5) {
          const dw = activeTool === 'signature' ? 35 : activeTool === 'checkbox' ? 30 : 22
          const dh = activeTool === 'signature' ? 9 : activeTool === 'checkbox' ? 20 : 4.5
          finalX = Math.min(drawing.sx, 100 - dw)
          finalY = Math.min(drawing.sy, 100 - dh)
          finalW = dw; finalH = dh
        }

        const id = crypto.randomUUID()
        const newField = {
          id, type: activeTool,
          page: drawing.pageIdx + 1,
          x: finalX, y: finalY, width: finalW, height: finalH,
          label: '', required: false, prefillKey: '',
          ...(activeTool === 'checkbox' ? { options: [], multiple: false } : {}),
        }
        setFields(prev => [...prev, newField])
        setSelectedFieldId(id)
        setActiveTool(null)

        // Show field name popup
        if (overlay) {
          const pos = computePopupPos(overlay, finalX, finalY, finalW, finalH)
          setFieldPopup({ fieldId: id, x: pos.x, y: pos.y, isCheckboxGroup: activeTool === 'checkbox' })
        }
      }

      setDrawing(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drawing, activeTool, placingOption, activeCheckboxField, fields])

  // ── Global mouse events for drag / resize ─────────────────────────────────
  useEffect(() => {
    if (!dragging) return

    const onMove = (e) => {
      const rect = document.querySelector(`[data-po="${dragging.pageIdx}"]`)?.getBoundingClientRect()
      if (!rect) return
      const curX = (e.clientX - rect.left) / rect.width * 100
      const curY = (e.clientY - rect.top) / rect.height * 100
      const dx = curX - dragging.startX
      const dy = curY - dragging.startY

      setFields(prev => prev.map(f => {
        if (f.id !== dragging.fieldId) return f
        if (dragging.type === 'move') {
          return {
            ...f,
            x: Math.max(0, Math.min(100 - f.width,  dragging.startFx + dx)),
            y: Math.max(0, Math.min(100 - f.height, dragging.startFy + dy)),
          }
        }
        // resize
        const h = dragging.handle
        let nx = dragging.startFx, ny = dragging.startFy
        let nw = dragging.startFw, nh = dragging.startFh
        if (h.includes('e')) nw = Math.max(2, dragging.startFw + dx)
        if (h.includes('w')) { const d = Math.min(dx, dragging.startFw - 2); nx = dragging.startFx + d; nw = dragging.startFw - d }
        if (h.includes('s')) nh = Math.max(0.5, dragging.startFh + dy)
        if (h.includes('n')) { const d = Math.min(dy, dragging.startFh - 0.5); ny = dragging.startFy + d; nh = dragging.startFh - d }
        return { ...f, x: nx, y: ny, width: nw, height: nh }
      }))
    }

    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  // ── Field ops ─────────────────────────────────────────────────────────────
  const updateField = (updated) => setFields(prev => prev.map(f => f.id === updated.id ? updated : f))
  const deleteField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id))
    if (selectedFieldId === id) setSelectedFieldId(null)
    if (fieldPopup?.fieldId === id) setFieldPopup(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/dokumente/save-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ templateId, fields, template_type: templateType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      toast({ title: 'Gespeichert', variant: 'success' })
      if (returnTo) navigate(decodeURIComponent(returnTo))
    } catch (err) { toast({ title: 'Fehler', description: err.message, variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const scrollToPage = (page) => {
    setCurrentPage(page)
    document.querySelector(`[data-po="${page - 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-gray-500">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="text-sm">{loadError}</p>
      <Button variant="outline" onClick={() => navigate(returnTo ? decodeURIComponent(returnTo) : '/admin/mediathek')}><ArrowLeft className="h-4 w-4 mr-2" />Zurück</Button>
    </div>
  )

  const isLoading = !template || pdfLoading

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(returnTo ? decodeURIComponent(returnTo) : '/admin/mediathek')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold text-gray-900 text-sm truncate">{template?.name || 'Lade...'}</h1>
            <p className="text-xs text-gray-400 truncate">{template?.file_name || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {numPages > 1 && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => scrollToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}
                className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="px-2 text-xs text-gray-600">{currentPage} / {numPages}</span>
              <button onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))} disabled={currentPage >= numPages}
                className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || isLoading} className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Speichern...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Speichern</>}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── PDF area ── */}
        <div className="flex-1 overflow-y-auto bg-gray-200 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-3 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm">PDF wird geladen...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-8 py-4 px-4">
              {pageAspects.map((aspect, idx) => (
                <div key={idx} className="flex flex-col items-stretch">
                  <div
                    className="relative shadow-lg w-full bg-white"
                    style={{ paddingBottom: `${(aspect.height / aspect.width) * 100}%` }}
                  >
                    <canvas
                      ref={el => { canvasRefs.current[idx] = el }}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    />
                    {/* Interaction overlay */}
                    <div
                      data-po={idx}
                      style={{ position: 'absolute', inset: 0, cursor: dragging ? (dragging.type === 'move' ? 'grabbing' : dragging.handle + '-resize') : (isDrawing || activeCheckboxField) ? 'crosshair' : 'default' }}
                      onMouseDown={e => {
                        if (!isDrawing || dragging) return
                        e.preventDefault()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = (e.clientX - rect.left) / rect.width * 100
                        const y = (e.clientY - rect.top) / rect.height * 100
                        setDrawing({ sx: x, sy: y, cx: x, cy: y, pageIdx: idx })
                      }}
                      onClick={e => { if (!isDrawing && e.target === e.currentTarget) setSelectedFieldId(null) }}
                    >
                      {/* Rubber band */}
                      {drawing?.pageIdx === idx && (
                        <div style={{
                          position: 'absolute',
                          left: `${Math.min(drawing.sx, drawing.cx)}%`,
                          top: `${Math.min(drawing.sy, drawing.cy)}%`,
                          width: `${Math.abs(drawing.cx - drawing.sx)}%`,
                          height: `${Math.abs(drawing.cy - drawing.sy)}%`,
                          pointerEvents: 'none',
                        }} className={`border-2 border-dashed rounded ${
                          placingOption || activeCheckboxField ? 'border-orange-500 bg-orange-500/10' : 'border-[#1a3a5c] bg-[#1a3a5c]/10'
                        }`} />
                      )}

                      {/* Regular fields */}
                      {fields.filter(f => f.page === idx + 1 && f.type !== 'checkbox').map(field => {
                        const doDrag = (activeTool || placingOption || activeCheckboxField) ? null : (fid, pi, handle, e) => {
                          const rect = document.querySelector(`[data-po="${pi}"]`)?.getBoundingClientRect()
                          if (!rect) return
                          setSelectedFieldId(fid)
                          setDragging({ type: handle ? 'resize' : 'move', fieldId: fid, pageIdx: pi,
                            startX: (e.clientX - rect.left) / rect.width * 100,
                            startY: (e.clientY - rect.top) / rect.height * 100,
                            startFx: field.x, startFy: field.y, startFw: field.width, startFh: field.height, handle })
                        }
                        return (
                          <FieldOverlay key={field.id} field={field}
                            isSelected={selectedFieldId === field.id}
                            onClick={setSelectedFieldId} onDelete={deleteField}
                            onDragStart={doDrag}
                          />
                        )
                      })}

                      {/* Checkbox group boxes */}
                      {fields.filter(f => f.page === idx + 1 && f.type === 'checkbox').map(field => {
                        const doDrag = (activeTool || placingOption || activeCheckboxField) ? null : (fid, pi, handle, e) => {
                          const rect = document.querySelector(`[data-po="${pi}"]`)?.getBoundingClientRect()
                          if (!rect) return
                          setSelectedFieldId(fid)
                          setDragging({ type: handle ? 'resize' : 'move', fieldId: fid, pageIdx: pi,
                            startX: (e.clientX - rect.left) / rect.width * 100,
                            startY: (e.clientY - rect.top) / rect.height * 100,
                            startFx: field.x, startFy: field.y, startFw: field.width, startFh: field.height, handle })
                        }
                        return (
                          <FieldOverlay key={field.id} field={field}
                            isSelected={selectedFieldId === field.id}
                            onClick={setSelectedFieldId} onDelete={deleteField}
                            onDragStart={doDrag}
                          />
                        )
                      })}

                      {/* Checkbox option markers */}
                      {fields.filter(f => f.type === 'checkbox').flatMap(field =>
                        (field.options || [])
                          .filter(opt => opt.page === idx + 1 && opt.x !== undefined)
                          .map(opt => (
                            <OptionMarker key={opt.id} option={opt} field={field}
                              isGroupSelected={selectedFieldId === field.id}
                              onClick={setSelectedFieldId} />
                          ))
                      )}
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">Seite {idx + 1}</p>
                </div>
              ))}
              {pageRendering && (
                <div className="absolute inset-0 bg-white/30 flex items-center justify-center pointer-events-none">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1a3a5c]" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="w-[264px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">

          {/* Tool section — tinted background for clear separation */}
          <div className="bg-slate-50 border-b border-gray-200 shrink-0">

            {/* Draw hints */}
            {(activeCheckboxField || placingOption) && (
              <div className="px-3 pt-3">
                <div className="bg-orange-50 border border-orange-300 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                    {placingOption ? 'Jetzt auf PDF zeichnen' : 'Option einzeichnen'}
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {placingOption
                      ? <>Position für: <strong>{placingOption.label || 'Option'}</strong></>
                      : <>Neues Kästchen für <strong>{activeCheckboxField?.label || 'Gruppe'}</strong></>
                    }
                  </p>
                  {placingOption && (
                    <button onClick={() => setPlacingOption(null)} className="mt-1 text-[10px] text-orange-500 hover:text-orange-700 underline">Abbrechen</button>
                  )}
                </div>
              </div>
            )}

            {/* Tool picker */}
            {!placingOption && (
              <div className="px-3 pt-3 pb-3">
                <SectionTip label="Werkzeug">
                  <p>📌 <strong>So funktioniert's:</strong> Wähle ein Werkzeug, dann zeichne mit der Maus ein Rechteck auf das PDF. Genau dort erscheint später das Feld für den Empfänger.</p>
                  <div className="space-y-1 pt-1 border-t border-white/20">
                    <p>⬛ <strong>Text</strong> — Einzeilige Eingabe (Name, Ort, Betrag …)</p>
                    <p>☒ <strong>Ja/Nein-Kreuz</strong> — Setzt automatisch ein „X" wenn Ja (z.B. Schwerbehinderung)</p>
                    <p>☑ <strong>Checkbox</strong> — Empfänger wählt selbst eine Option aus (z.B. Vollzeit / Teilzeit)</p>
                    <p>✍ <strong>Unterschrift</strong> — Unterschriftsfeld, das der Empfänger digital unterschreibt</p>
                    <p>📅 <strong>Datum</strong> — Datumsfeld (z.B. Vertragsbeginn)</p>
                  </div>
                </SectionTip>
                <div className="grid grid-cols-2 gap-1.5">
                  {FIELD_TYPES.map(t => {
                    const Icon = t.icon
                    const active = activeTool === t.key
                    return (
                      <button key={t.key}
                        onClick={() => setActiveTool(active ? null : t.key)}
                        title={t.label}
                        className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium border transition-all ${
                          active ? `${t.bg} ${t.border} ${t.text} ring-1 ring-current` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
                {activeTool && (
                  <p className="text-[11px] text-[#0d9488] mt-1.5 font-medium text-center">
                    Auf PDF einzeichnen ↓
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Context panel: field properties OR field list */}
          <div className="flex-1 overflow-y-auto">
            {selectedField ? (
              /* ── Field selected: show properties ── */
              <div className="p-3 space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setSelectedFieldId(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Zurück zur Feldliste"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <SectionTip label="Eigenschaften" labelClass="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    <p>🏷 <strong>Beschriftung</strong> — Interner Name des Feldes (erscheint als Platzhaltertext auf dem Dokument, z.B. „Vorname").</p>
                    <p>👤 <strong>Wer füllt aus?</strong> — Fachkraft oder Unternehmen. Das bestimmt, welche Seite dieses Feld beim Ausfüllen sieht.</p>
                    <p>⚡ <strong>Vorausfüllen</strong> — Wenn aktiviert, wird das Feld automatisch mit Daten aus dem Profil befüllt (z.B. Name, Geburtsdatum). Der Empfänger muss nichts tippen.</p>
                    <p>✳️ <strong>Pflichtfeld</strong> — Wenn aktiviert, muss der Empfänger dieses Feld ausfüllen, bevor er absenden kann.</p>
                  </SectionTip>
                </div>
                <FieldProperties
                  field={selectedField}
                  onChange={updateField}
                  onDelete={deleteField}
                />
              </div>
            ) : (
              /* ── No field selected: show field list ── */
              <div className="p-3">
                <SectionTip label={`Felder (${fields.length})`} labelClass="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  <p>📋 Alle Felder, die du bisher auf dem PDF platziert hast.</p>
                  <p>Klicke auf einen Eintrag, um das Feld zu bearbeiten (Name, Zielgruppe, Vorausfüllen).</p>
                  <p className="text-white/70">Tipp: Felder kannst du auch direkt auf dem PDF anklicken.</p>
                </SectionTip>
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-xs">Noch keine Felder</p>
                    <p className="text-[11px] mt-1 text-gray-300">Werkzeug wählen, dann auf PDF zeichnen</p>
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {fields.map((f, i) => {
                      const c = cfg(f.type, f.audience)
                      const Icon = c.icon
                      return (
                        <li key={f.id}>
                          <button
                            onClick={() => setSelectedFieldId(f.id)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all text-left hover:bg-gray-50 border border-transparent hover:border-gray-100"
                          >
                            <span className="text-gray-300 w-4 text-right shrink-0 text-[10px]">{i + 1}</span>
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${c.bg}`}>
                              <Icon className={`h-3 w-3 ${c.text}`} />
                            </div>
                            <span className="flex-1 truncate text-gray-700">
                              {f.label || <span className="text-gray-400 italic">{c.label}</span>}
                            </span>
                            <span className="text-gray-300 shrink-0 text-[10px]">S.{f.page}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Template type selector */}
          <div className="px-3 py-3 border-t border-gray-100 shrink-0 bg-slate-50">
            <SectionTip label="Vorlagentyp" labelClass="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              <p>📂 Für <strong>wen</strong> ist dieses Dokument hauptsächlich gedacht? Das beeinflusst, wie es beim Versenden automatisch kategorisiert wird.</p>
              <div className="space-y-1 pt-1 border-t border-white/20">
                <p>🟢 <strong>Fachkraft</strong> — z.B. Einverständniserklärung, Vollmacht, Datenschutzerklärung der Pflegekraft. Die Fachkraft unterschreibt.</p>
                <p>🔵 <strong>Unternehmen</strong> — z.B. Betriebsfragebogen, Arbeitgebererklärung. Das Unternehmen unterschreibt.</p>
                <p>🟣 <strong>Vermittlung</strong> — z.B. Förderantrag (IFlaS), Bewilligungsbescheid. Enthält Felder für Gehalt, Maßnahme-Daten & beide Parteien.</p>
              </div>
            </SectionTip>
            <div className="flex flex-col gap-1">
              {[
                { val: 'fachkraft',   label: 'Fachkraft',   color: 'border-green-500 bg-green-50 text-green-700', inactive: 'border-gray-200 text-gray-500 hover:bg-gray-50' },
                { val: 'unternehmen', label: 'Unternehmen',  color: 'border-blue-500 bg-blue-50 text-blue-700',   inactive: 'border-gray-200 text-gray-500 hover:bg-gray-50' },
                { val: 'vermittlung', label: 'Vermittlung',  color: 'border-purple-500 bg-purple-50 text-purple-700', inactive: 'border-gray-200 text-gray-500 hover:bg-gray-50' },
              ].map(({ val, label, color, inactive }) => (
                <button
                  key={val}
                  onClick={() => setTemplateType(val)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${templateType === val ? color : inactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-gray-100 shrink-0">
            <Button onClick={handleSave} disabled={saving || isLoading} className="w-full bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 h-9 text-sm">
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Speichern...</> : <><Save className="h-3.5 w-3.5 mr-2" />Speichern</>}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Inline field name popup (Portal) ── */}
      {fieldPopup && (
        <FieldNamePopup
          x={fieldPopup.x}
          y={fieldPopup.y}
          isCheckboxGroup={fieldPopup.isCheckboxGroup}
          label={fields.find(f => f.id === fieldPopup.fieldId)?.label || ''}
          onChange={val => updateField({ ...fields.find(f => f.id === fieldPopup.fieldId), label: val })}
          onDone={() => setFieldPopup(null)}
        />
      )}

      {/* ── Option name popup (Portal) ── */}
      {optionPopup && (
        <OptionNamePopup
          x={optionPopup.x}
          y={optionPopup.y}
          label={optionPopup.label}
          onChange={val => {
            setOptionPopup(prev => ({ ...prev, label: val }))
            setFields(prev => prev.map(f => {
              if (f.id !== optionPopup.fieldId) return f
              return { ...f, options: (f.options || []).map(o => o.id === optionPopup.optionId ? { ...o, label: val } : o) }
            }))
          }}
          onDone={() => setOptionPopup(null)}
        />
      )}
    </div>
  )
}
