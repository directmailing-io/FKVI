import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Minimize2, Maximize2, Loader2 } from 'lucide-react'

function extractVimeoId(url) {
  if (!url) return null
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/) || url.match(/player\.vimeo\.com\/video\/(\d+)/)
  return m ? m[1] : null
}

export default function VideoLightbox({ url, open, onClose }) {
  const [minimized, setMinimized] = useState(false)
  const [isPortrait, setIsPortrait] = useState(true)
  const [detected, setDetected] = useState(false)

  const videoId = extractVimeoId(url)
  const embedUrl = videoId
    ? `https://player.vimeo.com/video/${videoId}?badge=0&title=0&byline=0&portrait=0&autoplay=1`
    : url

  // Detect orientation via oEmbed once on open
  useEffect(() => {
    if (!videoId || !open) return
    setDetected(false)
    fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.width && data?.height) setIsPortrait(data.width <= data.height)
        setDetected(true)
      })
      .catch(() => setDetected(true))
  }, [videoId, open])

  // Reset minimized when closed
  useEffect(() => { if (!open) setMinimized(false) }, [open])

  // Escape to close (only fullscreen mode)
  useEffect(() => {
    if (!open || minimized) return
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, minimized, onClose])

  if (!open || !url) return null

  return createPortal(
    <>
      {/* ── Backdrop (fullscreen only) ───────────────────────────── */}
      <div
        className={`fixed inset-0 z-[199] bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
          minimized ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => setMinimized(true)}
      />

      {/* ── Video container — NEVER unmounted so iframe keeps playing ── */}
      <div
        className={`fixed z-[200] transition-all duration-300 ease-in-out ${
          minimized
            // Mini PiP: bottom-right, above mobile browser chrome
            ? 'bottom-[env(safe-area-inset-bottom,0px)] right-0 sm:right-4 sm:bottom-6 w-36 xs:w-44 sm:w-56 rounded-l-2xl sm:rounded-2xl overflow-hidden shadow-2xl'
            // Fullscreen: centered, mobile-first (sheet from bottom on small screens)
            : 'inset-x-0 bottom-0 sm:inset-0 flex sm:items-center justify-center pointer-events-none'
        }`}
      >
        <div
          className={`w-full pointer-events-auto ${
            minimized
              ? 'bg-gray-950 rounded-l-2xl sm:rounded-2xl overflow-hidden'
              : isPortrait
                ? 'max-w-[85vw] sm:max-w-xs mx-auto mb-4 sm:mb-0'
                : 'max-w-2xl mx-4 sm:mx-auto mb-4 sm:mb-0'
          }`}
        >
          {/* ── Mini header bar ── */}
          {minimized && (
            <div className="flex items-center justify-between px-2.5 py-2 bg-gray-950">
              <span className="text-white/80 text-[11px] font-medium truncate pr-1">Video</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setMinimized(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Vergrößern"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Schließen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ── Iframe wrapper — persistent across mode changes ── */}
          <div
            className="relative bg-black"
            style={{ aspectRatio: isPortrait ? '9/16' : '16/9' }}
          >
            {/* Loading overlay */}
            {!detected && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
                <Loader2 className="h-7 w-7 text-white/30 animate-spin" />
              </div>
            )}
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vorstellungsvideo"
            />
          </div>

          {/* ── Fullscreen controls (below video) ── */}
          {!minimized && (
            <div className="flex gap-2 mt-3 px-1 sm:px-0">
              <button
                onClick={() => setMinimized(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-2xl sm:rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm font-medium transition-colors touch-manipulation"
              >
                <Minimize2 className="h-4 w-4" />
                <span>Minimieren</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-2xl sm:rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm font-medium transition-colors touch-manipulation"
              >
                <X className="h-4 w-4" />
                <span>Schließen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
