import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, PROCESS_STATUS_LABELS } from '@/lib/utils'
import {
  Users, Building2, Clock, CheckCircle2, ArrowRight, Plus,
  TrendingUp, Briefcase, AlertCircle, Activity, ChevronRight,
  UserCheck, Star
} from 'lucide-react'

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, bg, href }) {
  const content = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {href && <ChevronRight className="h-4 w-4 text-gray-300" />}
      </div>
      <div className="mt-3">
        <div className="text-3xl font-bold text-gray-900">{value ?? '—'}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        {sub != null && (
          <div className="text-xs text-gray-400 mt-1">{sub}</div>
        )}
      </div>
    </div>
  )
  return href ? <Link to={href}>{content}</Link> : content
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────
function PipelineBar({ step, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const label = PROCESS_STATUS_LABELS?.[step] || `Schritt ${step}`
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="truncate max-w-[200px]">{label}</span>
        <span className="font-semibold text-gray-700 ml-2">{count}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-fkvi-blue rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [recentProfiles, setRecentProfiles] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [profilesRes, companiesRes, reservationsRes] = await Promise.all([
      supabase.from('profiles').select('id, status, first_name, last_name, nationality, created_at, profile_image_url').order('created_at', { ascending: false }),
      supabase.from('companies').select('id, status, company_name, email, created_at, company_type').order('created_at', { ascending: false }),
      supabase.from('reservations').select('id, process_status, created_at').order('created_at', { ascending: false }),
    ])

    const profiles   = profilesRes.data   || []
    const companies  = companiesRes.data  || []
    const reservations = reservationsRes.data || []

    // Profile stats
    const byStatus = (s) => profiles.filter(p => p.status === s).length
    // Pipeline distribution
    const pipelineCounts = {}
    reservations.forEach(r => {
      pipelineCounts[r.process_status] = (pipelineCounts[r.process_status] || 0) + 1
    })
    const pipelineArr = Object.entries(pipelineCounts)
      .map(([step, count]) => ({ step: Number(step), count }))
      .sort((a, b) => a.step - b.step)

    setStats({
      totalProfiles:    profiles.length,
      published:        byStatus('published'),
      reserved:         byStatus('reserved'),
      completed:        byStatus('completed'),
      pendingLeads:     companies.filter(c => c.status === 'pending').length,
      approvedCompanies: companies.filter(c => c.status === 'approved').length,
      customers:        companies.filter(c => c.company_type === 'customer').length,
      activeReservations: reservations.length,
    })

    setRecentLeads(companies.filter(c => c.status === 'pending').slice(0, 5))
    setRecentProfiles(profiles.slice(0, 5))
    setPipeline(pipelineArr)
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    </div>
  )

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
          <p className="text-gray-500 mt-1">Hier ist deine aktuelle Übersicht</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/crm')}>
            <Briefcase className="h-4 w-4 mr-2" />CRM öffnen
          </Button>
          <Button size="sm" onClick={() => navigate('/admin/fachkraefte/neu')}>
            <Plus className="h-4 w-4 mr-2" />Neue Fachkraft
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Fachkräfte gesamt" value={stats.totalProfiles} icon={Users}
          color="text-blue-600" bg="bg-blue-50" href="/admin/fachkraefte" />
        <StatCard label="Veröffentlicht" value={stats.published}
          sub={`${stats.totalProfiles > 0 ? Math.round(stats.published / stats.totalProfiles * 100) : 0} % des Portfolios`}
          icon={CheckCircle2} color="text-green-600" bg="bg-green-50" href="/admin/fachkraefte" />
        <StatCard label="Reserviert" value={stats.reserved} icon={Clock}
          color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="Abgeschlossen" value={stats.completed} icon={Star}
          color="text-purple-600" bg="bg-purple-50" />
        <StatCard label="Offene Anfragen" value={stats.pendingLeads}
          sub={stats.pendingLeads > 0 ? 'Handlungsbedarf' : 'Alles erledigt ✓'}
          icon={AlertCircle} color="text-red-500" bg="bg-red-50" href="/admin/leads" />
        <StatCard label="Freigesch. Firmen" value={stats.approvedCompanies} icon={Building2}
          color="text-fkvi-blue" bg="bg-blue-50/50" href="/admin/crm" />
        <StatCard label="Kunden" value={stats.customers} icon={UserCheck}
          color="text-teal-600" bg="bg-teal-50" href="/admin/crm" />
        <StatCard label="Aktive Vermittlungen" value={stats.activeReservations} icon={Activity}
          color="text-violet-600" bg="bg-violet-50" />
      </div>

      {/* Middle row: Pipeline + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Vermittlungs-Pipeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-fkvi-blue" />Vermittlungs-Pipeline
            </h2>
            <span className="text-xs text-gray-400">{stats.activeReservations} aktiv</span>
          </div>
          {pipeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Noch keine aktiven Vermittlungen</p>
          ) : (
            <div className="space-y-3">
              {pipeline.map(({ step, count }) => (
                <PipelineBar key={step} step={step} count={count} total={stats.activeReservations} />
              ))}
            </div>
          )}
        </div>

        {/* Neue Unternehmensanfragen */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-fkvi-blue" />Neue Anfragen
            </h2>
            <Link to="/admin/leads" className="text-xs text-fkvi-blue hover:underline flex items-center gap-1">
              Alle <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Alle Anfragen bearbeitet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeads.map(lead => (
                <Link
                  key={lead.id}
                  to={`/admin/crm/${lead.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{lead.company_name}</p>
                    <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-xs text-gray-400 hidden sm:block">{formatDateTime(lead.created_at)}</span>
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">Neu</span>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-fkvi-blue transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Profiles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-fkvi-blue" />Zuletzt angelegte Fachkräfte
          </h2>
          <Link to="/admin/fachkraefte" className="text-xs text-fkvi-blue hover:underline flex items-center gap-1">
            Alle <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentProfiles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Noch keine Profile angelegt</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentProfiles.map(p => (
              <Link
                key={p.id}
                to={`/admin/fachkraefte/${p.id}`}
                className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                  {p.profile_image_url
                    ? <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                    : <Users className="h-4 w-4 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Kein Name'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{p.nationality || '—'} · {formatDateTime(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={p.status} />
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-fkvi-blue transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft:     'bg-gray-100 text-gray-500',
    published: 'bg-green-100 text-green-700',
    reserved:  'bg-orange-100 text-orange-700',
    completed: 'bg-purple-100 text-purple-700',
  }
  const labels = { draft: 'Entwurf', published: 'Veröffentlicht', reserved: 'Reserviert', completed: 'Abgeschlossen' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {labels[status] || status}
    </span>
  )
}
