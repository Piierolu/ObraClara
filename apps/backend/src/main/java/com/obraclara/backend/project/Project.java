package com.obraclara.backend.project;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "projects")
public class Project {
    @Id
    private String id;
    private String organizationId;
    private String name;
    private String code;
    private String location;
    private BigDecimal contractAmount;
    private BigDecimal approvedProgress;
    private Instant createdAt;

    protected Project() {}

    public Project(String id, String organizationId, String name, String code, String location,
                   BigDecimal contractAmount) {
        this.id = id;
        this.organizationId = organizationId;
        this.name = name;
        this.code = code;
        this.location = location;
        this.contractAmount = contractAmount;
        this.approvedProgress = BigDecimal.ZERO;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public String getLocation() { return location; }
    public BigDecimal getContractAmount() { return contractAmount; }
    public BigDecimal getApprovedProgress() { return approvedProgress; }
    public Instant getCreatedAt() { return createdAt; }
}
