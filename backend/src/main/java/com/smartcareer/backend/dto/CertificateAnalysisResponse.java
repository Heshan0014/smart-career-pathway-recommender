package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

public class CertificateAnalysisResponse {

    @JsonProperty("detected_skills")
    private List<DetectedSkillResponse> detectedSkills;

    @JsonProperty("analysis_summary")
    private String analysisSummary;

    @JsonProperty("analyzed_at")
    private Instant analyzedAt;

    public CertificateAnalysisResponse(
        List<DetectedSkillResponse> detectedSkills,
        String analysisSummary,
        Instant analyzedAt
    ) {
        this.detectedSkills = detectedSkills;
        this.analysisSummary = analysisSummary;
        this.analyzedAt = analyzedAt;
    }

    public List<DetectedSkillResponse> getDetectedSkills() {
        return detectedSkills;
    }

    public String getAnalysisSummary() {
        return analysisSummary;
    }

    public Instant getAnalyzedAt() {
        return analyzedAt;
    }
}
