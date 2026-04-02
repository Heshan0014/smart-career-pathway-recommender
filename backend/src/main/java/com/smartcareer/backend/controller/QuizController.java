package com.smartcareer.backend.controller;

import com.smartcareer.backend.dto.QuizSubmissionRequest;
import com.smartcareer.backend.dto.QuizSubmissionResponse;
import com.smartcareer.backend.service.QuizService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/quiz")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping("/submit")
    public QuizSubmissionResponse submitQuiz(
        @RequestHeader("Authorization") String authorizationHeader,
        @Valid @RequestBody QuizSubmissionRequest request
    ) {
        return quizService.submitQuiz(authorizationHeader, request);
    }

    @GetMapping("/me")
    public QuizSubmissionResponse getMyQuiz(@RequestHeader("Authorization") String authorizationHeader) {
        return quizService.getMyQuiz(authorizationHeader);
    }
}
