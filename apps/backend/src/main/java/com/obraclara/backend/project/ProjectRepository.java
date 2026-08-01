package com.obraclara.backend.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findAllByOrganizationIdOrderByCreatedAtDesc(String organizationId);
    Optional<Project> findByIdAndOrganizationId(String id, String organizationId);
    boolean existsByOrganizationIdAndCode(String organizationId, String code);
    long countByOrganizationId(String organizationId);
}
