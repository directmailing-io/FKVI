import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { PROCESS_STATUS_LABELS, formatDateTime } from '@/lib/utils'
import { Activity, User, ChevronRight, CheckCircle2, Clock, Users } from 'lucide-react'

const STEP_COLOR = (s) => {
  if (s === 11) return 'bg-green-100 text-green-700'
  if (s >= 8)   return 'bg-purple-100 text-purple-700'
  if (s >= 5)   return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

export default function VermittlungenPage() {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('aktiv')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('reservations')
        .select(`
          id, process_status, created_at, updated_at,
          profiles ( id, first_name, last_name, gender, age, nationality, profile_image_url, nursing_education ),
          companies ( id, company_name, city )
        `)
        .order('updated_at', { ascending: false })
      setReservations(data || [])
    } finally {
      setLoading(false)
    }
  }

  const filtered = reservations.filter(r => {
    if (filter === 'aktiv')       return r.process_status < 11
    if (filter === 'abgeschlossen') return r.process_status === 11
    return true
  })

  const counts = {
    alle:           reservations.length,
    aktiv:          reservations.filter(r => r.process_status < 11).length,
    abgeschlossen:  reservations.filter(r => r.process_status === 11).length,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vermittlungen</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {counts.aktiv} aktiv · {counts.abgeschlossen} abgeschlossen
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'aktiv',         label: `Aktiv (${counts.aktiv})` },
          { key: 'abgeschlossen', label: `Abgeschlossen (${counts.abgeschlossen})` },
          { key: 'alle',          label: `Alle (${counts.alle})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-fkvi-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Activity className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Keine Vermittlungen in dieser Kategorie</p>
          <p className="text-gray-400 text-sm mt-1">Profile können über die Fachkräfte-Seite reserviert werden.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fachkraft</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Unternehmen</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Schritt</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Fortschritt</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Zuletzt</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(res => {
                const p = res.profiles
                const c = res.companies
                const step = res.process_status
                const pct = Math.round((step / 11) * 100)

                return (
                  <tr
                    key={res.id}
                    onClick={() => navigate(`/admin/vermittlungen/${res.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    {/* Fachkraft */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                          {p?.profile_image_url
                            ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                            : <User className="h-4 w-4 text-gray-300" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || `${p.gender || 'Fachkraft'}` : '—'}
                          </p>
                          <p className="text-xs text-gray-400">{p?.nationality || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Unternehmen */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="font-medium text-gray-700">{c?.company_name || '—'}</p>
                      <p className="text-xs text-gray-400">{c?.city || ''}</p>
                    </td>

                    {/* Schritt */}
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STEP_COLOR(step)}`}>
                        {step}/11
                      </span>
                      <p className="text-xs text-gray-400 mt-1 max-w-[140px] truncate">
                        {PROCESS_STATUS_LABELS[step]}
                      </p>
                    </td>

                    {/* Fortschritt */}
                    <td className="px-5 py-4 hidden lg:table-cell w-40">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${step === 11 ? 'bg-green-500' : 'bg-fkvi-blue'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{pct} %</p>
                    </td>

                    {/* Datum */}
                    <td className="px-5 py-4 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                      {formatDateTime(res.updated_at)}
                    </td>

                    {/* Arrow */}
                    <td className="px-4 py-4">
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-fkvi-blue transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
