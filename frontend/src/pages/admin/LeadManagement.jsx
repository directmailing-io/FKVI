import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDateTime } from '@/lib/utils'
import { Building2, CheckCircle2, X, Trash2, FileText, Phone, Mail, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const STATUS_CONFIG = {
  pending: { label: 'Ausstehend', variant: 'warning' },
  approved: { label: 'Freigeschaltet', variant: 'success' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
}

export default function LeadManagement() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectDialog, setRejectDialog] = useState(false)
  const { session } = useAuthStore()

  useEffect(() => { fetchCompanies() }, [])

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    setCompanies(data || [])
    setLoading(false)
  }

  const filtered = companies.filter(c => filter === 'all' || c.status === filter)

  const handleApprove = async (company) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${company.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Unternehmen freigeschaltet', description: `${company.company_name} hat Zugang erhalten. Eine E-Mail wurde versandt.`, variant: 'success' })
      fetchCompanies()
      setSelected(null)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await fetch(`/api/admin/companies/${selected.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ reason: rejectNote }),
      })
      toast({ title: 'Anfrage abgelehnt', description: `${selected.company_name} wurde abgelehnt.` })
      fetchCompanies()
      setRejectDialog(false)
      setSelected(null)
      setRejectNote('')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (company) => {
    if (!confirm(`"${company.company_name}" wirklich löschen?`)) return
    await fetch(`/api/admin/companies/${company.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    fetchCompanies()
    if (selected?.id === company.id) setSelected(null)
  }

  const saveNotes = async (companyId, notes) => {
    await supabase.from('companies').update({ internal_notes: notes }).eq('id', companyId)
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, internal_notes: notes } : c))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Freigabezentrale</h1>
        <p className="text-gray-500 mt-1">Unternehmensanfragen prüfen und freischalten</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'pending', label: `Ausstehend (${companies.filter(c => c.status === 'pending').length})` },
          { key: 'approved', label: 'Freigeschaltet' },
          { key: 'rejected', label: 'Abgelehnt' },
          { key: 'all', label: 'Alle' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-fkvi-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Keine Anfragen in dieser Kategorie</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(company => (
                <div
                  key={company.id}
                  onClick={() => setSelected(company)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer hover:border-fkvi-blue/30 transition-colors ${
                    selected?.id === company.id ? 'border-fkvi-blue shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{company.company_name}</p>
                      <p className="text-sm text-gray-500">{company.first_name} {company.last_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_CONFIG[company.status]?.variant}>
                        {STATUS_CONFIG[company.status]?.label}
                      </Badge>
                      <span className="text-xs text-gray-400">{formatDateTime(company.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 sticky top-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.company_name}</h3>
                  <Badge variant={STATUS_CONFIG[selected.status]?.variant} className="mt-1">
                    {STATUS_CONFIG[selected.status]?.label}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{selected.first_name} {selected.last_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a href={`mailto:${selected.email}`} className="hover:underline text-fkvi-blue">{selected.email}</a>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{selected.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Interne Notiz</Label>
                <Textarea
                  value={selected.internal_notes || ''}
                  onChange={e => {
                    setSelected(prev => ({ ...prev, internal_notes: e.target.value }))
                  }}
                  onBlur={e => saveNotes(selected.id, e.target.value)}
                  placeholder="Notizen zur Anfrage..."
                  rows={3}
                  className="text-sm"
                />
              </div>

              {selected.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleApprove(selected)}
                    disabled={actionLoading}
                    size="sm"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Freischalten</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectDialog(true)}
                    disabled={actionLoading}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />Ablehnen
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-400 hover:text-red-600"
                onClick={() => handleDelete(selected)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />Eintrag löschen
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anfrage ablehnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Ablehnungsgrund (intern)</Label>
            <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Optionaler interner Grund..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
