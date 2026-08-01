import type { ReactNode } from 'react'
import type { AnomalyStatus, DocumentStatus, Severity } from '../types'
import { Icon } from './Icon'

const severityLabels: Record<Severity, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' }
const statusLabels: Record<AnomalyStatus, string> = { open: 'Abierto', in_review: 'En revisión', resolved: 'Resuelto' }
const documentLabels: Record<DocumentStatus, string> = { uploaded: 'Cargado', processed: 'Analizado', processing: 'Procesando', needs_review: 'Revisar', failed: 'Error' }

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge severity-${severity}`}><span className="badge-dot" />{severityLabels[severity]}</span>
}

export function StatusBadge({ status }: { status: AnomalyStatus }) {
  return <span className={`badge status-${status}`}>{status === 'resolved' && <Icon name="check" />}{statusLabels[status]}</span>
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`document-status document-${status}`}><span />{documentLabels[status]}</span>
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header">
    <div>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
}

export function LoadingState({ label = 'Cargando información' }: { label?: string }) {
  return <div className="state-panel" role="status"><span className="loader" /><strong>{label}</strong><span>Estamos organizando la documentación.</span></div>
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="state-panel state-error" role="alert"><Icon name="alert" /><strong>No pudimos cargar esta vista</strong><span>{message}</span><button className="button secondary" onClick={retry}>Reintentar</button></div>
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="state-panel"><span className="empty-mark"><Icon name="file" /></span><strong>{title}</strong><span>{text}</span>{action}</div>
}
