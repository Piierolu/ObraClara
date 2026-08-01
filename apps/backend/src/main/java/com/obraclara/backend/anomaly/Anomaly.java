package com.obraclara.backend.anomaly;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "anomalies")
public class Anomaly {
    @Id
    private String id;
    private String organizationId;
    private String projectId;
    private String documentId;
    @Enumerated(EnumType.STRING)
    private AnomalyType type;
    @Enumerated(EnumType.STRING)
    private AnomalyStatus status;
    private String severity;
    private String message;
    private String fieldNames;
    private Instant createdAt;
    private Instant updatedAt;

    protected Anomaly() {}

    public Anomaly(String id, String organizationId, String projectId, String documentId, AnomalyType type,
                   String severity, String message, String fieldNames) {
        this.id = id;
        this.organizationId = organizationId;
        this.projectId = projectId;
        this.documentId = documentId;
        this.type = type;
        this.status = AnomalyStatus.OPEN;
        this.severity = severity;
        this.message = message;
        this.fieldNames = fieldNames;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    public void review(AnomalyStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public void updateFinding(String severity, String message, String fieldNames) {
        this.severity = severity;
        this.message = message;
        this.fieldNames = fieldNames;
        this.updatedAt = Instant.now();
    }

    public void resolve() {
        this.status = AnomalyStatus.RESOLVED;
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public String getProjectId() { return projectId; }
    public String getDocumentId() { return documentId; }
    public AnomalyType getType() { return type; }
    public AnomalyStatus getStatus() { return status; }
    public String getSeverity() { return severity; }
    public String getMessage() { return message; }
    public String getFieldNames() { return fieldNames; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
