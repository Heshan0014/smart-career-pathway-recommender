package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class CertificateEntryRequest {

    @JsonProperty("title")
    private String title;

    @JsonProperty("provider")
    private String provider;

    @JsonProperty("description")
    private String description;

    @JsonProperty("certificate_content")
    private String certificateContent;

    @NotBlank
    @JsonProperty("certificate_image_base64")
    private String certificateImageBase64;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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
}
