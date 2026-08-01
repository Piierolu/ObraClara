$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Push-Location (Join-Path $root "apps/web")
try {
    npm test -- --run
    npm run build
} finally {
    Pop-Location
}

Push-Location (Join-Path $root "apps/ai-service")
try {
    python -m pytest
} finally {
    Pop-Location
}

docker build --target build -f (Join-Path $root "apps/backend/Dockerfile") $root
