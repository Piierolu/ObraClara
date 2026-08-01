from fastapi.testclient import TestClient

from obra_ai.api import app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "SERVING", "mode": "MOCK"}


def test_packaged_gold_evaluation_is_perfect():
    response = client.post("/api/v1/evaluate", json={})
    assert response.status_code == 200
    metrics = response.json()
    assert metrics["dataset"] == "packaged-gold-v1"
    assert metrics["cases"] == 5
    assert metrics["classification_accuracy"] == 1.0
    assert metrics["field_f1"] == 1.0


def test_custom_evaluation_reports_mismatch():
    response = client.post(
        "/api/v1/evaluate",
        json={
            "cases": [
                {
                    "name": "wrong-label",
                    "text": "Delivery note",
                    "expected_document_type": "INVOICE",
                    "expected_fields": {},
                }
            ]
        },
    )
    assert response.status_code == 200
    assert response.json()["classification_accuracy"] == 0.0
