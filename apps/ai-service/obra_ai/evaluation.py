from __future__ import annotations

import json
from importlib.resources import files

from .models import EvaluationMetrics, GoldCase
from .processor import DocumentProcessor


def load_gold_cases() -> list[GoldCase]:
    path = files("obra_ai").joinpath("data/gold_dataset.json")
    return [GoldCase.model_validate(case) for case in json.loads(path.read_text(encoding="utf-8"))]


def evaluate_cases(
    processor: DocumentProcessor,
    cases: list[GoldCase],
    *,
    dataset: str,
) -> EvaluationMetrics:
    classification_matches = 0
    true_positives = 0
    false_positives = 0
    false_negatives = 0

    for case in cases:
        result = processor.process(content=case.text.encode(), file_name=f"{case.name}.txt")
        if result.document_type == case.expected_document_type:
            classification_matches += 1
        predicted = {field.name: field.normalized_value for field in result.fields}
        for name, value in predicted.items():
            if case.expected_fields.get(name) == value:
                true_positives += 1
            else:
                false_positives += 1
        false_negatives += sum(
            1 for name, value in case.expected_fields.items() if predicted.get(name) != value
        )

    precision = true_positives / (true_positives + false_positives) if true_positives + false_positives else 1.0
    recall = true_positives / (true_positives + false_negatives) if true_positives + false_negatives else 1.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    count = len(cases)
    return EvaluationMetrics(
        dataset=dataset,
        cases=count,
        classification_accuracy=classification_matches / count if count else 0.0,
        field_precision=precision,
        field_recall=recall,
        field_f1=f1,
        exact_field_matches=true_positives,
        expected_fields=true_positives + false_negatives,
    )
