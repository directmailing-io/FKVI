import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, Clock, CheckCircle2, ArrowRight } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [profilesRes, companiesRes] = await Promise.all([
      supabase.from('profiles').select('status'),
      supabase.from('companies').select('status, company_name, email, created_at').order('created_at', { ascending: false }).limit(5),
    ])

    const profiles = profilesRes.data || []
    const companies = companiesRes.data || []

    setStats({
      total: profiles.length,
      published: profiles.filter(p => p.status === 'published').length,
      reserved: profiles.filter(p => p.status === 'reserved').length,
      completed: profiles.filter(p => p.status === 'completed').length,
      pendingLeads: companies.filter(c => c.status === 'pending').length,
      approvedCompanies: companies.filter(c => c.status === 'approved').length,
    })

    setRecentLeads(companies.filter(c => c.status === 'pending').slice(0, 5))
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    </div>
  )

  const statCards = [
    { label: 'Fachkräfte gesamt', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Veröffentlicht', value: stats.published, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Reserviert', value: stats.reserved, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Offene Anfragen', value: stats.pendingLeads, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Übersicht aller Aktivitäten</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recentLeads.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Neue Unternehmensanfragen</CardTitle>
              <Link to="/admin/leads" className="text-sm text-fkvi-blue hover:underline flex items-center gap-1">
                Alle anzeigen <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeads.map(lead => (
                <div key={lead.email} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{lead.company_name}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                  </div>
                  <Badge variant="warning">Ausstehend</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
