import type { Evidence } from '../types'
import { Icon } from './Icon'

interface EvidencePaneProps {
  evidence: Evidence[]
  activeId: string | null
  onSelect: (evidence: Evidence) => void
  title?: string
}

export function EvidencePane({ evidence, activeId, onSelect, title = 'Evidencia verificable' }: EvidencePaneProps) {
  if (!evidence.length) {
    return <aside className="evidence-pane empty-evidence" aria-label={title} role="status"><Icon name="link" /><strong>Sin evidencia vinculada</strong><p>La API no aportó una cita documental verificable para este elemento.</p></aside>
  }

  const active = evidence.find((item) => item.id === activeId) || evidence[0]

  return <aside className="evidence-pane" aria-label={title}>
    <div className="evidence-heading">
      <div><span className="eyebrow">Trazabilidad</span><h2>{title}</h2></div>
      <span className="source-count">{evidence.length} {evidence.length === 1 ? 'fuente' : 'fuentes'}</span>
    </div>
    <div className="source-tabs" role="group" aria-label="Fuentes documentales">
      {evidence.map((item, index) => <button
        type="button"
        key={item.id}
        aria-pressed={item.id === active.id}
        className={item.id === active.id ? 'active' : ''}
        onClick={() => onSelect(item)}
      >Fuente {index + 1}</button>)}
    </div>
      <div className="document-preview">
        <div className="paper-toolbar">
          <span><Icon name="file" />{active.documentName}</span>
          <strong>{active.page > 0 ? `Pág. ${active.page}` : 'Página no informada'}</strong>
        </div>
      <div className="paper-page" aria-label={`Vista de ${active.documentName}${active.page > 0 ? `, página ${active.page}` : ', página no informada'}`}>
        <div className="paper-rule wide" /><div className="paper-rule" /><div className="paper-rule short" />
        <div className="paper-section">{active.context || 'Fragmento identificado'}</div>
        <blockquote>{active.quote}</blockquote>
        <div className="paper-rule wide" /><div className="paper-rule" /><div className="paper-rule short" />
        {active.page > 0 && <span className="page-number">{active.page}</span>}
      </div>
    </div>
    <div className="evidence-quote"><span>Extracto original</span><p>“{active.quote}”</p><small>{active.context}</small></div>
  </aside>
}
