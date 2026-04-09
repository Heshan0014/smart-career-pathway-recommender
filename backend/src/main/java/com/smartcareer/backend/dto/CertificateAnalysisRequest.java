package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.ArrayList;
import java.util.List;

public class CertificateAnalysisRequest {

    @Valid
    @NotEmpty
    @JsonProperty("certificates")
    private List<CertificateEntryRequest> certificates = new ArrayList<>();

    public List<CertificateEntryRequest> getCertificates() {
        return certificates;
    }

    public void setCertificates(List<CertificateEntryRequest> certificates) {
        this.certificates = certificates;
    }
}
