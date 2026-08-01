package com.obraclara.backend.analysis;

import com.google.protobuf.ByteString;
import com.obraclara.ai.v1.DocumentAiServiceGrpc;
import com.obraclara.ai.v1.ProcessDocumentRequest;
import com.obraclara.backend.document.Document;
import io.grpc.ManagedChannelBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class GrpcDocumentAnalysisClient implements DocumentAnalysisClient {
    private static final Logger log = LoggerFactory.getLogger(GrpcDocumentAnalysisClient.class);
    private final String address;
    private final FallbackDocumentAnalyzer fallback;

    public GrpcDocumentAnalysisClient(@Value("${obraclara.ai.grpc-address:}") String address,
                                      FallbackDocumentAnalyzer fallback) {
        this.address = address;
        this.fallback = fallback;
    }

    @Override
    public AnalysisResult analyze(Document document, byte[] content) {
        if (address == null || address.isBlank()) {
            return fallback.analyze(document, content);
        }
        var channel = ManagedChannelBuilder.forTarget(address).usePlaintext().build();
        try {
            var request = ProcessDocumentRequest.newBuilder()
                    .setOrganizationId(document.getOrganizationId())
                    .setProjectId(document.getProjectId())
                    .setDocumentId(document.getId())
                    .setFileName(document.getOriginalFileName())
                    .setContent(ByteString.copyFrom(content))
                    .setIdempotencyKey(document.getId())
                    .build();
            var response = DocumentAiServiceGrpc.newBlockingStub(channel)
                    .withDeadlineAfter(Duration.ofSeconds(30).toMillis(), TimeUnit.MILLISECONDS)
                    .processDocument(request);
            var fields = response.getFieldsList().stream().map(field -> new AnalysisResult.FieldResult(
                    field.getName(), field.getRawValue(), field.getNormalizedValue(), field.getConfidence(),
                    field.getPage(), field.getQuote())).toList();
            var evidences = response.getEvidencesList().stream().map(evidence -> new AnalysisResult.EvidenceResult(
                    evidence.getEvidenceId(), evidence.getPage(), evidence.getQuote(),
                    evidence.getBoundingBoxList().toString())).toList();
            return new AnalysisResult(response.getDocumentType(), "GRPC", fields, evidences);
        } catch (RuntimeException exception) {
            log.warn("AI gRPC processing unavailable; using deterministic fallback: {}", exception.getMessage());
            return fallback.analyze(document, content);
        } finally {
            channel.shutdownNow();
        }
    }
}
