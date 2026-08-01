import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { DocumentStatusBadge, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

export function ProjectPage() {
  const projectId = useParams().projectId!
  const { data, loading, error, reload } = useApi(() => api.getProject(projectId), [projectId])
  const [uploading, setUploading] = useState(false)
  const [operationMessage, setOperationMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File | undefined) {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setOperationError('El archivo supera el límite de 20 MB.')
      return
    }
    setUploading(true)
    setOperationMessage('')
    setOperationError('')
    try {
      await api.uploadDocument(projectId, file)
      setOperationMessage(`${file.name} se cargó correctamente. Ya puedes iniciar o repetir su análisis.`)
      reload()
    } catch (reason) {
      setOperationError(reason instanceof Error ? reason.message : 'No se pudo cargar el documento')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    void uploadFile(event.target.files?.[0])
  }

  async function reprocess(documentId: string, documentName: string) {
    setProcessingId(documentId)
    setOperationMessage('')
    setOperationError('')
    try {
      await api.processDocument(documentId)
      setOperationMessage(`Se inició el análisis de ${documentName}.`)
      reload()
    } catch (reason) {
      setOperationError(reason instanceof Error ? reason.message : 'No se pudo iniciar el análisis del documento')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <LoadingState label="Abriendo el expediente de obra" />
  if (error || !data) return <ErrorState message={error} retry={reload} />

  const normalizedQuery = query.trim().toLocaleLowerCase('es-ES')
  const documents = normalizedQuery
    ? data.documents.filter((document) => `${document.name} ${document.type} ${document.status}`.toLocaleLowerCase('es-ES').includes(normalizedQuery))
    : data.documents

  return <div className="page project-page">
    <div className="breadcrumb"><Link to="/">Proyectos</Link><span>/</span><strong>{data.code}</strong></div>
    <PageHeader eyebrow={data.code} title={data.name} description={`${data.location} · Alta ${data.startDate}`} actions={<><Link className="button secondary" to={`/projects/${projectId}/questions`}><Icon name="search" /> Consultar</Link><Link className="button primary" to={`/projects/${projectId}/review`}>Abrir revisión <Icon name="arrow" /></Link></>} />
    <section className="project-strip">
      <div><span>Avance de obra</span><strong>{data.progress}%</strong><span className="strip-progress"><i style={{ width: `${data.progress}%` }} /></span></div>
      <div><span>Presupuesto</span><strong>{data.budget}</strong><small>contratado</small></div>
      <div><span>Documentación</span><strong>{data.documentCount ?? '—'}</strong><small>{data.documentCount == null ? 'sin recuento' : 'archivos'}</small></div>
      <div className="risk-strip"><span>Riesgo abierto</span><strong>{data.openAnomalies ?? '—'}</strong><small>{data.criticalAnomalies == null ? 'sin desglose crítico' : `${data.criticalAnomalies} críticos`}</small></div>
    </section>
    <section className="documents-layout">
      <div className="document-list-card">
        <div className="section-heading compact"><div><span className="eyebrow">Expediente digital</span><h2>Documentos</h2></div><div className="document-tools"><label className="search-field"><Icon name="search" /><input type="search" aria-label="Buscar documentos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar archivo…" /></label><button type="button" className="button primary" onClick={() => inputRef.current?.click()} disabled={uploading}><Icon name="upload" />{uploading ? 'Cargando…' : 'Subir'}</button><input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={handleFile} /></div></div>
        {operationMessage && <div className="inline-notice success" role="status" aria-live="polite"><Icon name="check" />{operationMessage}</div>}
        {operationError && <div className="inline-notice error" role="alert"><Icon name="alert" />{operationError}</div>}
        {data.documents.length === 0 ? <EmptyState title="Expediente vacío" text="Sube el primer contrato, certificación o plano para empezar." /> : documents.length === 0 ? <EmptyState title="Sin documentos coincidentes" text="Prueba otra búsqueda por nombre, tipo o estado." /> : <div className="document-table">
          <div className="document-row document-head"><span>Nombre</span><span>Tipo</span><span>Estado</span><span>Carga</span><span>Acción</span></div>
          {documents.map((document) => <div className="document-row" key={document.id}>
            <span className="file-cell"><span className="file-icon">{document.name.split('.').pop()?.toUpperCase()}</span><span><strong>{document.name}</strong><small>{[document.version, document.size, document.pages == null ? null : `${document.pages} págs.`].filter(Boolean).join(' · ')}</small></span></span>
            <span>{document.type}</span><span><DocumentStatusBadge status={document.status} /></span><span className="upload-cell"><strong>{document.uploadedBy}</strong><small>{document.uploadedAt}</small></span><button type="button" className="reprocess-button" aria-label={`Reprocesar ${document.name}`} disabled={processingId !== null || uploading} onClick={() => reprocess(document.id, document.name)}>{processingId === document.id ? 'Iniciando…' : 'Reprocesar'}</button>
          </div>)}
        </div>}
      </div>
      <aside className="upload-card" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFile(event.dataTransfer.files[0]) }}>
        <span className="upload-illustration"><Icon name="upload" /></span><h3>Incorpora documentación</h3><p>Arrastra archivos para contrastarlos con el expediente del proyecto.</p><button type="button" className="text-button" onClick={() => inputRef.current?.click()} disabled={uploading}>Seleccionar archivos <Icon name="arrow" /></button><small>PDF con texto o TXT · Máx. 20 MB</small>
      </aside>
    </section>
  </div>
}
