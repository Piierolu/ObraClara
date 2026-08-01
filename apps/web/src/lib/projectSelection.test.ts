import { describe, expect, it } from 'vitest'
import type { Project } from '../types'
import { getRouteProjectId, resolveProjectId } from './projectSelection'

const projects = [
  { id: 'project-1', code: 'OC-01', name: 'Norte' },
  { id: 'project-2', code: 'OC-02', name: 'Sur' },
] as Project[]

describe('project route selection', () => {
  it('prefiere y reconoce el proyecto real de la ruta', () => {
    expect(getRouteProjectId('/projects/project-2/review')).toBe('project-2')
    expect(resolveProjectId('/projects/project-2/review', projects, 'project-1')).toBe('project-2')
  })

  it('recupera el último proyecto real o el primero disponible', () => {
    expect(resolveProjectId('/', projects, 'project-2')).toBe('project-2')
    expect(resolveProjectId('/', projects, 'eliminado')).toBe('project-1')
    expect(resolveProjectId('/', [], 'project-1')).toBeNull()
  })
})
