package com.obraclara.backend.document;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "extracted_fields")
public class ExtractedField {
    @Id
    private String id;
    private String organizationId;
    private String projectId;
    private String documentId;
    private String name;
    private String rawValue;
    private String normalizedValue;
    private double confidence;
    private int pageNumber;
    private String quoteText;

    protected ExtractedField() {}

    public ExtractedField(String id, String organizationId, String projectId, String documentId, String name,
                          String rawValue, String normalizedValue, double confidence, int pageNumber, String quoteText) {
        this.id = id;
        this.organizationId = organizationId;
        this.projectId = projectId;
        this.documentId = documentId;
        this.name = name;
        this.rawValue = rawValue;
        this.normalizedValue = normalizedValue;
        this.confidence = confidence;
        this.pageNumber = pageNumber;
        this.quoteText = quoteText;
    }

    public String getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getProjectId() { return projectId; }
    public String getDocumentId() { return documentId; }
    public String getName() { return name; }
    public String getRawValue() { return rawValue; }
    public String getNormalizedValue() { return normalizedValue; }
    public double getConfidence() { return confidence; }
    public int getPageNumber() { return pageNumber; }
    public String getQuoteText() { return quoteText; }
}
