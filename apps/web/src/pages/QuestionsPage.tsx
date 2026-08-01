import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EvidencePane } from '../components/EvidencePane'
import { Icon } from '../components/Icon'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { AnswerSource, Evidence, QuestionAnswer } from '../types'

export function AnswerCard({ answer, onSourceSelect }: { answer: QuestionAnswer; onSourceSelect: (source: AnswerSource) => void }) {
  const hasEvidence = answer.sources.length > 0
  return <article className="answer-card">
    <div className="question-line"><span>TÚ</span><div><small>Tu consulta · {answer.createdAt}</small><h2>{answer.question}</h2></div></div>
    <div className="answer-body"><span className="answer-mark">OC</span><div><span className="eyebrow">{hasEvidence ? 'Respuesta contrastada' : 'Sin respaldo documental'}</span><p>{answer.answer}</p>{hasEvidence ? <div className="citation-list" aria-label="Fuentes de la respuesta">{answer.sources.map((source, index) => <button type="button" key={source.id} onClick={() => onSourceSelect(source)}><b>{index + 1}</b>{source.label}<Icon name="chevron" /></button>)}</div> : <div className="no-evidence-answer" role="status"><Icon name="alert" /><span>No hay una cita documental verificable para esta respuesta. No la uses como evidencia de obra.</span></div>}</div></div>
  </article>
}

export function QuestionsPage() {
  const projectId = useParams().projectId!
  const { data, loading, error, reload } = useApi(async () => {
    const [history, project] = await Promise.all([api.getQuestions(projectId), api.getProjectSummary(projectId)])
    return { history, project }
  }, [projectId])
  const [answers, setAnswers] = useState<QuestionAnswer[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState('')
  const [activeSource, setActiveSource] = useState<AnswerSource | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = question.trim()
    if (!value) return
    setAsking(true)
    setAskError('')
    try {
      const answer = await api.askQuestion(projectId, value)
      setAnswers((current) => [answer, ...current])
      setActiveSource(answer.sources[0] || null)
      setQuestion('')
    } catch (reason) {
      setAskError(reason instanceof Error ? reason.message : 'No se pudo responder la consulta')
    } finally {
      setAsking(false)
    }
  }

  if (loading) return <LoadingState label="Conectando el índice documental" />
  if (error || !data) return <ErrorState message={error} retry={reload} />
  const allAnswers = [...answers, ...data.history]
  const suggestions = [
    '¿Cuál es el importe del contrato?',
    '¿Qué retención establece el contrato?',
    '¿Cuál es el importe total?',
    '¿Cuál es el precio unitario del contrato?',
  ]

  return <div className="page questions-page">
    <div className="breadcrumb"><Link to={`/projects/${projectId}`}>{data.project.name || data.project.code}</Link><span>/</span><strong>Consulta documental</strong></div>
    <PageHeader eyebrow="Búsqueda con respaldo documental" title="Pregunta al expediente" description="Las respuestas se construyen únicamente con fuentes del proyecto. Verifica cada afirmación en el documento original." />
    <form className="question-composer" onSubmit={submit}>
      <Icon name="search" /><textarea aria-label="Pregunta sobre los documentos" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ej. ¿La retención aplicada en la certificación 14 cumple el contrato?" rows={2} /><button className="button primary" disabled={asking || !question.trim()}>{asking ? 'Consultando…' : 'Consultar'}<Icon name="arrow" /></button>
      <div className="composer-meta"><span>{data.project.documentCount == null ? 'Busca en el expediente del proyecto' : `Busca en ${data.project.documentCount} ${data.project.documentCount === 1 ? 'documento' : 'documentos'} del proyecto`}</span><span>Comprueba si la respuesta incluye citas verificables</span></div>
    </form>
    {askError && <div className="inline-notice error" role="alert"><Icon name="alert" />{askError}</div>}
    <div className={`qa-layout ${activeSource ? 'source-open' : ''}`}>
      <section className="answer-stream">
        <div className="suggestion-row"><span>Consultas compatibles</span>{suggestions.map((text) => <button type="button" key={text} onClick={() => setQuestion(text)}>{text}</button>)}</div>
        {allAnswers.length === 0 ? <EmptyState title="Haz tu primera consulta" text="Pregunta por importes, plazos, cláusulas o inconsistencias del expediente." /> : allAnswers.map((answer) => <AnswerCard key={answer.id} answer={answer} onSourceSelect={setActiveSource} />)}
      </section>
      {activeSource && <div className="qa-evidence-wrap"><button type="button" className="close-evidence" onClick={() => setActiveSource(null)}><Icon name="close" /> Cerrar evidencia</button><EvidencePane evidence={[activeSource]} activeId={activeSource.id} onSelect={(evidence: Evidence) => setActiveSource(evidence as AnswerSource)} title="Fuente de la respuesta" /></div>}
    </div>
  </div>
}
