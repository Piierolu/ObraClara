from __future__ import annotations

import grpc

from .codegen import ensure_generated
from .container import processor, settings
from .extractor import DocumentExtractionError

ensure_generated()

from .generated import document_ai_pb2, document_ai_pb2_grpc  # noqa: E402


class DocumentAiServicer(document_ai_pb2_grpc.DocumentAiServiceServicer):
    async def ProcessDocument(self, request, context):  # noqa: N802
        try:
            result = processor.process(
                content=request.content,
                file_name=request.file_name,
                organization_id=request.organization_id,
                idempotency_key=request.idempotency_key,
            )
        except DocumentExtractionError as exc:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(exc))

        return document_ai_pb2.ProcessDocumentResponse(
            document_type=result.document_type,
            pages=[document_ai_pb2.Page(number=page.number, text=page.text) for page in result.pages],
            fields=[
                document_ai_pb2.ExtractedField(
                    name=field.name,
                    raw_value=field.raw_value,
                    normalized_value=field.normalized_value,
                    confidence=field.confidence,
                    page=field.page,
                    quote=field.quote,
                )
                for field in result.fields
            ],
            evidences=[
                document_ai_pb2.Evidence(
                    evidence_id=evidence.evidence_id,
                    page=evidence.page,
                    quote=evidence.quote,
                    bounding_box=evidence.bounding_box,
                )
                for evidence in result.evidences
            ],
            pii_findings=[
                document_ai_pb2.PiiFinding(
                    type=finding.type,
                    page=finding.page,
                    masked_value=finding.masked_value,
                )
                for finding in result.pii_findings
            ],
        )

    async def Health(self, request, context):  # noqa: N802
        return document_ai_pb2.HealthResponse(status="SERVING", mode=settings.mode)


def add_to_server(server: grpc.aio.Server) -> None:
    document_ai_pb2_grpc.add_DocumentAiServiceServicer_to_server(DocumentAiServicer(), server)
