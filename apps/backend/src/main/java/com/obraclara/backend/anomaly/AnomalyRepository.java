package com.obraclara.backend.anomaly;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AnomalyRepository extends JpaRepository<Anomaly, String> {
    List<Anomaly> findAllByProjectIdAndOrganizationIdOrderByCreatedAtDesc(String projectId, String organizationId);
    List<Anomaly> findAllByDocumentIdAndOrganizationId(String documentId, String organizationId);
    Optional<Anomaly> findByIdAndOrganizationId(String id, String organizationId);
    long countByProjectIdAndOrganizationIdAndStatusIn(String projectId, String organizationId,
                                                       Collection<AnomalyStatus> statuses);
    long countByProjectIdAndOrganizationIdAndSeverityAndStatusIn(String projectId, String organizationId,
                                                                  String severity,
                                                                  Collection<AnomalyStatus> statuses);
    long countByOrganizationIdAndStatusIn(String organizationId, Collection<AnomalyStatus> statuses);
    long countByOrganizationIdAndSeverityAndStatusIn(String organizationId, String severity,
                                                       Collection<AnomalyStatus> statuses);
}
