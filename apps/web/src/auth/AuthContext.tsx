import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, TOKEN_KEY, UNAUTHORIZED_EVENT } from '../lib/api'

interface AuthValue {
  authenticated: boolean
  loginDemo: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    const clearInvalidSession = () => setToken(null)
    window.addEventListener(UNAUTHORIZED_EVENT, clearInvalidSession)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, clearInvalidSession)
  }, [])

  async function loginDemo() {
    const response = await api.loginDemo()
    localStorage.setItem(TOKEN_KEY, response.token)
    setToken(response.token)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }

  return <AuthContext.Provider value={{ authenticated: Boolean(token), loginDemo, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return value
}
