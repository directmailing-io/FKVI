import { useRef, useEffect, useState, useCallback } from 'react'
import SignaturePad from 'signature_pad'

// ─── HiDPI resize helper ──────────────────────────────────────────────────────

function resizeCanvas(canvas, pad) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const data = pad.toData()
  canvas.width = canvas.offsetWidth * ratio
  canvas.height = canvas.offsetHeight * ratio
  canvas.getContext('2d').scale(ratio, ratio)
  pad.clear()
  pad.fromData(data)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignatureCanvas({ onSignatureChange, disabled }) {
  const canvasRef = useRef(null)
  const padRef = useRef(null)
  const debounceRef = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)

  // Initialize SignaturePad
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#1a3a5c',
      minWidth: 1.5,
      maxWidth: 3,
    })
    padRef.current = pad

    // Initial resize to handle HiDPI
    resizeCanvas(canvas, pad)

    // Notify parent on stroke end
    pad.addEventListener('endStroke', () => {
      const empty = pad.isEmpty()
      setIsEmpty(empty)
      onSignatureChange(empty ? null : pad.toDataURL('image/png'))
    })

    // Debounced resize handler
    const handleResize = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        resizeCanvas(canvas, pad)
      }, 300)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      pad.off()
    }
  }, [onSignatureChange])

  // Sync disabled state
  useEffect(() => {
    const pad = padRef.current
    if (!pad) return
    if (disabled) {
      pad.off()
    } else {
      pad.on()
    }
  }, [disabled])

  const handleClear = useCallback(() => {
    const pad = padRef.current
    if (!pad) return
    pad.clear()
    setIsEmpty(true)
    onSignatureChange(null)
  }, [onSignatureChange])

  return (
    <div className={`space-y-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {/* Canvas wrapper */}
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          className="
            w-full
            h-[180px] md:h-[220px]
            bg-white
            border-2 border-gray-200
            rounded-xl
            touch-none
          "
          style={{ cursor: disabled ? 'default' : 'crosshair', display: 'block' }}
        />

        {/* Placeholder — only visible when empty and not disabled */}
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-gray-300 text-base font-light tracking-wide">
              Hier unterschreiben
            </span>
          </div>
        )}
      </div>

      {/* Clear button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="
            px-4 py-2 rounded-lg text-sm font-medium
            border border-gray-200 text-gray-500
            hover:bg-gray-50 hover:text-gray-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Löschen
        </button>
      </div>
    </div>
  )
}
