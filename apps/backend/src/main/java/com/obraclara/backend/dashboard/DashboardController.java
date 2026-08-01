package com.obraclara.backend.dashboard;

import com.obraclara.backend.anomaly.AnomalyRepository;
import com.obraclara.backend.anomaly.AnomalyStatus;
import com.obraclara.backend.document.DocumentRepository;
import com.obraclara.backend.document.DocumentStatus;
import com.obraclara.backend.project.ProjectRepository;
import com.obraclara.backend.security.TenantContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumSet;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private static final EnumSet<AnomalyStatus> ACTIVE_ANOMALY_STATUSES =
            EnumSet.of(AnomalyStatus.OPEN, AnomalyStatus.IN_REVIEW);

    private final ProjectRepository projects;
    private final DocumentRepository documents;
    private final AnomalyRepository anomalies;

    public DashboardController(ProjectRepository projects, DocumentRepository documents, AnomalyRepository anomalies) {
        this.projects = projects;
        this.documents = documents;
        this.anomalies = anomalies;
    }

    @GetMapping
    DashboardView dashboard() {
        String organizationId = TenantContext.organizationId();
        return new DashboardView(projects.countByOrganizationId(organizationId),
                documents.countByOrganizationId(organizationId),
                documents.countByOrganizationIdAndStatus(organizationId, DocumentStatus.PROCESSED),
                documents.countByOrganizationIdAndStatus(organizationId, DocumentStatus.FAILED),
                anomalies.countByOrganizationIdAndStatusIn(organizationId, ACTIVE_ANOMALY_STATUSES),
                anomalies.countByOrganizationIdAndSeverityAndStatusIn(
                        organizationId, "CRITICAL", ACTIVE_ANOMALY_STATUSES));
    }

    record DashboardView(long projects, long documents, long processedDocuments, long failedDocuments,
                         long openAnomalies, long criticalFindings) {}
}
