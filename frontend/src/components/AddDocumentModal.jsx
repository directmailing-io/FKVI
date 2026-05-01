import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Building2, User, ChevronLeft, Loader2, Check, Search, X, Eye, PenLine } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const MODES = [
  {
    id: 'upload',
    icon: Upload,
    label: 'Datei hochladen',
    desc: 'PDF, Word oder andere Dateien',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    id: 'template',
    icon: FileText,
    label: 'Aus Vorlage',
    desc: 'Vorlage auswählen & signieren',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  {
    id: 'company',
    icon: Building2,
    label: 'Aus Unternehmen',
    desc: 'Dokument vom Firmenprofil',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    onlyFor: 'profile',
  },
  {
    id: 'fachkraft',
    icon: User,
    label: 'Aus Fachkraft',
    desc: 'Dokumente einer Fachkraft',
    color: 'bg-teal-50 text-teal-600 border-teal-200',
    onlyFor: 'company',
  },
]

export default function AddDocumentModal({
  profileId,
  session,
  entityType = 'profile', // 'profile' | 'company'
  activeVermittlungen = [], // [{ profileId, profileName }]
  onAddDoc,       // (doc: { title, link, doc_type, is_internal }) => void
  onSendTemplate, // () => void — opens DocSendDialog with fixedSource='template'
  onClose,
}) {
  const [mode, setMode] = useState(null)

  // Upload form
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  // Post-upload: choose view mode
  const [uploadedDoc, setUploadedDoc] = useState(null) // { title, downloadUrl }
  const [convertingToTemplate, setConvertingToTemplate] = useState(false)

  // Template picker
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Company copy
  const [companySearch, setCompanySearch] = useState('')
  const [allCompanies, setAllCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [companyDocs, setCompanyDocs] = useState([])
  const [companyDocsLoading, setCompanyDocsLoading] = useState(false)

  // Fachkraft copy
  const [fkSearch, setFkSearch] = useState('')
  const [fkSearchResults, setFkSearchResults] = useState([])
  const [fkSearchLoading, setFkSearchLoading] = useState(false)
  const [selectedFk, setSelectedFk] = useState(null)
  const [fkDocs, setFkDocs] = useState([])
  const [fkDocsLoading, setFkDocsLoading] = useState(false)

  // Load templates when template mode is activated
  useEffect(() => {
    if (mode !== 'template') return
    setTemplatesLoading(true)
    fetch('/api/admin/dokumente/list', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setTemplatesLoading(false) })
      .catch(() => setTemplatesLoading(false))
  }, [mode])

  // Load all companies when company mode is activated
  useEffect(() => {
    if (mode !== 'company') return
    setCompaniesLoading(true)
    fetch('/api/admin/entities/companies', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setAllCompanies(d.companies || []); setCompaniesLoading(false) })
      .catch(() => setCompaniesLoading(false))
  }, [mode])

  // Load company docs when company selected
  useEffect(() => {
    if (!selectedCompany) { setCompanyDocs([]); return }
    setCompanyDocsLoading(true)
    fetch(`/api/admin/dokumente/sends-list?companyId=${selectedCompany.id}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => {
        const signed = (d.sends || []).filter(s => s.status === 'submitted' || s.status === 'signed')
        setCompanyDocs(signed)
        setCompanyDocsLoading(false)
      })
      .catch(() => setCompanyDocsLoading(false))
  }, [selectedCompany])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (!uploadTitle.trim()) setUploadTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      // Step 1: Get signed upload URL
      const urlRes = await fetch('/api/admin/profile-docs/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profileId, filename: selectedFile.name }),
      })
      if (!urlRes.ok) {
        const err = await urlRes.json()
        throw new Error(err.error || 'Upload-URL konnte nicht erstellt werden')
      }
      const { uploadUrl, storagePath } = await urlRes.json()

      // Step 2: Upload file directly to Supabase storage via signed URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
        body: selectedFile,
      })
      if (!uploadRes.ok) throw new Error('Upload fehlgeschlagen')

      // Step 3: Resolve download URL now that the file exists
      const resolveRes = await fetch('/api/admin/profile-docs/resolve-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ storagePath }),
      })
      if (!resolveRes.ok) {
        const err = await resolveRes.json()
        throw new Error(err.error || 'Download-URL konnte nicht erstellt werden')
      }
      const { downloadUrl } = await resolveRes.json()

      setUploadedDoc({ title: uploadTitle.trim() || selectedFile.name, downloadUrl })
    } catch (err) {
      toast({ title: 'Upload fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveAsView = () => {
    onAddDoc({
      title: uploadedDoc.title,
      link: uploadedDoc.downloadUrl,
      doc_type: 'upload',
      description: '',
      is_internal: false,
    })
    onClose()
  }

  const handleConvertToTemplate = async () => {
    setConvertingToTemplate(true)
    try {
      const res = await fetch('/api/admin/profile-docs/to-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ sourceUrl: uploadedDoc.downloadUrl, title: uploadedDoc.title }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Konvertierung fehlgeschlagen')
      }
      const { templateId } = await res.json()
      onAddDoc({
        title: uploadedDoc.title,
        link: `template:${templateId}`,
        doc_type: 'template',
        description: '',
        is_internal: false,
      })
      onClose()
      window.open(`/admin/dokumente/editor/${templateId}`, '_blank')
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setConvertingToTemplate(false)
    }
  }

  // Search FKs with debounce
  useEffect(() => {
    if (mode !== 'fachkraft') return
    if (!fkSearch.trim()) { setFkSearchResults([]); return }
    const timer = setTimeout(async () => {
      setFkSearchLoading(true)
      try {
        const res = await fetch(`/api/admin/profiles/search?q=${encodeURIComponent(fkSearch.trim())}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const d = await res.json()
        setFkSearchResults(d.profiles || [])
      } catch { /* ignore */ }
      setFkSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [fkSearch, mode])

  // Load FK docs when FK selected — Lebenslauf + signed document_sends
  useEffect(() => {
    if (!selectedFk) { setFkDocs([]); return }
    setFkDocsLoading(true)
    const fkName = [selectedFk.first_name, selectedFk.last_name].filter(Boolean).join(' ') || 'Fachkraft'
    fetch(`/api/admin/dokumente/sends-list?profileId=${selectedFk.id}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => {
        const signed = (d.sends || []).filter(s => s.status === 'submitted' || s.status === 'signed')
        const lebenslauf = {
          _key: 'cv',
          title: 'Lebenslauf',
          link: `cv:${selectedFk.id}`,
          doc_type: 'cv_ref',
          description: `Von ${fkName}`,
        }
        const sendDocs = signed.map(s => ({
          _key: s.id,
          title: s.template_name || s.display_title || 'Dokument',
          link: `send:${s.id}`,
          doc_type: 'send_ref',
          description: `Von ${fkName} · unterzeichnet`,
        }))
        setFkDocs([lebenslauf, ...sendDocs])
        setFkDocsLoading(false)
      })
      .catch(() => setFkDocsLoading(false))
  }, [selectedFk])

  const handleCopyFkDoc = (doc) => {
    onAddDoc({
      title: doc.title,
      link: doc.link,
      doc_type: doc.doc_type,
      description: doc.description,
      is_internal: false,
    })
    onClose()
  }

  const handleCopyCompanyDoc = (doc) => {
    onAddDoc({
      title: doc.template_name || doc.display_title || 'Dokument',
      link: `send:${doc.id}`,
      doc_type: 'send_ref',
      description: `Von ${selectedCompany.company_name || selectedCompany.name || ''}`,
      is_internal: false,
    })
    onClose()
  }

  const filteredCompanies = allCompanies.filter(c => {
    const q = companySearch.toLowerCase()
    if (!q) return true
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q)
    )
  })

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {(mode || uploadedDoc) && (
              <button
                onClick={() => { if (uploadedDoc) { setUploadedDoc(null) } else { setMode(null) } }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors mr-1"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
            )}
            {uploadedDoc
              ? 'Verwendungszweck'
              : mode
                ? (MODES.find(m => m.id === mode)?.label ?? 'Dokument hinzufügen')
                : 'Dokument hinzufügen'}
          </DialogTitle>
        </DialogHeader>

        {/* ── Auswahl: vertikale Liste ── */}
        {!mode && !uploadedDoc && (
          <div className="flex flex-col gap-2 py-1">
            {MODES.filter(m => !m.onlyFor || m.onlyFor === entityType).map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white text-left transition-all active:scale-[0.99] group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )
            })}
          </div>
        )}

        {/* ── Post-upload: Verwendungszweck ── */}
        {uploadedDoc && (
          <div className="space-y-3 py-1">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm mb-1">
              <FileText className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="font-medium text-blue-800 truncate">{uploadedDoc.title}</span>
            </div>
            <p className="text-xs text-gray-500 px-0.5">Wie soll das Dokument verwendet werden?</p>
            <button
              type="button"
              onClick={handleSaveAsView}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white text-left transition-all active:scale-[0.99] group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                <Eye className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Nur ansehen</p>
                <p className="text-xs text-gray-400 mt-0.5">Dokument zum Lesen & Herunterladen</p>
              </div>
              <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              type="button"
              onClick={handleConvertToTemplate}
              disabled={convertingToTemplate}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 bg-white text-left transition-all active:scale-[0.99] group disabled:opacity-60 disabled:pointer-events-none"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-50 text-violet-600">
                {convertingToTemplate ? <Loader2 className="h-5 w-5 animate-spin" /> : <PenLine className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Zum Ausfüllen</p>
                <p className="text-xs text-gray-400 mt-0.5">Felder definieren — wird als Vorlage gespeichert</p>
              </div>
              <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}

        {/* ── Upload ── */}
        {!uploadedDoc && mode === 'upload' && (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Titel</Label>
              <Input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="z.B. Zeugnis 2023"
              />
            </div>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#1a3a5c]/40 hover:bg-gray-50/50 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              {selectedFile ? (
                <p className="text-sm font-medium text-[#1a3a5c]">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-500">Datei auswählen</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, JPG — max. 10 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {uploading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird hochgeladen…</>
                  : <><Upload className="h-3.5 w-3.5 mr-1.5" />Hochladen</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── Aus Vorlage ── */}
        {!uploadedDoc && mode === 'template' && (
          <div className="space-y-3 py-1">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Keine Vorlagen vorhanden.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onAddDoc({
                        title: tpl.name,
                        link: `template:${tpl.id}`,
                        doc_type: 'template',
                        description: tpl.description || '',
                        is_internal: false,
                      })
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 bg-white text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tpl.name}</p>
                      {tpl.description && (
                        <p className="text-xs text-gray-400 truncate">{tpl.description}</p>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-violet-400 shrink-0 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Aus Fachkraft ── */}
        {!uploadedDoc && mode === 'fachkraft' && (
          <div className="space-y-3 py-1">
            {!selectedFk ? (
              <>
                {/* Active Vermittlungen quick-select */}
                {activeVermittlungen.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-0.5">Aktive Vermittlungen</p>
                    {activeVermittlungen.map(v => (
                      <button
                        key={v.profileId}
                        type="button"
                        onClick={() => setSelectedFk({ id: v.profileId, first_name: v.profileName?.split(' ')[0] || '', last_name: v.profileName?.split(' ').slice(1).join(' ') || '' })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-teal-200 bg-teal-50 hover:border-teal-400 text-left text-sm transition-colors"
                      >
                        <User className="h-4 w-4 text-teal-500 shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{v.profileName || '—'}</span>
                        <span className="text-xs text-teal-600 ml-auto shrink-0">Aktiv</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Search other FKs */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    value={fkSearch}
                    onChange={e => setFkSearch(e.target.value)}
                    placeholder="Andere Fachkraft suchen..."
                    autoFocus={activeVermittlungen.length === 0}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                  />
                  {fkSearchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />}
                </div>
                {fkSearchResults.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {fkSearchResults.map(fk => (
                      <button
                        key={fk.id}
                        type="button"
                        onClick={() => { setSelectedFk(fk); setFkSearch('') }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-left text-sm"
                      >
                        <User className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-800 truncate">
                          {[fk.first_name, fk.last_name].filter(Boolean).join(' ') || '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {!fkSearchLoading && fkSearch.trim() && fkSearchResults.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">Keine Fachkraft gefunden.</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm">
                  <User className="h-4 w-4 text-teal-600 shrink-0" />
                  <span className="font-medium text-teal-800 flex-1 truncate">
                    {[selectedFk.first_name, selectedFk.last_name].filter(Boolean).join(' ') || '—'}
                  </span>
                  <button onClick={() => { setSelectedFk(null); setFkDocs([]) }} className="text-teal-500 hover:text-teal-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {fkDocsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                  </div>
                ) : fkDocs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Keine unterzeichneten Dokumente vorhanden.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {fkDocs.map(doc => (
                      <button
                        key={doc._key}
                        type="button"
                        onClick={() => handleCopyFkDoc(doc)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-[#1a3a5c] bg-white text-left transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${doc.doc_type === 'cv_ref' ? 'bg-teal-50' : 'bg-green-50'}`}>
                          {doc.doc_type === 'cv_ref'
                            ? <User className="h-3.5 w-3.5 text-teal-500" />
                            : <FileText className="h-3.5 w-3.5 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                          <p className="text-xs text-gray-400">{doc.doc_type === 'cv_ref' ? 'Lebenslauf' : 'Unterzeichnetes Dokument'}</p>
                        </div>
                        <Check className="h-4 w-4 text-teal-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Aus Unternehmen ── */}
        {!uploadedDoc && mode === 'company' && (
          <div className="space-y-3 py-1">
            {!selectedCompany ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    value={companySearch}
                    onChange={e => setCompanySearch(e.target.value)}
                    placeholder="Unternehmen suchen..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                  />
                  {companiesLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />}
                </div>
                {!companiesLoading && filteredCompanies.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredCompanies.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCompany(c); setCompanySearch('') }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-left text-sm"
                      >
                        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{c.company_name || '—'}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!companiesLoading && companySearch.trim() && filteredCompanies.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Unternehmen gefunden.</p>
                )}
                {!companiesLoading && !companySearch.trim() && allCompanies.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Noch keine Unternehmen angelegt.</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-medium text-amber-800 flex-1 truncate">{selectedCompany.company_name || selectedCompany.name}</span>
                  <button onClick={() => { setSelectedCompany(null); setCompanyDocs([]) }} className="text-amber-500 hover:text-amber-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {companyDocsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                  </div>
                ) : companyDocs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Keine unterzeichneten Dokumente vorhanden.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {companyDocs.map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleCopyCompanyDoc(doc)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-[#1a3a5c] bg-white text-left transition-colors"
                      >
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.template_name || '—'}</p>
                          <p className="text-xs text-gray-400">Unterzeichnet · {doc.signer_name}</p>
                        </div>
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
