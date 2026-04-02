package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

public class QuizSubmissionResponse {

    @JsonProperty("answers")
    private JsonNode answers;

    @JsonProperty("submitted_at")
    private Instant submittedAt;

    public QuizSubmissionResponse(JsonNode answers, Instant submittedAt) {
        this.answers = answers;
        this.submittedAt = submittedAt;
    }

    public JsonNode getAnswers() {
        return answers;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }
}
