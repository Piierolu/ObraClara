# ObraClara

ObraClara es un MVP de portafolio para auditar facturas de construccion contra contratos y certificaciones de avance. Cada hallazgo y respuesta conserva documento, pagina y fragmento exacto. Si no existe evidencia persistida, la API se niega a responder.

## Recorrido funcional

1. El usuario entra con el token de demostracion.
2. Carga contrato, certificacion y factura de una obra.
3. Temporal ejecuta el procesamiento durable.
4. Spring llama por gRPC al servicio Python.
5. Python clasifica, extrae campos, detecta PII y devuelve evidencia.
6. Java aplica reglas deterministas y persiste hallazgos multiempresa.
7. El revisor contrasta cada hallazgo con sus fuentes y registra su decision.

El modo `MOCK` no necesita claves de IA y es completamente reproducible.

## Inicio rapido

Requisitos: Docker Desktop con contenedores Linux y Docker Compose.

```powershell
docker compose up --build -d
docker compose ps
./scripts/demo.ps1
```

Abrir:

- Aplicacion: http://localhost:3000
- API: http://localhost:8080/actuator/health
- Servicio IA: http://localhost:8000/health
- Temporal UI: http://localhost:8088
- MinIO: http://localhost:9001
- Trazas Jaeger: http://localhost:16686

Credenciales MinIO: `obraclara` / `obraclara-secret`.

Token API de demostracion: `demo-admin`.

## Demo

El script `scripts/demo.ps1` carga, en orden:

- `01-contrato-sub-2026-014.txt`
- `02-certificacion-avance-09.txt`
- `03-factura-fac-1042.txt`

La factura debe generar diferencias de tarifa, cantidad, retencion, saldo contractual y aritmetica. Las reglas usan los campos del proyecto completo, pero cada cita debe coincidir literalmente con evidencia extraida y persistida.

Consulta de ejemplo desde la interfaz:

```text
¿Cual es la retencion facturada?
```

Consulta sin evidencia esperada:

```text
¿Quien aprobo el pago bancario?
```

La segunda debe responder: `No puedo responder con la evidencia disponible.`

## Componentes

| Ruta | Tecnologia | Responsabilidad |
|---|---|---|
| `apps/backend` | Java 21, Spring Boot | Tenancy, archivos, reglas, auditoria, API y Temporal |
| `apps/ai-service` | Python, FastAPI, gRPC | Lectura, clasificacion, extraccion, PII y evaluacion |
| `apps/web` | React, TypeScript, Vite | Dashboard, carga, revision y consultas |
| `contracts/proto` | Protocol Buffers | Contrato tipado Java-Python |
| `infra` | Docker Compose, OTel | Datos, almacenamiento, workflows y trazas |
| `fixtures` | Documentos sinteticos | Demo y evaluacion reproducible |

## Pruebas

```powershell
./scripts/test.ps1
```

Tambien pueden ejecutarse por componente:

```powershell
cd apps/web
npm test -- --run
npm run build

cd ../ai-service
python -m pytest
```

Maven no es necesario en el host: el backend se compila con la etapa `build` de su Dockerfile.

## Modos de ejecucion

- Compose usa PostgreSQL, MinIO, Temporal y gRPC reales.
- Las pruebas del backend usan H2, almacenamiento local y launcher local.
- `VITE_DEMO_MODE=true` activa datos visuales simulados sin backend.
- `docker compose --profile search up -d opensearch` levanta OpenSearch para la siguiente fase de indexacion hibrida.

## Limites conscientes del MVP

- Los PDF escaneados no tienen OCR de imagen; se aceptan PDF con texto y fixtures UTF-8.
- La consulta actual es extractiva y determinista, no generativa.
- OpenSearch y pgvector estan provisionados, pero la busqueda del recorrido vertical usa campos extraidos.
- La autenticacion por token fijo es exclusiva de demostracion.
- El workflow espera su resultado para mantener una experiencia sencilla de carga; Temporal conserva reintentos e historial.

Estas decisiones mantienen el proyecto ejecutable sin secretos y separan claramente el MVP de las extensiones productivas.
