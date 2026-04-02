package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

public class RecommendationResponse {

    @JsonProperty("primary_path")
    private String primaryPath;

    @JsonProperty("recommendation_summary")
    private String recommendationSummary;

    private List<String> reasons;

    @JsonProperty("next_steps")
    private List<String> nextSteps;

    private List<RecommendationOptionResponse> alternatives;

    @JsonProperty("generated_at")
    private Instant generatedAt;

    public RecommendationResponse(
        String primaryPath,
        String recommendationSummary,
        List<String> reasons,
        List<String> nextSteps,
        List<RecommendationOptionResponse> alternatives,
        Instant generatedAt
    ) {
        this.primaryPath = primaryPath;
        this.recommendationSummary = recommendationSummary;
        this.reasons = reasons;
        this.nextSteps = nextSteps;
        this.alternatives = alternatives;
        this.generatedAt = generatedAt;
    }

    public String getPrimaryPath() {
        return primaryPath;
    }

    public String getRecommendationSummary() {
        return recommendationSummary;
    }

    public List<String> getReasons() {
        return reasons;
    }

    public List<String> getNextSteps() {
        return nextSteps;
    }

    public List<RecommendationOptionResponse> getAlternatives() {
        return alternatives;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }
}
