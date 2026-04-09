package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

public class SubmitAssessmentResponse {

    @JsonProperty("verified_skills")
    private List<VerifiedSkillResponse> verifiedSkills;

    @JsonProperty("certificate_trust_reduced")
    private boolean certificateTrustReduced;

    @JsonProperty("mismatch_count")
    private int mismatchCount;

    @JsonProperty("overall_knowledge_level")
    private String overallKnowledgeLevel;

    @JsonProperty("question_results")
    private List<AssessmentQuestionResultResponse> questionResults;

    @JsonProperty("completed_at")
    private Instant completedAt;

    public SubmitAssessmentResponse(
        List<VerifiedSkillResponse> verifiedSkills,
        boolean certificateTrustReduced,
        int mismatchCount,
        String overallKnowledgeLevel,
        List<AssessmentQuestionResultResponse> questionResults,
        Instant completedAt
    ) {
        this.verifiedSkills = verifiedSkills;
        this.certificateTrustReduced = certificateTrustReduced;
        this.mismatchCount = mismatchCount;
        this.overallKnowledgeLevel = overallKnowledgeLevel;
        this.questionResults = questionResults;
        this.completedAt = completedAt;
    }

    public List<VerifiedSkillResponse> getVerifiedSkills() {
        return verifiedSkills;
    }

    public boolean isCertificateTrustReduced() {
        return certificateTrustReduced;
    }

    public int getMismatchCount() {
        return mismatchCount;
    }

    public String getOverallKnowledgeLevel() {
        return overallKnowledgeLevel;
    }

    public List<AssessmentQuestionResultResponse> getQuestionResults() {
        return questionResults;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }
}
