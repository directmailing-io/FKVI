import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      // signIn now eagerly syncs the store — read role synchronously
      const { isAdmin } = useAuthStore.getState()
      if (!isAdmin) {
        await signOut()
        setError('Dieses Konto hat keinen Zugang zum Administrationsbereich.')
        return
      }
      const from = location.state?.from || '/admin'
      navigate(from)
    } catch {
      setError('E-Mail oder Passwort ist falsch.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="FKVI" className="h-28 w-auto mx-auto mb-4" style={{ mixBlendMode: 'multiply' }} />
          <h1 className="text-2xl font-bold text-gray-900">Admin-Login</h1>
          <p className="text-sm text-gray-500 mt-1">FKVI Verwaltungsbereich</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@fkvi.de"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <Link to="/matching/passwort-vergessen" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Passwort vergessen?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Anmelden...</> : 'Anmelden'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
