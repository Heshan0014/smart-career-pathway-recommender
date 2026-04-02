package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public class AdminStudentRowResponse {

    private Long id;

    @JsonProperty("full_name")
    private String fullName;

    private String email;

    @JsonProperty("profile_completion_percentage")
    private int profileCompletionPercentage;

    @JsonProperty("quiz_submitted")
    private boolean quizSubmitted;

    @JsonProperty("recommendation_eligible")
    private boolean recommendationEligible;

    @JsonProperty("last_updated_at")
    private Instant lastUpdatedAt;

    public AdminStudentRowResponse(
        Long id,
        String fullName,
        String email,
        int profileCompletionPercentage,
        boolean quizSubmitted,
        boolean recommendationEligible,
        Instant lastUpdatedAt
    ) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.profileCompletionPercentage = profileCompletionPercentage;
        this.quizSubmitted = quizSubmitted;
        this.recommendationEligible = recommendationEligible;
        this.lastUpdatedAt = lastUpdatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public int getProfileCompletionPercentage() {
        return profileCompletionPercentage;
    }

    public boolean isQuizSubmitted() {
        return quizSubmitted;
    }

    public boolean isRecommendationEligible() {
        return recommendationEligible;
    }

    public Instant getLastUpdatedAt() {
        return lastUpdatedAt;
    }
}
