package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

public class StartAssessmentResponse {

    @JsonProperty("session_id")
    private Long sessionId;

    @JsonProperty("detected_skills")
    private List<DetectedSkillResponse> detectedSkills;

    @JsonProperty("questions")
    private List<AssessmentQuestionResponse> questions;

    @JsonProperty("total_time_limit_sec")
    private int totalTimeLimitSec;

    @JsonProperty("started_at")
    private Instant startedAt;

    public StartAssessmentResponse(
        Long sessionId,
        List<DetectedSkillResponse> detectedSkills,
        List<AssessmentQuestionResponse> questions,
        int totalTimeLimitSec,
        Instant startedAt
    ) {
        this.sessionId = sessionId;
        this.detectedSkills = detectedSkills;
        this.questions = questions;
        this.totalTimeLimitSec = totalTimeLimitSec;
        this.startedAt = startedAt;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public List<DetectedSkillResponse> getDetectedSkills() {
        return detectedSkills;
    }

    public List<AssessmentQuestionResponse> getQuestions() {
        return questions;
    }

    public int getTotalTimeLimitSec() {
        return totalTimeLimitSec;
    }

    public Instant getStartedAt() {
        return startedAt;
    }
}
