package com.smartcareer.backend.dto;

public class AdminBlockUserRequest {

    private String reason;

    public AdminBlockUserRequest() {
    }

    public AdminBlockUserRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}