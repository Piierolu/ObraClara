# ObraClara AI service

Python 3.13 FastAPI and gRPC service for deterministic construction-document processing. No external model or API key is required in the default `MOCK` mode.

## Run locally

```bash
python -m venv .venv
python -m pip install -e ".[test]"
python -m obra_ai.codegen
python -m obra_ai.main
```

HTTP listens on `8000` and gRPC on `50051`. Configuration is through `AI_MODE`, `HTTP_HOST`, `HTTP_PORT`, `GRPC_HOST`, `GRPC_PORT`, and `IDEMPOTENCY_CACHE_SIZE`.

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/v1/evaluate -H "Content-Type: application/json" -d '{}'
pytest
```

Build the container from this directory so the vendored contract fallback is available:

```bash
docker build -t obraclara-ai .
docker run --rm -p 8000:8000 -p 50051:50051 obraclara-ai
```

`python -m obra_ai.codegen` prefers the repository contract at `../../contracts/proto/document_ai.proto`. A matching local copy is packaged for isolated Docker builds, where files outside the build context are unavailable. Generated Python files are build artifacts and are not committed.

## API behavior

- `GET /health` reports service mode and status.
- `POST /api/v1/evaluate` evaluates supplied gold cases, or the packaged five-document gold set when the body is empty.
- gRPC `DocumentAiService.ProcessDocument` accepts textual PDFs or UTF-8 fixture content and returns pages, classified type, normalized fields, exact line quotes, evidence, and masked PII findings.
- gRPC `DocumentAiService.Health` reports status and mode.

The mock extractor only processes embedded PDF text; image-only/scanned PDFs require OCR outside this MVP. Pattern matching is intentionally conservative and is not a replacement for human review.
