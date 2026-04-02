package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RecommendationOptionResponse {

    @JsonProperty("career_path")
    private String careerPath;

    private int score;

    @JsonProperty("fit_label")
    private String fitLabel;

    public RecommendationOptionResponse(String careerPath, int score, String fitLabel) {
        this.careerPath = careerPath;
        this.score = score;
        this.fitLabel = fitLabel;
    }

    public String getCareerPath() {
        return careerPath;
    }

    public int getScore() {
        return score;
    }

    public String getFitLabel() {
        return fitLabel;
    }
}
