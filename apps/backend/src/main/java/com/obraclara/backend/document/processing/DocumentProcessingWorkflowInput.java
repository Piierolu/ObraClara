package com.obraclara.backend.document.processing;

public record DocumentProcessingWorkflowInput(String documentId, String organizationId, String userId,
                                              String displayName, String role) {
}
