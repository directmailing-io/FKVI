import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import CvDocument from '@/components/matching/CvDocument'
import { Button } from '@/components/ui/button'
import { Printer, Link as LinkIcon, CheckCircle2, Loader2, AlertCircle, LogIn } from 'lucide-react'

export default function CvPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, session, loading: authLoading } = useAuthStore()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareState, setShareState] = useState('idle') // idle | loading | done | error
  const [shareUrl, setShareUrl] = useState('')
  const [shareCopied, setShareCopied] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/matching/login?next=/lebenslauf/${id}`, { replace: true })
    }
  }, [authLoading, user, id, navigate])

  // Fetch profile (using authenticated supabase client — only published profiles)
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('Profil nicht gefunden oder nicht veröffentlicht.')
        else setProfile(data)
      })
      .finally(() => setLoading(false))
  }, [id, user])

  const handlePrint = () => window.print()

  const handleCreateShareLink = async () => {
    setShareState('loading')
    try {
      const res = await fetch('/api/matching/create-share-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profileId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShareUrl(data.shareUrl)
      setShareState('done')
      await navigator.clipboard.writeText(data.shareUrl)
      setShareCopied(true)
    } catch (err) {
      setShareState('error')
    }
  }

  const handleCopyAgain = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
          <h1 className="text-lg font-semibold text-gray-700">Profil nicht verfügbar</h1>
          <p className="text-sm text-gray-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/matching')}>
            Zur Matching-Plattform
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      {/* ── Action bar ── */}
      <div className="no-print sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div style={{ maxWidth: 794 }} className="mx-auto px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/matching')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
              ← Zurück
            </button>
            <span className="text-gray-200">|</span>
            <span className="font-bold text-[#1e3a5f] text-sm">FKVI</span>
            <span className="text-gray-400 text-sm">Lebenslauf</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            {/* Share link section */}
            {shareState === 'idle' && (
              <Button variant="outline" size="sm" onClick={handleCreateShareLink} className="gap-1.5 text-sm">
                <LinkIcon className="h-3.5 w-3.5" />Link teilen (7 Tage)
              </Button>
            )}
            {shareState === 'loading' && (
              <Button variant="outline" size="sm" disabled className="gap-1.5 text-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Link wird erstellt…
              </Button>
            )}
            {shareState === 'done' && (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 w-64 truncate"
                />
                <Button variant="outline" size="sm" onClick={handleCopyAgain} className="gap-1.5 text-sm shrink-0">
                  {shareCopied
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Kopiert!</>
                    : <><LinkIcon className="h-3.5 w-3.5" />Kopieren</>
                  }
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShareState('idle')} className="text-xs text-gray-400 px-2">
                  Neuer Link
                </Button>
              </div>
            )}
            {shareState === 'error' && (
              <span className="text-xs text-red-500">Fehler beim Erstellen. Bitte erneut versuchen.</span>
            )}

            <Button size="sm" onClick={handlePrint} className="gap-1.5 text-sm bg-[#1e3a5f] hover:bg-[#16304f]">
              <Printer className="h-3.5 w-3.5" />Als PDF speichern
            </Button>
          </div>
        </div>
      </div>

      {/* ── CV ── */}
      <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white">
        <div className="mx-auto shadow-xl print:shadow-none" style={{ maxWidth: 794 }}>
          <CvDocument profile={profile} />
        </div>
      </div>
    </>
  )
}
