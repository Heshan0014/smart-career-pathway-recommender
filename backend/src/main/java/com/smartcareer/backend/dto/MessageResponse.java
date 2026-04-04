package com.smartcareer.backend.dto;

import java.time.Instant;

public class MessageResponse {
    
    private Long id;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private String studentMessage;
    private String adminReply;
    private Boolean isRead;
    private Boolean studentRead;
    private Instant createdAt;
    private Instant repliedAt;
    private Instant updatedAt;
    private Boolean hasReply;
    private Boolean studentBlocked;

    public MessageResponse() {
    }

    public MessageResponse(Long id, Long studentId, String studentName, String studentEmail, 
                          String studentMessage, String adminReply, Boolean isRead, 
                          Boolean studentRead, Instant createdAt, Instant repliedAt, Instant updatedAt,
                          Boolean studentBlocked) {
        this.id = id;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentEmail = studentEmail;
        this.studentMessage = studentMessage;
        this.adminReply = adminReply;
        this.isRead = isRead;
        this.studentRead = studentRead;
        this.createdAt = createdAt;
        this.repliedAt = repliedAt;
        this.updatedAt = updatedAt;
        this.hasReply = adminReply != null && !adminReply.isEmpty();
        this.studentBlocked = studentBlocked;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
    }

    public String getStudentMessage() {
        return studentMessage;
    }

    public void setStudentMessage(String studentMessage) {
        this.studentMessage = studentMessage;
    }

    public String getAdminReply() {
        return adminReply;
    }

    public void setAdminReply(String adminReply) {
        this.adminReply = adminReply;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public Boolean getStudentRead() {
        return studentRead;
    }

    public void setStudentRead(Boolean studentRead) {
        this.studentRead = studentRead;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getRepliedAt() {
        return repliedAt;
    }

    public void setRepliedAt(Instant repliedAt) {
        this.repliedAt = repliedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Boolean getHasReply() {
        return hasReply;
    }

    public void setHasReply(Boolean hasReply) {
        this.hasReply = hasReply;
    }

    public Boolean getStudentBlocked() {
        return studentBlocked;
    }

    public void setStudentBlocked(Boolean studentBlocked) {
        this.studentBlocked = studentBlocked;
    }
}
