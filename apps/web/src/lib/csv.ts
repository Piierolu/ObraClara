export type CsvValue = string | number | null | undefined

function escapeCsv(value: CsvValue): string {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(rows: CsvValue[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: CsvValue[][]): void {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function safeFilename(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'obraclara'
}
