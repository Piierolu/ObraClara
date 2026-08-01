from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class GoldCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    text: str = Field(min_length=1)
    expected_document_type: str = Field(min_length=1)
    expected_fields: dict[str, str] = Field(default_factory=dict)


class EvaluationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cases: list[GoldCase] | None = Field(default=None, min_length=1)


class EvaluationMetrics(BaseModel):
    dataset: str
    cases: int
    classification_accuracy: float
    field_precision: float
    field_recall: float
    field_f1: float
    exact_field_matches: int
    expected_fields: int


class HealthResponse(BaseModel):
    status: str
    mode: str
