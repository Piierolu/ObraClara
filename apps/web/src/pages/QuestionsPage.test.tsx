import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { QuestionAnswer } from '../types'
import { AnswerCard } from './QuestionsPage'

const answer: QuestionAnswer = {
  id: 'answer-1',
  question: '¿Cuál es el importe máximo?',
  answer: 'El límite contractual asciende a 749.500 EUR.',
  createdAt: 'Ahora',
  sources: [{
    id: 'source-contract', documentId: 'doc-contract', documentName: 'Contrato.pdf', page: 34,
    quote: 'Importe máximo: 749.500 EUR', label: 'Contrato, p. 34',
  }],
}

describe('AnswerCard', () => {
  it('entrega la fuente exacta al pulsar una cita', async () => {
    const onSourceSelect = vi.fn()
    render(<AnswerCard answer={answer} onSourceSelect={onSourceSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /Contrato, p. 34/ }))
    expect(onSourceSelect).toHaveBeenCalledWith(answer.sources[0])
    expect(screen.getByText('Respuesta contrastada')).toBeInTheDocument()
  })

  it('advierte explícitamente cuando la API no aporta evidencia', () => {
    render(<AnswerCard answer={{ ...answer, sources: [], answer: 'No puedo responder con la evidencia disponible.' }} onSourceSelect={() => undefined} />)
    expect(screen.getByText('Sin respaldo documental')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No hay una cita documental verificable')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
