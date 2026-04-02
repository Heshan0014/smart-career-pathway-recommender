package com.smartcareer.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcareer.backend.config.JwtUtil;
import com.smartcareer.backend.dto.QuizSubmissionRequest;
import com.smartcareer.backend.dto.QuizSubmissionResponse;
import com.smartcareer.backend.entity.QuizSubmissionEntity;
import com.smartcareer.backend.entity.UserEntity;
import com.smartcareer.backend.repository.QuizSubmissionRepository;
import com.smartcareer.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;

@Service
public class QuizService {

    private final QuizSubmissionRepository quizSubmissionRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    public QuizService(
        QuizSubmissionRepository quizSubmissionRepository,
        UserRepository userRepository,
        JwtUtil jwtUtil,
        ObjectMapper objectMapper
    ) {
        this.quizSubmissionRepository = quizSubmissionRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.objectMapper = objectMapper;
    }

    public QuizSubmissionResponse submitQuiz(String authorizationHeader, QuizSubmissionRequest request) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);

        if (request.getAnswers() == null || request.getAnswers().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quiz answers are required");
        }

        Instant now = Instant.now();
        QuizSubmissionEntity submission = quizSubmissionRepository.findByUserId(user.getId())
            .map(existing -> {
                existing.setAnswersJson(request.getAnswers().toString());
                existing.setSubmittedAt(now);
                return existing;
            })
            .orElseGet(() -> {
                QuizSubmissionEntity created = new QuizSubmissionEntity();
                created.setUser(user);
                created.setAnswersJson(request.getAnswers().toString());
                created.setSubmittedAt(now);
                return created;
            });

        QuizSubmissionEntity saved = quizSubmissionRepository.save(submission);
        return toResponse(saved);
    }

    public QuizSubmissionResponse getMyQuiz(String authorizationHeader) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);

        QuizSubmissionEntity submission = quizSubmissionRepository.findByUserId(user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not submitted yet"));

        return toResponse(submission);
    }

    private UserEntity getUserFromAuthorizationHeader(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }

        String token = authorizationHeader.substring(7);
        String subject = jwtUtil.extractSubject(token);

        try {
            Long userId = Long.parseLong(subject);
            return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        } catch (NumberFormatException ex) {
            return userRepository.findByEmail(subject)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }
    }

    private QuizSubmissionResponse toResponse(QuizSubmissionEntity submission) {
        return new QuizSubmissionResponse(parseAnswers(submission.getAnswersJson()), submission.getSubmittedAt());
    }

    private JsonNode parseAnswers(String answersJson) {
        try {
            return objectMapper.readTree(answersJson);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored quiz data is invalid");
        }
    }
}
