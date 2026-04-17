package com.smartcareer.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcareer.backend.dto.RecommendationOptionResponse;
import com.smartcareer.backend.dto.RecommendationResponse;
import com.smartcareer.backend.dto.UserResponse;
import com.smartcareer.backend.entity.AssessmentSessionEntity;
import com.smartcareer.backend.entity.AssessmentSessionStatus;
import com.smartcareer.backend.entity.QuizSubmissionEntity;
import com.smartcareer.backend.entity.SkillLevel;
import com.smartcareer.backend.entity.UserEntity;
import com.smartcareer.backend.entity.VerifiedSkillEntity;
import com.smartcareer.backend.repository.AssessmentSessionRepository;
import com.smartcareer.backend.repository.QuizSubmissionRepository;
import com.smartcareer.backend.repository.UserRepository;
import com.smartcareer.backend.repository.VerifiedSkillRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class RecommendationService {

    private final AuthService authService;
    private final AssessmentSessionRepository assessmentSessionRepository;
    private final QuizSubmissionRepository quizSubmissionRepository;
    private final UserRepository userRepository;
    private final VerifiedSkillRepository verifiedSkillRepository;
    private final ObjectMapper objectMapper;

    public RecommendationService(
        AuthService authService,
        AssessmentSessionRepository assessmentSessionRepository,
        QuizSubmissionRepository quizSubmissionRepository,
        UserRepository userRepository,
        VerifiedSkillRepository verifiedSkillRepository,
        ObjectMapper objectMapper
    ) {
        this.authService = authService;
        this.assessmentSessionRepository = assessmentSessionRepository;
        this.quizSubmissionRepository = quizSubmissionRepository;
        this.userRepository = userRepository;
        this.verifiedSkillRepository = verifiedSkillRepository;
        this.objectMapper = objectMapper;
    }

    public RecommendationResponse getMyRecommendation(String authorizationHeader) {
        UserResponse me = authService.me(authorizationHeader);

        if (!me.isRecommendationEligible()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Recommendations are locked. Complete profile and quiz requirements first"
            );
        }

        UserEntity user = userRepository.findById(me.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        QuizSubmissionEntity submission = quizSubmissionRepository.findByUserId(user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not submitted yet"));

        JsonNode answers = parseAnswers(submission.getAnswersJson());
        Map<String, Integer> scores = initializeScores();
        List<VerifiedSkillEntity> verifiedSkills = verifiedSkillRepository.findByUserIdOrderBySkillNameAsc(user.getId());

        if (!verifiedSkills.isEmpty()) {
            scoreFromVerifiedSkills(scores, verifiedSkills);
        }

        Map<String, Double> assessmentAccuracyBySkill = loadLatestAssessmentSkillAccuracy(user.getId());
        scoreFromAssessmentAccuracy(scores, assessmentAccuracyBySkill);

        scoreFromText(scores, extractAnswersText(answers));
        scoreFromProfile(scores, user);

        List<Map.Entry<String, Integer>> sorted = scores.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()))
            .toList();

        String primaryPath = sorted.get(0).getKey();
        int topScore = sorted.get(0).getValue();
        int secondScore = sorted.size() > 1 ? sorted.get(1).getValue() : 0;
        int confidence = topScore == 0 ? 0 : Math.max(55, Math.min(95, 60 + (topScore - secondScore) * 8));

        List<String> reasons = buildReasons(primaryPath, user, answers, verifiedSkills, assessmentAccuracyBySkill);
        List<String> nextSteps = buildNextSteps(primaryPath);

        List<RecommendationOptionResponse> alternatives = sorted.stream()
            .limit(3)
            .map(entry -> new RecommendationOptionResponse(
                entry.getKey(),
                entry.getValue(),
                toFitLabel(entry.getValue(), topScore)
            ))
            .toList();

        String summary = String.format(
            Locale.ROOT,
            "Based on your verified skills, quiz, and profile, %s is your strongest fit right now (confidence %d%%).",
            primaryPath,
            confidence
        );

        return new RecommendationResponse(
            primaryPath,
            summary,
            reasons,
            nextSteps,
            alternatives,
            Instant.now()
        );
    }

    private JsonNode parseAnswers(String answersJson) {
        try {
            return objectMapper.readTree(answersJson);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored quiz data is invalid");
        }
    }

    private Map<String, Integer> initializeScores() {
        Map<String, Integer> scores = new HashMap<>();
        scores.put("Software Engineering", 0);
        scores.put("Data Science / AI", 0);
        scores.put("UI/UX Design", 0);
        scores.put("Cybersecurity", 0);
        scores.put("Networking & Cloud", 0);
        return scores;
    }

    private List<String> extractAnswersText(JsonNode answers) {
        List<String> values = new ArrayList<>();
        if (answers == null || !answers.isObject()) {
            return values;
        }

        answers.fields().forEachRemaining(field -> {
            JsonNode value = field.getValue();
            if (value == null || !value.isObject()) {
                return;
            }

            JsonNode answer = value.get("answer");
            if (answer != null && answer.isTextual()) {
                values.add(answer.asText());
            }

            JsonNode otherChoice = value.get("otherChoice");
            if (otherChoice != null && otherChoice.isTextual()) {
                values.add(otherChoice.asText());
            }
        });

        return values;
    }

    private void scoreFromText(Map<String, Integer> scores, List<String> values) {
        for (String raw : values) {
            String value = raw.toLowerCase(Locale.ROOT);

            applyKeywordScores(scores, value, "Software Engineering", List.of("software", "program", "coding", "developer", "web", "app"), 2);
            applyKeywordScores(scores, value, "Data Science / AI", List.of("data", "ai", "machine", "analytics", "analysis"), 2);
            applyKeywordScores(scores, value, "UI/UX Design", List.of("design", "ui", "ux", "creative"), 2);
            applyKeywordScores(scores, value, "Cybersecurity", List.of("cyber", "security", "hacking", "vulnerab"), 2);
            applyKeywordScores(scores, value, "Networking & Cloud", List.of("network", "server", "cloud", "infrastructure"), 2);

            if (value.contains("logical") || value.contains("problem")) {
                addScore(scores, "Software Engineering", 1);
                addScore(scores, "Data Science / AI", 1);
            }
            if (value.contains("analytical")) {
                addScore(scores, "Data Science / AI", 2);
                addScore(scores, "Cybersecurity", 1);
            }
            if (value.contains("creative")) {
                addScore(scores, "UI/UX Design", 2);
            }
        }
    }

    private void scoreFromProfile(Map<String, Integer> scores, UserEntity user) {
        scoreProfileField(scores, user.getFavoriteField(), 3);
        scoreProfileField(scores, user.getFavoriteSubject(), 2);
        scoreProfileField(scores, user.getEducationLevel(), 1);

        if (user.getInterests() != null) {
            user.getInterests().forEach(interest -> scoreProfileField(scores, interest, 1));
        }
        if (user.getTalents() != null) {
            user.getTalents().forEach(talent -> scoreProfileField(scores, talent, 1));
        }
    }

    private void scoreFromVerifiedSkills(Map<String, Integer> scores, List<VerifiedSkillEntity> verifiedSkills) {
        for (VerifiedSkillEntity skill : verifiedSkills) {
            int weight = levelWeight(skill.getVerifiedLevel());
            String normalized = skill.getSkillName() == null ? "" : skill.getSkillName().toLowerCase(Locale.ROOT);

            if (normalized.contains("python") || normalized.contains("web") || normalized.contains("software")) {
                addScore(scores, "Software Engineering", weight);
            }
            if (normalized.contains("data")) {
                addScore(scores, "Data Science / AI", weight);
            }
            if (normalized.contains("ui") || normalized.contains("ux") || normalized.contains("design")) {
                addScore(scores, "UI/UX Design", weight);
            }
            if (normalized.contains("cyber") || normalized.contains("security")) {
                addScore(scores, "Cybersecurity", weight);
            }
            if (normalized.contains("cloud") || normalized.contains("network")) {
                addScore(scores, "Networking & Cloud", weight);
            }
        }
    }

    private void scoreFromAssessmentAccuracy(Map<String, Integer> scores, Map<String, Double> accuracyBySkill) {
        accuracyBySkill.forEach((skillArea, accuracy) -> {
            String path = mapSkillToPath(skillArea);
            if (path == null) {
                return;
            }

            int bonus = (int) Math.round(Math.max(0.0, Math.min(1.0, accuracy)) * 20.0);
            addScore(scores, path, bonus);
        });
    }

    private String mapSkillToPath(String skillArea) {
        if (skillArea == null) {
            return null;
        }

        String normalized = skillArea.toLowerCase(Locale.ROOT);
        if (normalized.contains("python") || normalized.contains("software") || normalized.contains("web")) {
            return "Software Engineering";
        }
        if (normalized.contains("data")) {
            return "Data Science / AI";
        }
        if (normalized.contains("ui") || normalized.contains("ux") || normalized.contains("design")) {
            return "UI/UX Design";
        }
        if (normalized.contains("cyber") || normalized.contains("security")) {
            return "Cybersecurity";
        }
        if (normalized.contains("network") || normalized.contains("cloud")) {
            return "Networking & Cloud";
        }
        return null;
    }

    private Map<String, Double> loadLatestAssessmentSkillAccuracy(Long userId) {
        AssessmentSessionEntity latest = assessmentSessionRepository
            .findTopByUserIdAndStatusOrderByCompletedAtDesc(userId, AssessmentSessionStatus.COMPLETED)
            .orElse(null);

        if (latest == null || latest.getQuestionsJson() == null || latest.getResponsesJson() == null) {
            return Map.of();
        }

        try {
            Map<String, String> skillByQuestionId = new HashMap<>();
            JsonNode questions = objectMapper.readTree(latest.getQuestionsJson());
            if (questions != null && questions.isArray()) {
                for (JsonNode question : questions) {
                    String questionId = question.path("questionId").asText("");
                    String skillArea = question.path("skillArea").asText("");
                    if (!questionId.isBlank() && !skillArea.isBlank()) {
                        skillByQuestionId.put(questionId, skillArea);
                    }
                }
            }

            Map<String, Integer> totalBySkill = new HashMap<>();
            Map<String, Integer> correctBySkill = new HashMap<>();

            JsonNode responses = objectMapper.readTree(latest.getResponsesJson());
            if (responses != null && responses.isArray()) {
                for (JsonNode response : responses) {
                    String questionId = response.path("question_id").asText("");
                    if (questionId.isBlank()) {
                        continue;
                    }

                    String skill = skillByQuestionId.get(questionId);
                    if (skill == null || skill.isBlank()) {
                        continue;
                    }

                    totalBySkill.merge(skill, 1, Integer::sum);
                    if (response.path("correct").asBoolean(false)) {
                        correctBySkill.merge(skill, 1, Integer::sum);
                    }
                }
            }

            Map<String, Double> accuracyBySkill = new HashMap<>();
            totalBySkill.forEach((skill, total) -> {
                int correct = correctBySkill.getOrDefault(skill, 0);
                accuracyBySkill.put(skill, total == 0 ? 0.0 : (correct / (double) total));
            });
            return accuracyBySkill;
        } catch (IOException ex) {
            return Map.of();
        }
    }

    private int levelWeight(SkillLevel level) {
        if (level == SkillLevel.ADVANCED) {
            return 9;
        }
        if (level == SkillLevel.INTERMEDIATE) {
            return 6;
        }
        return 3;
    }

    private void scoreProfileField(Map<String, Integer> scores, String value, int weight) {
        if (value == null || value.isBlank()) {
            return;
        }

        String normalized = value.toLowerCase(Locale.ROOT);
        applyKeywordScores(scores, normalized, "Software Engineering", List.of("software", "program", "web", "app"), weight);
        applyKeywordScores(scores, normalized, "Data Science / AI", List.of("data", "ai", "machine"), weight);
        applyKeywordScores(scores, normalized, "UI/UX Design", List.of("design", "ui", "ux"), weight);
        applyKeywordScores(scores, normalized, "Cybersecurity", List.of("cyber", "security"), weight);
        applyKeywordScores(scores, normalized, "Networking & Cloud", List.of("network", "cloud", "server"), weight);
    }

    private void applyKeywordScores(
        Map<String, Integer> scores,
        String input,
        String career,
        List<String> keywords,
        int weight
    ) {
        for (String keyword : keywords) {
            if (input.contains(keyword)) {
                addScore(scores, career, weight);
                return;
            }
        }
    }

    private void addScore(Map<String, Integer> scores, String career, int amount) {
        scores.put(career, scores.getOrDefault(career, 0) + amount);
    }

    private List<String> buildReasons(
        String primaryPath,
        UserEntity user,
        JsonNode answers,
        List<VerifiedSkillEntity> verifiedSkills,
        Map<String, Double> assessmentAccuracyBySkill
    ) {
        List<String> reasons = new ArrayList<>();
        reasons.add("Your quiz responses align most strongly with " + primaryPath + ".");

        if (!verifiedSkills.isEmpty()) {
            reasons.add("Your verified skill assessment was prioritized over self-reported data.");
        }

        if (user.getFavoriteField() != null && !user.getFavoriteField().isBlank()) {
            reasons.add("Your preferred field (" + user.getFavoriteField() + ") supports this pathway.");
        }

        assessmentAccuracyBySkill.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(top -> reasons.add(
                "Your strongest assessed performance was in " + top.getKey() + " ("
                    + Math.round(top.getValue() * 100) + "% correct), which was prioritized in recommendation ranking."
            ));

        if (answers != null && answers.isObject() && answers.size() >= 10) {
            reasons.add("You completed a broad quiz response set, increasing recommendation reliability.");
        } else {
            reasons.add("Complete all quiz questions over time to improve recommendation precision.");
        }

        return reasons;
    }

    private List<String> buildNextSteps(String primaryPath) {
        return switch (primaryPath) {
            case "Software Engineering" -> List.of(
                "Build one full-stack mini project and publish it on GitHub.",
                "Practice data structures and problem solving at least 3 times per week.",
                "Learn one backend framework and one frontend framework deeply."
            );
            case "Data Science / AI" -> List.of(
                "Complete one end-to-end data analysis project with visualization.",
                "Strengthen Python and statistics fundamentals.",
                "Train and evaluate at least one ML model on a public dataset."
            );
            case "UI/UX Design" -> List.of(
                "Create a portfolio with 2-3 case studies.",
                "Practice user flow, wireframe, and high-fidelity prototype creation.",
                "Run simple usability tests and iterate based on feedback."
            );
            case "Cybersecurity" -> List.of(
                "Study security fundamentals: OWASP Top 10 and secure coding basics.",
                "Practice in legal labs and CTF-style environments.",
                "Learn basic network security monitoring and incident response concepts."
            );
            default -> List.of(
                "Build practical labs around networking and cloud fundamentals.",
                "Practice configuring servers, routing, and cloud services.",
                "Document one deployment architecture as a portfolio artifact."
            );
        };
    }

    private String toFitLabel(int score, int topScore) {
        if (topScore == 0) {
            return "Low";
        }

        double ratio = score / (double) topScore;
        if (ratio >= 0.9) {
            return "Strong";
        }
        if (ratio >= 0.65) {
            return "Moderate";
        }
        return "Emerging";
    }
}
