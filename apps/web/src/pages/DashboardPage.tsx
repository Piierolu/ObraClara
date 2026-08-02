import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Ui'
import { api, isDemoMode } from '../lib/api'
import { PROJECTS_CHANGED_EVENT, SELECTED_PROJECT_KEY } from '../lib/projectSelection'
import { useApi } from '../lib/useApi'
import type { CreateProjectInput, Project } from '../types'

export function DashboardPage() {
  const { data, loading, error, reload } = useApi(() => api.getDashboard(), [])
  const [creating, setCreating] = useState(false)
  const newProjectButton = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  if (loading) return <LoadingState label="Cargando cartera de proyectos" />
  if (error || !data) return <ErrorState message={error} retry={reload} />

  const metrics = [
    { label: 'Proyectos', value: data.metrics.activeProjects, note: 'En la organización', tone: 'neutral' },
    { label: 'Documentos revisados', value: data.metrics.documentsReviewed.toLocaleString('es-ES'), note: 'Procesados', tone: 'positive' },
    { label: 'Hallazgos abiertos', value: data.metrics.openFindings, note: 'Pendientes de revisión', tone: 'warning' },
    { label: 'Críticos', value: data.metrics.criticalFindings ?? '—', note: data.metrics.criticalFindings == null ? 'Sin desglose en resumen' : 'Acción prioritaria', tone: 'danger' },
  ]

  function handleCreated(project: Project) {
    setCreating(false)
    localStorage.setItem(SELECTED_PROJECT_KEY, project.id)
    reload()
    window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT))
    navigate(`/projects/${project.id}`)
  }

  const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return <div className="page dashboard-page">
    <PageHeader eyebrow={today} title="Control de proyectos" description="Visión documental y riesgos de tu cartera activa." actions={<button ref={newProjectButton} type="button" className="button secondary" onClick={() => setCreating(true)}><span className="button-plus">+</span> Nuevo proyecto</button>} />
    <section className="metric-grid" aria-label="Resumen de cartera">
      {metrics.map((metric, index) => <article className={`metric-card ${metric.tone}`} key={metric.label}>
        <span className="metric-number">0{index + 1}</span><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small>
      </article>)}
    </section>
    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">Cartera activa</span><h2>Proyectos recientes</h2></div><span className="muted">{isDemoMode ? 'Datos simulados para la demo' : 'Datos actuales del servidor'}</span></div>
      <div className="project-table" aria-label="Proyectos recientes">
        <div className="project-row table-head"><span>Proyecto</span><span>Avance</span><span>Documentos</span><span>Hallazgos</span><span>Actividad</span><span /></div>
        {data.projects.length === 0 && <EmptyState title="Aún no hay proyectos" text="Crea el primer proyecto para organizar su expediente documental." action={<button type="button" className="button primary" onClick={() => setCreating(true)}>Crear proyecto</button>} />}
        {data.projects.map((project) => <Link to={`/projects/${project.id}`} className="project-row" key={project.id}>
          <span className="project-cell"><i className={`project-signal ${project.status}`} /><span><strong>{project.name}</strong><small>{project.code} · {project.location}</small></span></span>
          <span className="progress-cell"><span className="progress-label"><strong>{project.progress}%</strong><small>ejecutado</small></span><span className="progress-track"><i style={{ width: `${project.progress}%` }} /></span></span>
          <span className="number-cell"><strong>{project.documentCount ?? '—'}</strong><small>{project.documentCount == null ? 'ver expediente' : 'archivos'}</small></span>
          <span className="finding-cell"><strong>{project.openAnomalies ?? '—'}</strong><small>{project.openAnomalies == null ? 'ver revisión' : 'abiertos'}</small>{project.criticalAnomalies != null && project.criticalAnomalies > 0 && <b>{project.criticalAnomalies} críticos</b>}</span>
          <span className="activity-cell">{project.lastActivity}</span><span className="row-arrow"><Icon name="chevron" /></span>
        </Link>)}
      </div>
    </section>
    {creating && <NewProjectDialog onClose={() => { setCreating(false); newProjectButton.current?.focus() }} onCreated={handleCreated} />}
  </div>
}

export function NewProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (project: Project) => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'))
      const first = controls[0]
      const last = controls.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleDialogKeys)
    return () => window.removeEventListener('keydown', handleDialogKeys)
  }, [onClose, submitting])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: CreateProjectInput = {
      name: String(form.get('name') || '').trim(),
      code: String(form.get('code') || '').trim(),
      location: String(form.get('location') || '').trim(),
      contractAmount: Number(form.get('contractAmount')),
    }
    setSubmitting(true)
    setError('')
    try {
      onCreated(await api.createProject(input))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear el proyecto')
      setSubmitting(false)
    }
  }

  return <div className="dialog-backdrop">
    <section ref={dialogRef} className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="new-project-title" aria-describedby="new-project-description">
      <div className="dialog-heading"><div><span className="eyebrow">Nueva obra</span><h2 id="new-project-title">Crear proyecto</h2></div><button type="button" className="icon-button" aria-label="Cerrar creación de proyecto" onClick={onClose} disabled={submitting}><Icon name="close" /></button></div>
      <p id="new-project-description">Identifica el proyecto y registra su importe contractual inicial.</p>
      <form onSubmit={submit}>
        <label>Nombre del proyecto<input autoFocus name="name" required maxLength={160} autoComplete="organization" /></label>
        <div className="form-grid">
          <label>Código<input name="code" required maxLength={60} autoComplete="off" /></label>
          <label>Ubicación<input name="location" required maxLength={200} autoComplete="address-level2" /></label>
        </div>
        <label>Importe contractual (EUR)<input name="contractAmount" type="number" required min="0.01" step="0.01" inputMode="decimal" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose} disabled={submitting}>Cancelar</button><button className="button primary" disabled={submitting}>{submitting ? 'Creando…' : 'Crear proyecto'}</button></div>
      </form>
    </section>
  </div>
}
