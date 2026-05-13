import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import CvDocument from '@/components/matching/CvDocument'

export default function CvPreviewModal({ profile, documents = [], onClose }) {
  const handlePrint = () => {
    const el = document.getElementById('cv-preview-print')
    if (!el) return
    const win = window.open('', '_blank', 'width=870,height=920')
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; }
        @page { margin: 0; size: A4; }
        @media print { html, body { width: 210mm; } }
      </style>
    </head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print(); win.close() }, 300)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[880px] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0 bg-white">
          <h3 className="font-semibold text-gray-900 text-sm">
            Lebenslauf · {profile.first_name} {profile.last_name}
          </h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />Als PDF drucken
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* CV scroll area */}
        <div className="flex-1 overflow-y-auto bg-gray-100 py-6 px-4">
          <div
            id="cv-preview-print"
            className="mx-auto shadow-xl"
            style={{ maxWidth: 794, background: 'white' }}
          >
            <CvDocument profile={profile} showRealName={true} documents={documents} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
