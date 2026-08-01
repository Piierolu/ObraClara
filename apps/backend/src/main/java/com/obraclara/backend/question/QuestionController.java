package com.obraclara.backend.question;

import com.obraclara.backend.common.NotFoundException;
import com.obraclara.backend.document.Document;
import com.obraclara.backend.document.DocumentRepository;
import com.obraclara.backend.document.Evidence;
import com.obraclara.backend.document.EvidenceRepository;
import com.obraclara.backend.document.ExtractedField;
import com.obraclara.backend.document.ExtractedFieldRepository;
import com.obraclara.backend.project.ProjectRepository;
import com.obraclara.backend.security.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectId}/questions")
public class QuestionController {
    static final String NO_EVIDENCE = "No puedo responder con la evidencia disponible.";
    private final ProjectRepository projects;
    private final ExtractedFieldRepository fields;
    private final EvidenceRepository evidences;
    private final DocumentRepository documents;

    public QuestionController(ProjectRepository projects, ExtractedFieldRepository fields, EvidenceRepository evidences,
                              DocumentRepository documents) {
        this.projects = projects;
        this.fields = fields;
        this.evidences = evidences;
        this.documents = documents;
    }

    @GetMapping
    QuestionAnswer lookup(@PathVariable String projectId, @RequestParam @NotBlank String field) {
        String organizationId = TenantContext.organizationId();
        projects.findByIdAndOrganizationId(projectId, organizationId)
                .orElseThrow(() -> new NotFoundException("Project not found"));
        var matches = fields.findAllByProjectIdAndOrganizationIdAndNameIgnoreCase(projectId, organizationId, field);
        if (matches.isEmpty()) {
            throw new NotFoundException("No extracted answer found for field: " + field);
        }
        var answers = matches.stream().map(match -> {
            var citations = evidences.findAllByDocumentIdAndOrganizationId(match.getDocumentId(), organizationId).stream()
                    .filter(evidence -> match.getQuoteText() != null && match.getQuoteText().equals(evidence.getQuoteText()))
                    .map(evidence -> new Citation(evidence.getId(), evidence.getPageNumber(), evidence.getQuoteText(),
                            evidence.getBoundingBox())).toList();
            return new Answer(match.getDocumentId(), match.getName(), match.getNormalizedValue(), match.getRawValue(),
                    match.getConfidence(), citations);
        }).toList();
        return new QuestionAnswer(field, answers);
    }

    @PostMapping
    NaturalLanguageAnswer ask(@PathVariable String projectId, @Valid @RequestBody QuestionRequest request) {
        String organizationId = TenantContext.organizationId();
        projects.findByIdAndOrganizationId(projectId, organizationId)
                .orElseThrow(() -> new NotFoundException("Project not found"));
        List<String> candidates = candidatesFor(request.question());
        if (candidates.isEmpty()) {
            return refusal(request.question());
        }

        List<Document> projectDocuments = documents.findAllByProjectIdAndOrganizationIdOrderByCreatedAtDesc(
                projectId, organizationId);
        Map<String, Document> documentsById = projectDocuments.stream()
                .collect(Collectors.toMap(Document::getId, Function.identity()));
        Map<String, Integer> documentOrder = new java.util.HashMap<>();
        for (int index = 0; index < projectDocuments.size(); index++) {
            documentOrder.put(projectDocuments.get(index).getId(), index);
        }
        List<Evidence> projectEvidence = evidences.findAllByProjectIdAndOrganizationId(projectId, organizationId);

        for (String candidate : candidates) {
            List<ExtractedField> matches = fields.findAllByProjectIdAndOrganizationIdAndNameIgnoreCase(
                            projectId, organizationId, candidate).stream()
                    .sorted(Comparator.comparingInt(field -> documentOrder.getOrDefault(field.getDocumentId(), Integer.MAX_VALUE)))
                    .toList();
            for (ExtractedField match : matches) {
                if (match.getQuoteText() == null || match.getQuoteText().isBlank()) continue;
                List<SourceCitation> citations = projectEvidence.stream()
                        .filter(evidence -> evidence.getDocumentId().equals(match.getDocumentId())
                                && match.getQuoteText().equals(evidence.getQuoteText()))
                        .map(evidence -> citation(evidence, documentsById.get(evidence.getDocumentId())))
                        .filter(java.util.Objects::nonNull).toList();
                if (!citations.isEmpty()) {
                    String value = match.getNormalizedValue() == null || match.getNormalizedValue().isBlank()
                            ? match.getRawValue() : match.getNormalizedValue();
                    return new NaturalLanguageAnswer(request.question(), true, match.getName(),
                            "Según la evidencia disponible, " + match.getName() + " es " + value + ".", value, citations);
                }
            }
        }
        return refusal(request.question());
    }

