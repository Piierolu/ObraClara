import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Ui'
import { api } from '../lib/api'
import { downloadCsv, safeFilename } from '../lib/csv'
import { useApi } from '../lib/useApi'
import type { AuditEvent } from '../types'

const kindIcon: Record<AuditEvent['kind'], IconName> = { document: 'file', finding: 'review', access: 'search', system: 'check' }

export function AuditPage() {
  const projectId = useParams().projectId!
  const { data, loading, error, reload } = useApi(async () => {
    const [events, project] = await Promise.all([api.getAudit(projectId), api.getProjectSummary(projectId)])
    return { events, project }
  }, [projectId])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<AuditEvent['kind'] | 'all'>('all')
  const [days, setDays] = useState<'all' | '7' | '30' | '90'>('all')

  if (loading) return <LoadingState label="Reconstruyendo historial de auditoría" />
  if (error || !data) return <ErrorState message={error} retry={reload} />
  const auditData = data

  const cutoff = days === 'all' ? null : Date.now() - Number(days) * 24 * 60 * 60 * 1000
  const events = auditData.events.filter((event) => {
    const matchesQuery = `${event.action} ${event.detail} ${event.actor}`.toLocaleLowerCase('es-ES').includes(query.toLocaleLowerCase('es-ES'))
    const matchesKind = kind === 'all' || event.kind === kind
    const eventTime = event.occurredAt ? new Date(event.occurredAt).getTime() : Number.NaN
    const matchesDate = cutoff === null || (Number.isFinite(eventTime) && eventTime >= cutoff)
    return matchesQuery && matchesKind && matchesDate
  })
  const hashesAvailable = auditData.events.length > 0 && auditData.events.every((event) => event.hash !== '—')

  function exportEvents() {
    downloadCsv(`auditoria-${safeFilename(auditData.project.code)}.csv`, [
      ['Fecha y hora', 'Tipo', 'Evento', 'Detalle', 'Responsable', 'Huella'],
      ...events.map((event) => [event.timestamp, event.kind, event.action, event.detail, event.actor, event.hash === '—' ? '' : event.hash]),
    ])
  }

  return <div className="page audit-page">
    <div className="breadcrumb"><Link to={`/projects/${projectId}`}>{auditData.project.name || auditData.project.code}</Link><span>/</span><strong>Auditoría</strong></div>
    <PageHeader eyebrow="Registro de actividad" title="Historial de actividad" description="Trazabilidad cronológica de documentos, revisiones y accesos del proyecto." actions={<button type="button" className="button secondary" onClick={exportEvents} disabled={events.length === 0}>Exportar CSV</button>} />
    <section className="audit-integrity"><span className="integrity-icon"><Icon name="check" /></span><div><strong>{hashesAvailable ? 'Integridad del registro verificada' : 'Registro proporcionado por el servidor'}</strong><p>{hashesAvailable ? 'Todos los eventos conservan su huella de origen.' : 'La API actual no expone huellas criptográficas para estos eventos.'}</p></div><span className="integrity-status">{hashesAvailable ? 'HUELLAS DISPONIBLES' : 'SIN HUELLA EXPUESTA'}</span></section>
    <section className="audit-card">
      <div className="audit-tools"><label className="search-field"><Icon name="search" /><input type="search" aria-label="Buscar en auditoría" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar acción, archivo o persona…" /></label><label className="audit-filter"><span>Tipo de evento</span><select value={kind} onChange={(event) => setKind(event.target.value as AuditEvent['kind'] | 'all')}><option value="all">Todos los eventos</option><option value="document">Documentos</option><option value="finding">Hallazgos</option><option value="access">Consultas y accesos</option><option value="system">Sistema</option></select></label><label className="audit-filter"><span>Periodo</span><select value={days} onChange={(event) => setDays(event.target.value as 'all' | '7' | '30' | '90')}><option value="all">Todo el historial</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></label></div>
      {events.length === 0 ? <EmptyState title="Sin resultados" text="Prueba con otro archivo, acción o responsable." /> : <div className="audit-list">
        <div className="audit-row audit-head"><span>Fecha y hora</span><span>Evento</span><span>Responsable</span><span>Huella</span></div>
        {events.map((event) => <div className="audit-row" key={event.id}>
          <time dateTime={event.occurredAt || undefined}>{event.timestamp}</time><span className="audit-event"><i className={`audit-kind ${event.kind}`}><Icon name={kindIcon[event.kind]} /></i><span><strong>{event.action}</strong><small>{event.detail}</small></span></span><span className="audit-actor"><i>{event.actor.split(' ').map((word) => word[0]).join('').slice(0, 2)}</i>{event.actor}</span><code>{event.hash}</code>
        </div>)}
      </div>}
    </section>
  </div>
}
