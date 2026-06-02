import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { FileText, Trash2, Eye, Loader2, CloudUpload } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// pdfjs worker via CDN — works for all PDF formats and encodings
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

const API = (path) => `/api/admin/mediathek/${path}`

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFiles, uploading }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (files.length) onFiles(files)
  }, [onFiles])

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none',
        dragOver
          ? 'border-blue-400 bg-blue-50/80 scale-[1.01]'
          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50',
        uploading && 'pointer-events-none opacity-60',
      )}
      style={{ minHeight: 180 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => { const f = [...e.target.files]; if (f.length) onFiles(f); e.target.value = '' }}
      />

      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
        dragOver ? 'bg-blue-100' : 'bg-white shadow-sm border border-gray-100'
      )}>
        {uploading
          ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          : <CloudUpload className={cn('w-6 h-6', dragOver ? 'text-blue-500' : 'text-gray-400')} />
        }
      </div>

      <div className="text-center">
        <p className={cn('font-medium text-sm', dragOver ? 'text-blue-600' : 'text-gray-700')}>
          {uploading ? 'Wird hochgeladen…' : dragOver ? 'PDF loslassen' : 'PDF hierher ziehen'}
        </p>
        {!uploading && !dragOver && (
          <p className="text-xs text-gray-400 mt-1">oder <span className="text-blue-500">Datei auswählen</span> · Alle PDF-Formate</p>
        )}
      </div>
    </div>
  )
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onPreview, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-none">
        <FileText className="w-6 h-6 text-red-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{template.name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
          {template.page_count && <span>{template.page_count} S.</span>}
          {template.file_size && <><span>·</span><span>{formatBytes(template.file_size)}</span></>}
          <span>·</span>
          <span>{formatDate(template.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onPreview(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Vorschau
        </button>
        <button
          onClick={async () => {
            if (!confirm(`„${template.name}" wirklich löschen?`)) return
            setDeleting(true)
            onDelete(template.id)
          }}
          disabled={deleting}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MediathekPage() {
  const { session } = useAuthStore()
  const navigate = useNavigate()
  const token = session?.access_token

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/mediathek/list', { headers })
      const data = await res.json()
      if (data.templates) setTemplates(data.templates)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleFiles = useCallback(async (files) => {
    setUploading(true)
    const results = []

    for (const file of files) {
      try {
        // 1. Get signed upload URL
        const urlRes = await fetch('/api/admin/mediathek/upload-url', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        })
        const urlData = await urlRes.json()
        if (!urlRes.ok) throw new Error(urlData.error || 'Upload-URL Fehler')

        // 2. Upload PDF directly to Supabase storage
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
          body: file,
        })
        if (!uploadRes.ok) throw new Error('Datei-Upload fehlgeschlagen')

        // 3. Count pages
        let pageCount = null
        try {
          const buf = await file.arrayBuffer()
          const pdf = await pdfjsLib.getDocument({
            data: buf,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          }).promise
          pageCount = pdf.numPages
          pdf.destroy()
        } catch {}

        // 4. Save metadata
        const saveRes = await fetch('/api/admin/mediathek/save', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim(),
            fileName: file.name,
            storagePath: urlData.storagePath,
            fileSize: file.size,
            pageCount,
          }),
        })
        const saveData = await saveRes.json()
        if (!saveRes.ok) throw new Error(saveData.error || 'Speichern fehlgeschlagen')

        results.push({ ok: true, name: file.name })
        setTemplates(prev => [saveData.template, ...prev])

      } catch (err) {
        console.error(err)
        results.push({ ok: false, name: file.name, error: err.message })
      }
    }

    setUploading(false)

    const failed = results.filter(r => !r.ok)
    const success = results.filter(r => r.ok)
    if (success.length) {
      toast({ title: `${success.length} PDF${success.length > 1 ? 's' : ''} hochgeladen` })
    }
    if (failed.length) {
      toast({ title: 'Upload fehlgeschlagen', description: failed[0].error, variant: 'destructive' })
    }
  }, [token])

  const handleDelete = useCallback(async (id) => {
    const res = await fetch(`/api/admin/mediathek/delete?id=${id}`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) {
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast({ title: 'Vorlage gelöscht' })
    } else {
      const data = await res.json()
      toast({ title: 'Fehler', description: data.error, variant: 'destructive' })
    }
  }, [token])

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dokumentenvorlagen</h1>
          <p className="text-sm text-gray-500 mt-1">Verwalte PDF-Vorlagen für Verträge und Formulare</p>
        </div>

        {/* Upload zone */}
        <DropZone onFiles={handleFiles} uploading={uploading} />

        {/* Template list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Laden…</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Keine Vorlagen vorhanden</p>
            <p className="text-gray-400 text-xs mt-1">Lade deine erste PDF-Vorlage hoch</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">
              {templates.length} {templates.length === 1 ? 'Vorlage' : 'Vorlagen'}
            </p>
            <div className="space-y-2">
              {templates.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onPreview={(t) => navigate(`/admin/mediathek/${t.id}`)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
