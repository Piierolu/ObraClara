import type { Project } from '../types'

export const SELECTED_PROJECT_KEY = 'obraclara_selected_project'
export const PROJECTS_CHANGED_EVENT = 'obraclara:projects-changed'

export function getRouteProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)(?:\/|$)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function resolveProjectId(pathname: string, projects: Project[], storedId: string | null): string | null {
  const routeId = getRouteProjectId(pathname)
  if (routeId && projects.some((project) => project.id === routeId)) return routeId
  if (storedId && projects.some((project) => project.id === storedId)) return storedId
  return projects[0]?.id || null
}
