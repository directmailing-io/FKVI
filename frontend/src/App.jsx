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

// Public pages
import PublicHome from '@/pages/public/PublicHome'
import ContactPage from '@/pages/public/ContactPage'

// Matching pages
import MatchingLogin from '@/pages/matching/MatchingLogin'
import MatchingBrowse from '@/pages/matching/MatchingBrowse'
import ReservedProfiles from '@/pages/matching/ReservedProfiles'
import MatchingLayout from '@/components/layout/MatchingLayout'

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/kontakt" element={<ContactPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
        <Route path="/admin/fachkraefte" element={<AdminRoute><AdminLayout><ProfileList /></AdminLayout></AdminRoute>} />
        <Route path="/admin/fachkraefte/:id" element={<AdminRoute><AdminLayout><ProfileForm /></AdminLayout></AdminRoute>} />
        <Route path="/admin/leads" element={<AdminRoute><AdminLayout><LeadManagement /></AdminLayout></AdminRoute>} />
        <Route path="/admin/crm" element={<AdminRoute><AdminLayout><CRMPage /></AdminLayout></AdminRoute>} />
        <Route path="/admin/crm/:id" element={<AdminRoute><AdminLayout><CompanyDetailPage /></AdminLayout></AdminRoute>} />

        {/* Matching */}
        <Route path="/matching/login" element={<MatchingLogin />} />
        <Route path="/matching" element={<CompanyRoute><MatchingLayout><MatchingBrowse /></MatchingLayout></CompanyRoute>} />
        <Route path="/matching/reserviert" element={<CompanyRoute><MatchingLayout><ReservedProfiles /></MatchingLayout></CompanyRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
