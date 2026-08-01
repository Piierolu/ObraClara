package com.obraclara.backend.document.processing;

import com.obraclara.backend.document.Document;

public interface DocumentProcessingLauncher {
    Document process(String documentId);
}
