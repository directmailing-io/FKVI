import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle2, ClipboardCopy, Check, FileText, Loader2, Link2, Mail,
  Eye, PenLine, Search, User, Plus, X, ChevronLeft, ChevronRight, Building2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ── Schritt-Anzeige ──────────────────────────────────────────────────────────
function Stepper({ step, steps }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${
            step === s.id ? 'bg-[#1a3a5c] text-white' : step > s.id ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            {step > s.id ? <Check className="h-3 w-3" /> : s.id}
          </div>
          <span className={`text-xs font-medium ${step === s.id ? 'text-[#1a3a5c]' : step > s.id ? 'text-[#0d9488]' : 'text-gray-400'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className={`h-px w-5 mx-0.5 ${step > s.id ? 'bg-[#0d9488]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

// ── Admin-Signatur-Pad ────────────────────────────────────────────────────────
function AdminSignaturePad({ fieldLabel, onChange }) {
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const hasDrawnRef = useRef(false)
  const [hasSig, setHasSig] = useState(false)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1a3a5c'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    isDrawingRef.current = true
  }

  const draw = (e) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true
      setHasSig(true)
    }
  }

  const stopDraw = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    if (hasDrawnRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'))
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    setHasSig(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{fieldLabel}</p>
        {hasSig && (
          <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Löschen
          </button>
        )}
      </div>
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white hover:border-[#1a3a5c]/40 transition-colors">
        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          className="w-full cursor-crosshair touch-none block"
          style={{ height: '100px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasSig && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
            <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            <p className="text-xs text-gray-300">Hier mit der Maus oder dem Finger unterschreiben</p>
          </div>
        )}
      </div>
      {hasSig && (
        <p className="text-xs text-[#0d9488] flex items-center gap-1">
          <Check className="h-3 w-3" /> Unterschrift erfasst
        </p>
      )}
    </div>
  )
}

// ── Profil-Prefill berechnen ─────────────────────────────────────────────────
function buildProfilePrefill(profile) {
  if (!profile) return {}
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  return {
    'profile.first_name': profile.first_name || '',
    'profile.last_name': profile.last_name || '',
    'profile.nationality': profile.nationality || '',
    'profile.nursing_education': profile.nursing_education || '',
    'profile.education_duration': profile.education_duration || '',
    'profile.graduation_year': String(profile.graduation_year || ''),
    'profile.german_recognition': profile.german_recognition || '',
    'profile.total_experience_years': String(profile.total_experience_years || ''),
    'profile.germany_experience_years': String(profile.germany_experience_years || ''),
    'profile.work_time_preference': profile.work_time_preference || '',
    'profile.marital_status': profile.marital_status || '',
    'profile.children_count': String(profile.children_count ?? ''),
    'profile.address': profile.address || '',
    'profile.postal_code': profile.postal_code || '',
    'profile.city': profile.city || '',
    'signer.name': name,
    'today': new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  }
}

/**
 * DocSendDialog – 4-Schritt-Dialog zum Verschicken von Dokumenten
 *
 * Props:
 *   entityType: 'profile' | 'company'
 *   entityId: uuid
 *   profile: Profil-Objekt (bei entityType='profile')
 *   company: Firmen-Objekt (bei entityType='company')
 *   activeVermittlungen: [{ profileId, profileName, profileEmail, companyId, companyName, companyEmail }]
 *   session: Supabase-Session
 *   onClose: () => void
 *   onSent: () => void
 */
export default function DocSendDialog({
  entityType = 'profile',
  entityId,
  profile = null,
  company = null,
  activeVermittlungen = [],
  session,
  onClose,
  onSent,
  fixedSource = null, // 'template' | 'url' — hides source toggle when set
}) {
  const [step, setStep] = useState(1)

  // ── Schritt 1: Dokument ──────────────────────────────────────────────────
  const [docSource, setDocSource] = useState(fixedSource || 'template') // 'template' | 'url'
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceTitle, setSourceTitle] = useState('')
  const [extraTemplateIds, setExtraTemplateIds] = useState([])
  const [showExtraDocs, setShowExtraDocs] = useState(false)

  // ── Schritt 2: Empfänger ─────────────────────────────────────────────────
  const [recipientType, setRecipientType] = useState(entityType === 'profile' ? 'fachkraft' : 'unternehmen')
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchTimeout = useRef(null)

  // ── Schritt 3: Zweck ─────────────────────────────────────────────────────
  const [sendMode, setSendMode] = useState('sign') // 'sign' | 'view'
  const [prefillMode, setPrefillMode] = useState('prefilled')
  const [disabledPrefillIds, setDisabledPrefillIds] = useState(new Set())
  const [prefillPickerOpen, setPrefillPickerOpen] = useState(false)
  const [checkboxPrefills, setCheckboxPrefills] = useState({})

  // ── Admin-Unterschriften ──────────────────────────────────────────────────
  const [adminSigDataUrls, setAdminSigDataUrls] = useState({}) // { [fieldId]: dataUrl | null }

  // ── Ergebnis ─────────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [useCustomMessage, setUseCustomMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')

  // ── Company-Daten für Prefill laden ──────────────────────────────────────
  const [companyPrefillData, setCompanyPrefillData] = useState({})

  const companyIdForPrefill = activeVermittlungen[0]?.companyId || (entityType === 'company' ? entityId : null)

  useEffect(() => {
    if (!companyIdForPrefill) return
    supabase
      .from('companies')
      .select('*')
      .eq('id', companyIdForPrefill)
      .single()
      .then(({ data: c }) => {
        if (!c) return
        const contactName = `${c.first_name || ''} ${c.last_name || ''}`.trim()
        setCompanyPrefillData({
          'company.company_name':       c.company_name || '',
          'company.contact_name':       contactName,
          'company.contact_first_name': c.first_name || '',
          'company.contact_last_name':  c.last_name || '',
          'company.email':              c.email || '',
          'company.phone':              c.phone || '',
          'company.address':            c.address || '',
          'company.house_number':       c.house_number || '',
          'company.adresszusatz':       c.adresszusatz || '',
          'company.city':               c.city || '',
          'company.postal_code':        c.postal_code || '',
          'company.betriebsnummer':     c.betriebsnummer || '',
          'company.ba_kundennummer':    c.ba_kundennummer || '',
          'company.klassifizierung.kmu_kategorie':            c.klassifizierung?.kmu_kategorie || '',
          'company.klassifizierung.beschaeftigte_gesamt':     c.klassifizierung?.beschaeftigte_gesamt || '',
          'company.klassifizierung.jahresumsatz':             c.klassifizierung?.jahresumsatz || '',
          'company.klassifizierung.tarifvertrag_bezeichnung': c.klassifizierung?.tarifvertrag_bezeichnung || '',
        })
      })
  }, [companyIdForPrefill])

  // ── FKVI-Stammdaten (Vermittler) laden ───────────────────────────────────
  const [vermittlerPrefillData, setVermittlerPrefillData] = useState({})

  useEffect(() => {
    fetch('/api/admin/fkvi-settings', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const s = d?.settings || {}
        if (!Object.keys(s).length) return
        setVermittlerPrefillData({
          'vermittler.company_name':       s.company_name || '',
          'vermittler.contact_first_name': s.contact_first_name || '',
          'vermittler.contact_last_name':  s.contact_last_name || '',
          'vermittler.contact_name':       `${s.contact_first_name || ''} ${s.contact_last_name || ''}`.trim(),
          'vermittler.email':              s.email || '',
          'vermittler.phone':              s.phone || '',
          'vermittler.address':            s.address || '',
          'vermittler.city':               s.city || '',
          'vermittler.postal_code':        s.postal_code || '',
          'vermittler.website':            s.website || '',
        })
      })
      .catch(() => {})
  }, [session?.access_token])

  const prefillData = {
    ...(entityType === 'profile' ? buildProfilePrefill(profile) : {}),
    ...companyPrefillData,
    ...vermittlerPrefillData,
  }

  // ── Templates laden ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/dokumente/list', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setTemplatesLoading(false) })
      .catch(() => setTemplatesLoading(false))
  }, [])

  // ── Template-Details laden + recipientType auto-sync ────────────────────
  useEffect(() => {
    if (!selectedTemplateId) { setSelectedTemplate(null); setAdminSigDataUrls({}); return }
    setTemplateLoading(true)
    setAdminSigDataUrls({}) // Reset admin sigs when template changes
    fetch(`/api/admin/dokumente/get?templateId=${selectedTemplateId}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => {
        const tpl = d.template || null
        setSelectedTemplate(tpl)
        setTemplateLoading(false)
        // Auto-set recipientType from template_type
        if (tpl?.template_type && tpl.template_type !== 'vermittlung') {
          setRecipientType(tpl.template_type === 'unternehmen' ? 'unternehmen' : 'fachkraft')
        }
      })
      .catch(() => setTemplateLoading(false))
  }, [selectedTemplateId])

  // ── Standard-Empfänger setzen ────────────────────────────────────────────
  useEffect(() => {
    const isCurrentEntity =
      (entityType === 'profile' && recipientType === 'fachkraft') ||
      (entityType === 'company' && recipientType === 'unternehmen')

    if (isCurrentEntity) {
      if (entityType === 'profile') {
        setSignerName(`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim())
        setSignerEmail(profile?.contact_email || '')
      } else {
        setSignerName(company?.name || '')
        setSignerEmail(company?.email || '')
      }
    } else if (activeVermittlungen.length > 0) {
      const v = activeVermittlungen[0]
      if (recipientType === 'fachkraft') {
        setSignerName(v.profileName || '')
        setSignerEmail(v.profileEmail || '')
      } else {
        setSignerName(v.companyName || '')
        setSignerEmail(v.companyEmail || '')
      }
    } else {
      setSignerName('')
      setSignerEmail('')
    }
  }, [recipientType])

  // ── Suche (andere Partei) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearching(true)
      const endpoint = recipientType === 'fachkraft'
        ? `/api/admin/profiles/search?q=${encodeURIComponent(searchQ)}`
        : `/api/admin/companies/search?q=${encodeURIComponent(searchQ)}`
      fetch(endpoint, { headers: { Authorization: `Bearer ${session?.access_token}` } })
        .then(r => r.json())
        .then(d => { setSearchResults(d.profiles || d.companies || []); setSearching(false) })
        .catch(() => setSearching(false))
    }, 300)
    return () => clearTimeout(searchTimeout.current)
  }, [searchQ, recipientType])

  // ── Prefill-Felder ────────────────────────────────────────────────────────
  const prefillableFields = (selectedTemplate?.fields || []).filter(
    f => !['signature', 'checkbox'].includes(f.type) && f.prefillKey && prefillData[f.prefillKey]
  )
  const checkboxFields = (selectedTemplate?.fields || []).filter(
    f => f.type === 'checkbox' && Array.isArray(f.options) && f.options.length > 0
  )
  const activePrefillFieldIds = prefillableFields.filter(f => !disabledPrefillIds.has(f.id)).map(f => f.id)

  // ── Template-Signatur-Warnung ─────────────────────────────────────────────
  const allSignatureFields = (selectedTemplate?.fields || []).filter(f => f.type === 'signature')
  const hasSignatureField = allSignatureFields.some(f => f.audience !== 'admin')
  const showSignatureWarning = selectedTemplate && sendMode === 'sign' && !hasSignatureField

  // ── Admin-Signatur-Felder ─────────────────────────────────────────────────
  const adminSigFields = (selectedTemplate?.fields || []).filter(
    f => f.type === 'signature' && f.audience === 'admin'
  )
  const needsAdminSig = sendMode === 'sign' && docSource === 'template' && adminSigFields.length > 0
  const adminSigComplete = !needsAdminSig || adminSigFields.every(f => !!adminSigDataUrls[f.id])

  // ── Dynamische Schritte ───────────────────────────────────────────────────
  const STEPS_BASE = [
    { id: 1, label: 'Dokument' },
    { id: 2, label: 'Empfänger' },
    { id: 3, label: 'Zweck' },
  ]
  const steps = needsAdminSig
    ? [...STEPS_BASE, { id: 4, label: 'Ihre Unterschrift' }]
    : STEPS_BASE
  const totalSteps = steps.length

  // ── Template-Typ Badge ────────────────────────────────────────────────────
  const TEMPLATE_TYPE_BADGE = {
    fachkraft:   { label: 'Fachkraft',   className: 'bg-green-50 text-green-700 border-green-200' },
    unternehmen: { label: 'Unternehmen', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    vermittlung: { label: 'Vermittlung', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  }

  // ── Validierung ───────────────────────────────────────────────────────────
  const isMultiSend = showExtraDocs && extraTemplateIds.length > 0
  const step1Valid = docSource === 'template' ? !!selectedTemplateId : (!!sourceUrl.trim() && !!sourceTitle.trim())
  const step2Valid = !!signerName.trim()
  const step4Valid = adminSigComplete
  const canGoNext = step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? true : step4Valid

  const isOtherParty =
    (entityType === 'profile' && recipientType === 'unternehmen') ||
    (entityType === 'company' && recipientType === 'fachkraft')

  // ── Verschicken ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    setSending(true)
    try {
      if (isMultiSend && docSource === 'template') {
        // Paket-Versendung
        const body = {
          templateIds: [selectedTemplateId, ...extraTemplateIds],
          signerName: signerName.trim(),
          prefillData: { ...prefillData, ...checkboxPrefills, ...adminSigDataUrls },
          message: useCustomMessage ? customMessage : undefined,
        }
        if (entityType === 'profile') body.profileId = entityId
        else body.companyId = entityId

        const res = await fetch('/api/admin/dokumente/bundle-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')
        setResult({ signerUrl: data.bundleUrl, sendId: data.bundleId, isBundle: true })
      } else {
        // Einzelne Versendung
        const body = {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim() || null,
          sendMode,
          recipientType,
          prefillData: { ...prefillData, ...checkboxPrefills, ...adminSigDataUrls },
          message: useCustomMessage ? customMessage : undefined,
        }
        if (entityType === 'profile') body.profileId = entityId
        else body.companyId = entityId

        if (docSource === 'template') {
          body.templateId = selectedTemplateId
          if (sendMode === 'sign') {
            // If admin has signed, force prefillMode='prefilled' so the PDF is generated with the sig embedded.
            // Only include text prefillFieldIds if the admin explicitly chose 'prefilled' mode —
            // not when it was forced just to bake in the admin sig.
            const hasAdminSigs = Object.keys(adminSigDataUrls).length > 0
            const effectivePrefillMode = hasAdminSigs ? 'prefilled' : prefillMode
            body.prefillMode = effectivePrefillMode
            if (effectivePrefillMode === 'prefilled') {
              body.prefillFieldIds = prefillMode === 'prefilled' ? activePrefillFieldIds : []
            }
          }
        } else {
          body.sourceUrl = sourceUrl.trim()
          body.sourceTitle = sourceTitle.trim()
        }

        const res = await fetch('/api/admin/dokumente/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')
        setResult({ signerUrl: data.signerUrl, sendId: data.sendId })
      }
      onSent?.()
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleSendEmail = async () => {
    if (!signerEmail.trim() || !result?.sendId || result?.isBundle) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/admin/dokumente/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          sendId: result.sendId,
          recipientEmail: signerEmail.trim(),
          recipientName: signerName,
          customMessage: useCustomMessage ? customMessage : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setEmailSent(true)
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setEmailSending(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(result?.signerUrl || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-gray-500" />
            Dokument verschicken
          </DialogTitle>
        </DialogHeader>

        {result ? (
          /* ── ERGEBNIS ── */
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {result.isBundle ? 'Paket erstellt' : sendMode === 'view' ? 'Ansichts-Link erstellt' : 'Signierlink erstellt'}
              </div>
              <p className="text-xs text-gray-500">Teile diesen Link mit <strong>{signerName || 'dem Empfänger'}</strong>:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-700 select-all">
                  {result.signerUrl}
                </code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyUrl}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {!result.isBundle && (
              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#1a3a5c]" />
                  Per E-Mail senden (optional)
                </p>
                {emailSent ? (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />E-Mail gesendet!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <Input
                      type="email"
                      value={signerEmail}
                      onChange={e => setSignerEmail(e.target.value)}
                      placeholder="empfaenger@beispiel.de"
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUseCustomMessage(v => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useCustomMessage ? 'bg-[#1a3a5c]' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${useCustomMessage ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-xs text-gray-600">Eigene Nachricht verfassen</span>
                    </div>
                    {useCustomMessage && (
                      <textarea
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        placeholder="anbei findest du ein Dokument..."
                        rows={3}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                      />
                    )}
                    <Button
                      onClick={handleSendEmail}
                      disabled={!signerEmail.trim() || emailSending}
                      className="w-full bg-[#0ea5a0] hover:bg-[#0ea5a0]/90 text-white"
                    >
                      {emailSending
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Wird gesendet...</>
                        : <><Mail className="h-3.5 w-3.5 mr-1.5" />E-Mail senden</>}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={onClose}>Fertig</Button>
            </div>
          </div>
        ) : (
          /* ── SCHRITTE ── */
          <div>
            <Stepper step={step} steps={steps} />

            <div className="space-y-4 max-h-[55vh] overflow-y-auto">

              {/* ─── Schritt 1: Dokument ───────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  {!fixedSource && (
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                      {[
                        { val: 'template', icon: <FileText className="h-3.5 w-3.5" />, label: 'Aus Vorlage' },
                        { val: 'url', icon: <Link2 className="h-3.5 w-3.5" />, label: 'Link / Google Drive' },
                      ].map(o => (
                        <button
                          key={o.val}
                          type="button"
                          onClick={() => setDocSource(o.val)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                            docSource === o.val ? 'bg-white text-[#1a3a5c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {o.icon}{o.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {docSource === 'template' ? (
                    <div className="space-y-3">
                      {templatesLoading ? (
                        <div className="h-9 animate-pulse bg-gray-100 rounded-md" />
                      ) : templates.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Keine aktiven Vorlagen vorhanden.</p>
                      ) : (
                        <div className="space-y-1.5">
                          <Label>Vorlage <span className="text-red-500">*</span></Label>
                          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger>
                              {selectedTemplateId ? (
                                <div className="flex items-center gap-2 truncate">
                                  <span className="truncate">{templates.find(t => t.id === selectedTemplateId)?.name}</span>
                                  {(() => {
                                    const ttype = templates.find(t => t.id === selectedTemplateId)?.template_type
                                    const badge = TEMPLATE_TYPE_BADGE[ttype]
                                    return badge ? (
                                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.className}`}>
                                        {badge.label}
                                      </span>
                                    ) : null
                                  })()}
                                </div>
                              ) : (
                                <SelectValue placeholder="Vorlage auswählen..." />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map(t => {
                                const badge = TEMPLATE_TYPE_BADGE[t.template_type]
                                return (
                                  <SelectItem key={t.id} value={t.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="truncate">{t.name}</span>
                                      {badge && (
                                        <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.className}`}>
                                          {badge.label}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedTemplateId && (
                        <div>
                          {!showExtraDocs ? (
                            <button
                              type="button"
                              onClick={() => setShowExtraDocs(true)}
                              className="flex items-center gap-1.5 text-xs text-[#1a3a5c] hover:text-[#1a3a5c]/80 font-medium py-1"
                            >
                              <Plus className="h-3.5 w-3.5" />Weitere Dokumente hinzufügen
                            </button>
                          ) : (
                            <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-600">Weitere Vorlagen (werden zusammen verschickt):</p>
                              {extraTemplateIds.map((tid, idx) => (
                                <div key={tid} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1 text-gray-700 truncate">
                                    {templates.find(t => t.id === tid)?.name || tid}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setExtraTemplateIds(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-gray-400 hover:text-red-500 shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              <Select
                                value=""
                                onValueChange={v => {
                                  if (v && v !== selectedTemplateId && !extraTemplateIds.includes(v)) {
                                    setExtraTemplateIds(prev => [...prev, v])
                                  }
                                }}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue placeholder="Weitere Vorlage wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates
                                    .filter(t => t.id !== selectedTemplateId && !extraTemplateIds.includes(t.id))
                                    .map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Titel des Dokuments <span className="text-red-500">*</span></Label>
                        <Input
                          value={sourceTitle}
                          onChange={e => setSourceTitle(e.target.value)}
                          placeholder="z.B. Arbeitsvertrag 2024"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Link (Google Drive, Dropbox o.ä.) <span className="text-red-500">*</span></Label>
                        <Input
                          value={sourceUrl}
                          onChange={e => setSourceUrl(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          type="url"
                        />
                      </div>
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Links werden zur Ansicht verschickt. Der Empfänger bestätigt den Erhalt.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Schritt 2: Empfänger ──────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">An wen geht das Dokument?</p>
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                      {[
                        { val: 'fachkraft', icon: <User className="h-3.5 w-3.5" />, label: 'Fachkraft' },
                        { val: 'unternehmen', icon: <Building2 className="h-3.5 w-3.5" />, label: 'Unternehmen' },
                      ].map(o => (
                        <button
                          key={o.val}
                          type="button"
                          onClick={() => setRecipientType(o.val)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                            recipientType === o.val ? 'bg-white text-[#1a3a5c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {o.icon}{o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aktive Vermittlungen vorschlagen */}
                  {isOtherParty && activeVermittlungen.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Aktive Vermittlung</p>
                      {activeVermittlungen.slice(0, 3).map(v => {
                        const name = recipientType === 'fachkraft' ? v.profileName : v.companyName
                        const email = recipientType === 'fachkraft' ? v.profileEmail : v.companyEmail
                        const isSelected = signerName === name
                        return (
                          <button
                            key={`${v.profileId}-${v.companyId}`}
                            type="button"
                            onClick={() => { setSignerName(name || ''); setSignerEmail(email || '') }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                              isSelected ? 'border-[#1a3a5c] bg-[#1a3a5c]/[0.04]' : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              {recipientType === 'fachkraft'
                                ? <User className="h-3.5 w-3.5 text-gray-400" />
                                : <Building2 className="h-3.5 w-3.5 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                              {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
                            </div>
                            <span className="text-[10px] font-semibold bg-[#0d9488]/10 text-[#0d9488] px-2 py-0.5 rounded-full shrink-0">
                              Vermittlung
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-[#1a3a5c] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Suche (andere Partei) */}
                  {isOtherParty && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <input
                        value={searchQ}
                        onChange={e => { setSearchQ(e.target.value); setSearchOpen(true) }}
                        onFocus={() => setSearchOpen(true)}
                        onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                        placeholder={recipientType === 'fachkraft' ? 'Andere Fachkraft suchen...' : 'Anderes Unternehmen suchen...'}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                      />
                      {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />}
                      {searchOpen && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden max-h-40 overflow-y-auto">
                          {searchResults.map(r => {
                            const name = r.first_name ? `${r.first_name} ${r.last_name}` : r.name
                            const email = r.contact_email || r.email
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onMouseDown={() => {
                                  setSignerName(name || '')
                                  setSignerEmail(email || '')
                                  setSearchQ('')
                                  setSearchOpen(false)
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="text-sm text-gray-800 truncate">{name}</span>
                                {email && <span className="text-xs text-gray-400 truncate ml-auto">{email}</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={signerName}
                        onChange={e => setSignerName(e.target.value)}
                        placeholder="Vor- und Nachname"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-Mail-Adresse</Label>
                      <Input
                        type="email"
                        value={signerEmail}
                        onChange={e => setSignerEmail(e.target.value)}
                        placeholder="empfaenger@beispiel.de"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Schritt 3: Zweck ─────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Was soll der Empfänger tun?</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSendMode('view')}
                      className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all ${
                        sendMode === 'view' ? 'border-[#1a3a5c] bg-[#1a3a5c]/[0.03]' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Eye className={`h-5 w-5 mt-0.5 shrink-0 ${sendMode === 'view' ? 'text-[#1a3a5c]' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">Zur Ansicht</p>
                        <p className="text-xs text-gray-400 mt-0.5">Empfänger öffnet und bestätigt den Erhalt. Wir sehen Datum & Uhrzeit des Öffnens.</p>
                      </div>
                      {sendMode === 'view' && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-[#1a3a5c] flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => docSource !== 'url' && setSendMode('sign')}
                      disabled={docSource === 'url'}
                      className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all ${
                        docSource === 'url'
                          ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                          : sendMode === 'sign'
                          ? 'border-[#0d9488] bg-[#0d9488]/[0.03]'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <PenLine className={`h-5 w-5 mt-0.5 shrink-0 ${sendMode === 'sign' && docSource !== 'url' ? 'text-[#0d9488]' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">Ausfüllen & Signieren</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {docSource === 'url'
                            ? 'Nur bei Vorlagen möglich'
                            : 'Empfänger füllt Felder aus und setzt eine Unterschrift.'}
                        </p>
                      </div>
                      {sendMode === 'sign' && docSource !== 'url' && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-[#0d9488] flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Warnung: kein Unterschriftenfeld */}
                  {showSignatureWarning && (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <svg className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Kein Unterschriftenfeld vorhanden</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Diese Vorlage hat kein Signaturfeld – das Dokument kann ohne rechtsgültige Unterschrift nicht unterzeichnet werden.
                          Bitte füge im Template-Editor ein Unterschriftenfeld hinzu.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Vorausfüllen (nur Signieren + Vorlage) */}
                  {sendMode === 'sign' && docSource === 'template' && selectedTemplateId && !templateLoading && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Felder vorausfüllen</p>
                      <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                        {[
                          { val: 'blank', label: 'Leer lassen', desc: 'Empfänger füllt alle Felder selbst aus' },
                          { val: 'prefilled', label: 'Mit Profildaten', desc: 'Bekannte Daten werden automatisch eingetragen', badge: 'Empfohlen' },
                        ].map(o => (
                          <button
                            key={o.val}
                            type="button"
                            onClick={() => setPrefillMode(o.val)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${prefillMode === o.val ? (o.val === 'prefilled' ? 'bg-[#1a3a5c]/[0.03]' : 'bg-gray-50') : 'bg-white hover:bg-gray-50/60'}`}
                          >
                            <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${prefillMode === o.val ? 'border-[#1a3a5c]' : 'border-gray-300'}`}>
                              {prefillMode === o.val && <div className="h-2 w-2 rounded-full bg-[#1a3a5c]" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-800">{o.label}</p>
                                {o.badge && <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#0d9488]/10 text-[#0d9488] px-1.5 py-0.5 rounded">{o.badge}</span>}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {prefillMode === 'prefilled' && prefillableFields.length > 0 && (
                        <div className="rounded-xl border border-[#1a3a5c]/15 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setPrefillPickerOpen(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1a3a5c]/[0.04] hover:bg-[#1a3a5c]/[0.07] transition-colors"
                          >
                            <span className="text-xs font-medium text-[#1a3a5c]">
                              {activePrefillFieldIds.length === prefillableFields.length
                                ? `Alle ${prefillableFields.length} Felder vorausgefüllt`
                                : `${activePrefillFieldIds.length} von ${prefillableFields.length} Feldern`}
                            </span>
                            <svg className={`h-3.5 w-3.5 text-[#1a3a5c]/60 transition-transform ${prefillPickerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {prefillPickerOpen && (
                            <div className="divide-y divide-gray-100">
                              {prefillableFields.map(f => {
                                const isActive = !disabledPrefillIds.has(f.id)
                                return (
                                  <label key={f.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50/60">
                                    <input
                                      type="checkbox"
                                      checked={isActive}
                                      onChange={() => setDisabledPrefillIds(prev => {
                                        const next = new Set(prev)
                                        next.has(f.id) ? next.delete(f.id) : next.add(f.id)
                                        return next
                                      })}
                                      className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1a3a5c]"
                                    />
                                    <span className="flex-1 text-xs text-gray-700 truncate">{f.label || f.id}</span>
                                    <span className={`text-xs font-medium truncate max-w-[120px] ${isActive ? 'text-gray-600' : 'text-gray-300 line-through'}`}>
                                      {prefillData[f.prefillKey]}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {checkboxFields.length > 0 && (
                        <div className="space-y-3">
                          {checkboxFields.map(field => {
                            const isMultiple = field.multiple === true
                            const cur = checkboxPrefills[field.id]
                            return (
                              <div key={field.id} className="space-y-1.5">
                                <p className="text-xs text-gray-500 font-medium">{field.label || 'Checkbox'}:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {field.options.map(opt => {
                                    const active = isMultiple ? (Array.isArray(cur) ? cur : []).includes(opt.id) : cur === opt.id
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setCheckboxPrefills(prev => {
                                          const c = prev[field.id]
                                          if (isMultiple) {
                                            const arr = Array.isArray(c) ? c : []
                                            return { ...prev, [field.id]: arr.includes(opt.id) ? arr.filter(x => x !== opt.id) : [...arr, opt.id] }
                                          }
                                          return { ...prev, [field.id]: c === opt.id ? '' : opt.id }
                                        })}
                                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                          active ? 'bg-[#0d9488]/10 border-[#0d9488] text-[#0d9488] font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                        }`}
                                      >
                                        {opt.label || opt.id}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Schritt 4: Admin-Unterschrift ─────────────────────── */}
              {step === 4 && needsAdminSig && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Ihre Unterschrift (FKVI / Vermittler)</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Diese Vorlage enthält ein Signaturfeld für den Vermittler. Bitte unterschreiben Sie unten — die Unterschrift wird direkt in das PDF eingebettet, bevor es an den Empfänger verschickt wird.
                    </p>
                  </div>

                  {adminSigFields.map(field => (
                    <AdminSignaturePad
                      key={field.id}
                      fieldLabel={field.label || 'Unterschrift Vermittler (FKVI)'}
                      onChange={dataUrl => setAdminSigDataUrls(prev => {
                        const next = { ...prev }
                        if (dataUrl) next[field.id] = dataUrl
                        else delete next[field.id]
                        return next
                      })}
                    />
                  ))}

                  {!adminSigComplete && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Bitte unterschreiben Sie alle Felder, um das Dokument verschicken zu können.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer-Navigation ── */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <Button
                variant="outline"
                onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
              >
                {step === 1 ? 'Abbrechen' : <><ChevronLeft className="h-4 w-4 mr-1" />Zurück</>}
              </Button>
              {step < totalSteps ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canGoNext}
                  className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                >
                  Weiter <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={sending || !adminSigComplete}
                  className="bg-[#0d9488] hover:bg-[#0d9488]/90 text-white"
                >
                  {sending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Erstelle Link...</>
                    : <><Link2 className="h-3.5 w-3.5 mr-1.5" />Verschicken</>}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
