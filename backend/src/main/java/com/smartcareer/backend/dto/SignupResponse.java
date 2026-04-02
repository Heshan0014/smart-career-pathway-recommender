package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SignupResponse {

    private String message;
    @JsonProperty("user_id")
    private Long userId;

    public SignupResponse(String message, Long userId) {
        this.message = message;
        this.userId = userId;
    }

    public String getMessage() {
        return message;
    }

    public Long getUserId() {
        return userId;
    }
}
