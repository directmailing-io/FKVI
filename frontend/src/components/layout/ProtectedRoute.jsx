import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
  if (!user) return <Navigate to="/admin/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export function CompanyRoute({ children }) {
  const { user, isAdmin, companyId, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
  if (!user) return <Navigate to="/matching/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (!companyId) return <Navigate to="/matching/login" replace />
  return children
}
