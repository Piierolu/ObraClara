package com.obraclara.backend.document;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "documents")
public class Document {
    @Id
    private String id;
    private String organizationId;
    private String projectId;
    private String originalFileName;
    private String contentType;
    private long sizeBytes;
    private String storageKey;
    @Enumerated(EnumType.STRING)
    private DocumentStatus status;
    private String documentType;
    private String processingMode;
    private String failureReason;
    private Instant createdAt;
    private Instant processedAt;

    protected Document() {}

    public Document(String id, String organizationId, String projectId, String originalFileName,
                    String contentType, long sizeBytes, String storageKey) {
        this.id = id;
        this.organizationId = organizationId;
        this.projectId = projectId;
        this.originalFileName = originalFileName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.storageKey = storageKey;
        this.status = DocumentStatus.UPLOADED;
        this.createdAt = Instant.now();
    }

    public void markProcessing() {
        status = DocumentStatus.PROCESSING;
        failureReason = null;
    }

    public void markProcessed(String documentType, String processingMode) {
        this.status = DocumentStatus.PROCESSED;
        this.documentType = documentType;
        this.processingMode = processingMode;
        this.processedAt = Instant.now();
    }

    public void markFailed(String reason) {
        this.status = DocumentStatus.FAILED;
        this.failureReason = reason;
    }

    public String getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getProjectId() { return projectId; }
    public String getOriginalFileName() { return originalFileName; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public String getStorageKey() { return storageKey; }
    public DocumentStatus getStatus() { return status; }
    public String getDocumentType() { return documentType; }
    public String getProcessingMode() { return processingMode; }
    public String getFailureReason() { return failureReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getProcessedAt() { return processedAt; }
}
