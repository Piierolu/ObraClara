import { anomaliesMock, auditMock, dashboardMock, projectMock, qaHistoryMock } from '../data/mock'
import type {
  Anomaly,
  AnomalyStatus,
  AnswerSource,
  AuditEvent,
  CreateProjectInput,
  DashboardData,
  DocumentRecord,
  DocumentStatus,
  Evidence,
  Project,
  ProjectDetail,
  QuestionAnswer,
  ReviewData,
  Severity,
} from '../types'

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
export const DEMO_TOKEN = import.meta.env.VITE_DEMO_TOKEN || 'demo-admin'
export const TOKEN_KEY = 'obraclara_token'
export const UNAUTHORIZED_EVENT = 'obraclara:unauthorized'

interface BackendDashboardDto {
  projects: number
  documents: number
  processedDocuments: number
  failedDocuments: number
  openAnomalies: number
  criticalFindings?: number | null
  criticalAnomalies?: number | null
}

interface BackendProjectDto {
  id: string
  name: string
  code: string
  location: string | null
  contractAmount: number | string | null
  approvedProgress: number | string | null
  createdAt: string | null
  documentCount?: number | null
  openAnomalies?: number | null
  criticalAnomalies?: number | null
  lastActivity?: string | null
}

interface BackendDocumentDto {
  id: string
  projectId: string
  originalFileName: string
  contentType: string | null
  sizeBytes: number
  status: string
  documentType: string | null
  processingMode: string | null
  failureReason: string | null
  createdAt: string | null
  processedAt: string | null
}

interface BackendEvidenceDto {
  id?: string
  evidenceId?: string
  documentId?: string
  documentName?: string
  documentFileName?: string
  page?: number
  pageNumber?: number
  quote?: string
  quoteText?: string
  context?: string
  boundingBox?: number[] | string | null
  label?: string
}

interface BackendAnomalyDto {
  id: string
  projectId: string
  documentId: string
  documentName?: string
  type: string
  status: string
  severity: string
  message: string
  fieldNames: string | null
  confidence?: number | null
  evidence?: BackendEvidenceDto[]
  evidences?: BackendEvidenceDto[]
  createdAt: string | null
  updatedAt: string | null
}

interface BackendQuestionAnswerItem {
  documentId: string
  documentName?: string
  field?: string
  value?: string
  rawValue?: string
  confidence?: number
  evidence?: BackendEvidenceDto[]
}

interface BackendQuestionDto {
  id?: string
  question?: string
  field?: string
  answer?: string
  sources?: BackendEvidenceDto[]
  citations?: BackendEvidenceDto[]
  evidence?: BackendEvidenceDto[]
  answers?: BackendQuestionAnswerItem[]
  createdAt?: string
  answered?: boolean
}

interface BackendAuditDto {
  id: string
  action: string
  detail?: string
  details?: string
  actor?: string
  actorUserId?: string
  entityType?: string
  entityId?: string
  timestamp?: string
  createdAt?: string
  hash?: string
}

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const isForm = options.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; detail?: string; error?: string } | null
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    throw new ApiError(body?.message || body?.detail || body?.error || `La solicitud falló (${response.status})`, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function demo<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), 260))
}

const demoCreatedProjects: ProjectDetail[] = []
const demoUploadedDocuments = new Map<string, DocumentRecord[]>()

