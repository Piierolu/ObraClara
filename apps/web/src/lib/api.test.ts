import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  api,
  backendDecision,
  mapBackendAnomaly,
  mapBackendAuditEvent,
  mapBackendDashboard,
  mapBackendDocument,
  mapBackendProject,
  mapBackendQuestion,
  TOKEN_KEY,
  UNAUTHORIZED_EVENT,
} from './api'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  localStorage.clear()
})

const backendProject = {
  id: 'project-1',
  name: 'Edificio Norte',
  code: 'OC-001',
  location: 'Madrid',
  contractAmount: '1250000.50',
  approvedProgress: '42.5',
  createdAt: '2026-07-20T10:00:00Z',
  documentCount: 4,
  openAnomalies: 2,
  criticalAnomalies: 1,
  lastActivity: '2026-07-21T12:00:00Z',
}

const backendDocument = {
  id: 'document-1',
  projectId: 'project-1',
  originalFileName: 'certificacion.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2048,
  status: 'PROCESSED',
  documentType: 'CERTIFICATION',
  processingMode: 'AI',
  failureReason: null,
  createdAt: '2026-07-21T12:00:00Z',
  processedAt: '2026-07-21T12:01:00Z',
}

describe('adaptadores de API Spring', () => {
  it('mapea las métricas enriquecidas de proyectos sin inventar metadatos', () => {
    const project = mapBackendProject(backendProject)
    expect(project).toMatchObject({ id: 'project-1', progress: 42.5, documentCount: 4, openAnomalies: 2, criticalAnomalies: 1, status: 'at_risk' })
    expect(project).not.toHaveProperty('client')
  })

  it('combina contadores reales del dashboard con filas adaptadas', () => {
    const dashboard = mapBackendDashboard({ projects: 1, documents: 4, processedDocuments: 3, failedDocuments: 1, openAnomalies: 2, criticalFindings: 1 }, [backendProject])
    expect(dashboard.metrics).toEqual({ activeProjects: 1, documentsReviewed: 3, openFindings: 2, criticalFindings: 1 })
    expect(dashboard.projects).toHaveLength(1)
  })

  it('normaliza documentos y anomalías enriquecidas con evidencia', () => {
    expect(mapBackendDocument(backendDocument)).toMatchObject({ name: 'certificacion.pdf', status: 'processed', pages: null, size: '2 KB' })
    const anomaly = mapBackendAnomaly({
      id: 'anomaly-1', projectId: 'project-1', documentId: 'document-1', type: 'INVALID_RETENTION',
      status: 'IN_REVIEW', severity: 'HIGH', message: 'La retención aplicada no coincide.', fieldNames: 'retention_percent',
      confidence: 0.91, createdAt: '2026-07-21T12:02:00Z', updatedAt: null,
      evidence: [{ evidenceId: 'evidence-1', page: 4, quote: 'Retención: 3 %', boundingBox: '[0.1, 0.2, 0.8, 0.3]' }],
    }, [backendDocument])
    expect(anomaly).toMatchObject({ title: 'Retención fuera de contrato', status: 'in_review', severity: 'high' })
    expect(anomaly.evidence[0]).toMatchObject({ id: 'evidence-1', documentName: 'certificacion.pdf', page: 4, boundingBox: [0.1, 0.2, 0.8, 0.3] })
  })

  it('traduce decisiones de UI a los enums esperados por review', () => {
    expect(backendDecision).toEqual({ open: 'OPEN', in_review: 'IN_REVIEW', resolved: 'RESOLVED' })
  })

  it('adapta respuestas con citas y eventos sin afirmar una huella inexistente', () => {
    const answer = mapBackendQuestion({
      question: '¿Cuál es el importe?', answer: '1.250.000 EUR',
      citations: [{ evidenceId: 'evidence-2', documentId: 'document-1', documentName: 'contrato.pdf', page: 8, quote: 'Importe: 1.250.000 EUR' }],
    }, '¿Cuál es el importe?')
    expect(answer.sources[0]).toMatchObject({ id: 'evidence-2', page: 8, label: 'contrato.pdf, pág. 8' })

    const event = mapBackendAuditEvent({ id: 'event-1', action: 'DOCUMENT_UPLOADED', details: 'contrato.pdf', actorUserId: 'user-1', entityType: 'DOCUMENT', createdAt: '2026-07-21T12:00:00Z' })
    expect(event).toMatchObject({ kind: 'document', detail: 'contrato.pdf', actor: 'user-1', hash: '—' })
  })

  it('descarta citas incompletas en lugar de fabricar documento o extracto', () => {
    const answer = mapBackendQuestion({
      answered: false,
      answer: 'No puedo responder con la evidencia disponible.',
      evidence: [{ evidenceId: 'incomplete', page: 3 }],
    }, '¿Quién firma?')
    expect(answer.sources).toEqual([])
  })

  it('usa los contratos POST reales para revisión y preguntas', async () => {
    const reviewResponse = {
      id: 'anomaly-1', projectId: 'project-1', documentId: 'document-1', type: 'INVALID_RETENTION',
      status: 'CONFIRMED', severity: 'HIGH', message: 'Revisada', fieldNames: null, createdAt: null, updatedAt: null,
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => reviewResponse })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ question: '¿Importe?', answer: '1.250.000 EUR', citations: [] }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await api.updateAnomaly('project-1', 'anomaly-1', 'in_review')
    await api.askQuestion('project-1', '¿Importe?')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/anomalies/anomaly-1/review')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      decision: 'IN_REVIEW',
      comment: 'Estado actualizado a IN_REVIEW desde ObraClara web.',
    })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/projects/project-1/questions')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ question: '¿Importe?' }) })
  })

  it('crea proyectos y procesa documentos con los cuerpos y rutas pactados', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => backendProject })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => undefined })
    vi.stubGlobal('fetch', fetchMock)

    await api.createProject({ name: 'Edificio Norte', code: 'OC-001', location: 'Madrid', contractAmount: 1250000 })
    await api.processDocument('document-1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ name: 'Edificio Norte', code: 'OC-001', location: 'Madrid', contractAmount: 1250000 }),
    })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/documents/document-1/process')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' })
  })

  it('conserva las cargas simuladas dentro del proyecto de la demo pública', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const { api: demoApi } = await import('./api')
    const project = await demoApi.createProject({ name: 'Obra Demo', code: 'DEMO-01', location: 'Lima', contractAmount: 50000 })

    await demoApi.uploadDocument(project.id, new File(['total: 50000'], 'factura-demo.txt', { type: 'text/plain' }))

    await expect(demoApi.getProject(project.id)).resolves.toMatchObject({
      documentCount: 1,
      documents: [{ name: 'factura-demo.txt', status: 'processed', uploadedBy: 'Tú' }],
    })
  })

  it('elimina la credencial inválida y notifica un 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'legacy-token')
    const unauthorized = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, unauthorized)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'No autorizado' }) }))

    await expect(api.getProjects()).rejects.toThrow('No autorizado')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(unauthorized).toHaveBeenCalledOnce()
    window.removeEventListener(UNAUTHORIZED_EVENT, unauthorized)
  })
})
