package com.obraclara.backend.review;

import com.obraclara.backend.anomaly.AnomalyStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "review_decisions")
public class ReviewDecision {
    @Id
    private String id;
    private String organizationId;
    private String anomalyId;
    private String reviewerUserId;
    @Enumerated(EnumType.STRING)
    private AnomalyStatus decision;
    private String commentText;
    private Instant createdAt;

    protected ReviewDecision() {}

    public ReviewDecision(String id, String organizationId, String anomalyId, String reviewerUserId,
                          AnomalyStatus decision, String commentText, Instant createdAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.anomalyId = anomalyId;
        this.reviewerUserId = reviewerUserId;
        this.decision = decision;
        this.commentText = commentText;
        this.createdAt = createdAt;
    }
}
