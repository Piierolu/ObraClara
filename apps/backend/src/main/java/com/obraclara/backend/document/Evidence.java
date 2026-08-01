package com.obraclara.backend.document;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "evidences")
public class Evidence {
    @Id
    private String id;
    private String organizationId;
    private String projectId;
    private String documentId;
    private int pageNumber;
    private String quoteText;
    private String boundingBox;

    protected Evidence() {}

    public Evidence(String id, String organizationId, String projectId, String documentId, int pageNumber,
                    String quoteText, String boundingBox) {
        this.id = id;
        this.organizationId = organizationId;
        this.projectId = projectId;
        this.documentId = documentId;
        this.pageNumber = pageNumber;
        this.quoteText = quoteText;
        this.boundingBox = boundingBox;
    }

    public String getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getProjectId() { return projectId; }
    public String getDocumentId() { return documentId; }
    public int getPageNumber() { return pageNumber; }
    public String getQuoteText() { return quoteText; }
    public String getBoundingBox() { return boundingBox; }
}
