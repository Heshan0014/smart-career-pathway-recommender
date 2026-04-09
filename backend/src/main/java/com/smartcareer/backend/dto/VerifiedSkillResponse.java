package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VerifiedSkillResponse {

    @JsonProperty("skill_area")
    private String skillArea;

    @JsonProperty("claimed_level")
    private String claimedLevel;

    @JsonProperty("assessed_level")
    private String assessedLevel;

    @JsonProperty("verified_level")
    private String verifiedLevel;

    @JsonProperty("levels_matched")
    private boolean levelsMatched;

    @JsonProperty("certificate_credibility")
    private double certificateCredibility;

    public VerifiedSkillResponse(
        String skillArea,
        String claimedLevel,
        String assessedLevel,
        String verifiedLevel,
        boolean levelsMatched,
        double certificateCredibility
    ) {
        this.skillArea = skillArea;
        this.claimedLevel = claimedLevel;
        this.assessedLevel = assessedLevel;
        this.verifiedLevel = verifiedLevel;
        this.levelsMatched = levelsMatched;
        this.certificateCredibility = certificateCredibility;
    }

    public String getSkillArea() {
        return skillArea;
    }

    public String getClaimedLevel() {
        return claimedLevel;
    }

    public String getAssessedLevel() {
        return assessedLevel;
    }

    public String getVerifiedLevel() {
        return verifiedLevel;
    }

    public boolean isLevelsMatched() {
        return levelsMatched;
    }

    public double getCertificateCredibility() {
        return certificateCredibility;
    }
}
