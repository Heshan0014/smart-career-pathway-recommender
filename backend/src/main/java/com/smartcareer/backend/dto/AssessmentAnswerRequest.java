package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;

public class AssessmentAnswerRequest {

    @NotBlank
    @JsonProperty("question_id")
    private String questionId;

    @JsonProperty("selected_option_index")
    private Integer selectedOptionIndex;

    @JsonProperty("text_answer")
    private String textAnswer;

    @NotNull
    @Min(0)
    @JsonProperty("time_spent_sec")
    private Integer timeSpentSec;

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public Integer getSelectedOptionIndex() {
        return selectedOptionIndex;
    }

    public void setSelectedOptionIndex(Integer selectedOptionIndex) {
        this.selectedOptionIndex = selectedOptionIndex;
    }

    public String getTextAnswer() {
        return textAnswer;
    }

    public void setTextAnswer(String textAnswer) {
        this.textAnswer = textAnswer;
    }

    public Integer getTimeSpentSec() {
        return timeSpentSec;
    }

    public void setTimeSpentSec(Integer timeSpentSec) {
        this.timeSpentSec = timeSpentSec;
    }
}
