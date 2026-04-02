package com.smartcareer.backend.dto;

public class SendMessageRequest {
    
    private String message;

    public SendMessageRequest() {
    }

    public SendMessageRequest(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
