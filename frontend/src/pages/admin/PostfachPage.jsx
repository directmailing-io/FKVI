import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'
import { Input } from '@/components/ui/input'
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
  Trash2,
  Search,
  RefreshCw,
} from 'lucide-react'

// ── Read state via localStorage ───────────────────────────────────────────────
const LS_READ_KEY = 'fkvi_postfach_read_ids'

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_READ_KEY) || '[]')) }
  catch { return new Set() }
}
function markRead(id) {
  const ids = getReadIds()
  ids.add(id)
  localStorage.setItem(LS_READ_KEY, JSON.stringify([...ids]))
}

// ── Relative time ─────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Gestern'
  if (days < 7) return `vor ${days} Tagen`
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Auth header ───────────────────────────────────────────────────────────────
function authHdr(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ── Status badge (used in detail dialog) ─────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    pending:   { label: 'Ausstehend',    className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    opened:    { label: 'Geöffnet',      className: 'bg-blue-50 text-blue-700 border border-blue-200' },
    signed:    { label: 'Unterzeichnet', className: 'bg-green-50 text-green-700 border border-green-200' },
    submitted: { label: 'Unterzeichnet', className: 'bg-green-50 text-green-700 border border-green-200' },
    expired:   { label: 'Abgelaufen',   className: 'bg-gray-100 text-gray-500 border border-gray-200' },
    revoked:   { label: 'Widerrufen',   className: 'bg-red-50 text-red-600 border border-red-200' },
  }
  const c = cfg[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  )
}

