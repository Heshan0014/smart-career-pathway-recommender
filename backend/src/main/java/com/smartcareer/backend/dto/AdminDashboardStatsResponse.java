package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public class AdminDashboardStatsResponse {

    @JsonProperty("total_students")
    private long totalStudents;

    @JsonProperty("completed_profiles")
    private long completedProfiles;

    @JsonProperty("pending_profiles")
    private long pendingProfiles;

    @JsonProperty("quiz_submitted_count")
    private long quizSubmittedCount;

    @JsonProperty("assessment_completed_count")
    private long assessmentCompletedCount;

    @JsonProperty("recommendation_ready_count")
    private long recommendationReadyCount;

    @JsonProperty("last_refreshed_at")
    private Instant lastRefreshedAt;

    public AdminDashboardStatsResponse(
        long totalStudents,
        long completedProfiles,
        long pendingProfiles,
        long quizSubmittedCount,
        long assessmentCompletedCount,
        long recommendationReadyCount,
        Instant lastRefreshedAt
    ) {
        this.totalStudents = totalStudents;
        this.completedProfiles = completedProfiles;
        this.pendingProfiles = pendingProfiles;
        this.quizSubmittedCount = quizSubmittedCount;
        this.assessmentCompletedCount = assessmentCompletedCount;
        this.recommendationReadyCount = recommendationReadyCount;
        this.lastRefreshedAt = lastRefreshedAt;
    }

    public long getTotalStudents() {
        return totalStudents;
    }

    public long getCompletedProfiles() {
        return completedProfiles;
    }

    public long getPendingProfiles() {
        return pendingProfiles;
    }

    public long getQuizSubmittedCount() {
        return quizSubmittedCount;
    }

    public long getAssessmentCompletedCount() {
        return assessmentCompletedCount;
    }

    public long getRecommendationReadyCount() {
        return recommendationReadyCount;
    }

    public Instant getLastRefreshedAt() {
        return lastRefreshedAt;
    }
}
