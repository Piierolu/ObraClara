package com.obraclara.backend.anomaly;

import com.obraclara.backend.audit.AuditService;
import com.obraclara.backend.common.NotFoundException;
import com.obraclara.backend.document.Document;
import com.obraclara.backend.document.DocumentRepository;
import com.obraclara.backend.document.EvidenceRepository;
import com.obraclara.backend.document.ExtractedField;
import com.obraclara.backend.document.ExtractedFieldRepository;
import com.obraclara.backend.project.ProjectRepository;
import com.obraclara.backend.review.ReviewDecision;
import com.obraclara.backend.review.ReviewDecisionRepository;
import com.obraclara.backend.security.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class AnomalyController {
    private final AnomalyRepository anomalies;
    private final ProjectRepository projects;
    private final ReviewDecisionRepository decisions;
    private final AuditService audit;
    private final ExtractedFieldRepository fields;
    private final EvidenceRepository evidences;
    private final DocumentRepository documents;

    public AnomalyController(AnomalyRepository anomalies, ProjectRepository projects,
                             ReviewDecisionRepository decisions, AuditService audit,
                             ExtractedFieldRepository fields, EvidenceRepository evidences,
                             DocumentRepository documents) {
        this.anomalies = anomalies;
        this.projects = projects;
        this.decisions = decisions;
        this.audit = audit;
        this.fields = fields;
        this.evidences = evidences;
        this.documents = documents;
    }

    @GetMapping("/projects/{projectId}/anomalies")
    List<AnomalyView> list(@PathVariable String projectId) {
        String organizationId = TenantContext.organizationId();
        projects.findByIdAndOrganizationId(projectId, organizationId)
                .orElseThrow(() -> new NotFoundException("Project not found"));
        return anomalies.findAllByProjectIdAndOrganizationIdOrderByCreatedAtDesc(projectId, organizationId)
                .stream().map(this::view).toList();
    }

    @PostMapping("/anomalies/{id}/review")
    @Transactional
    AnomalyView review(@PathVariable String id, @Valid @RequestBody ReviewRequest request) {
        var principal = TenantContext.current();
        Anomaly anomaly = anomalies.findByIdAndOrganizationId(id, principal.organizationId())
                .orElseThrow(() -> new NotFoundException("Anomaly not found"));
        anomaly.review(request.decision());
        decisions.save(new ReviewDecision(UUID.randomUUID().toString(), principal.organizationId(), id,
                principal.userId(), request.decision(), request.comment(), Instant.now()));
        audit.record(anomaly.getProjectId(), "ANOMALY_REVIEWED", "ANOMALY", id, request.decision().name());
        return view(anomalies.save(anomaly));
    }

    public record ReviewRequest(@NotNull AnomalyStatus decision,
                                @NotBlank @Size(max = 1000) String comment) {}

    private AnomalyView view(Anomaly anomaly) {
        String organizationId = TenantContext.organizationId();
        Set<String> anomalyFields = java.util.Arrays.stream(anomaly.getFieldNames().split(","))
                .map(name -> name.trim().toLowerCase(Locale.ROOT)).filter(name -> !name.isBlank())
                .collect(Collectors.toSet());
        List<ExtractedField> projectFields = fields.findAllByProjectIdAndOrganizationId(
                anomaly.getProjectId(), organizationId);
        List<ExtractedField> citedFields = anomalyFields.stream().flatMap(name -> {
            List<ExtractedField> matching = projectFields.stream()
                    .filter(field -> field.getName().equalsIgnoreCase(name)).toList();
            List<ExtractedField> current = matching.stream()
                    .filter(field -> anomaly.getDocumentId().equals(field.getDocumentId())).toList();
            return (current.isEmpty() ? matching : current).stream();
        }).toList();
        var projectEvidence = evidences.findAllByProjectIdAndOrganizationId(anomaly.getProjectId(), organizationId);
        Set<String> documentIds = citedFields.stream().map(ExtractedField::getDocumentId).collect(Collectors.toSet());
        Map<String, Document> sourceDocuments = documents.findAllByIdInAndOrganizationId(documentIds, organizationId)
                .stream().collect(Collectors.toMap(Document::getId, Function.identity()));
        List<EvidenceCitation> citations = citedFields.stream()
                .filter(field -> field.getQuoteText() != null && !field.getQuoteText().isBlank())
                .flatMap(field -> projectEvidence.stream()
                        .filter(evidence -> evidence.getDocumentId().equals(field.getDocumentId())
                                && field.getQuoteText().equals(evidence.getQuoteText()))
                        .map(evidence -> {
                            Document source = sourceDocuments.get(evidence.getDocumentId());
                            return source == null ? null : new EvidenceCitation(evidence.getId(), source.getId(),
                                    source.getOriginalFileName(), evidence.getPageNumber(), evidence.getQuoteText(),
                                    evidence.getBoundingBox());
                        }))
                .filter(java.util.Objects::nonNull).distinct().toList();
        return new AnomalyView(anomaly.getId(), anomaly.getProjectId(), anomaly.getDocumentId(), anomaly.getType(),
                anomaly.getStatus(), anomaly.getSeverity(), anomaly.getMessage(), anomaly.getFieldNames(), citations,
                anomaly.getCreatedAt(), anomaly.getUpdatedAt());
    }

    public record AnomalyView(String id, String projectId, String documentId, AnomalyType type,
                              AnomalyStatus status, String severity, String message, String fieldNames,
                              List<EvidenceCitation> evidence, Instant createdAt, Instant updatedAt) {}

    public record EvidenceCitation(String evidenceId, String documentId, String documentFileName, int page,
                                   String quote, String boundingBox) {}
}
