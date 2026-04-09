package com.smartcareer.backend.controller;

import com.smartcareer.backend.dto.CertificateAnalysisRequest;
import com.smartcareer.backend.dto.CertificateAnalysisResponse;
import com.smartcareer.backend.dto.CertificateClaimViewResponse;
import com.smartcareer.backend.dto.SkillVerificationStatusResponse;
import com.smartcareer.backend.dto.StartAssessmentResponse;
import com.smartcareer.backend.dto.SubmitAssessmentRequest;
import com.smartcareer.backend.dto.SubmitAssessmentResponse;
import com.smartcareer.backend.service.SkillVerificationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/skill-verification")
public class SkillVerificationController {

    private final SkillVerificationService skillVerificationService;

    public SkillVerificationController(SkillVerificationService skillVerificationService) {
        this.skillVerificationService = skillVerificationService;
    }

    @GetMapping("/me")
    public SkillVerificationStatusResponse getMyStatus(@RequestHeader("Authorization") String authorizationHeader) {
        return skillVerificationService.getMyStatus(authorizationHeader);
    }

    @GetMapping("/certifications/my")
    public List<CertificateClaimViewResponse> getMyCertificates(@RequestHeader("Authorization") String authorizationHeader) {
        return skillVerificationService.getMyCertificates(authorizationHeader);
    }

    @GetMapping("/assessment/latest-result")
    public SubmitAssessmentResponse getLatestAssessmentResult(@RequestHeader("Authorization") String authorizationHeader) {
        return skillVerificationService.getLatestAssessmentResult(authorizationHeader);
    }

    @PostMapping("/certifications/analyze")
    public CertificateAnalysisResponse analyzeCertificates(
        @RequestHeader("Authorization") String authorizationHeader,
        @Valid @RequestBody CertificateAnalysisRequest request
    ) {
        return skillVerificationService.analyzeCertificates(authorizationHeader, request);
    }

    @PostMapping("/assessment/start")
    public StartAssessmentResponse startAssessment(@RequestHeader("Authorization") String authorizationHeader) {
        return skillVerificationService.startAssessment(authorizationHeader);
    }

    @PostMapping("/assessment/submit")
    public SubmitAssessmentResponse submitAssessment(
        @RequestHeader("Authorization") String authorizationHeader,
        @Valid @RequestBody SubmitAssessmentRequest request
    ) {
        return skillVerificationService.submitAssessment(authorizationHeader, request);
    }
}
