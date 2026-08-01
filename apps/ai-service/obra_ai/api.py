from __future__ import annotations

from fastapi import Body, FastAPI

from .container import processor, settings
from .evaluation import evaluate_cases, load_gold_cases
from .models import EvaluationMetrics, EvaluationRequest, HealthResponse

app = FastAPI(title="ObraClara AI Service", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="SERVING", mode=settings.mode)


@app.post("/api/v1/evaluate", response_model=EvaluationMetrics)
def evaluate(request: EvaluationRequest | None = Body(default=None)) -> EvaluationMetrics:
    supplied_cases = request is not None and request.cases is not None
    cases = request.cases if supplied_cases else load_gold_cases()
    return evaluate_cases(processor, cases or [], dataset="request" if supplied_cases else "packaged-gold-v1")
