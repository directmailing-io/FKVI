import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Toaster } from '@/components/ui/toaster'
import { AdminRoute, CompanyRoute } from '@/components/layout/ProtectedRoute'
import AdminLayout from '@/components/layout/AdminLayout'

// Admin pages
import AdminLogin from '@/pages/admin/AdminLogin'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import ProfileList from '@/pages/admin/ProfileList'
import ProfileForm from '@/pages/admin/ProfileForm'
import LeadManagement from '@/pages/admin/LeadManagement'
import CRMPage from '@/pages/admin/CRMPage'
import CompanyDetailPage from '@/pages/admin/CompanyDetailPage'
import VermittlungenPage from '@/pages/admin/VermittlungenPage'
import VermittlungDetailPage from '@/pages/admin/VermittlungDetailPage'
import BrochuerePage from '@/pages/admin/BrochuerePage'

// Public pages
import PublicHome from '@/pages/public/PublicHome'
import ContactPage from '@/pages/public/ContactPage'
import CvPage from '@/pages/public/CvPage'
import CvSharePage from '@/pages/public/CvSharePage'
import DownloadsPage from '@/pages/public/DownloadsPage'
import BrochureAccessPage from '@/pages/public/BrochureAccessPage'
import BeratungPage from '@/pages/public/BeratungPage'

// Matching pages
import MatchingLogin from '@/pages/matching/MatchingLogin'
import MatchingBrowse from '@/pages/matching/MatchingBrowse'
import ReservedProfiles from '@/pages/matching/ReservedProfiles'
import StatustrackerDetail from '@/pages/matching/StatustrackerDetail'
import ReservationCvPage from '@/pages/matching/ReservationCvPage'
import MatchingLayout from '@/components/layout/MatchingLayout'
import SetupPasswordPage from '@/pages/matching/SetupPasswordPage'
import ForgotPasswordPage from '@/pages/matching/ForgotPasswordPage'

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  // Safety net: Radix UI sets pointer-events:none on document.body when a
  // dialog opens. If a dialog is force-unmounted (e.g. via a stale animation
  // race), this style can get stuck. Restore it whenever the tab regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        requestAnimationFrame(() => {
          const hasOpenDialog = !!document.querySelector('[role="dialog"][data-state="open"]')
          if (!hasOpenDialog) {
            document.body.style.removeProperty('pointer-events')
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/lebenslauf/:id" element={<CvPage />} />
        <Route path="/lebenslauf/share/:token" element={<CvSharePage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/downloads/zugang/:token" element={<BrochureAccessPage />} />
        <Route path="/beratung" element={<BeratungPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
        <Route path="/admin/fachkraefte" element={<AdminRoute><AdminLayout><ProfileList /></AdminLayout></AdminRoute>} />
        <Route path="/admin/fachkraefte/:id" element={<AdminRoute><AdminLayout><ProfileForm /></AdminLayout></AdminRoute>} />
        <Route path="/admin/leads" element={<AdminRoute><AdminLayout><LeadManagement /></AdminLayout></AdminRoute>} />
        <Route path="/admin/crm" element={<AdminRoute><AdminLayout><CRMPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/crm/:id" element={<AdminRoute><AdminLayout><CompanyDetailPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/vermittlungen" element={<AdminRoute><AdminLayout><VermittlungenPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/vermittlungen/:id" element={<AdminRoute><AdminLayout><VermittlungDetailPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/broschuere" element={<AdminRoute><AdminLayout><BrochuerePage /></AdminLayout></AdminRoute>} />

        {/* Matching */}
        <Route path="/matching/login" element={<MatchingLogin />} />
        <Route path="/matching/konto-einrichten" element={<SetupPasswordPage />} />
        <Route path="/matching/passwort-vergessen" element={<ForgotPasswordPage />} />
        <Route path="/matching" element={<CompanyRoute><MatchingLayout><MatchingBrowse /></MatchingLayout></CompanyRoute>} />
        <Route path="/matching/reserviert" element={<CompanyRoute><MatchingLayout><ReservedProfiles /></MatchingLayout></CompanyRoute>} />
        <Route path="/matching/reserviert/:id" element={<CompanyRoute><MatchingLayout><StatustrackerDetail /></MatchingLayout></CompanyRoute>} />
        <Route path="/matching/reserviert/:id/lebenslauf" element={<CompanyRoute><ReservationCvPage /></CompanyRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
