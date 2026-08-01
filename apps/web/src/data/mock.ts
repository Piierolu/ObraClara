import type { Anomaly, AuditEvent, DashboardData, ProjectDetail, QuestionAnswer } from '../types'

export const dashboardMock: DashboardData = {
  metrics: {
    activeProjects: 6,
    documentsReviewed: 1847,
    openFindings: 28,
    criticalFindings: 4,
  },
  projects: [
    {
      id: 'demo-atlas', code: 'OC-024', name: 'Residencial Atlas', location: 'Madrid, Arganzuela',
      progress: 68, documentCount: 5, openAnomalies: 9, criticalAnomalies: 2, lastActivity: 'Hace 18 min', status: 'at_risk',
    },
    {
      id: 'prj-norte', code: 'OC-019', name: 'Intercambiador Norte', location: 'Bilbao, Abando',
      progress: 42, documentCount: 318, openAnomalies: 6, criticalAnomalies: 1, lastActivity: 'Hace 2 h', status: 'active',
    },
    {
      id: 'prj-litoral', code: 'OC-031', name: 'Centro Logístico Litoral', location: 'Valencia, Sagunto',
      progress: 81, documentCount: 529, openAnomalies: 3, criticalAnomalies: 0, lastActivity: 'Ayer, 17:34', status: 'active',
    },
    {
      id: 'prj-ribera', code: 'OC-028', name: 'Rehabilitación La Ribera', location: 'Sevilla, Triana',
      progress: 26, documentCount: 172, openAnomalies: 5, criticalAnomalies: 1, lastActivity: 'Ayer, 11:02', status: 'at_risk',
    },
  ],
}

export const projectMock: ProjectDetail = {
  ...dashboardMock.projects[0],
  budget: '18,4 M EUR',
  startDate: '12 feb 2025',
  expectedEndDate: '30 nov 2026',
  documents: [
    { id: 'doc-cert-14', projectId: 'demo-atlas', name: 'Certificación_obra_14.pdf', type: 'Certificación', version: 'v3', size: '4,8 MB', pages: 24, status: 'needs_review', uploadedBy: 'Laura Méndez', uploadedAt: 'Hoy, 09:42' },
    { id: 'doc-contract', projectId: 'demo-atlas', name: 'Contrato_principal_firmado.pdf', type: 'Contrato', version: 'v1', size: '12,1 MB', pages: 68, status: 'processed', uploadedBy: 'Álvaro Santos', uploadedAt: '28 jul, 16:18' },
    { id: 'doc-budget', projectId: 'demo-atlas', name: 'Presupuesto_ejecución_v7.xlsx', type: 'Presupuesto', version: 'v7', size: '2,3 MB', pages: 16, status: 'processed', uploadedBy: 'Marta Ríos', uploadedAt: '27 jul, 12:05' },
    { id: 'doc-plan', projectId: 'demo-atlas', name: 'Planos_estructura_B2.pdf', type: 'Planos', version: 'v2', size: '28,6 MB', pages: 42, status: 'processing', uploadedBy: 'Iván Pérez', uploadedAt: 'Hoy, 10:03' },
    { id: 'doc-act', projectId: 'demo-atlas', name: 'Acta_replanteo.pdf', type: 'Acta', version: 'v1', size: '1,2 MB', pages: 7, status: 'failed', uploadedBy: 'Laura Méndez', uploadedAt: '25 jul, 08:51' },
  ],
}

