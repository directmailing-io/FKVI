/**
 * JobCreateDialog — Neuer Dialog zum Erstellen eines Document-Jobs
 *
 * Ersetzt den komplexen DocSendDialog für Vorlagen-basierte Versendungen.
 * Unterstützt:
 *   - Einzelparteien (nur FK oder nur UN)
 *   - Multi-Party (FK + UN teilen sich dasselbe Dokument)
 *   - Admin-Prefill (auto aus Profil + manuelle Eingabe)
 *   - Admin-Signaturen (Zeichenpad)
 *   - Vermittlungs-Felder mit Hinweis
 *
 * Props:
 *   entityType: 'profile' | 'company'
 *   entityId: UUID des Profils oder Unternehmens
 *   profile?: Profil-Objekt
 *   company?: Firmen-Objekt
 *   activeVermittlungen?: [{ profileId, profileName, profileEmail, companyId, companyName, companyEmail }]
 *   session: Supabase-Session
 *   onCreated?: () => void   — Callback nach erfolgreichem Erstellen
 *   onClose: () => void
 *   forwardFromSendId?: UUID — wenn gesetzt: Weiterleitung einer FK-signierten Send an UN
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCopy,
  FileText, Link2, Loader2, Mail, PenLine, Search, Send, User, Building2, X, AlertCircle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Audience-Badge ──────────────────────────────────────────────────────────
const AUDIENCE_BADGE = {
  fachkraft:   { label: 'FK',   cls: 'text-teal-700 bg-teal-50 border-teal-200' },
  unternehmen: { label: 'UN',   cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  admin:       { label: 'ADM',  cls: 'text-violet-700 bg-violet-50 border-violet-200' },
  vermittlung: { label: 'VE',   cls: 'text-amber-700 bg-amber-50 border-amber-200' },
}

// ─── Schritt-Anzeige ─────────────────────────────────────────────────────────
function Stepper({ step, steps }) {
  return (
    <div className="flex items-center gap-1 mb-5 flex-wrap">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${
            step === s.id ? 'bg-[#1a3a5c] text-white' :
            step > s.id  ? 'bg-[#0d9488] text-white' :
                           'bg-gray-100 text-gray-400'
          }`}>
            {step > s.id ? <Check className="h-3 w-3" /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${
            step === s.id ? 'text-[#1a3a5c]' : step > s.id ? 'text-[#0d9488]' : 'text-gray-400'
          }`}>{s.label}</span>
          {i < steps.length - 1 && (
            <div className={`h-px w-4 mx-0.5 ${step > s.id ? 'bg-[#0d9488]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Signatur-Pad ────────────────────────────────────────────────────────────
function SignaturePad({ fieldLabel, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasSig, setHasSig] = useState(false)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a3a5c'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    if (!hasSig) setHasSig(true)
  }

  const stopDraw = () => {
    if (!drawing.current) return
    drawing.current = false
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onChange(dataUrl)
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
    onChange(null)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{fieldLabel}</span>
        {hasSig && (
          <button type="button" onClick={clear} className="text-xs text-red-400 hover:text-red-600">Löschen</button>
        )}
      </div>
      <div className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-white hover:border-[#1a3a5c]/30 transition-colors">
        <canvas
          ref={canvasRef} width={700} height={200}
          className="w-full cursor-crosshair touch-none block" style={{ height: 160 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
        {!hasSig && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none gap-2 text-gray-300">
            <PenLine className="h-4 w-4" />
            <span className="text-xs">Hier unterschreiben</span>
          </div>
        )}
      </div>
      {hasSig && <p className="text-[10px] text-[#0d9488] flex items-center gap-1"><Check className="h-3 w-3" />Erfasst</p>}
    </div>
  )
}

// ─── Profil-Prefill aufbauen ─────────────────────────────────────────────────
function buildProfilePrefill(profile) {
  if (!profile) return {}
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  return {
    'profile.first_name': profile.first_name || '',
    'profile.last_name':  profile.last_name || '',
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

// ─── Hauptkomponente ─────────────────────────────────────────────────────────
export default function JobCreateDialog({
  entityType = 'profile',
  entityId,
  profile = null,
  company = null,
  activeVermittlungen = [],
  session,
  onCreated,
  onClose,
  initialTemplateId = null,  // when set, skip step 1 and pre-select the template
  forwardFromSendId = null,  // when set: forward mode — skip step 1, lock party to 'unternehmen'
}) {
  const isForwardMode = !!forwardFromSendId
  const [step, setStep] = useState(initialTemplateId || isForwardMode ? 2 : 1)

  // ── Schritt 1: Vorlage ───────────────────────────────────────────────────
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templateSearch, setTemplateSearch] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || '')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  // ── Schritt 2: Parteien ──────────────────────────────────────────────────
  // In forward mode, always unternehmen. Otherwise derive from entity context.
  const defaultParty = isForwardMode
    ? ['unternehmen']
    : entityId
      ? (entityType === 'profile' ? ['fachkraft'] : ['unternehmen'])
      : []
  const [parties, setParties] = useState(defaultParty)
  const [signerNames, setSignerNames]   = useState({ fachkraft: '', unternehmen: '' })
  const [signerEmails, setSignerEmails] = useState({ fachkraft: '', unternehmen: '' })

  // Per-party search state
  const [searchQs, setSearchQs] = useState({ fachkraft: '', unternehmen: '' })
  const [searchResultsMap, setSearchResultsMap] = useState({ fachkraft: [], unternehmen: [] })
  const [searchingParty, setSearchingParty] = useState(null)
  const searchTimeouts = useRef({})
  // Selected entity objects per party (for visual confirmation chip)
  const [selectedEntities, setSelectedEntities] = useState({ fachkraft: null, unternehmen: null })

  // ── Schritt 3: Felder vorausfüllen ───────────────────────────────────────
  const [fieldOverrides, setFieldOverrides] = useState({}) // { [fieldId]: value }
  const [adminSigDataUrls, setAdminSigDataUrls] = useState({}) // { [fieldId]: dataUrl }

  // ── Prefill-Daten ────────────────────────────────────────────────────────
  const [companyPrefillData, setCompanyPrefillData] = useState({})
  const [profilePrefillData, setProfilePrefillData] = useState({}) // from search-selected profile
  const [vermittlerPrefillData, setVermittlerPrefillData] = useState({})

  // Helper: build company prefill map from a company object
  function buildCompanyPrefill(c) {
    if (!c) return {}
    const contactName = `${c.first_name || ''} ${c.last_name || ''}`.trim()
    return {
      'company.company_name':        c.company_name || '',
      'company.contact_name':        contactName,
      'company.contact_first_name':  c.first_name || '',
      'company.contact_last_name':   c.last_name || '',
      'company.email':               c.email || '',
      'company.phone':               c.phone || '',
      'company.address':             c.address || '',
      'company.city':                c.city || '',
      'company.postal_code':         c.postal_code || '',
      'company.betriebsnummer':      c.betriebsnummer || '',
      'company.ba_kundennummer':     c.ba_kundennummer || '',
    }
  }

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
        setCompanyPrefillData(buildCompanyPrefill(c))
      })
  }, [companyIdForPrefill])

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
        })
      })
      .catch(() => {})
  }, [session?.access_token])

  const prefillData = {
    ...(entityType === 'profile' ? buildProfilePrefill(profile) : {}),
    ...profilePrefillData,  // from search-selected FK (overrides if present)
    ...companyPrefillData,
    ...vermittlerPrefillData,
  }

  // ── Ergebnis ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { jobId, sends: [...] }
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [emailSending, setEmailSending] = useState({}) // { [sendId]: 'sending'|'sent'|'error' }

  const sendEmail = async (s) => {
    const email = s.signerEmail || signerEmails[s.recipientType]
    const name  = s.signerName  || signerNames[s.recipientType]
    if (!email) {
      toast({ title: 'Keine E-Mail', description: 'Für diese Partei ist keine E-Mail-Adresse hinterlegt.', variant: 'destructive' })
      return
    }
    setEmailSending(p => ({ ...p, [s.sendId]: 'sending' }))
    try {
      const res = await fetch('/api/admin/dokumente/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ sendId: s.sendId, recipientEmail: email, recipientName: name || email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setEmailSending(p => ({ ...p, [s.sendId]: 'sent' }))
      toast({ title: 'E-Mail gesendet', description: `Link wurde an ${email} verschickt.` })
    } catch (err) {
      setEmailSending(p => ({ ...p, [s.sendId]: 'error' }))
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    }
  }

  // ── Templates laden ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isForwardMode) { setTemplatesLoading(false); return } // skip in forward mode
    fetch('/api/admin/dokumente/list', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setTemplatesLoading(false) })
      .catch(() => setTemplatesLoading(false))
  }, [])

  // ── Original-Send laden (nur im Forward-Modus) ───────────────────────────
  useEffect(() => {
    if (!isForwardMode || !forwardFromSendId) return
    fetch(`/api/admin/dokumente/sends-detail?sendId=${forwardFromSendId}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.send) return
        const s = d.send
        // Load the template so field definitions are available
        if (s.template_id) setSelectedTemplateId(s.template_id)
        // Pre-fill UN signer info from company if available
        const unName  = company?.company_name || company?.name || ''
        const unEmail = company?.email || ''
        setSignerNames(prev => ({ ...prev, unternehmen: prev.unternehmen || unName }))
        setSignerEmails(prev => ({ ...prev, unternehmen: prev.unternehmen || unEmail }))
      })
      .catch(() => {})
  }, [forwardFromSendId])

  // ── Template-Details laden ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTemplateId) { setSelectedTemplate(null); return }
    setTemplateLoading(true)
    setAdminSigDataUrls({})
    fetch(`/api/admin/dokumente/get?templateId=${selectedTemplateId}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then(r => r.json())
      .then(d => {
        const tpl = d.template || null
        setSelectedTemplate(tpl)
        setTemplateLoading(false)
        // Auto-Parteien aus Template-Typ ableiten (nur wenn kein Entity-Kontext vorhanden und nicht Forward-Modus)
        if (!entityId && !isForwardMode && tpl?.template_type) {
          if (tpl.template_type === 'fachkraft') setParties(['fachkraft'])
          else if (tpl.template_type === 'unternehmen') setParties(['unternehmen'])
          // 'vermittlung' → keine Auto-Vorauswahl
        }
      })
      .catch(() => setTemplateLoading(false))
  }, [selectedTemplateId])

  // ── Standard-Empfänger aus Kontext ──────────────────────────────────────
  useEffect(() => {
    const fkName  = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : (activeVermittlungen[0]?.profileName || '')
    const fkEmail = profile?.contact_email || activeVermittlungen[0]?.profileEmail || ''
    const unName  = company?.company_name || company?.name || activeVermittlungen[0]?.companyName || ''
    const unEmail = company?.email || activeVermittlungen[0]?.companyEmail || ''
    setSignerNames(prev => ({
      fachkraft:   prev.fachkraft   || fkName,
      unternehmen: prev.unternehmen || unName,
    }))
    setSignerEmails(prev => ({
      fachkraft:   prev.fachkraft   || fkEmail,
      unternehmen: prev.unternehmen || unEmail,
    }))
  }, [])

  // ── Auto-Prefill aus Profil/Firma beim Betreten von Schritt 3 ────────────
  useEffect(() => {
    if (step !== 3 || !selectedTemplate?.fields) return
    setFieldOverrides(prev => {
      const next = { ...prev }
      for (const f of selectedTemplate.fields) {
        if (['signature', 'checkbox'].includes(f.type)) continue
        if (f.id in next) continue // Bereits gesetzt → nicht überschreiben
        // Nur Felder der relevanten Parteien + Admin + Vermittlung prefüllen
        const fieldAudience = f.audience || 'fachkraft'
        if (fieldAudience !== 'admin' && fieldAudience !== 'vermittlung' && !parties.includes(fieldAudience)) continue
        const autoVal = f.prefillKey ? (prefillData[f.prefillKey] || '') : ''
        if (autoVal) next[f.id] = autoVal
      }
      return next
    })
  }, [step, selectedTemplateId])

  // ── Such-Autocomplete (per party) ────────────────────────────────────────
  const doSearch = useCallback((party, q) => {
    clearTimeout(searchTimeouts.current[party])
    if (!q.trim()) {
      setSearchResultsMap(p => ({ ...p, [party]: [] }))
      return
    }
    searchTimeouts.current[party] = setTimeout(async () => {
      setSearchingParty(party)
      try {
        const isFK = party === 'fachkraft'
        if (isFK) {
          const res = await fetch(`/api/admin/profiles/search?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${session?.access_token}` },
          })
          const data = await res.json()
          setSearchResultsMap(p => ({ ...p, [party]: (data.profiles || []).slice(0, 6) }))
        } else {
          const res = await fetch('/api/admin/entities/companies', {
            headers: { Authorization: `Bearer ${session?.access_token}` },
          })
          const data = await res.json()
          const lq = q.toLowerCase()
          const filtered = (data.companies || []).filter(c =>
            (c.company_name || '').toLowerCase().includes(lq) ||
            `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(lq)
          ).slice(0, 6)
          setSearchResultsMap(p => ({ ...p, [party]: filtered }))
        }
      } catch {}
      setSearchingParty(null)
    }, 300)
  }, [session?.access_token])

  // ── Berechnungen ─────────────────────────────────────────────────────────
  const templateFields = selectedTemplate?.fields || []

  // Felder nach Audience
  const adminTextFields  = templateFields.filter(f => f.audience === 'admin' && !['signature', 'checkbox'].includes(f.type))
  const adminSigFields   = templateFields.filter(f => f.audience === 'admin' && f.type === 'signature')
  const fkTextFields     = templateFields.filter(f => (f.audience === 'fachkraft' || !f.audience) && !['signature', 'checkbox'].includes(f.type))
  const unTextFields     = templateFields.filter(f => f.audience === 'unternehmen' && !['signature', 'checkbox'].includes(f.type))
  const vermittlungFields = templateFields.filter(f => f.audience === 'vermittlung' && !['signature', 'checkbox'].includes(f.type))
  const checkboxFields   = templateFields.filter(f => f.type === 'checkbox')

  const hasAdminSigs    = adminSigFields.length > 0
  const adminSigsComplete = !hasAdminSigs || adminSigFields.every(f => !!adminSigDataUrls[f.id])

  const hasVermittlung = activeVermittlungen.length > 0

  // Audit-Felder: Text-Gruppen die in Step 3 angezeigt werden
  const showFkFields = parties.includes('fachkraft')
  const showUnFields = parties.includes('unternehmen')

  // Steps dynamisch
  const steps = [
    ...(!isForwardMode ? [{ id: 1, label: 'Vorlage' }] : []),
    { id: 2, label: 'Parteien' },
    { id: 3, label: 'Felder' },
    ...(hasAdminSigs && !isForwardMode ? [{ id: 4, label: 'Unterschrift' }] : []),
  ]
  const totalSteps = steps.length
  const lastStepId = steps[steps.length - 1]?.id ?? totalSteps

  // Validierung
  const step1Valid = !!selectedTemplateId
  const step2Valid = parties.length > 0
  const step3Valid = adminSigsComplete || hasAdminSigs ? adminSigFields.every(f => !!adminSigDataUrls[f.id]) : true
  // Step 4 = Admin-Sig (separate Seite)
  const step4Valid = true // signature is optional — "Später unterschreiben" allowed
  const canGoNext = step === 1 ? step1Valid : step === 2 ? step2Valid : true

  // ── Versenden ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (isForwardMode) {
        // ── Forward-Modus: ruft forward-send.js auf ─────────────────────────
        const signerName  = signerNames.unternehmen  || company?.company_name || 'Unternehmen'
        const signerEmail = signerEmails.unternehmen || company?.email || null
        const res = await fetch('/api/admin/dokumente/forward-send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            originalSendId: forwardFromSendId,
            signerName,
            signerEmail,
            prefillData: fieldOverrides,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler beim Weiterleiten')
        // Transform to standard result format
        setResult({
          sends: [{
            recipientType: 'unternehmen',
            sendId: data.sendId,
            token: data.token,
            signerUrl: data.signerUrl,
            signerName,
            signerEmail,
          }],
        })
        setSubmitting(false)
        return
      }

      // ── Standard-Modus: job-create.js ──────────────────────────────────────
      const adminFieldValues = { ...fieldOverrides, ...adminSigDataUrls }

      const body = {
        templateId: selectedTemplateId,
        parties,
        adminFieldValues,
        signerNames,
        signerEmails,
      }
      // Link entity IDs — prefer pre-set entityId, fall back to search-selected entities
      const fkEntity = selectedEntities.fachkraft
      const unEntity = selectedEntities.unternehmen
      if (entityType === 'profile' && entityId) body.profileId = entityId
      else if (fkEntity?.id && parties.includes('fachkraft')) body.profileId = fkEntity.id
      if (entityType === 'company' && entityId) body.companyId = entityId
      else if (unEntity?.id && parties.includes('unternehmen')) body.companyId = unEntity.id

      const res = await fetch('/api/admin/dokumente/job-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')

      setResult(data) // show result screen — onCreated is called when user clicks "Fertig"
    } catch (err) {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const copyUrl = (url, idx) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  // ── Vorlage-Statistik ─────────────────────────────────────────────────────
  const FieldStats = ({ fields }) => {
    const counts = { fachkraft: 0, unternehmen: 0, admin: 0, vermittlung: 0 }
    for (const f of fields) {
      const a = f.audience || 'fachkraft'
      if (counts[a] !== undefined) counts[a]++
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(counts).map(([aud, cnt]) => cnt > 0 ? (
          <span key={aud} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${AUDIENCE_BADGE[aud].cls}`}>
            {AUDIENCE_BADGE[aud].label} {cnt}
          </span>
        ) : null)}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-gray-500" />
            {isForwardMode ? 'Dokument an Unternehmen weiterleiten' : 'Dokument versenden'}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          /* ── ERGEBNIS ─────────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {result.sends.length === 1 ? 'Signierlink erstellt' : 'Links für beide Parteien erstellt'}
              </div>
              {result.sends.map((s, idx) => {
                const party = s.recipientType === 'fachkraft' ? 'Fachkraft' : 'Unternehmen'
                const email = s.signerEmail || signerEmails[s.recipientType]
                const emailState = emailSending[s.sendId]
                return (
                  <div key={s.sendId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{party}</p>
                      {email && (
                        <button
                          type="button"
                          onClick={() => sendEmail(s)}
                          disabled={emailState === 'sending' || emailState === 'sent'}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            emailState === 'sent'
                              ? 'border-green-200 bg-green-50 text-green-600 cursor-default'
                              : emailState === 'error'
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          {emailState === 'sending' ? <Loader2 className="h-3 w-3 animate-spin" /> :
                           emailState === 'sent'    ? <Check className="h-3 w-3" /> :
                                                      <Send className="h-3 w-3" />}
                          {emailState === 'sent' ? 'Gesendet' : emailState === 'sending' ? 'Sende…' : `Per E-Mail senden`}
                        </button>
                      )}
                    </div>
                    {email && <p className="text-[11px] text-gray-400">→ {email}</p>}
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white border border-green-200 rounded px-2.5 py-2 break-all text-gray-700 select-all">
                        {s.signerUrl}
                      </code>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyUrl(s.signerUrl, idx)}>
                        {copiedIdx === idx ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end">
              <Button className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90" onClick={() => { onCreated?.(); onClose() }}>Fertig</Button>
            </div>
          </div>
        ) : (
          /* ── SCHRITTE ──────────────────────────────────────────────────── */
          <div>
            <Stepper step={step} steps={steps} />

            {/* Step 2 must NOT have overflow-y-auto — it clips the search dropdown */}
            <div className={`space-y-4 pr-0.5 ${step !== 2 ? 'max-h-[55vh] overflow-y-auto' : ''}`}>

              {/* ── Schritt 1: Vorlage ──────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-3">
                  {/* Suchfeld */}
                  {!templatesLoading && templates.length > 3 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <input
                        value={templateSearch}
                        onChange={e => setTemplateSearch(e.target.value)}
                        placeholder="Vorlage suchen…"
                        autoFocus
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]/50"
                      />
                      {templateSearch && (
                        <button onClick={() => setTemplateSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {templatesLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm">Keine Vorlagen vorhanden</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
                      {templates
                        .filter(t => !templateSearch || t.name?.toLowerCase().includes(templateSearch.toLowerCase()))
                        .map(t => {
                          const isSelected = t.id === selectedTemplateId
                          const fieldCounts = (t.fields || []).reduce((acc, f) => {
                            const a = f.audience || 'fachkraft'
                            acc[a] = (acc[a] || 0) + 1
                            return acc
                          }, {})
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedTemplateId(t.id)}
                              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-[#1a3a5c] bg-[#1a3a5c]/[0.03]'
                                  : 'border-gray-100 bg-gray-50/80 hover:border-gray-200 hover:bg-white'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isSelected ? 'bg-[#1a3a5c] text-white' : 'bg-white border border-gray-200 text-gray-400'
                              }`}>
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#1a3a5c]' : 'text-gray-800'}`}>{t.name}</p>
                                {Object.keys(fieldCounts).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(fieldCounts).map(([aud, cnt]) => (
                                      <span key={aud} className={`text-[9px] font-bold px-1 py-0.5 rounded border ${AUDIENCE_BADGE[aud]?.cls || ''}`}>
                                        {AUDIENCE_BADGE[aud]?.label} {cnt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-[#1a3a5c] shrink-0 mt-1" />}
                            </button>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Schritt 2: Parteien & Empfänger ─────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  {/* Welche Parteien? */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wer soll dieses Dokument erhalten?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'fachkraft', icon: User, label: 'Fachkraft', desc: `${signerNames.fachkraft || 'Nicht gesetzt'}`, color: 'border-teal-500 bg-teal-50/50' },
                        { val: 'unternehmen', icon: Building2, label: 'Unternehmen', desc: `${signerNames.unternehmen || 'Nicht gesetzt'}`, color: 'border-blue-500 bg-blue-50/50' },
                      ].map(o => {
                        const Icon = o.icon
                        const active = parties.includes(o.val)
                        // When opened from a specific entity context, lock the matching party
                        // and disable the other so only the relevant one can be selected
                        const isLocked = isForwardMode
                          ? o.val === 'unternehmen'
                          : !!entityId && (
                              (o.val === 'fachkraft'   && entityType === 'profile') ||
                              (o.val === 'unternehmen' && entityType === 'company')
                            )
                        const isDisabled = isForwardMode
                          ? o.val !== 'unternehmen'
                          : !!entityId && !isLocked
                        return (
                          <button
                            key={o.val}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isLocked && setParties(prev =>
                              prev.includes(o.val) ? prev.filter(p => p !== o.val) : [...prev, o.val]
                            )}
                            className={`flex flex-col items-start gap-1.5 px-4 py-4 rounded-xl border-2 text-left transition-all ${
                              isDisabled
                                ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                                : active
                                ? o.color
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Icon className={`h-4 w-4 shrink-0 ${active && !isDisabled ? 'text-current' : 'text-gray-400'}`} />
                              <span className={`text-sm font-semibold flex-1 ${active && !isDisabled ? '' : 'text-gray-500'}`}>{o.label}</span>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active && !isDisabled ? 'border-current bg-current' : 'border-gray-300'}`}>
                                {active && !isDisabled && <Check className="h-2.5 w-2.5 text-white" />}
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400 truncate w-full">{o.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                    {parties.length === 2 && (
                      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>Geteiltes Dokument: Beide Parteien füllen nur ihre eigenen Felder aus. Das fertige PDF vereint alle Eingaben.</span>
                      </div>
                    )}
                  </div>

                  {/* Empfänger-Details */}
                  {parties.map(party => {
                    const isFK = party === 'fachkraft'
                    // Only treat as "current entity" when entityId is set AND type matches
                    const isCurrentEntity =
                      !!entityId &&
                      ((entityType === 'profile' && isFK) ||
                       (entityType === 'company' && !isFK))
                    const partySearchQ = searchQs[party] || ''
                    const partyResults = searchResultsMap[party] || []
                    return (
                      <div key={party} className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {isFK ? 'Fachkraft' : 'Unternehmen'}
                        </p>

                        {/* Aktive Vermittlung Quickselect */}
                        {!isCurrentEntity && activeVermittlungen.length > 0 && (
                          <div className="space-y-1">
                            {activeVermittlungen.slice(0, 2).map(v => {
                              const name  = isFK ? v.profileName  : v.companyName
                              const email = isFK ? v.profileEmail : v.companyEmail
                              return (
                                <button
                                  key={`${v.profileId}-${v.companyId}`}
                                  type="button"
                                  onClick={() => {
                                    setSignerNames(p => ({ ...p, [party]: name || '' }))
                                    setSignerEmails(p => ({ ...p, [party]: email || '' }))
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-[#1a3a5c] bg-white text-left text-sm"
                                >
                                  {isFK ? <User className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                                  <span className="flex-1 truncate font-medium text-gray-800">{name}</span>
                                  <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full shrink-0">Vermittlung</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Suche — always shown unless entity is pre-set */}
                        {!isCurrentEntity && (
                          selectedEntities[party] ? (
                            /* ── Selected entity chip ── */
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#1a3a5c]/40 bg-[#1a3a5c]/5">
                              {isFK
                                ? <User className="h-4 w-4 text-[#1a3a5c] shrink-0" />
                                : <Building2 className="h-4 w-4 text-[#1a3a5c] shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#1a3a5c] truncate">
                                  {selectedEntities[party].company_name || `${selectedEntities[party].first_name || ''} ${selectedEntities[party].last_name || ''}`.trim()}
                                </p>
                                {selectedEntities[party].company_name && selectedEntities[party].first_name && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {`${selectedEntities[party].first_name} ${selectedEntities[party].last_name || ''}`.trim()}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEntities(p => ({ ...p, [party]: null }))
                                  setSignerNames(p => ({ ...p, [party]: '' }))
                                  setSignerEmails(p => ({ ...p, [party]: '' }))
                                }}
                                className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Auswahl zurücksetzen"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            /* ── Search input ── */
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                              <input
                                value={partySearchQ}
                                onChange={e => {
                                  const q = e.target.value
                                  setSearchQs(p => ({ ...p, [party]: q }))
                                  doSearch(party, q)
                                }}
                                placeholder={isFK ? 'Fachkraft suchen…' : 'Unternehmen suchen…'}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                              />
                              {searchingParty === party && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />}
                              {partyResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                                  {partyResults.map(r => {
                                    // For companies: primary = company_name, sub = contact name
                                    // For profiles: primary = full name
                                    const primaryName = isFK
                                      ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
                                      : (r.company_name || `${r.first_name || ''} ${r.last_name || ''}`.trim())
                                    const contactName = !isFK && r.first_name
                                      ? `${r.first_name} ${r.last_name || ''}`.trim()
                                      : null
                                    const email = r.contact_email || r.email || ''
                                    const sub = contactName || email
                                    // signerName = company_name for companies, full name for profiles
                                    const signerName = primaryName
                                    return (
                                      <button
                                        key={r.id}
                                        type="button"
                                        onMouseDown={() => {
                                          setSelectedEntities(p => ({ ...p, [party]: r }))
                                          setSignerNames(p => ({ ...p, [party]: signerName }))
                                          setSignerEmails(p => ({ ...p, [party]: email }))
                                          setSearchQs(p => ({ ...p, [party]: '' }))
                                          setSearchResultsMap(p => ({ ...p, [party]: [] }))
                                          // Update prefill data so Step 3 auto-fills correctly
                                          if (isFK) {
                                            setProfilePrefillData(buildProfilePrefill(r))
                                          } else {
                                            setCompanyPrefillData(buildCompanyPrefill(r))
                                          }
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                      >
                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
                                          {(primaryName[0] || '?').toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-800 truncate">{primaryName}</p>
                                          {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={signerNames[party] || ''}
                              onChange={e => setSignerNames(p => ({ ...p, [party]: e.target.value }))}
                              placeholder="Vor- und Nachname"
                              className="text-sm h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">E-Mail</Label>
                            <Input
                              type="email"
                              value={signerEmails[party] || ''}
                              onChange={e => setSignerEmails(p => ({ ...p, [party]: e.target.value }))}
                              placeholder="empfaenger@beispiel.de"
                              className="text-sm h-8"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── Schritt 3: Felder vorausfüllen ──────────────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  {templateLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
                  ) : (
                    <>
                      {/* Admin-Felder (Text) — nicht im Forward-Modus (bereits im Original eingebettet) */}
                      {!isForwardMode && adminTextFields.length > 0 && (
                        <FieldGroup
                          title="FKVI / Admin-Felder"
                          badge={AUDIENCE_BADGE.admin}
                          required
                          fields={adminTextFields}
                          overrides={fieldOverrides}
                          prefillData={prefillData}
                          onChange={(id, val) => setFieldOverrides(p => ({ ...p, [id]: val }))}
                        />
                      )}

                      {/* Fachkraft-Felder (optional prefill) */}
                      {showFkFields && fkTextFields.length > 0 && (
                        <FieldGroup
                          title="Fachkraft-Felder"
                          badge={AUDIENCE_BADGE.fachkraft}
                          hint="Werden vom Empfänger ausgefüllt — optional vorab befüllen"
                          fields={fkTextFields}
                          overrides={fieldOverrides}
                          prefillData={prefillData}
                          onChange={(id, val) => setFieldOverrides(p => ({ ...p, [id]: val }))}
                        />
                      )}

                      {/* Unternehmen-Felder */}
                      {showUnFields && unTextFields.length > 0 && (
                        <FieldGroup
                          title="Unternehmen-Felder"
                          badge={AUDIENCE_BADGE.unternehmen}
                          hint="Werden vom Unternehmen ausgefüllt — optional vorab befüllen"
                          fields={unTextFields}
                          overrides={fieldOverrides}
                          prefillData={prefillData}
                          onChange={(id, val) => setFieldOverrides(p => ({ ...p, [id]: val }))}
                        />
                      )}

                      {/* Vermittlungs-Felder — nicht im Forward-Modus */}
                      {!isForwardMode && vermittlungFields.length > 0 && (
                        <FieldGroup
                          title="Vermittlungs-Felder"
                          badge={AUDIENCE_BADGE.vermittlung}
                          hint={hasVermittlung ? 'Werte aus aktiver Vermittlung' : 'Nur bei aktiver Vermittlung verfügbar'}
                          fields={vermittlungFields}
                          overrides={fieldOverrides}
                          prefillData={prefillData}
                          disabled={!hasVermittlung}
                          onChange={(id, val) => setFieldOverrides(p => ({ ...p, [id]: val }))}
                        />
                      )}

                      {/* Checkbox-Felder */}
                      {checkboxFields.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Auswahlfelder</p>
                          <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            {checkboxFields.map(field => {
                              const isMultiple = field.multiple === true
                              const cur = fieldOverrides[field.id]
                              return (
                                <div key={field.id} className="px-3 py-2.5 bg-white">
                                  <p className="text-xs font-medium text-gray-700 mb-1.5">{field.label || field.id}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(field.options || []).map(opt => {
                                      const active = isMultiple
                                        ? (Array.isArray(cur) ? cur : []).includes(opt.id)
                                        : cur === opt.id
                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => setFieldOverrides(prev => {
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
                        </div>
                      )}

                      {/* Wenn keine Felder in Step 3 sichtbar (Admin-Sigs kommen ggf. in Step 4) */}
                      {(isForwardMode || adminTextFields.length === 0) &&
                       (!showFkFields || fkTextFields.length === 0) &&
                       (!showUnFields || unTextFields.length === 0) &&
                       (isForwardMode || vermittlungFields.length === 0) &&
                       checkboxFields.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">Keine Felder zu befüllen</p>
                            <p className="text-xs text-gray-400 mt-1">Die Empfänger erhalten das Dokument direkt zum Unterschreiben — ohne weitere Eingaben.</p>
                          </div>
                        </div>
                      )}

                      {/* Admin-Signaturen (Inline wenn kein eigener Step) */}
                      {!hasAdminSigs && adminSigFields.length > 0 && (
                        adminSigFields.map(f => (
                          <SignaturePad
                            key={f.id}
                            fieldLabel={f.label || 'Unterschrift (FKVI)'}
                            onChange={dataUrl => setAdminSigDataUrls(prev => {
                              const next = { ...prev }
                              if (dataUrl) next[f.id] = dataUrl
                              else delete next[f.id]
                              return next
                            })}
                          />
                        ))
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Schritt 4: Admin-Signatur ──────────────────────────── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Ihre Unterschrift (FKVI / Vermittler)</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Die Signatur wird vorab in das PDF eingebettet, bevor der Empfänger das Dokument erhält. Sie können auch ohne Unterschrift fortfahren.
                    </p>
                  </div>
                  {adminSigFields.map(field => (
                    <SignaturePad
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
                </div>
              )}
            </div>

            {/* ── Footer-Navigation ───────────────────────────────────── */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <Button
                variant="outline"
                onClick={() => (step === 1 || ((initialTemplateId || isForwardMode) && step === 2)) ? onClose() : setStep(s => s - 1)}
              >
                {(step === 1 || ((initialTemplateId || isForwardMode) && step === 2)) ? 'Abbrechen' : <><ChevronLeft className="h-4 w-4 mr-1" />Zurück</>}
              </Button>

              {step < lastStepId ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canGoNext}
                  className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                >
                  Weiter <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {step === 4 && !adminSigsComplete && (
                    <Button
                      variant="outline"
                      onClick={handleCreate}
                      disabled={submitting}
                      className="text-gray-500"
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Später unterschreiben'}
                    </Button>
                  )}
                  <Button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="bg-[#0d9488] hover:bg-[#0d9488]/90 text-white"
                  >
                    {submitting
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Erstelle...</>
                      : <><Link2 className="h-3.5 w-3.5 mr-1.5" />Versenden</>}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Feld-Gruppe Komponente ───────────────────────────────────────────────────
function FieldGroup({ title, badge, hint, fields, overrides, prefillData, onChange, disabled, required }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
        {required && <span className="text-[10px] text-red-500 font-medium">*</span>}
        {hint && <span className="text-[10px] text-gray-400 ml-auto">{hint}</span>}
      </div>
      <div className={`rounded-xl border overflow-hidden divide-y divide-gray-50 ${disabled ? 'opacity-50 pointer-events-none' : 'border-gray-100'}`}>
        {fields.map(f => {
          const autoVal = f.prefillKey ? (prefillData[f.prefillKey] || '') : ''
          const currentVal = overrides[f.id] !== undefined ? overrides[f.id] : autoVal
          const isFromProfile = autoVal && currentVal === autoVal
          const isManual = currentVal && !isFromProfile
          return (
            <div key={f.id} className="px-3 py-2.5 bg-white hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{f.label || f.id}</span>
                {isFromProfile && <span className="text-[9px] font-semibold text-[#0d9488] bg-[#0d9488]/10 px-1.5 py-0.5 rounded">Profil</span>}
                {isManual && <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Manuell</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  value={currentVal}
                  onChange={e => onChange(f.id, e.target.value)}
                  placeholder={`${f.label || 'Wert'} eingeben…`}
                  disabled={disabled}
                  className="flex-1 h-7 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a5c] focus:border-[#1a3a5c] bg-white placeholder:text-gray-300"
                />
                {currentVal && (
                  <button
                    type="button"
                    onClick={() => onChange(f.id, '')}
                    className="text-gray-300 hover:text-gray-500 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
