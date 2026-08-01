package com.obraclara.backend.analysis;

import com.obraclara.backend.document.Document;

public interface DocumentAnalysisClient {
    AnalysisResult analyze(Document document, byte[] content);
}
