package com.obraclara.backend.audit;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id
    private String id;
    private String organizationId;
    private String projectId;
    private String actorUserId;
    private String action;
    private String entityType;
    private String entityId;
    private String details;
    private Instant createdAt;

    protected AuditEvent() {}

    public AuditEvent(String id, String organizationId, String projectId, String actorUserId, String action, String entityType,
                      String entityId, String details, Instant createdAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.projectId = projectId;
        this.actorUserId = actorUserId;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.details = details;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getProjectId() { return projectId; }
    public String getActorUserId() { return actorUserId; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public String getEntityId() { return entityId; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}
