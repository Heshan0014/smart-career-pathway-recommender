package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DetectedSkillResponse {

    @JsonProperty("skill_area")
    private String skillArea;

    @JsonProperty("claimed_level")
    private String claimedLevel;

    public DetectedSkillResponse(String skillArea, String claimedLevel) {
        this.skillArea = skillArea;
        this.claimedLevel = claimedLevel;
    }

    public String getSkillArea() {
        return skillArea;
    }

    public String getClaimedLevel() {
        return claimedLevel;
    }
}
