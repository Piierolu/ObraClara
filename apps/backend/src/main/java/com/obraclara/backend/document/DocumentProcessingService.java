package com.obraclara.backend.document;

import com.obraclara.backend.analysis.DocumentAnalysisClient;
import com.obraclara.backend.anomaly.Anomaly;
import com.obraclara.backend.anomaly.AnomalyRepository;
import com.obraclara.backend.anomaly.AnomalyRuleEngine;
import com.obraclara.backend.audit.AuditService;
import com.obraclara.backend.storage.ObjectStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentProcessingService {
    private final DocumentService documentService;
    private final DocumentRepository documents;
    private final ExtractedFieldRepository fields;
    private final EvidenceRepository evidences;
    private final AnomalyRepository anomalies;
    private final AnomalyRuleEngine ruleEngine;
    private final DocumentAnalysisClient analysisClient;
    private final ObjectStorage storage;
    private final AuditService audit;

    public DocumentProcessingService(DocumentService documentService, DocumentRepository documents,
                                     ExtractedFieldRepository fields, EvidenceRepository evidences,
                                     AnomalyRepository anomalies, AnomalyRuleEngine ruleEngine,
                                     DocumentAnalysisClient analysisClient, ObjectStorage storage, AuditService audit) {
        this.documentService = documentService;
        this.documents = documents;
        this.fields = fields;
        this.evidences = evidences;
        this.anomalies = anomalies;
        this.ruleEngine = ruleEngine;
        this.analysisClient = analysisClient;
        this.storage = storage;
        this.audit = audit;
    }

    @Transactional
    public Document process(String documentId) {
        Document document = documentService.get(documentId);
        document.markProcessing();
        documents.save(document);
        try {
            var result = analysisClient.analyze(document, storage.read(document.getStorageKey()));
            List<Anomaly> existingAnomalies = anomalies.findAllByDocumentIdAndOrganizationId(
                    documentId, document.getOrganizationId());
            fields.deleteAllByDocumentId(documentId);
            evidences.deleteAllByDocumentId(documentId);
            result.fields().forEach(field -> fields.save(new ExtractedField(UUID.randomUUID().toString(),
                    document.getOrganizationId(), document.getProjectId(), documentId, field.name(), field.rawValue(),
                    field.normalizedValue(), field.confidence(), field.page(), field.quote())));
            result.evidences().forEach(evidence -> evidences.save(new Evidence(UUID.randomUUID().toString(),
                    document.getOrganizationId(), document.getProjectId(), documentId, evidence.page(),
                    evidence.quote(), evidence.boundingBox())));
            var projectFields = new LinkedHashMap<String, com.obraclara.backend.analysis.AnalysisResult.FieldResult>();
            fields.findAllByProjectIdAndOrganizationId(document.getProjectId(), document.getOrganizationId()).stream()
                    .filter(field -> !documentId.equals(field.getDocumentId()))
                    .forEach(field -> projectFields.putIfAbsent(field.getName().toLowerCase(Locale.ROOT),
                            new com.obraclara.backend.analysis.AnalysisResult.FieldResult(field.getName(),
                                    field.getRawValue(), field.getNormalizedValue(), field.getConfidence(),
                                    field.getPageNumber(), field.getQuoteText())));
            result.fields().forEach(field -> projectFields.put(field.name().toLowerCase(Locale.ROOT), field));
            var projectEvidence = evidences.findAllByProjectIdAndOrganizationId(
                             document.getProjectId(), document.getOrganizationId()).stream()
                    .map(evidence -> new com.obraclara.backend.analysis.AnalysisResult.EvidenceResult(evidence.getId(),
                            evidence.getPageNumber(), evidence.getQuoteText(), evidence.getBoundingBox())).toList();
            reconcileAnomalies(document,
                    ruleEngine.evaluate(projectFields.values().stream().toList(), projectEvidence),
                    existingAnomalies);
            document.markProcessed(result.documentType(), result.mode());
            audit.record(document.getProjectId(), "DOCUMENT_PROCESSED", "DOCUMENT", documentId, result.mode());
        } catch (Exception exception) {
            document.markFailed(exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage());
            audit.record(document.getProjectId(), "DOCUMENT_PROCESSING_FAILED", "DOCUMENT", documentId,
                    document.getFailureReason());
        }
        return documents.save(document);
    }

    private void reconcileAnomalies(Document document, List<AnomalyRuleEngine.Finding> findings,
                                    List<Anomaly> existingAnomalies) {
        Map<FindingKey, ArrayDeque<Anomaly>> existingByKey = new LinkedHashMap<>();
        existingAnomalies.forEach(anomaly -> existingByKey
                .computeIfAbsent(new FindingKey(anomaly.getType(), normalizeFieldNames(anomaly.getFieldNames())),
                        ignored -> new ArrayDeque<>())
                .add(anomaly));

        List<Anomaly> reconciled = new ArrayList<>();
        for (var finding : findings) {
            var matches = existingByKey.get(new FindingKey(finding.type(), normalizeFieldNames(finding.fieldNames())));
            Anomaly anomaly = matches == null ? null : matches.pollFirst();
            if (anomaly == null) {
                anomaly = new Anomaly(UUID.randomUUID().toString(), document.getOrganizationId(),
                        document.getProjectId(), document.getId(), finding.type(), finding.severity(),
                        finding.message(), finding.fieldNames());
            } else {
                anomaly.updateFinding(finding.severity(), finding.message(), finding.fieldNames());
            }
            reconciled.add(anomaly);
        }
        existingByKey.values().forEach(unmatched -> unmatched.forEach(anomaly -> {
            anomaly.resolve();
            reconciled.add(anomaly);
        }));
        anomalies.saveAll(reconciled);
    }

    private String normalizeFieldNames(String fieldNames) {
        if (fieldNames == null || fieldNames.isBlank()) {
            return "";
        }
        return Arrays.stream(fieldNames.split(","))
                .map(String::trim)
                .filter(name -> !name.isBlank())
                .map(name -> name.toLowerCase(Locale.ROOT))
                .distinct()
                .sorted()
                .collect(Collectors.joining(","));
    }

    private record FindingKey(com.obraclara.backend.anomaly.AnomalyType type, String fieldNames) {}
}