export const anomaliesMock: Anomaly[] = [
  {
    id: 'anom-1', code: 'FIN-042', title: 'Importe certificado supera la partida contratada',
    description: 'La suma certificada para cimentación excede un 12,4 % el límite de la partida 03.02 sin modificativo aprobado.',
    severity: 'critical', status: 'open', category: 'Control económico', assignee: 'Marta Ríos', detectedAt: 'Hoy, 09:47', confidence: 0.96,
    evidence: [
      { id: 'ev-1', documentId: 'doc-cert-14', documentName: 'Certificación_obra_14.pdf', page: 12, quote: 'Importe acumulado certificado: 842.650,00 EUR', context: '03.02 Cimentación profunda · Medición acumulada', boundingBox: [0.12, 0.41, 0.82, 0.49] },
      { id: 'ev-2', documentId: 'doc-contract', documentName: 'Contrato_principal_firmado.pdf', page: 34, quote: 'Importe máximo partida 03.02: 749.500,00 EUR', context: 'Anexo II · Cuadro de precios contractuales', boundingBox: [0.1, 0.62, 0.86, 0.69] },
    ],
  },
  {
    id: 'anom-2', code: 'CTR-018', title: 'Retención de garantía incorrecta',
    description: 'Se aplica una retención del 3 % cuando la cláusula 18 establece un 5 % sobre el importe de ejecución material.',
    severity: 'high', status: 'in_review', category: 'Cumplimiento contractual', assignee: 'Diego Leal', detectedAt: 'Ayer, 17:12', confidence: 0.93,
    evidence: [
      { id: 'ev-3', documentId: 'doc-cert-14', documentName: 'Certificación_obra_14.pdf', page: 21, quote: 'Retención garantía (3,00 %): 18.426,33 EUR', context: 'Resumen de certificación · Deducciones' },
      { id: 'ev-4', documentId: 'doc-contract', documentName: 'Contrato_principal_firmado.pdf', page: 18, quote: 'Se retendrá el cinco por ciento (5 %) en concepto de garantía.', context: 'Cláusula 18 · Garantías y retenciones' },
    ],
  },
  {
    id: 'anom-3', code: 'DOC-107', title: 'Falta firma de dirección facultativa',
    description: 'La certificación incluye firma del contratista, pero no consta firma válida de la dirección de obra.',
    severity: 'medium', status: 'open', category: 'Integridad documental', detectedAt: 'Ayer, 16:58', confidence: 0.89,
    evidence: [{ id: 'ev-5', documentId: 'doc-cert-14', documentName: 'Certificación_obra_14.pdf', page: 24, quote: 'Firma Dirección Facultativa: __________________', context: 'Página de firmas' }],
  },
  {
    id: 'anom-4', code: 'PLA-006', title: 'Fecha de hito desalineada con planificación',
    description: 'El acta sitúa el cierre de estructura 18 días después de la fecha comprometida en el plan vigente.',
    severity: 'low', status: 'resolved', category: 'Planificación', assignee: 'Laura Méndez', detectedAt: '24 jul, 10:20', confidence: 0.84,
    evidence: [{ id: 'ev-6', documentId: 'doc-plan', documentName: 'Planificación_contractual_v4.pdf', page: 8, quote: 'Hito H07 · Fin estructura: 14/07/2026', context: 'Cronograma contractual' }],
  },
]

export const qaHistoryMock: QuestionAnswer[] = [
  {
    id: 'qa-1', question: '¿Qué desviaciones económicas siguen abiertas?',
    answer: 'Hay dos desviaciones económicas abiertas. La más relevante afecta a cimentación profunda: el acumulado certificado es 842.650 EUR frente a un máximo contractual de 749.500 EUR, una diferencia de 93.150 EUR. También está pendiente corregir la retención de garantía aplicada al 3 % en lugar del 5 % contractual.',
    sources: [
      { ...anomaliesMock[0].evidence[0], label: 'Certificación 14, p. 12' },
      { ...anomaliesMock[0].evidence[1], label: 'Contrato, p. 34' },
      { ...anomaliesMock[1].evidence[1], label: 'Contrato, p. 18' },
    ],
    createdAt: 'Hoy, 10:14',
  },
]

export const auditMock: AuditEvent[] = [
  { id: 'aud-1', action: 'Hallazgo asignado', detail: 'FIN-042 asignado a Marta Ríos', actor: 'Laura Méndez', timestamp: 'Hoy, 10:08:42', occurredAt: '2026-08-01T10:08:42Z', kind: 'finding', hash: '9f82…a10c' },
  { id: 'aud-2', action: 'Análisis finalizado', detail: 'Certificación_obra_14.pdf · 3 hallazgos detectados', actor: 'Motor ObraClara', timestamp: 'Hoy, 09:47:16', occurredAt: '2026-08-01T09:47:16Z', kind: 'system', hash: '32bc…84d1' },
  { id: 'aud-3', action: 'Documento cargado', detail: 'Certificación_obra_14.pdf · v3 · 4,8 MB', actor: 'Laura Méndez', timestamp: 'Hoy, 09:42:03', occurredAt: '2026-08-01T09:42:03Z', kind: 'document', hash: 'c411…71fe' },
  { id: 'aud-4', action: 'Estado modificado', detail: 'CTR-018: Abierto → En revisión', actor: 'Diego Leal', timestamp: 'Ayer, 17:26:31', occurredAt: '2026-07-31T17:26:31Z', kind: 'finding', hash: '7a05…0d99' },
  { id: 'aud-5', action: 'Consulta documental', detail: 'Consulta respaldada por 3 fuentes', actor: 'Marta Ríos', timestamp: 'Ayer, 12:11:09', occurredAt: '2026-07-31T12:11:09Z', kind: 'access', hash: 'aa14…c822' },
  { id: 'aud-6', action: 'Nueva versión', detail: 'Presupuesto_ejecución_v7.xlsx reemplaza v6', actor: 'Marta Ríos', timestamp: '27 jul, 12:05:44', occurredAt: '2026-07-27T12:05:44Z', kind: 'document', hash: 'd023…f3e8' },
]
