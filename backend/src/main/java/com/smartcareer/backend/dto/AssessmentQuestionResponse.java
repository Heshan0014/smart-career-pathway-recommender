package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class AssessmentQuestionResponse {

    @JsonProperty("question_id")
    private String questionId;

    @JsonProperty("skill_area")
    private String skillArea;

    @JsonProperty("question")
    private String question;

    @JsonProperty("question_type")
    private String questionType;

    @JsonProperty("options")
    private List<String> options;

    @JsonProperty("scenario_based")
    private boolean scenarioBased;

    @JsonProperty("recommended_time_sec")
    private int recommendedTimeSec;

    public AssessmentQuestionResponse(
        String questionId,
        String skillArea,
        String question,
        String questionType,
        List<String> options,
        boolean scenarioBased,
        int recommendedTimeSec
    ) {
        this.questionId = questionId;
        this.skillArea = skillArea;
        this.question = question;
        this.questionType = questionType;
        this.options = options;
        this.scenarioBased = scenarioBased;
        this.recommendedTimeSec = recommendedTimeSec;
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

    public List<String> getOptions() {
        return options;
    }

    public boolean isScenarioBased() {
        return scenarioBased;
    }

    public int getRecommendedTimeSec() {
        return recommendedTimeSec;
    }
}
