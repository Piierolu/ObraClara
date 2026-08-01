package com.obraclara.backend.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AuditEventRepository extends JpaRepository<AuditEvent, String> {
    List<AuditEvent> findAllByProjectIdAndOrganizationIdOrderByCreatedAtDesc(String projectId, String organizationId);
    Optional<AuditEvent> findFirstByProjectIdAndOrganizationIdOrderByCreatedAtDesc(String projectId,
                                                                                    String organizationId);
}
