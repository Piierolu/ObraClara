package com.obraclara.backend.document.processing;

import com.obraclara.backend.document.Document;
import com.obraclara.backend.document.DocumentProcessingService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "obraclara.temporal.enabled", havingValue = "false", matchIfMissing = true)
public class LocalDocumentProcessingLauncher implements DocumentProcessingLauncher {
    private final DocumentProcessingService processingService;

    public LocalDocumentProcessingLauncher(DocumentProcessingService processingService) {
        this.processingService = processingService;
    }

    @Override
    public Document process(String documentId) {
        return processingService.process(documentId);
    }
}
