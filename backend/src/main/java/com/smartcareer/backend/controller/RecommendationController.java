package com.smartcareer.backend.controller;

import com.smartcareer.backend.dto.RecommendationResponse;
import com.smartcareer.backend.service.RecommendationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/me")
    public RecommendationResponse getMyRecommendation(@RequestHeader("Authorization") String authorizationHeader) {
        return recommendationService.getMyRecommendation(authorizationHeader);
    }
}
