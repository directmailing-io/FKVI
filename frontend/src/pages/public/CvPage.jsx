import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import CvDocument from '@/components/matching/CvDocument'
import { Button } from '@/components/ui/button'
import { Printer, Link as LinkIcon, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

export default function CvPage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/public/profile?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.profile) setProfile(data.profile)
        else setError(data.error || 'Profil nicht gefunden')
      })
      .catch(() => setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.'))
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = () => window.print()

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
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
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-800">Profil nicht verfügbar</h1>
          <p className="text-sm text-gray-500">{error}</p>
          <a href="/" className="text-sm text-[#1e3a5f] hover:underline">Zur FKVI-Startseite</a>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print styles – inlined so they work without extra CSS files */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      {/* ── Action bar (hidden when printing) ── */}
      <div className="no-print sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-[794px] mx-auto px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1e3a5f] text-sm">FKVI</span>
            <span className="text-gray-300 text-sm">·</span>
            <span className="text-gray-600 text-sm">Lebenslauf-Vorschau</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 text-sm">
              {copied
                ? <><CheckCircle2 className="h-4 w-4 text-green-500" />Link kopiert!</>
                : <><LinkIcon className="h-4 w-4" />Link teilen</>
              }
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 text-sm bg-[#1e3a5f] hover:bg-[#16304f]">
              <Printer className="h-4 w-4" />
              Als PDF speichern
            </Button>
          </div>
        </div>
      </div>

      {/* ── CV Document ── */}
      <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white">
        <div className="max-w-[794px] mx-auto shadow-xl print:shadow-none">
          <CvDocument profile={profile} />
        </div>
      </div>
    </>
  )
}
