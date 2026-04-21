import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { formatDateTime, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Inbox,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  User,
  Calendar,
  Clock,
  ChevronRight,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function sevenDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    pending:   { label: 'Ausstehend',    className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    opened:    { label: 'Geöffnet',      className: 'bg-blue-50 text-blue-700 border border-blue-200' },
    signed:    { label: 'Unterzeichnet', className: 'bg-green-50 text-green-700 border border-green-200' },
    submitted: { label: 'Unterzeichnet', className: 'bg-green-50 text-green-700 border border-green-200' },
    expired:   { label: 'Abgelaufen',   className: 'bg-gray-100 text-gray-500 border border-gray-200' },
    revoked:   { label: 'Widerrufen',   className: 'bg-red-50 text-red-600 border border-red-200 line-through opacity-70' },
  }
  const c = cfg[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  )
}

// ─── Status strip color ───────────────────────────────────────────────────────

function statusStrip(status) {
  if (status === 'signed' || status === 'submitted') return 'bg-green-400'
  if (status === 'opened') return 'bg-blue-400'
  if (status === 'revoked') return 'bg-red-300'
  if (status === 'expired') return 'bg-gray-300'
  return 'bg-yellow-300'
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',     label: 'Alle eingegangen', status: 'signed,submitted' },
  { key: 'week',    label: 'Diese Woche',       status: 'signed,submitted' },
  { key: 'pending', label: 'Ausstehend',        status: 'pending,opened' },
]

// ─── SendDetailDialog ─────────────────────────────────────────────────────────

