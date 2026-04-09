package com.smartcareer.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "certificate_claims")
public class CertificateClaimEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "certificate_title", nullable = false)
    private String certificateTitle;

    @Column(name = "provider")
    private String provider;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "certificate_content", columnDefinition = "TEXT")
    private String certificateContent;

    @Column(name = "certificate_image_base64", columnDefinition = "TEXT")
    private String certificateImageBase64;

    @Column(name = "detected_skills_json", nullable = false, columnDefinition = "TEXT")
    private String detectedSkillsJson;

    @Column(name = "claimed_levels_json", nullable = false, columnDefinition = "TEXT")
    private String claimedLevelsJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public String getCertificateTitle() {
        return certificateTitle;
    }

    public void setCertificateTitle(String certificateTitle) {
        this.certificateTitle = certificateTitle;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCertificateContent() {
        return certificateContent;
    }

    public void setCertificateContent(String certificateContent) {
        this.certificateContent = certificateContent;
    }

    public String getCertificateImageBase64() {
        return certificateImageBase64;
    }

    public void setCertificateImageBase64(String certificateImageBase64) {
        this.certificateImageBase64 = certificateImageBase64;
    }

    public String getDetectedSkillsJson() {
        return detectedSkillsJson;
    }

    public void setDetectedSkillsJson(String detectedSkillsJson) {
        this.detectedSkillsJson = detectedSkillsJson;
    }

    public String getClaimedLevelsJson() {
        return claimedLevelsJson;
    }

    public void setClaimedLevelsJson(String claimedLevelsJson) {
        this.claimedLevelsJson = claimedLevelsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
