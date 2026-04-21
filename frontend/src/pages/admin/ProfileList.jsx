import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { PROFILE_STATUS_LABELS, PROFILE_STATUS_COLORS } from '@/lib/utils'
import { Plus, Search, User, Trash2, AlertTriangle, GripVertical, Globe } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function ProfileList() {
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [savingOrder, setSavingOrder] = useState(false)

  // Drag state (refs to avoid re-renders during drag)
  const dragIdx = useRef(null)
  const dragOverIdx = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const canDrag = statusFilter === 'all' && !search

  useEffect(() => { fetchProfiles() }, [])

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, status, nationality, specializations, created_at, profile_image_url, sort_order')
        .order('sort_order', { ascending: true, nullsFirst: false })

      // Fallback if sort_order column doesn't exist yet (migration pending)
      if (error) {
        const fallback = await supabase
          .from('profiles')
          .select('id, first_name, last_name, status, nationality, specializations, created_at, profile_image_url')
          .order('created_at', { ascending: false })
        data = fallback.data
      }
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

  // ─── Drag & Drop handlers ────────────────────────────────────────────────────
  const handleDragStart = (e, idx) => {
    dragIdx.current = idx
    setDragActive(true)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverIdx.current = idx
  }

  const handleDrop = async (e, idx) => {
    e.preventDefault()
    const from = dragIdx.current
    if (from === null || from === idx) { resetDrag(); return }

    const reordered = [...profiles]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(idx, 0, moved)
    setProfiles(reordered)
    resetDrag()

    // Persist to backend
    setSavingOrder(true)
    try {
      const res = await fetch('/api/admin/update-profile-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ orderedIds: reordered.map(p => p.id) }),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      toast({ title: 'Reihenfolge gespeichert' })
    } catch {
      toast({ title: 'Reihenfolge konnte nicht gespeichert werden', variant: 'destructive' })
      fetchProfiles() // revert
    } finally {
      setSavingOrder(false)
    }
  }

  const handleDragEnd = () => resetDrag()
  const resetDrag = () => { dragIdx.current = null; dragOverIdx.current = null; setDragActive(false) }

  // ─── Filter ──────────────────────────────────────────────────────────────────
  const filtered = profiles.filter(p => {
    const matchSearch = !search ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.nationality?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  // Which profiles appear in the public homepage preview (top 3 published in sort order)
  const topPublishedIds = new Set(
    profiles.filter(p => p.status === 'published').slice(0, 3).map(p => p.id)
  )

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

      {/* DnD hint */}
      {canDrag && !loading && filtered.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <GripVertical className="h-3.5 w-3.5 shrink-0" />
          Ziehen und ablegen, um die Reihenfolge zu ändern. Die ersten 3 veröffentlichten Profile
          <span className="inline-flex items-center gap-1 bg-fkvi-teal/10 text-fkvi-teal px-1.5 py-0.5 rounded font-medium">
            <Globe className="h-3 w-3" />Webseite
          </span>
          werden auf der Hauptseite beworben.
          {savingOrder && <span className="ml-auto text-fkvi-blue font-medium animate-pulse">Speichert…</span>}
        </div>
      )}

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
                  {canDrag && <th className="w-8 px-2" />}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Nationalität</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Spezialisierungen</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((profile, idx) => {
                  const isFeatured = topPublishedIds.has(profile.id)
                  const isDragging = dragActive && dragIdx.current === idx

                  return (
                    <tr
                      key={profile.id}
                      draggable={canDrag}
                      onDragStart={canDrag ? e => handleDragStart(e, idx) : undefined}
                      onDragOver={canDrag ? e => handleDragOver(e, idx) : undefined}
                      onDrop={canDrag ? e => handleDrop(e, idx) : undefined}
                      onDragEnd={canDrag ? handleDragEnd : undefined}
                      onClick={() => navigate(`/admin/fachkraefte/${profile.id}`)}
                      className={cn(
                        'hover:bg-gray-50 transition-colors cursor-pointer group',
                        isDragging && 'opacity-40',
                        isFeatured && 'bg-fkvi-teal/[0.03]'
                      )}
                    >
                      {/* Drag handle */}
                      {canDrag && (
                        <td className="w-8 pl-3 pr-1 text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing select-none"
                          onClick={e => e.stopPropagation()}
                        >
                          <GripVertical className="h-4 w-4" />
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {profile.profile_image_url ? (
                              <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 group-hover:text-fkvi-blue transition-colors block">
                              {profile.first_name || profile.last_name
                                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                                : 'Kein Name'}
                            </span>
                            {isFeatured && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fkvi-teal">
                                <Globe className="h-2.5 w-2.5" />Auf Webseite
                              </span>
                            )}
                          </div>
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
                  )
                })}
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
