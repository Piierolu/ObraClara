import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, isDemoMode } from '../lib/api'
import { useApi } from '../lib/useApi'
import { getRouteProjectId, PROJECTS_CHANGED_EVENT, resolveProjectId, SELECTED_PROJECT_KEY } from '../lib/projectSelection'
import { Icon, type IconName } from './Icon'

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: projects, loading, error, reload } = useApi(() => api.getProjects(), [])
  const storedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY)
  const projectId = projects ? resolveProjectId(location.pathname, projects, storedProjectId) : null
  const routeProjectId = getRouteProjectId(location.pathname)
  const projectNav: { suffix: string; label: string; icon: IconName; end?: boolean }[] = [
    { suffix: '', label: 'Documentos', icon: 'folder', end: true },
    { suffix: '/review', label: 'Revisión', icon: 'review' },
    { suffix: '/questions', label: 'Consultar', icon: 'search' },
    { suffix: '/audit', label: 'Auditoría', icon: 'audit' },
  ]

  useEffect(() => {
    if (projectId) localStorage.setItem(SELECTED_PROJECT_KEY, projectId)
    else if (projects && projects.length === 0) localStorage.removeItem(SELECTED_PROJECT_KEY)
  }, [projectId, projects])

  useEffect(() => {
    if (!projects || !routeProjectId || !projectId || routeProjectId === projectId || routeProjectId === storedProjectId) return
    const suffix = location.pathname.slice(`/projects/${routeProjectId}`.length)
    navigate(`/projects/${projectId}${suffix}`, { replace: true })
  }, [location.pathname, navigate, projectId, projects, routeProjectId, storedProjectId])

  useEffect(() => {
    window.addEventListener(PROJECTS_CHANGED_EVENT, reload)
    return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, reload)
  }, [reload])

  return <div className="app-shell">
    <header className="mobile-header">
      <Brand />
      <button type="button" className="icon-button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen((value) => !value)}><Icon name={open ? 'close' : 'menu'} /></button>
    </header>
    {open && <button type="button" className="nav-scrim" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <Brand />
      <div className={`workspace-label ${isDemoMode ? 'demo-workspace' : ''}`}>
        <span>{isDemoMode ? 'Demo pública' : 'Espacio de trabajo'}</span>
        <strong>Cartera ObraClara</strong>
        {isDemoMode && <small>Datos simulados · <a href="https://github.com/Piierolu/ObraClara" target="_blank" rel="noreferrer">Ver código</a></small>}
      </div>
      <nav aria-label="Navegación principal" aria-busy={loading}>
        <NavLink to="/" end onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon name="grid" /><span>Proyectos</span></NavLink>
        {projectId && projectNav.map((item) => {
          const to = `/projects/${projectId}${item.suffix}`
          return <NavLink key={item.suffix} to={to} end={item.end} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon name={item.icon} /><span>{item.label}</span>
          </NavLink>
        })}
        {!projectId && !loading && !error && projectNav.map((item) => <span className="nav-disabled" aria-disabled="true" title="Crea un proyecto para activar esta sección" key={item.suffix}>
          <Icon name={item.icon} /><span>{item.label}</span>
        </span>)}
        {!projectId && <p className="project-nav-note" role="status">{loading ? 'Cargando proyectos…' : error ? 'No se pudieron cargar los proyectos.' : 'Crea un proyecto para activar estas secciones.'}</p>}
      </nav>
      <div className="sidebar-foot">
        <div className="user-avatar">OC</div><div><strong>Sesión activa</strong><span>Acceso privado</span></div>
        <button type="button" aria-label="Cerrar sesión" onClick={logout}><Icon name="logout" /></button>
      </div>
    </aside>
    <main className="main-content" id="main-content" tabIndex={-1}><Outlet /></main>
  </div>
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>Obra<strong>Clara</strong></span></div>
}
