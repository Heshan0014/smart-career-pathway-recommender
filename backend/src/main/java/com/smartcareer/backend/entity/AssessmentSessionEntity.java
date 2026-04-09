package com.smartcareer.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "assessment_sessions")
public class AssessmentSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "detected_skills_json", nullable = false, columnDefinition = "TEXT")
    private String detectedSkillsJson;

    @Column(name = "questions_json", nullable = false, columnDefinition = "TEXT")
    private String questionsJson;

    @Column(name = "responses_json", columnDefinition = "TEXT")
    private String responsesJson;

    @Column(name = "behavior_metrics_json", columnDefinition = "TEXT")
    private String behaviorMetricsJson;

    @Column(name = "assessed_levels_json", columnDefinition = "TEXT")
    private String assessedLevelsJson;

    @Column(name = "mismatch_count")
    private Integer mismatchCount;

    @Column(name = "certificate_credibility_score")
    private Double certificateCredibilityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssessmentSessionStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public Long getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public String getDetectedSkillsJson() {
        return detectedSkillsJson;
    }

    public void setDetectedSkillsJson(String detectedSkillsJson) {
        this.detectedSkillsJson = detectedSkillsJson;
    }

    public String getQuestionsJson() {
        return questionsJson;
    }

    public void setQuestionsJson(String questionsJson) {
        this.questionsJson = questionsJson;
    }

    public String getResponsesJson() {
        return responsesJson;
    }

    public void setResponsesJson(String responsesJson) {
        this.responsesJson = responsesJson;
    }

    public String getBehaviorMetricsJson() {
        return behaviorMetricsJson;
    }

    public void setBehaviorMetricsJson(String behaviorMetricsJson) {
        this.behaviorMetricsJson = behaviorMetricsJson;
    }

    public String getAssessedLevelsJson() {
        return assessedLevelsJson;
    }

    public void setAssessedLevelsJson(String assessedLevelsJson) {
        this.assessedLevelsJson = assessedLevelsJson;
    }

    public Integer getMismatchCount() {
        return mismatchCount;
    }

    public void setMismatchCount(Integer mismatchCount) {
        this.mismatchCount = mismatchCount;
    }

    public Double getCertificateCredibilityScore() {
        return certificateCredibilityScore;
    }

    public void setCertificateCredibilityScore(Double certificateCredibilityScore) {
        this.certificateCredibilityScore = certificateCredibilityScore;
    }

    public AssessmentSessionStatus getStatus() {
        return status;
    }

    public void setStatus(AssessmentSessionStatus status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
