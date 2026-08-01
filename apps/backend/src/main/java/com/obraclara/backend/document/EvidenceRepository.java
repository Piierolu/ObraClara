package com.obraclara.backend.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvidenceRepository extends JpaRepository<Evidence, String> {
    List<Evidence> findAllByDocumentIdAndOrganizationId(String documentId, String organizationId);
    List<Evidence> findAllByProjectIdAndOrganizationId(String projectId, String organizationId);
    void deleteAllByDocumentId(String documentId);
}
