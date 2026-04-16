import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Search, Activity, LogOut, Menu, X, ChevronRight, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const navItems = [
  { label: 'Matching-Plattform', icon: Search,    href: '/matching',            live: false },
  { label: 'Statustracker',      icon: Activity,  href: '/matching/reserviert', live: true  },
]

function PasswordStrength({ password }) {
  const checks = [
    { label: 'Mindestens 8 Zeichen',  ok: password.length >= 8 },
    { label: 'Großbuchstabe (A–Z)',    ok: /[A-Z]/.test(password) },
    { label: 'Zahl oder Sonderzeichen', ok: /[0-9!@#$%^&*()_+\-=]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const bar = ['bg-red-400', 'bg-amber-400', 'bg-green-500'][score - 1] || 'bg-gray-200'
  if (!password) return null
  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? bar : 'bg-gray-200'}`} />
        ))}
      </div>
      <div className="space-y-0.5">
        {checks.map(c => (
          <p key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${c.ok ? 'bg-green-500' : 'bg-gray-200'}`} />
            {c.label}
          </p>
        ))}
      </div>
    </div>
  )
}

function ChangePasswordDialog({ open, onClose }) {
  const [pw, setPw]       = useState('')
  const [cf, setCf]       = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState(false)

  const isStrong = pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9!@#$%^&*()_+\-=]/.test(pw)

  const handleClose = () => { setPw(''); setCf(''); setError(''); setDone(false); onClose() }

  const handleSave = async (e) => {
    e.preventDefault()
    if (pw !== cf) { setError('Passwörter stimmen nicht überein.'); return }
    if (!isStrong) { setError('Bitte wähle ein stärkeres Passwort.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: pw })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-fkvi-blue" />Passwort ändern
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium text-gray-900">Passwort erfolgreich geändert!</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 py-2">
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Neues Passwort</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} value={pw}
                  onChange={e => setPw(e.target.value)} placeholder="Mindestens 8 Zeichen"
                  className="pr-10" required autoFocus />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={pw} />
            </div>

            <div className="space-y-1.5">
              <Label>Passwort bestätigen</Label>
              <div className="relative">
                <Input type={showCf ? 'text' : 'password'} value={cf}
                  onChange={e => setCf(e.target.value)} placeholder="Passwort wiederholen"
                  className="pr-10" required />
                <button type="button" tabIndex={-1} onClick={() => setShowCf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {cf.length > 0 && (
                <p className={`text-xs ${pw === cf ? 'text-green-600' : 'text-red-500'}`}>
                  {pw === cf ? '✓ Passwörter stimmen überein' : 'Passwörter stimmen nicht überein'}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>Abbrechen</Button>
              <Button type="submit" disabled={loading || !isStrong || pw !== cf}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Speichern…</> : 'Passwort speichern'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function MatchingLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/matching/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-gray-100 relative">
          <button className="lg:hidden text-gray-400 hover:text-gray-600 absolute top-4 right-4" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
          <img src="/logo.svg" alt="FKVI" className="w-40 h-40 object-contain" style={{ mixBlendMode: 'multiply' }} />
          <span className="text-gray-400 text-[11px] font-semibold tracking-widest uppercase mt-2">Mitgliederbereich</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.href ||
              (item.href !== '/matching' && location.pathname.startsWith(item.href))
            return (
              <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-fkvi-blue/10 text-fkvi-blue" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {item.live && (
                  <span className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-green-600">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    Live
                  </span>
                )}
                {active && <ChevronRight className="h-3 w-3 ml-auto text-fkvi-blue" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-fkvi-blue/10 flex items-center justify-center text-fkvi-blue text-sm font-semibold shrink-0">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 text-sm font-medium truncate">{user?.email}</p>
              <p className="text-gray-400 text-xs">Unternehmen</p>
            </div>
          </div>
          <button onClick={() => setChangePwOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm transition-colors">
            <KeyRound className="h-4 w-4" />Passwort ändern
          </button>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm transition-colors">
            <LogOut className="h-4 w-4" />Abmelden
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Menu className="h-6 w-6" />
          </button>
          <img src="/logo.svg" alt="FKVI" className="h-10 w-auto" style={{ mixBlendMode: 'multiply' }} />
        </header>
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>

      <ChangePasswordDialog open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </div>
  )
}
