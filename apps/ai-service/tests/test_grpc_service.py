import asyncio

from obra_ai.codegen import ensure_generated

ensure_generated()

from obra_ai.generated import document_ai_pb2  # noqa: E402
from obra_ai.grpc_service import DocumentAiServicer  # noqa: E402


def test_grpc_process_document_maps_contract_response():
    request = document_ai_pb2.ProcessDocumentRequest(
        organization_id="org-1",
        file_name="invoice.txt",
        content=b"Invoice number: INV-7\nTotal: 25.00",
        idempotency_key="grpc-test",
    )
    response = asyncio.run(DocumentAiServicer().ProcessDocument(request, None))

    assert response.document_type == "INVOICE"
    assert response.fields[0].name == "invoice_number"
    assert response.fields[0].quote == "Invoice number: INV-7"
    assert response.evidences[0].page == 1


def test_grpc_health():
    response = asyncio.run(DocumentAiServicer().Health(document_ai_pb2.HealthRequest(), None))
    assert response.status == "SERVING"
    assert response.mode == "MOCK"
