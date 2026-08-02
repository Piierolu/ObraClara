import path from 'node:path'
import { expect, test } from '@playwright/test'

test.skip(process.env.E2E_DEMO_MODE !== 'true', 'Solo se ejecuta contra la demo pública')

test('la demo pública recorre el flujo principal sin depender del backend', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(`Browser error: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 500) runtimeErrors.push(`${response.status()} ${response.url()}`)
  })

  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText('datos identificados como simulados')).toBeVisible()
  await page.getByRole('button', { name: 'Entrar a la demo' }).click()

  await expect(page.getByRole('heading', { name: 'Control de proyectos' })).toBeVisible()
  await expect(page.getByText('Datos simulados para la demo')).toBeVisible()
  await page.getByText('Residencial Atlas').click()
  await expect(page.getByText('Demo pública')).toBeVisible()

  const fixture = path.resolve(process.cwd(), '../../fixtures/documents/03-factura-fac-1042.txt')
  await page.locator('input[type="file"]').setInputFiles(fixture)
  await expect(page.getByRole('status')).toContainText('se cargó correctamente')
  await expect(page.getByText('03-factura-fac-1042.txt', { exact: true })).toBeVisible()

  await page.locator('.sidebar').getByRole('link', { name: 'Revisión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mesa de revisión' })).toBeVisible()
  await expect(page.locator('.anomaly-card').first()).toBeVisible()

  await page.locator('.sidebar').getByRole('link', { name: 'Consultar', exact: true }).click()
  await page.getByRole('button', { name: '¿Qué retención establece el contrato?' }).click()
  await page.getByRole('button', { name: 'Consultar', exact: true }).click()
  await expect(page.getByText('Respuesta contrastada').first()).toBeVisible()

  await page.locator('.sidebar').getByRole('link', { name: 'Auditoría', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Historial de actividad' })).toBeVisible()
  expect(runtimeErrors).toEqual([])
})

test('la demo pública mantiene la navegación principal en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar a la demo' }).click()

  await expect(page.getByRole('heading', { name: 'Control de proyectos' })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await expect(page.getByText('Demo pública')).toBeVisible()
  await page.locator('.sidebar').getByRole('link', { name: 'Documentos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Residencial Atlas' })).toBeVisible()
})
