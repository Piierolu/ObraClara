import path from 'node:path'
import { expect, test } from '@playwright/test'

const seededProjectId = '00000000-0000-0000-0000-000000000010'
let runtimeErrors: string[]

test.beforeEach(async ({ page }) => {
  runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(`Browser error: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 500) {
      runtimeErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.afterEach(() => {
  expect(runtimeErrors).toEqual([])
})

test('recupera enlaces antiguos y navega por todas las secciones', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar a la demo' }).click()
  await expect(page.getByRole('heading', { name: 'Control de proyectos' })).toBeVisible()
  await expect(page.getByText('Residencial Alameda')).toBeVisible()

  await page.goto('/projects/prj-atlas/review')
  await expect(page).toHaveURL(/\/projects\/(?!prj-atlas)[^/]+\/review$/)
  await page.goto(`/projects/${seededProjectId}/review`)
  await expect(page.getByRole('heading', { name: 'Mesa de revisión' })).toBeVisible()

  await page.locator('.sidebar').getByRole('link', { name: 'Documentos', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/projects/${seededProjectId}$`))
  await expect(page.getByRole('heading', { name: 'Residencial Alameda' })).toBeVisible()

  const search = page.getByRole('searchbox', { name: 'Buscar documentos' })
  await search.fill('factura')
  await expect(page.getByText('03-factura-fac-1042.txt')).toBeVisible()
  await search.fill('sin-coincidencias')
  await expect(page.getByText('Sin documentos coincidentes')).toBeVisible()
  await search.fill('')

  const invoiceRow = page.locator('.document-row').filter({ hasText: '03-factura-fac-1042.txt' })
  await invoiceRow.getByRole('button', { name: /Reprocesar/ }).click()
  await expect(page.getByRole('status')).toContainText('Se inició el análisis')

  await page.locator('.sidebar').getByRole('link', { name: 'Revisión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mesa de revisión' })).toBeVisible()
  const status = page.getByLabel('Estado del hallazgo')
  await status.selectOption('in_review')
  await expect(page.getByRole('status')).toContainText('actualizó correctamente')
  await status.selectOption('open')
  await expect(page.getByRole('status')).toContainText('actualizó correctamente')
  const reportDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar informe CSV' }).click()
  await expect((await reportDownload).suggestedFilename()).toMatch(/^hallazgos-/)

  await page.locator('.sidebar').getByRole('link', { name: 'Consultar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pregunta al expediente' })).toBeVisible()
  await page.getByRole('button', { name: '¿Qué retención establece el contrato?' }).click()
  await page.getByRole('button', { name: 'Consultar', exact: true }).click()
  await expect(page.getByText('Respuesta contrastada')).toBeVisible()
  await page.locator('.citation-list button').first().click()
  await expect(page.getByText('Fuente de la respuesta')).toBeVisible()

  await page.locator('.sidebar').getByRole('link', { name: 'Auditoría', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Historial de actividad' })).toBeVisible()
  await page.getByLabel('Tipo de evento').selectOption('document')
  await expect(page.locator('.audit-list')).toContainText('Documento')
  const auditDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  await expect((await auditDownload).suggestedFilename()).toMatch(/^auditoria-/)
})

test('crea un proyecto y carga un documento', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar a la demo' }).click()
  await expect(page.getByRole('heading', { name: 'Control de proyectos' })).toBeVisible()

  const suffix = Date.now().toString().slice(-7)
  await page.getByRole('button', { name: 'Nuevo proyecto' }).click()
  await expect(page.getByRole('dialog', { name: 'Crear proyecto' })).toBeVisible()
  await page.getByLabel('Nombre del proyecto').fill(`Obra E2E ${suffix}`)
  await page.getByLabel('Código').fill(`E2E-${suffix}`)
  await page.getByLabel('Ubicación').fill('Madrid')
  await page.getByLabel('Importe contractual (EUR)').fill('75000')
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click()
  await expect(page.getByRole('heading', { name: `Obra E2E ${suffix}` })).toBeVisible()

  const fixture = path.resolve(process.cwd(), '../../fixtures/documents/01-contrato-sub-2026-014.txt')
  await page.locator('input[type="file"]').setInputFiles(fixture)
  await expect(page.getByRole('status')).toContainText('se cargó correctamente')
  await expect(page.getByText('01-contrato-sub-2026-014.txt', { exact: true })).toBeVisible()
})
