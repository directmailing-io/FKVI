import { X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { GERMAN_STATES, EXPERIENCE_AREAS } from '@/lib/utils'
import {
  BERUFSGRUPPEN,
  SPECIALIZATIONS_BY_BERUFSGRUPPE,
  EINRICHTUNGSTYPEN_BY_BERUFSGRUPPE,
  getSpecializationsLabel,
} from '@/lib/profileOptions'

export const EMPTY_FILTERS = {
  berufsgruppe: '',
  gender: '',
  german_recognition: '',
  specializations: [],
  additional_qualifications: [],
  experience_areas: [],
  einrichtungstypen: [],
  work_time_preference: '',
  has_drivers_license: false,
  state_preferences: [],
}

export function countActiveFilters(filters) {
  let count = 0
  if (filters.berufsgruppe) count++
  if (filters.gender) count++
  if (filters.german_recognition) count++
  if (filters.specializations.length > 0) count++
  if (filters.additional_qualifications.length > 0) count++
  if (filters.experience_areas.length > 0) count++
  if (filters.einrichtungstypen.length > 0) count++
  if (filters.work_time_preference) count++
  if (filters.has_drivers_license) count++
  if (filters.state_preferences.length > 0) count++
  return count
}

export default function FilterPanel({ filters, onChange, onReset }) {
  const set = (field, value) => onChange({ ...filters, [field]: value })
  const activeCount = countActiveFilters(filters)

  const bg = filters.berufsgruppe
  const specsOptions = bg ? (SPECIALIZATIONS_BY_BERUFSGRUPPE[bg] || []) : []
  const facilityOptions = bg ? (EINRICHTUNGSTYPEN_BY_BERUFSGRUPPE[bg] || []) : []
  const specsLabel = bg ? getSpecializationsLabel(bg) : 'Spezialisierungen'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Filter</h3>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-fkvi-blue hover:underline flex items-center gap-1"
          >
            <X className="h-3 w-3" />Zurücksetzen ({activeCount})
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Berufsgruppe */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Berufsgruppe</Label>
          <Select value={filters.berufsgruppe} onValueChange={v => {
            onChange({ ...filters, berufsgruppe: v === '_all' ? '' : v, specializations: [], einrichtungstypen: [] })
          }}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Alle</SelectItem>
              {BERUFSGRUPPEN.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Geschlecht */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Geschlecht</Label>
          <Select value={filters.gender} onValueChange={v => set('gender', v === '_all' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Alle</SelectItem>
              <SelectItem value="männlich">Männlich</SelectItem>
              <SelectItem value="weiblich">Weiblich</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Anerkennung */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Anerkennung in Deutschland</Label>
          <Select value={filters.german_recognition} onValueChange={v => set('german_recognition', v === '_all' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Alle</SelectItem>
              <SelectItem value="anerkannt">Anerkannt</SelectItem>
              <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
              <SelectItem value="nicht_beantragt">Nicht beantragt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Spezialisierungen — only when berufsgruppe selected */}
        {bg && specsOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">{specsLabel}</Label>
            <MultiSelect
              options={specsOptions}
              value={filters.specializations}
              onChange={v => set('specializations', v)}
              placeholder="Alle"
            />
          </div>
        )}

        {/* Erfahrungsbereiche */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Erfahrung in Bereichen</Label>
          <MultiSelect
            options={EXPERIENCE_AREAS}
            value={filters.experience_areas}
            onChange={v => set('experience_areas', v)}
            placeholder="Alle"
          />
        </div>

        {/* Einrichtungstyp — only when berufsgruppe selected */}
        {bg && facilityOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Bevorzugte Einrichtung</Label>
            <MultiSelect
              options={facilityOptions}
              value={filters.einrichtungstypen}
              onChange={v => set('einrichtungstypen', v)}
              placeholder="Alle"
            />
          </div>
        )}

        {/* Arbeitszeitpräferenz */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Arbeitszeit</Label>
          <Select value={filters.work_time_preference} onValueChange={v => set('work_time_preference', v === '_all' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Alle</SelectItem>
              {['Vollzeit','Teilzeit','Flexibel'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bundesländer */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Bundesländer</Label>
          <MultiSelect
            options={GERMAN_STATES}
            value={filters.state_preferences}
            onChange={v => set('state_preferences', v)}
            placeholder="Alle"
          />
        </div>

        {/* Führerschein */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-500">Führerschein Klasse B</Label>
          <Switch
            checked={filters.has_drivers_license}
            onCheckedChange={v => set('has_drivers_license', v)}
          />
        </div>
      </div>
    </div>
  )
}
