package com.obraclara.backend.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExtractedFieldRepository extends JpaRepository<ExtractedField, String> {
    List<ExtractedField> findAllByDocumentIdAndOrganizationId(String documentId, String organizationId);
    List<ExtractedField> findAllByProjectIdAndOrganizationId(String projectId, String organizationId);
    List<ExtractedField> findAllByProjectIdAndOrganizationIdAndNameIgnoreCase(String projectId, String organizationId, String name);
    void deleteAllByDocumentId(String documentId);
}
