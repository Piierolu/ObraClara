export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type AnomalyStatus = 'open' | 'in_review' | 'resolved'
export type DocumentStatus = 'uploaded' | 'processed' | 'processing' | 'needs_review' | 'failed'

export interface Project {
  id: string
  code: string
  name: string
  location: string
  progress: number
  documentCount: number | null
  openAnomalies: number | null
  criticalAnomalies: number | null
  lastActivity: string
  status: 'active' | 'at_risk' | 'closed'
}

export interface DashboardData {
  metrics: {
    activeProjects: number
    documentsReviewed: number
    openFindings: number
    criticalFindings: number | null
  }
  projects: Project[]
}

export interface DocumentRecord {
  id: string
  projectId: string
  name: string
  type: string
  version: string
  size: string
  pages: number | null
  status: DocumentStatus
  uploadedBy: string
  uploadedAt: string
}

export interface Evidence {
  id: string
  documentId: string
  documentName: string
  page: number
  quote: string
  context?: string
  boundingBox?: [number, number, number, number]
}

export interface Anomaly {
  id: string
  code: string
  title: string
  description: string
  severity: Severity
  status: AnomalyStatus
  category: string
  assignee?: string
  detectedAt: string
  confidence: number | null
  evidence: Evidence[]
}

export interface ProjectDetail extends Project {
  budget: string
  startDate: string
  expectedEndDate: string
  documents: DocumentRecord[]
}

export interface ReviewData {
  project: Pick<Project, 'id' | 'name' | 'code'>
  anomalies: Anomaly[]
}

export interface AnswerSource extends Evidence {
  label: string
}

export interface QuestionAnswer {
  id: string
  question: string
  answer: string
  sources: AnswerSource[]
  createdAt: string
}

export interface AuditEvent {
  id: string
  action: string
  detail: string
  actor: string
  timestamp: string
  occurredAt: string | null
  kind: 'document' | 'finding' | 'access' | 'system'
  hash: string
}

export interface CreateProjectInput {
  name: string
  code: string
  location: string
  contractAmount: number
}