// ── Detail dialog ─────────────────────────────────────────────────────────────
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
        .then(setDetail)
        .catch(() => toast({ title: 'Fehler', description: 'Details konnten nicht geladen werden.', variant: 'destructive' }))
        .finally(() => setLoading(false))
    }
  }, [open, send, session])

  const handleDownload = async () => {
    const url = detail?.signedPdfUrl
    if (url) { window.open(url, '_blank'); return }
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
        headers: authHdr(session?.access_token),
        body: JSON.stringify({ sendId: send.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Widerrufen fehlgeschlagen')
      toast({ title: 'Widerrufen', description: 'Der Signierlink wurde widerrufen.' })
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
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0d9488]" />
            {send?.template_name || detail?.template?.name || 'Dokument'}
          </DialogTitle>
          <DialogDescription>{send?.signer_name || '—'}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Unterzeichner</p>
                <p className="font-medium text-gray-800">{send?.signer_name || '—'}</p>
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
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Unterzeichnet am</p>
                  <p className="text-gray-700 text-xs font-medium">{formatDateTime(send.signed_at)}</p>
                </div>
              )}
            </div>

            {send?.profile_id && (
              <a
                href={`/admin/fachkraefte/${send.profile_id}`}
                className="flex items-center gap-2 text-sm text-[#1a3a5c] hover:underline"
              >
                <User className="h-3.5 w-3.5" />
                Fachkraft-Profil öffnen
              </a>
            )}

            <Separator />

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
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(ev.created_at)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {detail?.fieldValues && Object.keys(detail.fieldValues).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ausgefüllte Felder</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
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
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[#0d9488]/40 text-[#0d9488] hover:bg-[#0d9488]/5 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              PDF herunterladen
            </button>
          )}
          {canRevoke && !confirmRevoke && (
            <button
              onClick={() => setConfirmRevoke(true)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Widerrufen
            </button>
          )}
          {canRevoke && confirmRevoke && (
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Wirklich widerrufen?
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto inline-flex items-center text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Schließen
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Inbox row ─────────────────────────────────────────────────────────────────
function InboxRow({ send, isRead, onOpen, onDelete, deletingId, deletingBusy, setDeletingId }) {
  const isDeleting = deletingId === send.id
  const timeStr = timeAgo(send.signed_at || send.created_at)
  const exactTime = send.signed_at
    ? formatDateTime(send.signed_at)
    : formatDateTime(send.created_at)

  return (
    <div
      onClick={() => !isDeleting && onOpen(send)}
      className={`group relative flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none transition-colors border-b border-gray-100 last:border-b-0 ${
        isDeleting
          ? 'bg-red-50'
          : isRead
            ? 'bg-white hover:bg-gray-50'
            : 'bg-[#f0f9f8] hover:bg-[#e8f5f4]'
      }`}
    >
      {/* Unread indicator */}
      <div className="w-2 shrink-0 flex items-center justify-center">
        {!isRead && (
          <div className="w-2 h-2 rounded-full bg-[#0d9488] shadow-sm" />
        )}
      </div>

      {/* Avatar / icon */}
      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold ${
        isRead ? 'bg-gray-100 text-gray-400' : 'bg-[#0d9488]/15 text-[#0d9488]'
      }`}>
        {(send.signer_name || 'D')[0].toUpperCase()}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className={`text-sm truncate ${isRead ? 'text-gray-600 font-normal' : 'text-gray-900 font-semibold'}`}>
            {send.signer_name || '—'}
          </p>
          <span className="text-xs text-gray-300 shrink-0 hidden sm:block">·</span>
          <p className="text-xs text-gray-400 truncate hidden sm:block">{send.template_name || 'Dokument'}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <FileText className="h-3 w-3 text-gray-300 shrink-0" />
          <p className="text-xs text-gray-400 truncate sm:hidden">{send.template_name || 'Dokument'}</p>
          <p className="text-xs text-gray-400 truncate hidden sm:block" title={exactTime}>
            Unterzeichnet am {exactTime}
          </p>
        </div>
      </div>

      {/* Time + actions */}
      <div className="shrink-0 flex items-center gap-2">
        <span className={`text-xs whitespace-nowrap ${isRead ? 'text-gray-300' : 'text-gray-500 font-medium'}`}>
          {timeStr}
        </span>

        {/* Delete (hover) */}
        {!isDeleting ? (
          <button
            onClick={e => { e.stopPropagation(); setDeletingId(send.id) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
            title="Löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-red-500 font-medium">Löschen?</span>
            <button
              onClick={() => onDelete(send.id)}
              disabled={deletingBusy}
              className="text-xs px-2 py-1 rounded bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deletingBusy ? '…' : 'Ja'}
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Nein
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PostfachPage() {
  const { session } = useAuthStore()
  const [sends, setSends] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const [readIds, setReadIds] = useState(() => getReadIds())
  const [selectedSend, setSelectedSend] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  useEffect(() => { fetchSends() }, [session])

  const fetchSends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dokumente/sends-list?status=signed,submitted', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      const sorted = (data.sends || []).sort(
        (a, b) => new Date(b.signed_at || b.created_at) - new Date(a.signed_at || a.created_at)
      )
      setSends(sorted)
    } catch {
      toast({ title: 'Fehler', description: 'Postfach konnte nicht geladen werden.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (send) => {
    markRead(send.id)
    setReadIds(getReadIds())
    setSelectedSend(send)
  }

  const handleDelete = async (id) => {
    setDeletingBusy(true)
    try {
      const res = await fetch('/api/admin/dokumente/delete-send', {
        method: 'DELETE',
        headers: authHdr(session?.access_token),
        body: JSON.stringify({ sendId: id }),
      })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      setSends(prev => prev.filter(s => s.id !== id))
      setDeletingId(null)
      toast({ title: 'Gelöscht', description: 'Eintrag wurde entfernt.' })
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const unreadCount = useMemo(
    () => sends.filter(s => !readIds.has(s.id)).length,
    [sends, readIds]
  )

  const filtered = useMemo(() => {
    let result = sends
    if (filter === 'unread') result = result.filter(s => !readIds.has(s.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        (s.template_name || '').toLowerCase().includes(q) ||
        (s.signer_name || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [sends, filter, search, readIds])

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Postfach</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unreadCount > 0
              ? <><span className="font-semibold text-[#0d9488]">{unreadCount}</span> ungelesen · {sends.length} gesamt</>
              : `${sends.length} Einträge · alle gelesen`
            }
          </p>
        </div>
        <button
          onClick={fetchSends}
          disabled={loading}
          className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          title="Aktualisieren"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Inbox card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fachkraft oder Dokument suchen…"
              className="pl-8 h-8 text-sm border-gray-200 bg-white rounded-lg"
            />
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-[#1a3a5c] text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'unread' ? 'bg-[#1a3a5c] text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Ungelesen
              {unreadCount > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  filter === 'unread' ? 'bg-white/20 text-white' : 'bg-[#0d9488]/10 text-[#0d9488]'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-b-0">
                <div className="w-2 shrink-0" />
                <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded animate-pulse w-36" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-48" />
                </div>
                <div className="h-3 bg-gray-100 rounded animate-pulse w-12 shrink-0" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Inbox className="h-10 w-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">
              {search
                ? 'Keine Treffer für deine Suche'
                : filter === 'unread'
                  ? 'Alles gelesen'
                  : 'Postfach ist leer'
              }
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="text-xs text-[#0d9488] mt-2 hover:underline">
                Suche zurücksetzen
              </button>
            )}
          </div>
        ) : (
          filtered.map(send => (
            <InboxRow
              key={send.id}
              send={send}
              isRead={readIds.has(send.id)}
              onOpen={handleOpen}
              onDelete={handleDelete}
              deletingId={deletingId}
              deletingBusy={deletingBusy}
              setDeletingId={setDeletingId}
            />
          ))
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400 text-center">
            {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {selectedSend && (
        <SendDetailDialog
          send={selectedSend}
          open={!!selectedSend}
          onClose={() => setSelectedSend(null)}
          session={session}
          onRevoked={(id) => setSends(prev => prev.map(s => s.id === id ? { ...s, status: 'revoked' } : s))}
        />
      )}
    </div>
  )
}
