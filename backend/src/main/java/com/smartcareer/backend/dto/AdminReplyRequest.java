package com.smartcareer.backend.dto;

public class AdminReplyRequest {
    
    private String reply;

    public AdminReplyRequest() {
    }

    public AdminReplyRequest(String reply) {
        this.reply = reply;
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }
}
