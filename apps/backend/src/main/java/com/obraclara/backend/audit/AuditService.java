package com.obraclara.backend.audit;

import com.obraclara.backend.security.TenantContext;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuditService {
    private final AuditEventRepository events;

    public AuditService(AuditEventRepository events) {
        this.events = events;
    }

    public void record(String projectId, String action, String entityType, String entityId, String details) {
        var principal = TenantContext.current();
        events.save(new AuditEvent(UUID.randomUUID().toString(), principal.organizationId(), projectId, principal.userId(),
                action, entityType, entityId, details, Instant.now()));
    }
}
