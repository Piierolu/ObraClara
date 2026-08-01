import { describe, expect, it } from 'vitest'
import { safeFilename, toCsv } from './csv'

describe('CSV helpers', () => {
  it('escapa comas, comillas y saltos de línea', () => {
    expect(toCsv([
      ['Proyecto', 'Detalle'],
      ['OC-01', 'Importe "revisado", con evidencia\nconfirmada'],
    ])).toBe('Proyecto,Detalle\r\nOC-01,"Importe ""revisado"", con evidencia\nconfirmada"')
  })

  it('crea nombres de archivo seguros', () => {
    expect(safeFilename('Obra Norte / OC-01')).toBe('obra-norte-oc-01')
  })
})
