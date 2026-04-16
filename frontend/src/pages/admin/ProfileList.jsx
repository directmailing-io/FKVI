import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { PROFILE_STATUS_LABELS, PROFILE_STATUS_COLORS } from '@/lib/utils'
import { Plus, Search, User, Edit, Eye, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function ProfileList() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteDialog, setDeleteDialog] = useState(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, status, nationality, specializations, created_at, profile_image_url')
        .order('created_at', { ascending: false })
      setProfiles(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const profile = deleteDialog
    setDeleteDialog(null)
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id)
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Profil gelöscht', description: `${profile.first_name || ''} ${profile.last_name || ''} wurde gelöscht.` })
      fetchProfiles()
    }
  }

  const filtered = profiles.filter(p => {
    const matchSearch = !search ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.nationality?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const statusButtons = [
    { key: 'all', label: 'Alle' },
    { key: 'draft', label: 'Entwurf' },
    { key: 'published', label: 'Veröffentlicht' },
    { key: 'reserved', label: 'Reserviert' },
    { key: 'completed', label: 'Abgeschlossen' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fachkräfte</h1>
          <p className="text-gray-500 mt-1">{profiles.length} Profile gesamt</p>
        </div>
        <Link to="/admin/fachkraefte/neu">
          <Button><Plus className="h-4 w-4 mr-2" />Neue Fachkraft</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Name oder Nationalität suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusButtons.map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s.key
                  ? 'bg-fkvi-blue text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <User className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Keine Fachkräfte gefunden</p>
          <p className="text-gray-400 text-sm mt-1">Legen Sie eine neue Fachkraft an oder ändern Sie den Filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Nationalität</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Spezialisierungen</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(profile => (
                  <tr
                    key={profile.id}
                    onClick={() => navigate(`/admin/fachkraefte/${profile.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {profile.profile_image_url ? (
                            <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-fkvi-blue transition-colors">
                          {profile.first_name || profile.last_name
                            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                            : 'Kein Name'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{profile.nationality || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(profile.specializations || []).slice(0, 2).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{s}</span>
                        ))}
                        {(profile.specializations || []).length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{profile.specializations.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PROFILE_STATUS_COLORS[profile.status]}`}>
                        {PROFILE_STATUS_LABELS[profile.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={e => { e.stopPropagation(); setDeleteDialog(profile) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!deleteDialog} onOpenChange={open => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />Profil unwiderruflich löschen?
            </DialogTitle>
            <DialogDescription>
              Das Profil von <strong>{deleteDialog?.first_name} {deleteDialog?.last_name}</strong> wird dauerhaft gelöscht.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
