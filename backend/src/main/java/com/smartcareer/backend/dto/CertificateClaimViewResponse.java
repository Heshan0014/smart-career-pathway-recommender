package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public class CertificateClaimViewResponse {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("provider")
    private String provider;

    @JsonProperty("description")
    private String description;

    @JsonProperty("certificate_content")
    private String certificateContent;

    @JsonProperty("certificate_image_base64")
    private String certificateImageBase64;

    @JsonProperty("created_at")
    private Instant createdAt;

    public CertificateClaimViewResponse(
        Long id,
        String title,
        String provider,
        String description,
        String certificateContent,
        String certificateImageBase64,
        Instant createdAt
    ) {
        this.id = id;
        this.title = title;
        this.provider = provider;
        this.description = description;
        this.certificateContent = certificateContent;
        this.certificateImageBase64 = certificateImageBase64;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getProvider() {
        return provider;
    }

    public String getDescription() {
        return description;
    }

    public String getCertificateContent() {
        return certificateContent;
    }

    public String getCertificateImageBase64() {
        return certificateImageBase64;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
