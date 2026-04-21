import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Building2, LogOut, Menu, X, ChevronRight, Briefcase, Activity, BookOpen, Library, Inbox } from 'lucide-react'

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [activeVermittlungen, setActiveVermittlungen] = useState(0)
  const [postfachCount, setPostfachCount] = useState(0)
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 60_000)
    return () => clearInterval(interval)
  }, [])

  const fetchCounts = async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [pendingRes, vermittlungRes, postfachRes] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).lt('process_status', 11),
      supabase.from('document_sends').select('id', { count: 'exact', head: true })
        .in('status', ['signed', 'submitted'])
        .gte('signed_at', sevenDaysAgo),
    ])
    setPendingCount(pendingRes.count || 0)
    setActiveVermittlungen(vermittlungRes.count || 0)
    setPostfachCount(postfachRes.count || 0)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const navItems = [
    { label: 'Dashboard',        icon: LayoutDashboard, href: '/admin' },
    { label: 'Fachkräfte',       icon: Users,            href: '/admin/fachkraefte' },
    { label: 'CRM / Firmen',     icon: Briefcase,        href: '/admin/crm' },
    { label: 'Vermittlungen',    icon: Activity,         href: '/admin/vermittlungen', badge: activeVermittlungen },
    { label: 'Freigabezentrale', icon: Building2,        href: '/admin/leads', badge: pendingCount },
    { label: 'Broschüre',        icon: BookOpen,         href: '/admin/broschuere' },
    { label: 'Dokumentenmediathek', icon: Library,        href: '/admin/mediathek' },
    { label: 'Postfach',         icon: Inbox,            href: '/admin/postfach', badge: postfachCount },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-fkvi-blue flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-white/10 relative">
          <button className="lg:hidden text-white/70 hover:text-white absolute top-4 right-4" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
          <div className="w-40 h-40 bg-white rounded-3xl flex items-center justify-center p-3 shadow-lg">
            <img src="/logo.svg" alt="FKVI" className="w-full h-full object-contain" />
          </div>
          <span className="text-white/60 text-[11px] font-semibold tracking-widest uppercase mt-3">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.href ||
              (item.href !== '/admin' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {active && !item.badge && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.email}</p>
              <p className="text-white/50 text-xs">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 relative">
            <Menu className="h-6 w-6" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
          <img src="/logo.svg" alt="FKVI" className="h-10 w-auto" style={{ mixBlendMode: 'multiply' }} />
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
