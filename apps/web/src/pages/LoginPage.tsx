import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { isDemoMode } from '../lib/api'

export function LoginPage() {
  const { authenticated, loginDemo } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (authenticated) return <Navigate to="/" replace />

  async function enterDemo() {
    setLoading(true)
    setError('')
    try {
      await loginDemo()
      navigate('/')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar la sesión')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-page" id="main-content" tabIndex={-1}>
    <section className="login-story">
      <div className="login-brand"><span className="brand-mark light"><i /><i /><i /></span>Obra<strong>Clara</strong></div>
      <div className="story-copy">
        <span className="story-index">01 / CONTROL DOCUMENTAL</span>
        <h1>Cada decisión de obra,<br /><em>con su evidencia.</em></h1>
        <p>Detecta desviaciones entre contratos, certificaciones y planos. Revisa cada hallazgo sobre la fuente original.</p>
      </div>
      <div className="blueprint" aria-hidden="true"><span /><span /><span /><b>PLANTA B2</b></div>
      <div className="story-proof"><strong>Fuente</strong><span>cada respuesta enlazada<br />a su evidencia</span></div>
    </section>
    <section className="login-panel">
      <div className="login-box">
        <span className="eyebrow">Acceso seguro</span>
        <h2>Entra a tu espacio de obra</h2>
        <p className="login-intro">{isDemoMode ? 'Explora el flujo completo en un entorno de demostración con datos identificados como simulados.' : 'Accede al entorno privado de control documental de tu organización.'}</p>
        <button className="button primary login-button" onClick={enterDemo} disabled={loading}>
          {loading ? <span className="loader small" /> : <span className="demo-monogram">DC</span>}
          <span><strong>{loading ? 'Preparando el espacio…' : 'Entrar a la demo'}</strong><small>{isDemoMode ? 'Datos locales, sin configuración' : 'Acceso temporal mediante API'}</small></span>
          {!loading && <Icon name="arrow" />}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="security-note"><Icon name="check" /><span>{isDemoMode ? 'Entorno aislado. Los datos de demostración no contienen información real.' : 'Sesión privada. Si la credencial no es válida, se eliminará automáticamente.'}</span></div>
        <p className="login-help">¿Tu organización ya usa ObraClara? <a href="mailto:acceso@obraclara.es">Solicita acceso</a></p>
      </div>
      <footer>ObraClara MVP · Trazabilidad documental para construcción</footer>
    </section>
  </main>
}
