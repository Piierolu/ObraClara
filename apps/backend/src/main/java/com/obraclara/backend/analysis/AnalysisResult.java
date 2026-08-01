package com.obraclara.backend.analysis;

import java.util.List;

public record AnalysisResult(String documentType, String mode, List<FieldResult> fields, List<EvidenceResult> evidences) {
    public record FieldResult(String name, String rawValue, String normalizedValue, double confidence,
                              int page, String quote) {}
    public record EvidenceResult(String id, int page, String quote, String boundingBox) {}
}