function SendDetailDialog({ send, open, onClose, session, onRevoked }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  useEffect(() => {
    if (open && send) {
      setDetail(null)
      setConfirmRevoke(false)
      setLoading(true)
      fetch(`/api/admin/dokumente/sends-detail?sendId=${send.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then(r => r.json())
        .then(data => setDetail(data))
        .catch(() =>
          toast({ title: 'Fehler', description: 'Details konnten nicht geladen werden.', variant: 'destructive' })
        )
        .finally(() => setLoading(false))
    }
  }, [open, send, session])

  const handleDownload = async () => {
    const url = detail?.signedPdfUrl
    if (url) {
      window.open(url, '_blank')
      return
    }
    try {
      const res = await fetch(`/api/admin/dokumente/sends-detail?sendId=${send.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (data.signedPdfUrl) window.open(data.signedPdfUrl, '_blank')
      else toast({ title: 'Nicht verfügbar', description: 'Kein signiertes PDF vorhanden.', variant: 'destructive' })
    } catch {
      toast({ title: 'Fehler', description: 'URL konnte nicht abgerufen werden.', variant: 'destructive' })
    }
  }

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      const res = await fetch('/api/admin/dokumente/revoke', {
        method: 'POST',
        headers: authHeaders(session?.access_token),
        body: JSON.stringify({ sendId: send.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Widerrufen fehlgeschlagen')
      toast({ title: 'Widerrufen', description: 'Der Signierlink wurde widerrufen.', variant: 'success' })
      setConfirmRevoke(false)
      onRevoked(send.id)
      onClose()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setRevoking(false)
    }
  }

  const eventCfg = {
    created:   { icon: FileText,     color: 'text-gray-400',  label: () => 'Erstellt' },
    opened:    { icon: Eye,          color: 'text-blue-500',  label: (e) => `Geöffnet${e.count > 1 ? ` (${e.count}×)` : ''}` },
    signed:    { icon: CheckCircle2, color: 'text-green-500', label: () => 'Unterzeichnet' },
    submitted: { icon: CheckCircle2, color: 'text-green-500', label: () => 'Unterzeichnet' },
    revoked:   { icon: XCircle,      color: 'text-red-500',   label: () => 'Widerrufen' },
  }

  const canRevoke = send && !['revoked', 'signed', 'submitted'].includes(send.status)
  const isSigned = send?.status === 'signed' || send?.status === 'submitted'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Versand-Details</DialogTitle>
          <DialogDescription>
            {send?.template_name || detail?.template?.name || '—'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Unterzeichner</p>
                <p className="font-medium text-gray-800">{send?.signer_name || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">E-Mail</p>
                <p className="font-medium text-gray-800">{send?.signer_email || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Status</p>
                <StatusBadge status={send?.status} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Erstellt</p>
                <p className="text-gray-700 text-xs">{formatDateTime(send?.created_at)}</p>
              </div>
              {send?.signed_at && (
                <div className="col-span-2 space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Unterzeichnet am</p>
                  <p className="text-gray-700 text-sm font-medium">{formatDateTime(send.signed_at)}</p>
                </div>
              )}
              {send?.expires_at && (
                <div className="col-span-2 space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Ablaufdatum</p>
                  <p className="text-gray-700 text-xs">{formatDate(send.expires_at)}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Audit log timeline */}
            {detail?.events && detail.events.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aktivitäten</p>
                <ul className="space-y-2.5">
                  {detail.events.map((ev, i) => {
                    const cfg = eventCfg[ev.type] ?? { icon: FileText, color: 'text-gray-400', label: () => ev.type }
                    const Icon = cfg.icon
                    return (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                        <span className="flex-1 text-gray-700">{cfg.label(ev)}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDateTime(ev.created_at)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Filled field values */}
            {detail?.fieldValues && Object.keys(detail.fieldValues).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ausgefüllte Felder</p>
                  <div className="space-y-1.5">
                    {Object.entries(detail.fieldValues).map(([k, v]) => (
                      <div key={k} className="flex gap-3 text-sm">
                        <span className="text-gray-400 shrink-0 w-28 truncate">{k}:</span>
                        <span className="text-gray-700 break-all">{String(v) || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 pt-2">
          {isSigned && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#0d9488] border-[#0d9488]/40 hover:bg-[#0d9488]/5"
              onClick={handleDownload}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              PDF herunterladen
            </Button>
          )}
          {canRevoke && !confirmRevoke && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirmRevoke(true)}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Widerrufen
            </Button>
          )}
          {canRevoke && confirmRevoke && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <XCircle className="h-3.5 w-3.5 mr-1.5" />
              }
              Wirklich widerrufen?
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Send card ────────────────────────────────────────────────────────────────

function SendCard({ send, onOpenDetail }) {
  const isSigned = send.status === 'signed' || send.status === 'submitted'
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex">
      {/* Status strip */}
      <div className={`w-1.5 shrink-0 ${statusStrip(send.status)}`} />

      {/* Content */}
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate leading-tight">
              {send.template_name || 'Unbekanntes Dokument'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-500 truncate">{send.signer_name || '—'}</p>
              {send.signer_email && (
                <p className="text-xs text-gray-400 truncate hidden sm:block">· {send.signer_email}</p>
              )}
            </div>
          </div>
          <StatusBadge status={send.status} />
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {/* Timestamps */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Erstellt: {formatDateTime(send.created_at)}</span>
          </div>
          {isSigned && send.signed_at && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{formatDateTime(send.signed_at)}</span>
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {send.profile_id && (
            <a
              href={`/admin/fachkraefte/${send.profile_id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1a3a5c] hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              Profil ansehen
              <ChevronRight className="h-3 w-3" />
            </a>
          )}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto text-[#1a3a5c] border-[#1a3a5c]/30 hover:bg-[#1a3a5c]/5 h-9"
            onClick={() => onOpenDetail(send)}
          >
            Details &amp; Download
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PostfachPage() {
  const { session } = useAuthStore()
  const [sends, setSends] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedSend, setSelectedSend] = useState(null)

  // Fetch signed/submitted sends
  useEffect(() => {
    fetchSends()
  }, [session])

  const fetchSends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dokumente/sends-list?status=signed,submitted', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setSends(data.sends || [])
    } catch {
      toast({ title: 'Fehler', description: 'Versand-Liste konnte nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Filter by tab
  const cutoff = sevenDaysAgo()
  const filteredSends = (() => {
    if (activeTab === 'week') {
      return sends.filter(s => {
        const d = s.signed_at ? new Date(s.signed_at) : new Date(s.created_at)
        return d >= cutoff
      })
    }
    if (activeTab === 'pending') {
      return sends.filter(s => s.status === 'pending' || s.status === 'opened')
    }
    // 'all' — already filtered to signed/submitted on fetch
    return sends
  })()

  // Stats
  const totalCount = sends.length
  const weekCount = sends.filter(s => {
    const d = s.signed_at ? new Date(s.signed_at) : new Date(s.created_at)
    return d >= cutoff
  }).length

  const handleRevoked = (sendId) => {
    setSends(prev => prev.map(s => s.id === sendId ? { ...s, status: 'revoked' } : s))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dokumenten-Postfach</h1>
        <p className="text-gray-500 mt-1 text-sm">Unterzeichnete Dokumente</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gesamt unterzeichnet</p>
          <p className="text-3xl font-black text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Diese Woche</p>
          <p className="text-3xl font-black text-[#0d9488]">{weekCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Letztes Dokument</p>
          <p className="text-sm font-semibold text-gray-700 truncate">
            {sends[0]?.signed_at
              ? formatDateTime(sends[0].signed_at)
              : sends[0]?.created_at
                ? formatDateTime(sends[0].created_at)
                : '—'
            }
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium border transition-colors
              ${activeTab === tab.key
                ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            {tab.label}
            {tab.key === 'week' && weekCount > 0 && (
              <span className={`ml-2 text-xs font-bold rounded-full px-1.5 py-0.5 ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-[#0d9488]/10 text-[#0d9488]'
              }`}>
                {weekCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Send list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredSends.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center text-gray-400">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {activeTab === 'all'
              ? 'Noch keine unterzeichneten Dokumente'
              : activeTab === 'week'
                ? 'Keine Dokumente in dieser Woche'
                : 'Keine ausstehenden Dokumente'
            }
          </p>
          <p className="text-xs mt-1 text-gray-300">
            Unterzeichnete Dokumente erscheinen hier automatisch.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSends.map(send => (
            <SendCard
              key={send.id}
              send={send}
              onOpenDetail={setSelectedSend}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      {selectedSend && (
        <SendDetailDialog
          send={selectedSend}
          open={!!selectedSend}
          onClose={() => setSelectedSend(null)}
          session={session}
          onRevoked={handleRevoked}
        />
      )}
    </div>
  )
}
