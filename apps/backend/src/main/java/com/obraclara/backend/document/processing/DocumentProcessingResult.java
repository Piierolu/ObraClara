package com.obraclara.backend.document.processing;

import com.obraclara.backend.document.Document;

import java.time.Instant;

public record DocumentProcessingResult(String documentId, String status, String processingMode,
                                       String failureReason, Instant processedAt) {
    public static DocumentProcessingResult from(Document document) {
        return new DocumentProcessingResult(document.getId(), document.getStatus().name(),
                document.getProcessingMode(), document.getFailureReason(), document.getProcessedAt());
    }
}
