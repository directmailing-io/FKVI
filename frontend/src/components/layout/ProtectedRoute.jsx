import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuthStore()
  const location = useLocation()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
  if (!user || !isAdmin) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  return children
}

export function CompanyRoute({ children }) {
  const { user, isAdmin, companyId, loading } = useAuthStore()
  const location = useLocation()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
  if (!user || !companyId) return <Navigate to="/matching/login" state={{ from: location.pathname }} replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return children
}