function asNumber(value: number | string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return 'No informada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No informada'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function formatMoney(value: number | string | null): string {
  if (value == null || value === '') return 'No informado'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(asNumber(value))
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(bytes / 1024 ** unit)} ${units[unit]}`
}

function mapDocumentStatus(status: string): DocumentStatus {
  const statuses: Record<string, DocumentStatus> = {
    UPLOADED: 'uploaded', PROCESSING: 'processing', PROCESSED: 'processed', FAILED: 'failed',
  }
  return statuses[status?.toUpperCase()] || 'needs_review'
}

function mapAnomalyStatus(status: string): AnomalyStatus {
  const statuses: Record<string, AnomalyStatus> = {
    OPEN: 'open', IN_REVIEW: 'in_review', CONFIRMED: 'in_review', DISMISSED: 'resolved', RESOLVED: 'resolved',
  }
  return statuses[status?.toUpperCase()] || 'open'
}

function mapSeverity(severity: string): Severity {
  const normalized = severity?.toLowerCase()
  if (normalized === 'critical' || normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized
  return 'medium'
}

const anomalyLabels: Record<string, { title: string; category: string }> = {
  RATE_MISMATCH: { title: 'Precio unitario no coincide', category: 'Control económico' },
  QUANTITY_EXCEEDS_PROGRESS: { title: 'Medición supera el avance aprobado', category: 'Control de mediciones' },
  INVALID_RETENTION: { title: 'Retención fuera de contrato', category: 'Cumplimiento contractual' },
  CONTRACT_BALANCE_EXCEEDED: { title: 'Saldo contractual excedido', category: 'Control económico' },
  ARITHMETIC_MISMATCH: { title: 'Descuadre aritmético', category: 'Consistencia documental' },
  MISSING_EVIDENCE: { title: 'Evidencia documental insuficiente', category: 'Integridad documental' },
}

function parseBoundingBox(value: number[] | string | null | undefined): [number, number, number, number] | undefined {
  const numbers = Array.isArray(value)
    ? value.map(Number)
    : typeof value === 'string'
      ? (value.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
      : []
  return numbers.length >= 4 && numbers.slice(0, 4).every(Number.isFinite)
    ? [numbers[0], numbers[1], numbers[2], numbers[3]]
    : undefined
}

export function mapBackendProject(dto: BackendProjectDto): Project {
  const progress = Math.max(0, Math.min(100, asNumber(dto.approvedProgress)))
  const criticalAnomalies = dto.criticalAnomalies ?? null
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    location: dto.location || 'Ubicación no informada',
    progress,
    documentCount: dto.documentCount ?? null,
    openAnomalies: dto.openAnomalies ?? null,
    criticalAnomalies,
    lastActivity: dto.lastActivity ? formatDate(dto.lastActivity, true) : 'Sin actividad informada',
    status: progress >= 100 ? 'closed' : criticalAnomalies != null && criticalAnomalies > 0 ? 'at_risk' : 'active',
  }
}

export function mapBackendDocument(dto: BackendDocumentDto): DocumentRecord {
  return {
    id: dto.id,
    projectId: dto.projectId,
    name: dto.originalFileName,
    type: dto.documentType || dto.contentType || 'Sin clasificar',
    version: '',
    size: formatBytes(dto.sizeBytes),
    pages: null,
    status: mapDocumentStatus(dto.status),
    uploadedBy: 'No informado',
    uploadedAt: formatDate(dto.createdAt, true),
  }
}

function mapEvidence(dto: BackendEvidenceDto, anomaly: BackendAnomalyDto, documents: Map<string, DocumentRecord>): Evidence | null {
  const documentId = dto.documentId || anomaly.documentId
  const documentName = dto.documentFileName || dto.documentName || anomaly.documentName || documents.get(documentId)?.name
  const quote = dto.quote || dto.quoteText
  if (!documentName || !quote) return null
  return {
    id: dto.evidenceId || dto.id || `${anomaly.id}-${dto.page ?? dto.pageNumber ?? 0}`,
    documentId,
    documentName,
    page: dto.page ?? dto.pageNumber ?? 0,
    quote,
    context: dto.context || anomaly.fieldNames || undefined,
    boundingBox: parseBoundingBox(dto.boundingBox),
  }
}

export function mapBackendAnomaly(dto: BackendAnomalyDto, documentDtos: BackendDocumentDto[] = []): Anomaly {
  const documents = new Map(documentDtos.map((document) => [document.id, mapBackendDocument(document)]))
  const label = anomalyLabels[dto.type] || { title: dto.type.replaceAll('_', ' ').toLocaleLowerCase('es-ES'), category: 'Revisión documental' }
  const rawEvidence = dto.evidence || dto.evidences || []
  return {
    id: dto.id,
    code: dto.type,
    title: label.title,
    description: dto.message,
    severity: mapSeverity(dto.severity),
    status: mapAnomalyStatus(dto.status),
    category: label.category,
    detectedAt: formatDate(dto.createdAt, true),
    confidence: dto.confidence ?? null,
    evidence: rawEvidence.map((item) => mapEvidence(item, dto, documents)).filter((item): item is Evidence => item !== null),
  }
}

export function mapBackendDashboard(dto: BackendDashboardDto, projects: BackendProjectDto[]): DashboardData {
  return {
    metrics: {
      activeProjects: dto.projects,
      documentsReviewed: dto.processedDocuments,
      openFindings: dto.openAnomalies,
      criticalFindings: dto.criticalFindings ?? dto.criticalAnomalies ?? null,
    },
    projects: projects.map(mapBackendProject),
  }
}

function mapAnswerSource(source: BackendEvidenceDto, index: number, documentId = ''): AnswerSource | null {
  const page = source.page ?? source.pageNumber ?? 0
  const name = source.documentFileName || source.documentName
  const quote = source.quote || source.quoteText
  if (!name || !quote) return null
  return {
    id: source.evidenceId || source.id || `source-${index}`,
    documentId: source.documentId || documentId,
    documentName: name,
    page,
    quote,
    context: source.context,
    boundingBox: parseBoundingBox(source.boundingBox),
    label: source.label || `${name}, ${page ? `pág. ${page}` : 'página no informada'}`,
  }
}

export function mapBackendQuestion(dto: BackendQuestionDto, submittedQuestion: string): QuestionAnswer {
  const directSources = dto.sources || dto.citations || dto.evidence || []
  const answerSources = (dto.answers || []).flatMap((answer) =>
    (answer.evidence || []).map((source, index) => mapAnswerSource({ ...source, documentName: source.documentName || answer.documentName }, index, answer.documentId)),
  )
  const answerText = dto.answer || (dto.answers || []).map((answer) => {
    const field = answer.field ? `${answer.field}: ` : ''
    return `${field}${answer.value || answer.rawValue || 'Valor no informado'}`
  }).join(' · ') || 'No se encontró una respuesta textual en el expediente.'
  return {
    id: dto.id || `question-${Date.now()}`,
    question: dto.question || submittedQuestion || dto.field || 'Consulta documental',
    answer: answerText,
    sources: (directSources.length > 0 ? directSources.map((source, index) => mapAnswerSource(source, index)) : answerSources)
      .filter((source): source is AnswerSource => source !== null),
    createdAt: dto.createdAt ? formatDate(dto.createdAt, true) : 'Ahora',
  }
}

export function mapBackendAuditEvent(dto: BackendAuditDto): AuditEvent {
  const entityType = dto.entityType?.toUpperCase() || ''
  const action = dto.action.toUpperCase()
  const kind: AuditEvent['kind'] = entityType.includes('DOCUMENT') || action.includes('DOCUMENT')
    ? 'document'
    : entityType.includes('ANOMALY') || action.includes('ANOMAL') || action.includes('REVIEW')
      ? 'finding'
      : action.includes('ACCESS') || action.includes('QUESTION')
        ? 'access'
        : 'system'
  const actionLabels: Record<string, string> = {
    DOCUMENT_UPLOADED: 'Documento cargado',
    DOCUMENT_PROCESSED: 'Documento procesado',
    DOCUMENT_PROCESSING_FAILED: 'Procesamiento de documento fallido',
    ANOMALY_REVIEWED: 'Hallazgo revisado',
  }
  return {
    id: dto.id,
    action: actionLabels[action] || dto.action.replaceAll('_', ' ').toLocaleLowerCase('es-ES').replace(/^./, (letter) => letter.toUpperCase()),
    detail: dto.detail || dto.details || [dto.entityType, dto.entityId].filter(Boolean).join(' · ') || 'Sin detalle adicional',
    actor: dto.actor || dto.actorUserId || 'Sistema',
    timestamp: formatDate(dto.timestamp || dto.createdAt, true),
    occurredAt: dto.timestamp || dto.createdAt || null,
    kind,
    hash: dto.hash || '—',
  }
}

export const backendDecision: Record<AnomalyStatus, 'OPEN' | 'IN_REVIEW' | 'RESOLVED'> = {
  open: 'OPEN',
  in_review: 'IN_REVIEW',
  resolved: 'RESOLVED',
}

export const api = {
  async loginDemo(): Promise<{ token: string }> {
    return isDemoMode ? demo({ token: DEMO_TOKEN }) : request<{ token: string }>('/auth/demo', { method: 'POST' })
  },

  async getDashboard(): Promise<DashboardData> {
    if (isDemoMode) {
      const projects = [...demoCreatedProjects, ...dashboardMock.projects]
      return demo({ ...dashboardMock, metrics: { ...dashboardMock.metrics, activeProjects: projects.length }, projects })
    }
    const [dashboard, projects] = await Promise.all([
      request<BackendDashboardDto>('/dashboard'),
      request<BackendProjectDto[]>('/projects'),
    ])
    return mapBackendDashboard(dashboard, projects)
  },

  async getProjects(): Promise<Project[]> {
    if (isDemoMode) return demo([...demoCreatedProjects, ...dashboardMock.projects])
    const projects = await request<BackendProjectDto[]>('/projects')
    return projects.map(mapBackendProject)
  },

  async getProjectSummary(projectId: string): Promise<Project> {
    if (isDemoMode) {
      const project = [...demoCreatedProjects, ...dashboardMock.projects].find((item) => item.id === projectId)
      if (!project) throw new ApiError('Proyecto no encontrado', 404)
      return demo(project)
    }
    return mapBackendProject(await request<BackendProjectDto>(`/projects/${projectId}`))
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    if (isDemoMode) {
      const project: ProjectDetail = {
        id: `project-${Date.now()}`,
        name: input.name,
        code: input.code,
        location: input.location,
        budget: formatMoney(input.contractAmount),
        progress: 0,
        documentCount: 0,
        openAnomalies: 0,
        criticalAnomalies: 0,
        lastActivity: 'Creado ahora',
        status: 'active',
        startDate: formatDate(new Date().toISOString()),
        expectedEndDate: 'No informada',
        documents: [],
      }
      demoCreatedProjects.unshift(project)
      return demo(project)
    }
    const project = await request<BackendProjectDto>('/projects', { method: 'POST', body: JSON.stringify(input) })
    return mapBackendProject(project)
  },

  async getProject(projectId: string): Promise<ProjectDetail> {
    if (isDemoMode) {
      const uploadedDocuments = demoUploadedDocuments.get(projectId) || []
      const created = demoCreatedProjects.find((project) => project.id === projectId)
      if (created) return demo({
        ...created,
        documentCount: created.documents.length + uploadedDocuments.length,
        documents: [...uploadedDocuments, ...created.documents],
      })
      const listed = dashboardMock.projects.find((project) => project.id === projectId)
      if (!listed) throw new ApiError('Proyecto no encontrado', 404)
      if (listed.id === projectMock.id) return demo({
        ...projectMock,
        documentCount: projectMock.documents.length + uploadedDocuments.length,
        documents: [...uploadedDocuments, ...projectMock.documents],
      })
      return demo({
        ...listed,
        budget: 'No informado',
        startDate: 'No informada',
        expectedEndDate: 'No informada',
        documentCount: uploadedDocuments.length,
        documents: uploadedDocuments,
      })
    }
    const [projectDto, documentDtos] = await Promise.all([
      request<BackendProjectDto>(`/projects/${projectId}`),
      request<BackendDocumentDto[]>(`/projects/${projectId}/documents`),
    ])
    const project = mapBackendProject(projectDto)
    const documents = documentDtos.map(mapBackendDocument)
    return {
      ...project,
      documentCount: project.documentCount ?? documents.length,
      budget: formatMoney(projectDto.contractAmount),
      startDate: formatDate(projectDto.createdAt),
      expectedEndDate: 'No informada',
      documents,
    }
  },

  async uploadDocument(projectId: string, file: File): Promise<{ id: string }> {
    if (isDemoMode) {
      const id = `doc-${Date.now()}`
      const documents = demoUploadedDocuments.get(projectId) || []
      documents.unshift({
        id,
        projectId,
        name: file.name,
        type: file.type === 'application/pdf' ? 'Documento PDF' : 'Documento de texto',
        version: 'Demo',
        size: formatBytes(file.size),
        pages: null,
        status: 'processed',
        uploadedBy: 'Tú',
        uploadedAt: 'Ahora',
      })
      demoUploadedDocuments.set(projectId, documents)
      return demo({ id })
    }
    const form = new FormData()
    form.append('file', file)
    const document = await request<BackendDocumentDto>(`/projects/${projectId}/documents`, { method: 'POST', body: form })
    return { id: document.id }
  },

  async processDocument(documentId: string): Promise<void> {
    if (isDemoMode) return demo(undefined)
    await request<unknown>(`/documents/${documentId}/process`, { method: 'POST' })
  },

  async getReview(projectId: string): Promise<ReviewData> {
    if (isDemoMode) {
      const project = [...demoCreatedProjects, ...dashboardMock.projects].find((item) => item.id === projectId)
      if (!project) throw new ApiError('Proyecto no encontrado', 404)
      return demo({ project: { id: project.id, name: project.name, code: project.code }, anomalies: project.id === projectMock.id ? anomaliesMock : [] })
    }
    const [project, anomalies, documents] = await Promise.all([
      request<BackendProjectDto>(`/projects/${projectId}`),
      request<BackendAnomalyDto[]>(`/projects/${projectId}/anomalies`),
      request<BackendDocumentDto[]>(`/projects/${projectId}/documents`),
    ])
    return {
      project: { id: project.id, name: project.name, code: project.code },
      anomalies: anomalies.map((anomaly) => mapBackendAnomaly(anomaly, documents)),
    }
  },

  async updateAnomaly(_projectId: string, anomalyId: string, status: AnomalyStatus): Promise<Anomaly> {
    if (isDemoMode) {
      const anomaly = anomaliesMock.find((item) => item.id === anomalyId)
      if (!anomaly) return Promise.reject(new ApiError('Hallazgo no encontrado', 404))
      return demo({ ...anomaly, status })
    }
    const result = await request<BackendAnomalyDto>(`/anomalies/${anomalyId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        decision: backendDecision[status],
        comment: `Estado actualizado a ${backendDecision[status]} desde ObraClara web.`,
      }),
    })
    return mapBackendAnomaly(result)
  },

  getQuestions(projectId: string): Promise<QuestionAnswer[]> {
    return isDemoMode ? demo(projectId === projectMock.id ? qaHistoryMock : []) : Promise.resolve([])
  },

  async askQuestion(projectId: string, question: string): Promise<QuestionAnswer> {
    if (isDemoMode) {
      if (projectId === projectMock.id) return demo({ ...qaHistoryMock[0], id: `qa-${Date.now()}`, question, createdAt: 'Ahora' })
      return demo(mapBackendQuestion({ question, answered: false, answer: 'No puedo responder con la evidencia disponible.', evidence: [] }, question))
    }
    const answer = await request<BackendQuestionDto>(`/projects/${projectId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
    return mapBackendQuestion(answer, question)
  },

  async getAudit(projectId: string): Promise<AuditEvent[]> {
    if (isDemoMode) return demo(projectId === projectMock.id ? auditMock : [])
    const events = await request<BackendAuditDto[]>(`/projects/${projectId}/audit-events`)
    return events.map(mapBackendAuditEvent)
  },
}
