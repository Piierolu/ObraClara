package com.obraclara.backend.audit;

import com.obraclara.backend.common.NotFoundException;
import com.obraclara.backend.project.ProjectRepository;
import com.obraclara.backend.security.TenantContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/audit-events")
public class AuditController {
    private final ProjectRepository projects;
    private final AuditEventRepository events;

    public AuditController(ProjectRepository projects, AuditEventRepository events) {
        this.projects = projects;
        this.events = events;
    }

    @GetMapping
    List<AuditEventView> list(@PathVariable String projectId) {
        String organizationId = TenantContext.organizationId();
        projects.findByIdAndOrganizationId(projectId, organizationId)
                .orElseThrow(() -> new NotFoundException("Project not found"));
        return events.findAllByProjectIdAndOrganizationIdOrderByCreatedAtDesc(projectId, organizationId)
                .stream().map(AuditEventView::from).toList();
    }

    record AuditEventView(String id, String actorUserId, String action, String entityType, String entityId,
                          String details, Instant createdAt) {
        static AuditEventView from(AuditEvent event) {
            return new AuditEventView(event.getId(), event.getActorUserId(), event.getAction(), event.getEntityType(),
                    event.getEntityId(), event.getDetails(), event.getCreatedAt());
        }
    }
}
