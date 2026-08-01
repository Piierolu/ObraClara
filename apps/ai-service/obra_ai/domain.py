from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Page:
    number: int
    text: str


@dataclass(frozen=True, slots=True)
class ExtractedField:
    name: str
    raw_value: str
    normalized_value: str
    confidence: float
    page: int
    quote: str


@dataclass(frozen=True, slots=True)
class Evidence:
    evidence_id: str
    page: int
    quote: str
    bounding_box: tuple[float, ...] = ()


@dataclass(frozen=True, slots=True)
class PiiFinding:
    type: str
    page: int
    masked_value: str


@dataclass(frozen=True, slots=True)
class ProcessedDocument:
    document_type: str
    pages: tuple[Page, ...]
    fields: tuple[ExtractedField, ...]
    evidences: tuple[Evidence, ...]
    pii_findings: tuple[PiiFinding, ...]
