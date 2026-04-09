package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

public class SkillVerificationStatusResponse {

    @JsonProperty("quiz_completed")
    private boolean quizCompleted;

    @JsonProperty("certification_stage_completed")
    private boolean certificationStageCompleted;

    @JsonProperty("assessment_stage_completed")
    private boolean assessmentStageCompleted;

    @JsonProperty("ready_for_assessment")
    private boolean readyForAssessment;

    @JsonProperty("ready_for_recommendation")
    private boolean readyForRecommendation;

    @JsonProperty("detected_skills")
    private List<DetectedSkillResponse> detectedSkills;

    @JsonProperty("verified_skills")
    private List<VerifiedSkillResponse> verifiedSkills;

    @JsonProperty("last_assessment_completed_at")
    private Instant lastAssessmentCompletedAt;

    public SkillVerificationStatusResponse(
        boolean quizCompleted,
        boolean certificationStageCompleted,
        boolean assessmentStageCompleted,
        boolean readyForAssessment,
        boolean readyForRecommendation,
        List<DetectedSkillResponse> detectedSkills,
        List<VerifiedSkillResponse> verifiedSkills,
        Instant lastAssessmentCompletedAt
    ) {
        this.quizCompleted = quizCompleted;
        this.certificationStageCompleted = certificationStageCompleted;
        this.assessmentStageCompleted = assessmentStageCompleted;
        this.readyForAssessment = readyForAssessment;
        this.readyForRecommendation = readyForRecommendation;
        this.detectedSkills = detectedSkills;
        this.verifiedSkills = verifiedSkills;
        this.lastAssessmentCompletedAt = lastAssessmentCompletedAt;
    }

    public boolean isQuizCompleted() {
        return quizCompleted;
    }

    public boolean isCertificationStageCompleted() {
        return certificationStageCompleted;
    }

    public boolean isAssessmentStageCompleted() {
        return assessmentStageCompleted;
    }

    public boolean isReadyForAssessment() {
        return readyForAssessment;
    }

    public boolean isReadyForRecommendation() {
        return readyForRecommendation;
    }

    public List<DetectedSkillResponse> getDetectedSkills() {
        return detectedSkills;
    }

    public List<VerifiedSkillResponse> getVerifiedSkills() {
        return verifiedSkills;
    }

    public Instant getLastAssessmentCompletedAt() {
        return lastAssessmentCompletedAt;
    }
}
