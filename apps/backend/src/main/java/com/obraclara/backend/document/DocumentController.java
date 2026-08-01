package com.obraclara.backend.document;

import com.obraclara.backend.document.processing.DocumentProcessingLauncher;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api")
public class DocumentController {
    private final DocumentService documentService;
    private final DocumentProcessingLauncher processingLauncher;

    public DocumentController(DocumentService documentService, DocumentProcessingLauncher processingLauncher) {
        this.documentService = documentService;
        this.processingLauncher = processingLauncher;
    }

    @PostMapping(value = "/projects/{projectId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    DocumentView upload(@PathVariable String projectId, @RequestParam("file") MultipartFile file) {
        Document uploaded = documentService.upload(projectId, file);
        return DocumentView.from(processingLauncher.process(uploaded.getId()));
    }

    @GetMapping("/projects/{projectId}/documents")
    List<DocumentView> list(@PathVariable String projectId) {
        return documentService.list(projectId).stream().map(DocumentView::from).toList();
    }

    @GetMapping("/documents/status")
    List<DocumentView> statuses(@RequestParam @NotBlank String projectId) {
        return list(projectId);
    }

    @GetMapping("/documents/{id}/status")
    DocumentView status(@PathVariable String id) {
        return DocumentView.from(documentService.get(id));
    }

    @PostMapping("/documents/{id}/process")
    DocumentView process(@PathVariable String id) {
        return DocumentView.from(processingLauncher.process(id));
    }

    public record DocumentView(String id, String projectId, String originalFileName, String contentType,
                               long sizeBytes, DocumentStatus status, String documentType, String processingMode,
                               String failureReason, Instant createdAt, Instant processedAt) {
        static DocumentView from(Document document) {
            return new DocumentView(document.getId(), document.getProjectId(), document.getOriginalFileName(),
                    document.getContentType(), document.getSizeBytes(), document.getStatus(), document.getDocumentType(),
                    document.getProcessingMode(), document.getFailureReason(), document.getCreatedAt(), document.getProcessedAt());
        }
    }
}
