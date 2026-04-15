import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MultiSelect({ options = [], value = [], onChange, placeholder = "Auswählen..." }) {
  const [open, setOpen] = useState(false)

  const toggle = (option) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div className="relative">
      <div
        className="min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer flex flex-wrap gap-1 items-center"
        onClick={() => setOpen(!open)}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          value.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
              {v}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(v) }}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", open && "rotate-180")} />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md max-h-56 overflow-y-auto">
            {options.map(option => (
              <div
                key={option}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors flex items-center gap-2",
                  value.includes(option) && "bg-primary/5 font-medium"
                )}
                onClick={() => toggle(option)}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  value.includes(option) ? "bg-primary border-primary" : "border-input"
                )}>
                  {value.includes(option) && <span className="text-white text-xs">✓</span>}
                </div>
                {option}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
