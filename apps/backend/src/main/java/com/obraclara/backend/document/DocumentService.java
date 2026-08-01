package com.obraclara.backend.document;

import com.obraclara.backend.audit.AuditService;
import com.obraclara.backend.common.NotFoundException;
import com.obraclara.backend.project.ProjectRepository;
import com.obraclara.backend.security.TenantContext;
import com.obraclara.backend.storage.ObjectStorage;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {
    private final DocumentRepository documents;
    private final ProjectRepository projects;
    private final ObjectStorage storage;
    private final AuditService audit;

    public DocumentService(DocumentRepository documents, ProjectRepository projects, ObjectStorage storage,
                           AuditService audit) {
        this.documents = documents;
        this.projects = projects;
        this.storage = storage;
        this.audit = audit;
    }

    public Document upload(String projectId, MultipartFile file) {
        String organizationId = TenantContext.organizationId();
        projects.findByIdAndOrganizationId(projectId, organizationId)
                .orElseThrow(() -> new NotFoundException("Project not found"));
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        String filename = safeFileName(file.getOriginalFilename());
        String id = UUID.randomUUID().toString();
        try {
            String key = storage.store(organizationId, projectId, id, file.getInputStream());
            Document document = documents.save(new Document(id, organizationId, projectId, filename,
                    file.getContentType(), file.getSize(), key));
            audit.record(projectId, "DOCUMENT_UPLOADED", "DOCUMENT", id, filename);
            return document;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store uploaded file", exception);
        }
    }

    public Document get(String id) {
        return documents.findByIdAndOrganizationId(id, TenantContext.organizationId())
                .orElseThrow(() -> new NotFoundException("Document not found"));
    }

    public List<Document> list(String projectId) {
        String organizationId = TenantContext.organizationId();
        projects.findByIdAndOrganizationId(projectId, organizationId)
                .orElseThrow(() -> new NotFoundException("Project not found"));
        return documents.findAllByProjectIdAndOrganizationIdOrderByCreatedAtDesc(projectId, organizationId);
    }

    private String safeFileName(String original) {
        String filename = original == null ? "document" : original.replace('\\', '/');
        filename = filename.substring(filename.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (filename.isBlank()) filename = "document";
        return filename.length() > 255 ? filename.substring(filename.length() - 255) : filename;
    }
}
