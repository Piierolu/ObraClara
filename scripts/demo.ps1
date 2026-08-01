param(
    [string]$BaseUrl = "http://localhost:8080/api",
    [string]$ProjectId = "00000000-0000-0000-0000-000000000010"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$headers = @("Authorization: Bearer demo-admin")
$documents = @(
    "fixtures/documents/01-contrato-sub-2026-014.txt",
    "fixtures/documents/02-certificacion-avance-09.txt",
    "fixtures/documents/03-factura-fac-1042.txt"
)

foreach ($relativePath in $documents) {
    $path = Join-Path $root $relativePath
    Write-Host "Procesando $relativePath"
    & curl.exe --fail --silent --show-error -X POST `
        -H $headers[0] `
        -F "file=@$path;type=text/plain" `
        "$BaseUrl/projects/$ProjectId/documents"
    if ($LASTEXITCODE -ne 0) { throw "Fallo al cargar $relativePath" }
}

Write-Host "Hallazgos creados:"
& curl.exe --fail --silent --show-error `
    -H $headers[0] `
    "$BaseUrl/projects/$ProjectId/anomalies"
