import { useState, useEffect } from 'react'
import { Loader2, Maximize2, Minimize2, Clock } from 'lucide-react'

// Extract numeric video ID from any Vimeo URL or embed URL
function extractVimeoId(url) {
  if (!url) return null
  const m =
    url.match(/vimeo\.com\/(?:video\/)?(\d+)/) ||
    url.match(/player\.vimeo\.com\/video\/(\d+)/)
  return m ? m[1] : null
}

// Build a clean embed URL
function buildEmbedUrl(id) {
  return `https://player.vimeo.com/video/${id}?badge=0&autopause=0&title=0&byline=0&portrait=0`
}

/**
 * VimeoPlayer
 * - Defaults to portrait (9:16) — most FKVI intro videos are shot on mobile
 * - Detects actual orientation via oEmbed; switches to landscape if needed
 * - Handles "still processing" state gracefully
 */
export default function VimeoPlayer({ url, showToggle = false, className = '' }) {
  const [orientation, setOrientation] = useState('portrait')
  const [detected, setDetected] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [manualOverride, setManualOverride] = useState(null)

  const videoId = extractVimeoId(url)
  const embedUrl = videoId ? buildEmbedUrl(videoId) : url

  useEffect(() => {
    if (!videoId) return
    setDetected(false)
    setProcessing(false)
    setManualOverride(null)

    fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`)
      .then(r => {
        if (r.status === 403 || r.status === 404) {
          // Video may still be processing
          setProcessing(true)
          setDetected(true)
          return null
        }
        return r.json()
      })
      .then(data => {
        if (!data) return
        if (data.width && data.height) {
          setOrientation(data.width > data.height ? 'landscape' : 'portrait')
        }
        setDetected(true)
      })
      .catch(() => {
        setDetected(true) // fall back to portrait on network error
      })
  }, [videoId])

  const effectiveOrientation = manualOverride ?? orientation
  const isPortrait = effectiveOrientation === 'portrait'

  return (
    <div className={`relative ${className}`}>
      {/* Loading shimmer */}
      {!detected && (
        <div className={`rounded-xl bg-gray-100 flex items-center justify-center ${isPortrait ? 'aspect-[9/16] max-w-[300px]' : 'aspect-video'}`}>
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Still processing on Vimeo */}
      {detected && processing && (
        <div className={`rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-2 text-center p-6 ${isPortrait ? 'aspect-[9/16] max-w-[300px]' : 'aspect-video'}`}>
          <Clock className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Video wird verarbeitet</p>
          <p className="text-xs text-gray-400">Vimeo verarbeitet das Video noch.<br />Bitte in einigen Minuten neu laden.</p>
        </div>
      )}

      {detected && !processing && (
        <div className={isPortrait ? 'flex justify-center' : ''}>
          <div
            className="relative rounded-xl overflow-hidden bg-black shadow-lg"
            style={isPortrait
              ? { width: '100%', maxWidth: '300px', aspectRatio: '9/16' }
              : { width: '100%', aspectRatio: '16/9' }
            }
          >
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo Video"
            />
          </div>
        </div>
      )}

      {/* Orientation toggle for admins */}
      {showToggle && detected && !processing && (
        <button
          onClick={() => setManualOverride(prev => {
            const cur = prev ?? orientation
            return cur === 'portrait' ? 'landscape' : 'portrait'
          })}
          className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isPortrait
            ? <><Maximize2 className="h-3.5 w-3.5" />Querformat anzeigen</>
            : <><Minimize2 className="h-3.5 w-3.5" />Hochformat anzeigen</>
          }
        </button>
      )}
    </div>
  )
}
