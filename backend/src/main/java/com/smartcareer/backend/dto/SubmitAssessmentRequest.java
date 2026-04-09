package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.List;

public class SubmitAssessmentRequest {

    @NotNull
    @JsonProperty("session_id")
    private Long sessionId;

    @Valid
    @NotEmpty
    @JsonProperty("answers")
    private List<AssessmentAnswerRequest> answers = new ArrayList<>();

    @Valid
    @JsonProperty("behaviour_metrics")
    private AssessmentBehaviorMetricsRequest behaviourMetrics;

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public List<AssessmentAnswerRequest> getAnswers() {
        return answers;
    }

    public void setAnswers(List<AssessmentAnswerRequest> answers) {
        this.answers = answers;
    }

    public AssessmentBehaviorMetricsRequest getBehaviourMetrics() {
        return behaviourMetrics;
    }

    public void setBehaviourMetrics(AssessmentBehaviorMetricsRequest behaviourMetrics) {
        this.behaviourMetrics = behaviourMetrics;
    }
}
