import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Evidence } from '../types'
import { EvidencePane } from './EvidencePane'

const evidence: Evidence[] = [
  { id: 'source-a', documentId: 'doc-a', documentName: 'Certificacion.pdf', page: 12, quote: 'Total certificado: 842.650 EUR', context: 'Medición acumulada' },
  { id: 'source-b', documentId: 'doc-b', documentName: 'Contrato.pdf', page: 34, quote: 'Límite contractual: 749.500 EUR', context: 'Cuadro de precios' },
]

function EvidenceHarness({ onSelect = () => undefined }: { onSelect?: (item: Evidence) => void }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  return <EvidencePane evidence={evidence} activeId={activeId} onSelect={(item) => { setActiveId(item.id); onSelect(item) }} />
}

describe('EvidencePane', () => {
  it('muestra la primera fuente y su página cuando no hay selección', () => {
    render(<EvidenceHarness />)
    expect(screen.getAllByText('Total certificado: 842.650 EUR', { exact: false })).toHaveLength(2)
    expect(screen.getByText('Pág. 12')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fuente 1' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('cambia el fragmento verificable al elegir otra fuente', async () => {
    const onSelect = vi.fn()
    render(<EvidenceHarness onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fuente 2' }))
    expect(screen.getAllByText('Límite contractual: 749.500 EUR', { exact: false })).toHaveLength(2)
    expect(screen.getByText('Pág. 34')).toBeInTheDocument()
    expect(onSelect).toHaveBeenCalledWith(evidence[1])
  })

  it('explica el estado sin evidencia', () => {
    render(<EvidencePane evidence={[]} activeId={null} onSelect={() => undefined} />)
    expect(screen.getByText('Sin evidencia vinculada')).toBeInTheDocument()
  })
})