    private List<String> candidatesFor(String question) {
        String normalized = Normalizer.normalize(question.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("[^a-z0-9]+", " ").trim();
        boolean contract = containsAny(normalized, "contract", "contrato", "contractual");
        boolean billed = containsAny(normalized, "billed", "invoice", "factura", "facturado", "cobrado");
        if (containsAny(normalized, "retention", "retencion")) {
            if (contract) return List.of("contract_retention_percent", "retention_percent");
            if (billed) return List.of("billed_retention_percent", "retention_percent");
            return List.of("billed_retention_percent", "contract_retention_percent", "retention_percent");
        }
        if (containsAny(normalized, "certified quantity", "cantidad certificada", "progress quantity",
                "cantidad de avance", "approved quantity", "cantidad aprobada")) {
            return List.of("certified_quantity", "progress_quantity", "approved_quantity");
        }
        if (containsAny(normalized, "quantity", "cantidad")) {
            return List.of("quantity", "billed_quantity", "certified_quantity");
        }
        if (containsAny(normalized, "rate", "tarifa", "unit price", "precio unitario")) {
            if (contract) return List.of("contract_rate", "unit_rate", "billed_rate");
            return List.of("unit_rate", "billed_rate", "contract_rate");
        }
        if (containsAny(normalized, "subtotal")) return List.of("subtotal", "line_subtotal");
        if (containsAny(normalized, "tax", "impuesto", "iva")) return List.of("tax", "tax_amount");
        if (containsAny(normalized, "total", "importe total", "monto total")) return List.of("total", "total_amount");
        if (contract && containsAny(normalized, "limit", "limite", "amount", "monto", "valor", "importe")) {
            return List.of("contract_limit", "contract_amount");
        }
        if (containsAny(normalized, "prior payments", "pagos previos", "pagado anteriormente")) {
            return List.of("prior_payments");
        }
        if (containsAny(normalized, "current payment", "pago actual")) return List.of("current_payment");
        return List.of();
    }

    private boolean containsAny(String question, String... terms) {
        for (String term : terms) if (question.contains(term)) return true;
        return false;
    }

    private SourceCitation citation(Evidence evidence, Document document) {
        if (document == null || evidence.getQuoteText() == null || evidence.getQuoteText().isBlank()) return null;
        return new SourceCitation(evidence.getId(), document.getId(), document.getOriginalFileName(),
                evidence.getPageNumber(), evidence.getQuoteText(), evidence.getBoundingBox());
    }

    private NaturalLanguageAnswer refusal(String question) {
        return new NaturalLanguageAnswer(question, false, null, NO_EVIDENCE, null, List.of());
    }

    record QuestionAnswer(String field, List<Answer> answers) {}
    record Answer(String documentId, String field, String value, String rawValue, double confidence,
                  List<Citation> evidence) {}
    record Citation(String evidenceId, int page, String quote, String boundingBox) {}
    record QuestionRequest(@NotBlank @Size(max = 500) String question) {}
    record NaturalLanguageAnswer(String question, boolean answered, String field, String answer, String value,
                                 List<SourceCitation> evidence) {}
    record SourceCitation(String evidenceId, String documentId, String documentFileName, int page, String quote,
                          String boundingBox) {}
}
