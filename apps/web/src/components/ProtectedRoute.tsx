import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AppShell } from './AppShell'

export function ProtectedRoute() {
  const { authenticated } = useAuth()
  return authenticated ? <AppShell /> : <Navigate to="/login" replace />
}
