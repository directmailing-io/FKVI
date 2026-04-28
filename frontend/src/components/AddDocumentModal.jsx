import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link2, Upload, FileText, Building2, ChevronLeft, Loader2, Check, Search, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const MODES = [
  {
    id: 'link',
    icon: Link2,
    label: 'Link einfügen',
    desc: 'Google Drive, Dropbox, Webseite',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    id: 'upload',
    icon: Upload,
    label: 'Datei hochladen',
    desc: 'PDF, Word oder andere Dateien',
    color: 'bg-green-50 text-green-600 border-green-200',
  },
  {
    id: 'template',
    icon: FileText,
    label: 'Aus Vorlage',
    desc: 'Vorlage auswählen & versenden',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  {
    id: 'company',
    icon: Building2,
    label: 'Aus Unternehmen',
    desc: 'Dokument von Firmenprofil übernehmen',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
]

export default function AddDocumentModal({
  profileId,
  session,
  entityType = 'profile', // 'profile' | 'company'
  onAddDoc,       // (doc: { title, link, doc_type, is_internal }) => void
  onSendTemplate, // () => void — opens DocSendDialog with fixedSource='template'
  onClose,
}) {
  const [mode, setMode] = useState(null)

  // Link form
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [savingLink, setSavingLink] = useState(false)

  // Upload form
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

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

  const handleSaveLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return
    setSavingLink(true)
    onAddDoc({ title: linkTitle.trim(), link: linkUrl.trim(), doc_type: '', description: '', is_internal: false })
    onClose()
  }

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
      // Get signed upload URL from server (avoids RLS issues)
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
      const { uploadUrl, downloadUrl } = await urlRes.json()

      // Upload file directly to Supabase storage via signed URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
        body: selectedFile,
      })
      if (!uploadRes.ok) throw new Error('Upload fehlgeschlagen')

      onAddDoc({
        title: uploadTitle.trim() || selectedFile.name,
        link: downloadUrl,
        doc_type: 'upload',
        description: '',
        is_internal: false,
      })
      onClose()
    } catch (err) {
      toast({ title: 'Upload fehlgeschlagen', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleCopyCompanyDoc = (doc) => {
    onAddDoc({
      title: doc.template_name || 'Dokument',
      link: doc.signer_url || '',
      doc_type: 'company_copy',
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
            {mode && (
              <button
                onClick={() => setMode(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors mr-1"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
            )}
            {mode ? MODES.find(m => m.id === mode)?.label : 'Dokument hinzufügen'}
          </DialogTitle>
        </DialogHeader>

        {/* ── Auswahl ── */}
        {!mode && (
          <div className="grid grid-cols-2 gap-3 py-1">
            {MODES.filter(m => !(m.id === 'company' && entityType === 'company')).map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.id === 'template') { onSendTemplate(); onClose(); return }
                    setMode(m.id)
                  }}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white text-left transition-all hover:shadow-sm active:scale-[0.98]"
                >
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${m.color}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{m.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Link ── */}
        {mode === 'link' && (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Titel <span className="text-red-500">*</span></Label>
              <Input
                value={linkTitle}
                onChange={e => setLinkTitle(e.target.value)}
                placeholder="z.B. Zeugnis 2023, Lebenslauf"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link <span className="text-red-500">*</span></Label>
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                type="url"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button
                onClick={handleSaveLink}
                disabled={!linkTitle.trim() || !linkUrl.trim() || savingLink}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {savingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Speichern
              </Button>
            </div>
          </div>
        )}

        {/* ── Upload ── */}
        {mode === 'upload' && (
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

        {/* ── Aus Unternehmen ── */}
        {mode === 'company' && (
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
