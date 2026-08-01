package com.obraclara.backend.project;

import com.obraclara.backend.anomaly.AnomalyRepository;
import com.obraclara.backend.anomaly.AnomalyStatus;
import com.obraclara.backend.audit.AuditEvent;
import com.obraclara.backend.audit.AuditEventRepository;
import com.obraclara.backend.common.ConflictException;
import com.obraclara.backend.common.NotFoundException;
import com.obraclara.backend.document.DocumentRepository;
import com.obraclara.backend.security.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private static final EnumSet<AnomalyStatus> ACTIVE_ANOMALY_STATUSES =
            EnumSet.of(AnomalyStatus.OPEN, AnomalyStatus.IN_REVIEW);

    private final ProjectRepository projects;
    private final DocumentRepository documents;
    private final AnomalyRepository anomalies;
    private final AuditEventRepository auditEvents;

    public ProjectController(ProjectRepository projects, DocumentRepository documents, AnomalyRepository anomalies,
                             AuditEventRepository auditEvents) {
        this.projects = projects;
        this.documents = documents;
        this.anomalies = anomalies;
        this.auditEvents = auditEvents;
    }

    @GetMapping
    List<ProjectView> list() {
        String organizationId = TenantContext.organizationId();
        return projects.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId)
                .stream().map(project -> view(project, organizationId)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ProjectView create(@Valid @RequestBody CreateProjectRequest request) {
        String organizationId = TenantContext.organizationId();
        String code = request.code().trim();
        if (projects.existsByOrganizationIdAndCode(organizationId, code)) {
            throw new ConflictException("Project code already exists for this organization");
        }
        Project project = new Project(UUID.randomUUID().toString(), organizationId, request.name().trim(), code,
                request.location().trim(), request.contractAmount());
        try {
            return view(projects.saveAndFlush(project), organizationId);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Project code already exists for this organization");
        }
    }

    @GetMapping("/{id}")
    ProjectView detail(@PathVariable String id) {
        String organizationId = TenantContext.organizationId();
        return view(projects.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new NotFoundException("Project not found")), organizationId);
    }

    private ProjectView view(Project project, String organizationId) {
        long documentCount = documents.countByProjectIdAndOrganizationId(project.getId(), organizationId);
        long openAnomalies = anomalies.countByProjectIdAndOrganizationIdAndStatusIn(
                project.getId(), organizationId, ACTIVE_ANOMALY_STATUSES);
        long criticalAnomalies = anomalies.countByProjectIdAndOrganizationIdAndSeverityAndStatusIn(
                project.getId(), organizationId, "CRITICAL", ACTIVE_ANOMALY_STATUSES);
        Instant lastActivity = auditEvents.findFirstByProjectIdAndOrganizationIdOrderByCreatedAtDesc(
                        project.getId(), organizationId)
                .map(AuditEvent::getCreatedAt).orElse(project.getCreatedAt());
        return new ProjectView(project.getId(), project.getName(), project.getCode(), project.getLocation(),
                project.getContractAmount(), project.getApprovedProgress(), project.getCreatedAt(), documentCount,
                openAnomalies, criticalAnomalies, lastActivity);
    }

    record CreateProjectRequest(@NotBlank @Size(max = 200) String name,
                                @NotBlank @Size(max = 60) String code,
                                @NotBlank @Size(max = 255) String location,
                                @NotNull @Positive @Digits(integer = 17, fraction = 2) BigDecimal contractAmount) {}

    record ProjectView(String id, String name, String code, String location, BigDecimal contractAmount,
                       BigDecimal approvedProgress, Instant createdAt, long documentCount, long openAnomalies,
                       long criticalAnomalies, Instant lastActivity) {}
}
