package com.obraclara.backend.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface DocumentRepository extends JpaRepository<Document, String> {
    Optional<Document> findByIdAndOrganizationId(String id, String organizationId);
    List<Document> findAllByIdInAndOrganizationId(Collection<String> ids, String organizationId);
    List<Document> findAllByProjectIdAndOrganizationIdOrderByCreatedAtDesc(String projectId, String organizationId);
    long countByProjectIdAndOrganizationId(String projectId, String organizationId);
    long countByOrganizationId(String organizationId);
    long countByOrganizationIdAndStatus(String organizationId, DocumentStatus status);
}
