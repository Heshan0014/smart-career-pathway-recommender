package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AssessmentQuestionResultResponse {

    @JsonProperty("question_id")
    private String questionId;

    @JsonProperty("skill_area")
    private String skillArea;

    @JsonProperty("question")
    private String question;

    @JsonProperty("question_type")
    private String questionType;

    @JsonProperty("selected_option_index")
    private Integer selectedOptionIndex;

    @JsonProperty("selected_option_text")
    private String selectedOptionText;

    @JsonProperty("text_answer")
    private String textAnswer;

    @JsonProperty("correct_answer")
    private String correctAnswer;

    @JsonProperty("correct")
    private boolean correct;

    public AssessmentQuestionResultResponse(
        String questionId,
        String skillArea,
        String question,
        String questionType,
        Integer selectedOptionIndex,
        String selectedOptionText,
        String textAnswer,
        String correctAnswer,
        boolean correct
    ) {
        this.questionId = questionId;
        this.skillArea = skillArea;
        this.question = question;
        this.questionType = questionType;
        this.selectedOptionIndex = selectedOptionIndex;
        this.selectedOptionText = selectedOptionText;
        this.textAnswer = textAnswer;
        this.correctAnswer = correctAnswer;
        this.correct = correct;
    }

    public String getQuestionId() {
        return questionId;
    }

    public String getSkillArea() {
        return skillArea;
    }

    public String getQuestion() {
        return question;
    }

    public String getQuestionType() {
        return questionType;
    }

    public Integer getSelectedOptionIndex() {
        return selectedOptionIndex;
    }

    public String getSelectedOptionText() {
        return selectedOptionText;
    }

    public String getTextAnswer() {
        return textAnswer;
    }

    public String getCorrectAnswer() {
        return correctAnswer;
    }

    public boolean isCorrect() {
        return correct;
    }
}
