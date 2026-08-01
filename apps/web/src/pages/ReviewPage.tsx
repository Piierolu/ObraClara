import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EvidencePane } from '../components/EvidencePane'
import { Icon } from '../components/Icon'
import { ErrorState, LoadingState, SeverityBadge, StatusBadge } from '../components/Ui'
import { api } from '../lib/api'
import { downloadCsv, safeFilename } from '../lib/csv'
import { useApi } from '../lib/useApi'
import type { Anomaly, AnomalyStatus, Evidence, Severity } from '../types'

type SeverityFilter = Severity | 'all'

export function ReviewPage() {
  const projectId = useParams().projectId!
  const { data, loading, error, reload } = useApi(() => api.getReview(projectId), [projectId])
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined)
  const [activeEvidence, setActiveEvidence] = useState<string | null>(null)
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const [statusBusy, setStatusBusy] = useState(false)
  const [localStatuses, setLocalStatuses] = useState<Record<string, AnomalyStatus>>({})
  const [mobileEvidence, setMobileEvidence] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  if (loading) return <LoadingState label="Preparando mesa de revisión" />
  if (error || !data) return <ErrorState message={error} retry={reload} />
  const reviewData = data

  const anomalies = reviewData.anomalies.map((item) => ({ ...item, status: localStatuses[item.id] || item.status }))
  const filtered = filter === 'all' ? anomalies : anomalies.filter((item) => item.severity === filter)
  const selected = selectedId === undefined
    ? filtered[0] || anomalies[0]
    : selectedId === null ? undefined : anomalies.find((item) => item.id === selectedId)

  function selectAnomaly(anomaly: Anomaly) {
    setSelectedId(anomaly.id)
    setActiveEvidence(anomaly.evidence[0]?.id || null)
    setMobileEvidence(false)
    setStatusError('')
    setStatusMessage('')
  }

  async function changeStatus(status: AnomalyStatus) {
    if (!selected) return
    setStatusBusy(true)
    setStatusError('')
    setStatusMessage('')
    try {
      await api.updateAnomaly(projectId, selected.id, status)
      setLocalStatuses((current) => ({ ...current, [selected.id]: status }))
      setStatusMessage(`El hallazgo ${selected.code} se actualizó correctamente.`)
    } catch (reason) {
      setStatusError(reason instanceof Error ? reason.message : 'No se pudo actualizar el estado del hallazgo')
    } finally {
      setStatusBusy(false)
    }
  }

  function exportReport() {
    downloadCsv(`hallazgos-${safeFilename(reviewData.project.code)}.csv`, [
      ['Código', 'Título', 'Severidad', 'Estado', 'Categoría', 'Detectado', 'Fuentes'],
      ...anomalies.map((anomaly) => [anomaly.code, anomaly.title, anomaly.severity, anomaly.status, anomaly.category, anomaly.detectedAt, anomaly.evidence.length]),
    ])
  }

  function closeDetail() {
    setSelectedId(null)
    setActiveEvidence(null)
    setMobileEvidence(false)
  }

  return <div className="review-page">
    <header className="workbench-header">
      <div><div className="breadcrumb"><Link to={`/projects/${projectId}`}>{reviewData.project.code}</Link><span>/</span><strong>Revisión</strong></div><h1>Mesa de revisión</h1></div>
      <div className="review-summary"><span><i className="critical-dot" />{anomalies.filter((item) => item.severity === 'critical').length} críticos</span><span>{anomalies.filter((item) => item.status !== 'resolved').length} pendientes</span><button type="button" className="button secondary" onClick={exportReport} disabled={anomalies.length === 0}>Exportar informe CSV</button></div>
    </header>
    <div className={`workbench ${selected ? '' : 'no-selection'}`}>
      <section className="anomaly-column" aria-label="Lista de hallazgos">
        <div className="filter-bar">
          <strong>{filtered.length} hallazgos</strong>
          <div className="filter-pills" role="group" aria-label="Filtrar por severidad">
            {(['all', 'critical', 'high', 'medium', 'low'] as SeverityFilter[]).map((item) => <button type="button" key={item} aria-pressed={filter === item} className={filter === item ? 'active' : ''} onClick={() => { setFilter(item); setSelectedId(undefined) }}>{item === 'all' ? 'Todos' : { critical: 'Críticos', high: 'Altos', medium: 'Medios', low: 'Bajos' }[item]}</button>)}
          </div>
        </div>
        <div className="anomaly-list">
          {filtered.length === 0 && <p className="list-empty">No hay hallazgos con esta severidad.</p>}
          {filtered.map((anomaly) => <button type="button" key={anomaly.id} aria-pressed={selected?.id === anomaly.id} className={`anomaly-card ${selected?.id === anomaly.id ? 'selected' : ''}`} onClick={() => selectAnomaly(anomaly)}>
            <span className="anomaly-top"><SeverityBadge severity={anomaly.severity} /><StatusBadge status={anomaly.status} /></span>
            <strong>{anomaly.title}</strong><p>{anomaly.description}</p>
            <span className="anomaly-meta"><b>{anomaly.code}</b><span>{anomaly.category}</span><span>{anomaly.evidence.length} {anomaly.evidence.length === 1 ? 'fuente' : 'fuentes'}</span></span>
          </button>)}
        </div>
        {selected && <button type="button" className="mobile-evidence-button button primary" onClick={() => setMobileEvidence(true)}><Icon name="link" /> {selected.evidence.length > 0 ? `Ver ${selected.evidence.length} ${selected.evidence.length === 1 ? 'evidencia' : 'evidencias'}` : 'Ver estado de evidencia'}</button>}
      </section>
      {selected && <section className="finding-detail" aria-label="Detalle del hallazgo">
        <div className="finding-detail-head"><div><span className="eyebrow">{selected.code} · {selected.confidence == null ? 'Confianza no informada' : `Confianza ${Math.round(selected.confidence * 100)}%`}</span><h2>{selected.title}</h2></div><button type="button" className="icon-button" aria-label="Cerrar detalle del hallazgo" onClick={closeDetail}><Icon name="close" /></button></div>
        <p className="finding-description">{selected.description}</p>
        <dl className="finding-facts"><div><dt>Detectado</dt><dd>{selected.detectedAt}</dd></div><div><dt>Responsable</dt><dd>{selected.assignee || 'Sin asignar'}</dd></div><div><dt>Categoría</dt><dd>{selected.category}</dd></div></dl>
        <div className="resolution-box"><label htmlFor="finding-status">Estado del hallazgo</label><select id="finding-status" value={selected.status} disabled={statusBusy} onChange={(event) => changeStatus(event.target.value as AnomalyStatus)}><option value="open">Abierto</option><option value="in_review">En revisión</option><option value="resolved">Resuelto</option></select>{statusBusy && <p className="status-feedback" role="status">Actualizando estado…</p>}{statusMessage && <p className="status-feedback success" role="status" aria-live="polite">{statusMessage}</p>}{statusError && <p className="status-feedback error" role="alert">{statusError}</p>}</div>
      </section>}
      {selected && <div className={`review-evidence-wrap ${mobileEvidence ? 'mobile-open' : ''}`}>
        <button type="button" className="close-review-evidence" onClick={() => setMobileEvidence(false)}><Icon name="close" /> Cerrar evidencia</button>
        <EvidencePane evidence={selected.evidence} activeId={activeEvidence} onSelect={(evidence: Evidence) => setActiveEvidence(evidence.id)} />
      </div>}
    </div>
  </div>
}
