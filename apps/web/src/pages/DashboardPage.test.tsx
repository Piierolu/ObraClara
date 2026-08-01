import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import type { Project } from '../types'
import { NewProjectDialog } from './DashboardPage'

afterEach(() => vi.restoreAllMocks())

describe('NewProjectDialog', () => {
  it('envía el contrato de creación y entrega el proyecto devuelto', async () => {
    const project: Project = {
      id: 'project-new', name: 'Centro Norte', code: 'OC-045', location: 'Oviedo', progress: 0,
      documentCount: 0, openAnomalies: 0, criticalAnomalies: 0, lastActivity: 'Ahora', status: 'active',
    }
    const createProject = vi.spyOn(api, 'createProject').mockResolvedValue(project)
    const onCreated = vi.fn()
    render(<NewProjectDialog onClose={() => undefined} onCreated={onCreated} />)

    await userEvent.type(screen.getByLabelText('Nombre del proyecto'), 'Centro Norte')
    await userEvent.type(screen.getByLabelText('Código'), 'OC-045')
    await userEvent.type(screen.getByLabelText('Ubicación'), 'Oviedo')
    await userEvent.type(screen.getByLabelText('Importe contractual (EUR)'), '840000')
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))

    expect(createProject).toHaveBeenCalledWith({ name: 'Centro Norte', code: 'OC-045', location: 'Oviedo', contractAmount: 840000 })
    expect(onCreated).toHaveBeenCalledWith(project)
  })
})
