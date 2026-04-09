package com.smartcareer.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcareer.backend.config.JwtUtil;
import com.smartcareer.backend.dto.AssessmentAnswerRequest;
import com.smartcareer.backend.dto.AssessmentBehaviorMetricsRequest;
import com.smartcareer.backend.dto.AssessmentQuestionResponse;
import com.smartcareer.backend.dto.AssessmentQuestionResultResponse;
import com.smartcareer.backend.dto.CertificateAnalysisRequest;
import com.smartcareer.backend.dto.CertificateAnalysisResponse;
import com.smartcareer.backend.dto.CertificateClaimViewResponse;
import com.smartcareer.backend.dto.CertificateEntryRequest;
import com.smartcareer.backend.dto.DetectedSkillResponse;
import com.smartcareer.backend.dto.SkillVerificationStatusResponse;
import com.smartcareer.backend.dto.StartAssessmentResponse;
import com.smartcareer.backend.dto.SubmitAssessmentRequest;
import com.smartcareer.backend.dto.SubmitAssessmentResponse;
import com.smartcareer.backend.dto.VerifiedSkillResponse;
import com.smartcareer.backend.entity.AssessmentSessionEntity;
import com.smartcareer.backend.entity.AssessmentSessionStatus;
import com.smartcareer.backend.entity.CertificateClaimEntity;
import com.smartcareer.backend.entity.SkillLevel;
import com.smartcareer.backend.entity.UserEntity;
import com.smartcareer.backend.entity.VerifiedSkillEntity;
import com.smartcareer.backend.repository.AssessmentSessionRepository;
import com.smartcareer.backend.repository.CertificateClaimRepository;
import com.smartcareer.backend.repository.QuizSubmissionRepository;
import com.smartcareer.backend.repository.UserRepository;
import com.smartcareer.backend.repository.VerifiedSkillRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SkillVerificationService {

    private static final Pattern YEARS_PATTERN = Pattern.compile("(\\d+)\\s*(year|years)", Pattern.CASE_INSENSITIVE);
    private static final int QUESTION_TIME_LIMIT_SEC = 90;
    private static final int MIN_ASSESSMENT_QUESTION_COUNT = 20;

    private final UserRepository userRepository;
    private final QuizSubmissionRepository quizSubmissionRepository;
    private final CertificateClaimRepository certificateClaimRepository;
    private final AssessmentSessionRepository assessmentSessionRepository;
    private final VerifiedSkillRepository verifiedSkillRepository;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    public SkillVerificationService(
        UserRepository userRepository,
        QuizSubmissionRepository quizSubmissionRepository,
        CertificateClaimRepository certificateClaimRepository,
        AssessmentSessionRepository assessmentSessionRepository,
        VerifiedSkillRepository verifiedSkillRepository,
        JwtUtil jwtUtil,
        ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.quizSubmissionRepository = quizSubmissionRepository;
        this.certificateClaimRepository = certificateClaimRepository;
        this.assessmentSessionRepository = assessmentSessionRepository;
        this.verifiedSkillRepository = verifiedSkillRepository;
        this.jwtUtil = jwtUtil;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CertificateAnalysisResponse analyzeCertificates(String authorizationHeader, CertificateAnalysisRequest request) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        ensureStageOneComplete(user);

        Map<String, SkillLevel> mergedClaims = new LinkedHashMap<>();
        List<CertificateClaimEntity> entitiesToSave = new ArrayList<>();

        for (CertificateEntryRequest cert : request.getCertificates()) {
            String text = String.join(" ",
                safe(cert.getTitle()),
                safe(cert.getDescription()),
                safe(cert.getProvider()),
                safe(cert.getCertificateContent())
            ).trim();

            if (text.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Certificate text is required for analysis");
            }

            List<String> detectedSkills = detectSkillAreas(text);
            SkillLevel claimedLevel = estimateClaimedLevel(text);
            for (String skill : detectedSkills) {
                SkillLevel existing = mergedClaims.get(skill);
                if (existing == null || claimedLevel.ordinal() > existing.ordinal()) {
                    mergedClaims.put(skill, claimedLevel);
                }
            }

            CertificateClaimEntity entity = new CertificateClaimEntity();
            entity.setUser(user);
            entity.setCertificateTitle(cert.getTitle().trim());
            entity.setProvider(safe(cert.getProvider()));
            entity.setDescription(safe(cert.getDescription()));
            entity.setCertificateContent(safe(cert.getCertificateContent()));
            entity.setCertificateImageBase64(safe(cert.getCertificateImageBase64()));
            entity.setDetectedSkillsJson(writeJson(detectedSkills));
            entity.setClaimedLevelsJson(writeJson(toStringMap(detectedSkills, claimedLevel)));
            entitiesToSave.add(entity);
        }

        if (mergedClaims.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No recognizable skill areas were detected from certificates");
        }

        certificateClaimRepository.deleteByUserId(user.getId());
        certificateClaimRepository.saveAll(entitiesToSave);

        List<DetectedSkillResponse> detected = mergedClaims.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> new DetectedSkillResponse(entry.getKey(), formatSkillLevel(entry.getValue())))
            .toList();

        String summary = "Certification stage complete. " + detected.size()
            + " skill areas were detected and mapped to claimed levels.";

        return new CertificateAnalysisResponse(detected, summary, Instant.now());
    }

    public StartAssessmentResponse startAssessment(String authorizationHeader) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        ensureStageOneComplete(user);

        Map<String, SkillLevel> claimedLevels = loadClaimedSkillLevels(user.getId());
        if (claimedLevels.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Complete certificate analysis before starting assessment");
        }

        AssessmentSessionEntity existingStarted = assessmentSessionRepository
            .findTopByUserIdAndStatusOrderByStartedAtDesc(user.getId(), AssessmentSessionStatus.STARTED)
            .orElse(null);

        AssessmentSessionEntity session;
        List<Question> internalQuestions;

        if (existingStarted != null) {
            session = existingStarted;
            internalQuestions = readQuestions(existingStarted.getQuestionsJson());
        } else {
            internalQuestions = generateAssessmentQuestions(new ArrayList<>(claimedLevels.keySet()));
            session = new AssessmentSessionEntity();
            session.setUser(user);
            session.setDetectedSkillsJson(writeJson(toStringMap(claimedLevels)));
            session.setQuestionsJson(writeJson(internalQuestions));
            session.setStatus(AssessmentSessionStatus.STARTED);
            session.setStartedAt(Instant.now());
            session = assessmentSessionRepository.save(session);
        }

        List<DetectedSkillResponse> detectedSkillResponses = claimedLevels.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> new DetectedSkillResponse(entry.getKey(), formatSkillLevel(entry.getValue())))
            .toList();

        List<AssessmentQuestionResponse> questions = internalQuestions.stream()
            .map(this::toQuestionResponse)
            .toList();

        int totalTimeLimitSec = questions.size() * QUESTION_TIME_LIMIT_SEC;
        return new StartAssessmentResponse(
            session.getId(),
            detectedSkillResponses,
            questions,
            totalTimeLimitSec,
            session.getStartedAt()
        );
    }

    @Transactional
    public SubmitAssessmentResponse submitAssessment(String authorizationHeader, SubmitAssessmentRequest request) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        ensureStageOneComplete(user);

        AssessmentSessionEntity session = assessmentSessionRepository.findByIdAndUserId(request.getSessionId(), user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assessment session not found"));

        if (session.getStatus() != AssessmentSessionStatus.STARTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assessment session is already completed");
        }

        List<Question> questions = readQuestions(session.getQuestionsJson());
        Map<String, Question> questionMap = new HashMap<>();
        questions.forEach(question -> questionMap.put(question.questionId(), question));

        Map<String, Integer> totalBySkill = new HashMap<>();
        Map<String, Integer> correctBySkill = new HashMap<>();
        Map<String, List<Integer>> timeBySkill = new HashMap<>();

        Map<String, AssessmentAnswerRequest> answerByQuestionId = new HashMap<>();
        for (AssessmentAnswerRequest answer : request.getAnswers()) {
            answerByQuestionId.put(answer.getQuestionId(), answer);
        }

        int totalAnsweredQuestions = 0;
        int totalCorrectQuestions = 0;
        List<AssessmentQuestionResultResponse> questionResults = new ArrayList<>();
        List<Map<String, Object>> responseRows = new ArrayList<>();

        for (Question question : questions) {
            AssessmentAnswerRequest answer = answerByQuestionId.get(question.questionId());
            if (answer == null) {
                continue;
            }

            int safeTimeSpent = valueOrZero(answer.getTimeSpentSec());
            boolean isWritten = isWrittenQuestion(question);
            boolean correct;
            String selectedOptionText = null;
            String correctAnswer;

            if (isWritten) {
                correct = evaluateWrittenAnswer(safe(answer.getTextAnswer()), question.expectedKeywords());
                correctAnswer = String.join(", ", question.expectedKeywords());
            } else {
                Integer selectedOptionIndex = answer.getSelectedOptionIndex();
                correct = selectedOptionIndex != null && Objects.equals(selectedOptionIndex, question.correctOptionIndex());
                if (selectedOptionIndex != null && selectedOptionIndex >= 0 && selectedOptionIndex < question.options().size()) {
                    selectedOptionText = question.options().get(selectedOptionIndex);
                }
                correctAnswer = question.options().get(question.correctOptionIndex());
            }

            totalAnsweredQuestions++;
            totalBySkill.merge(question.skillArea(), 1, Integer::sum);
            if (correct) {
                totalCorrectQuestions++;
                correctBySkill.merge(question.skillArea(), 1, Integer::sum);
            }
            timeBySkill.computeIfAbsent(question.skillArea(), unused -> new ArrayList<>()).add(safeTimeSpent);

            questionResults.add(new AssessmentQuestionResultResponse(
                question.questionId(),
                question.skillArea(),
                question.question(),
                question.questionType(),
                answer.getSelectedOptionIndex(),
                selectedOptionText,
                safe(answer.getTextAnswer()),
                correctAnswer,
                correct
            ));

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("question_id", answer.getQuestionId());
            row.put("question_type", question.questionType());
            row.put("selected_option_index", answer.getSelectedOptionIndex());
            row.put("text_answer", safe(answer.getTextAnswer()));
            row.put("time_spent_sec", safeTimeSpent);
            row.put("correct", correct);
            responseRows.add(row);
        }

        Map<String, SkillLevel> claimedLevels = loadClaimedSkillLevels(user.getId());
        Map<String, SkillLevel> assessedLevels = new LinkedHashMap<>();
        for (String skill : claimedLevels.keySet()) {
            int total = totalBySkill.getOrDefault(skill, 0);
            int correct = correctBySkill.getOrDefault(skill, 0);
            double accuracy = total == 0 ? 0 : (correct / (double) total);

            SkillLevel assessed = deriveAssessedLevel(accuracy);
            assessed = adjustByTiming(assessed, timeBySkill.getOrDefault(skill, List.of()));
            assessedLevels.put(skill, assessed);
        }

        AssessmentBehaviorMetricsRequest behavior = request.getBehaviourMetrics();
        int tabSwitches = valueOrZero(behavior == null ? null : behavior.getTabSwitchCount());
        int copyPaste = valueOrZero(behavior == null ? null : behavior.getCopyPasteAttempts());
        int blurCount = valueOrZero(behavior == null ? null : behavior.getWindowBlurCount());
        int unusuallyFast = valueOrZero(behavior == null ? null : behavior.getUnusuallyFastCount());
        int unusuallySlow = valueOrZero(behavior == null ? null : behavior.getUnusuallySlowCount());

        double behaviorPenalty = Math.min(0.25,
            tabSwitches * 0.02 + copyPaste * 0.07 + blurCount * 0.02 + unusuallyFast * 0.03 + unusuallySlow * 0.01);

        if (behaviorPenalty >= 0.15) {
            assessedLevels.replaceAll((skill, level) -> downgrade(level));
        }

        double rawAccuracy = totalAnsweredQuestions == 0 ? 0.0 : (totalCorrectQuestions / (double) totalAnsweredQuestions);
        double adjustedAccuracy = Math.max(0.0, rawAccuracy - behaviorPenalty);
        String overallKnowledgeLevel = deriveKnowledgeBand(adjustedAccuracy);

        int mismatchCount = 0;
        List<VerifiedSkillResponse> verifiedSkills = new ArrayList<>();
        for (Map.Entry<String, SkillLevel> entry : assessedLevels.entrySet()) {
            String skill = entry.getKey();
            SkillLevel assessed = entry.getValue();
            SkillLevel claimed = claimedLevels.getOrDefault(skill, assessed);
            boolean matched = claimed == assessed;
            if (!matched) {
                mismatchCount++;
            }

            SkillLevel verifiedLevel = matched ? claimed : assessed;
            double credibility = matched ? 0.85 : 0.35;

            VerifiedSkillEntity entity = verifiedSkillRepository.findByUserIdAndSkillName(user.getId(), skill)
                .orElseGet(VerifiedSkillEntity::new);
            entity.setUser(user);
            entity.setSkillName(skill);
            entity.setClaimedLevel(claimed);
            entity.setAssessedLevel(assessed);
            entity.setVerifiedLevel(verifiedLevel);
            entity.setLevelsMatched(matched);
            entity.setCertificateCredibility(credibility);
            verifiedSkillRepository.save(entity);

            verifiedSkills.add(new VerifiedSkillResponse(
                skill,
                formatSkillLevel(claimed),
                formatSkillLevel(assessed),
                formatSkillLevel(verifiedLevel),
                matched,
                credibility
            ));
        }

        verifiedSkills.sort(Comparator.comparing(VerifiedSkillResponse::getSkillArea));

        Map<String, Object> behaviorJson = new LinkedHashMap<>();
        behaviorJson.put("tab_switch_count", tabSwitches);
        behaviorJson.put("copy_paste_attempts", copyPaste);
        behaviorJson.put("window_blur_count", blurCount);
        behaviorJson.put("unusually_fast_count", unusuallyFast);
        behaviorJson.put("unusually_slow_count", unusuallySlow);
        behaviorJson.put("behaviour_penalty", behaviorPenalty);

        Instant completedAt = Instant.now();
        session.setResponsesJson(writeJson(responseRows));
        session.setBehaviorMetricsJson(writeJson(behaviorJson));
        session.setAssessedLevelsJson(writeJson(toStringMap(assessedLevels)));
        session.setMismatchCount(mismatchCount);
        session.setCertificateCredibilityScore(Math.max(0.1, 1.0 - (mismatchCount * 0.2) - behaviorPenalty));
        session.setStatus(AssessmentSessionStatus.COMPLETED);
        session.setCompletedAt(completedAt);
        assessmentSessionRepository.save(session);

        return new SubmitAssessmentResponse(
            verifiedSkills,
            mismatchCount > 0,
            mismatchCount,
            overallKnowledgeLevel,
            questionResults,
            completedAt
        );
    }

    public SkillVerificationStatusResponse getMyStatus(String authorizationHeader) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        boolean quizCompleted = quizSubmissionRepository.findByUserId(user.getId()).isPresent();

        Map<String, SkillLevel> claimedLevels = loadClaimedSkillLevels(user.getId());
        boolean certificationStageCompleted = !claimedLevels.isEmpty();

        List<VerifiedSkillEntity> verified = verifiedSkillRepository.findByUserIdOrderBySkillNameAsc(user.getId());
        boolean assessmentStageCompleted = !verified.isEmpty();

        Instant lastCompletedAt = assessmentSessionRepository.findTopByUserIdOrderByStartedAtDesc(user.getId())
            .filter(session -> session.getStatus() == AssessmentSessionStatus.COMPLETED)
            .map(AssessmentSessionEntity::getCompletedAt)
            .orElse(null);

        List<DetectedSkillResponse> detectedSkills = claimedLevels.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> new DetectedSkillResponse(entry.getKey(), formatSkillLevel(entry.getValue())))
            .toList();

        List<VerifiedSkillResponse> verifiedResponses = verified.stream()
            .map(item -> new VerifiedSkillResponse(
                item.getSkillName(),
                formatSkillLevel(item.getClaimedLevel()),
                formatSkillLevel(item.getAssessedLevel()),
                formatSkillLevel(item.getVerifiedLevel()),
                item.isLevelsMatched(),
                item.getCertificateCredibility()
            ))
            .toList();

        return new SkillVerificationStatusResponse(
            quizCompleted,
            certificationStageCompleted,
            assessmentStageCompleted,
            quizCompleted && certificationStageCompleted,
            quizCompleted && assessmentStageCompleted,
            detectedSkills,
            verifiedResponses,
            lastCompletedAt
        );
    }

    public List<CertificateClaimViewResponse> getMyCertificates(String authorizationHeader) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        return certificateClaimRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .map(item -> new CertificateClaimViewResponse(
                item.getId(),
                item.getCertificateTitle(),
                item.getProvider(),
                item.getDescription(),
                item.getCertificateContent(),
                item.getCertificateImageBase64(),
                item.getCreatedAt()
            ))
            .toList();
    }

    public SubmitAssessmentResponse getLatestAssessmentResult(String authorizationHeader) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);

        AssessmentSessionEntity session = assessmentSessionRepository
            .findTopByUserIdAndStatusOrderByCompletedAtDesc(user.getId(), AssessmentSessionStatus.COMPLETED)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No completed assessment found"));

        List<Question> questions = readQuestions(session.getQuestionsJson());
        Map<String, Question> questionById = new HashMap<>();
        questions.forEach(question -> questionById.put(question.questionId(), question));

        List<Map<String, Object>> responseRows = readResponseRows(session.getResponsesJson());
        List<AssessmentQuestionResultResponse> questionResults = new ArrayList<>();

        int total = 0;
        int correctTotal = 0;

        for (Map<String, Object> row : responseRows) {
            String questionId = asString(row.get("question_id"));
            if (questionId == null || questionId.isBlank()) {
                continue;
            }

            Question question = questionById.get(questionId);
            if (question == null) {
                continue;
            }

            total++;
            boolean correct = asBoolean(row.get("correct"));
            if (correct) {
                correctTotal++;
            }

            Integer selectedOptionIndex = asInteger(row.get("selected_option_index"));
            String textAnswer = asString(row.get("text_answer"));
            String questionType = question.questionType();

            String selectedOptionText = null;
            if (!isWrittenQuestion(question)
                && selectedOptionIndex != null
                && selectedOptionIndex >= 0
                && selectedOptionIndex < question.options().size()) {
                selectedOptionText = question.options().get(selectedOptionIndex);
            }

            String correctAnswer = isWrittenQuestion(question)
                ? String.join(", ", question.expectedKeywords())
                : question.options().get(question.correctOptionIndex());

            questionResults.add(new AssessmentQuestionResultResponse(
                question.questionId(),
                question.skillArea(),
                question.question(),
                questionType,
                selectedOptionIndex,
                selectedOptionText,
                safe(textAnswer),
                correctAnswer,
                correct
            ));
        }

        double rawAccuracy = total == 0 ? 0.0 : (correctTotal / (double) total);
        double behaviorPenalty = extractBehaviourPenalty(session.getBehaviorMetricsJson());
        String overallKnowledgeLevel = deriveKnowledgeBand(Math.max(0.0, rawAccuracy - behaviorPenalty));

        List<VerifiedSkillResponse> verifiedSkills = verifiedSkillRepository.findByUserIdOrderBySkillNameAsc(user.getId()).stream()
            .map(item -> new VerifiedSkillResponse(
                item.getSkillName(),
                formatSkillLevel(item.getClaimedLevel()),
                formatSkillLevel(item.getAssessedLevel()),
                formatSkillLevel(item.getVerifiedLevel()),
                item.isLevelsMatched(),
                item.getCertificateCredibility()
            ))
            .toList();

        int mismatchCount = session.getMismatchCount() == null ? 0 : Math.max(0, session.getMismatchCount());
        return new SubmitAssessmentResponse(
            verifiedSkills,
            mismatchCount > 0,
            mismatchCount,
            overallKnowledgeLevel,
            questionResults,
            session.getCompletedAt()
        );
    }

    private void ensureStageOneComplete(UserEntity user) {
        if (quizSubmissionRepository.findByUserId(user.getId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Stage 1 (quiz) must be completed before this step");
        }
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

    private List<String> detectSkillAreas(String inputText) {
        String text = inputText.toLowerCase(Locale.ROOT);
        List<String> skills = new ArrayList<>();

        addIfMatched(skills, "Python", text, List.of("python", "pandas", "numpy", "django", "flask"));
        addIfMatched(skills, "UI/UX", text, List.of("ui", "ux", "figma", "wireframe", "prototype", "user research"));
        addIfMatched(skills, "Cybersecurity", text, List.of("cyber", "security", "owasp", "penetration", "vulnerability"));
        addIfMatched(skills, "Data Science", text, List.of("data science", "machine learning", "analytics", "model", "statistics"));
        addIfMatched(skills, "Cloud", text, List.of("cloud", "aws", "azure", "gcp", "kubernetes", "docker"));
        addIfMatched(skills, "Web Development", text, List.of("javascript", "react", "spring", "node", "web development", "frontend", "backend"));
        addIfMatched(skills, "Networking", text, List.of("network", "tcp", "routing", "switching", "ccna"));

        if (skills.isEmpty()) {
            skills.add("Software Engineering");
        }
        return skills;
    }

    private void addIfMatched(List<String> skills, String skill, String text, List<String> keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                skills.add(skill);
                return;
            }
        }
    }

    private SkillLevel estimateClaimedLevel(String inputText) {
        String text = inputText.toLowerCase(Locale.ROOT);

        if (text.contains("advanced") || text.contains("expert") || text.contains("professional") || text.contains("master")) {
            return SkillLevel.ADVANCED;
        }
        if (text.contains("intermediate") || text.contains("associate") || text.contains("practitioner")) {
            return SkillLevel.INTERMEDIATE;
        }
        if (text.contains("beginner") || text.contains("foundation") || text.contains("fundamental")) {
            return SkillLevel.BEGINNER;
        }

        Matcher matcher = YEARS_PATTERN.matcher(text);
        if (matcher.find()) {
            int years = Integer.parseInt(matcher.group(1));
            if (years >= 3) {
                return SkillLevel.ADVANCED;
            }
            if (years >= 1) {
                return SkillLevel.INTERMEDIATE;
            }
        }

        return SkillLevel.INTERMEDIATE;
    }

    private List<Question> generateAssessmentQuestions(List<String> detectedSkills) {
        Random random = new Random();
        List<Question> allQuestions = new ArrayList<>();

        List<String> skills = new ArrayList<>(detectedSkills);
        if (skills.isEmpty()) {
            skills.add("Software Engineering");
        }

        Map<String, List<QuestionTemplate>> bank = questionBank();
        Map<String, Integer> indexBySkill = new HashMap<>();
        int sequence = 1;

        while (allQuestions.size() < MIN_ASSESSMENT_QUESTION_COUNT) {
            String skill = skills.get(allQuestions.size() % skills.size());
            List<QuestionTemplate> templates = bank.getOrDefault(skill, fallbackQuestionTemplates(skill));
            List<QuestionTemplate> shuffledTemplates = new ArrayList<>(templates);
            Collections.shuffle(shuffledTemplates, random);

            int index = indexBySkill.getOrDefault(skill, 0);
            QuestionTemplate template = shuffledTemplates.get(index % shuffledTemplates.size());
            indexBySkill.put(skill, index + 1);

            allQuestions.add(new Question(
                "Q-" + skill.replaceAll("\\s+", "-").toUpperCase(Locale.ROOT) + "-" + sequence + "-" + Math.abs(random.nextInt()),
                skill,
                template.question(),
                template.questionType(),
                template.options(),
                template.correctOptionIndex(),
                template.expectedKeywords(),
                true,
                QUESTION_TIME_LIMIT_SEC
            ));
            sequence++;
        }

        Collections.shuffle(allQuestions, random);
        return allQuestions;
    }

    private Map<String, List<QuestionTemplate>> questionBank() {
        Map<String, List<QuestionTemplate>> bank = new HashMap<>();

        bank.put("Python", List.of(
            mcq(
                "A script that parses 50k rows is too slow. Which change usually provides the largest performance gain first?",
                List.of("Switch from loops to vectorized library operations", "Rename variables for readability", "Add more print statements", "Convert every integer to string"),
                0
            ),
            mcq(
                "Your API throws exceptions for missing keys in nested JSON. What is the safest pattern?",
                List.of("Use dict access with guards/defaults", "Wrap every line in a while loop", "Ignore all exceptions", "Hardcode fallback payloads"),
                0
            ),
            mcq(
                "You need predictable dependencies across environments. What is the best practice?",
                List.of("Pin versions in requirements/lock files", "Install random latest versions", "Copy site-packages folder manually", "Disable virtual environments"),
                0
            ),
            written(
                "Describe how you would structure error handling and logging in a Python REST API endpoint.",
                List.of("exception", "logging", "status code", "validation")
            ),
            written(
                "A model-serving Python service has rising latency. Explain two debugging steps and one optimization you would apply.",
                List.of("profiling", "cache", "batch", "optimize")
            )
        ));

        bank.put("UI/UX", List.of(
            mcq(
                "Users drop off on checkout. What should be validated first?",
                List.of("Task flow friction from user journey testing", "Only typography color", "Team availability", "Random animation speed"),
                0
            ),
            mcq(
                "A mobile form has high error rate. What likely helps most?",
                List.of("Inline validation with clear field-level messages", "Smaller submit button", "More decorative icons", "Hidden labels"),
                0
            ),
            mcq(
                "A stakeholder asks for 5 different nav patterns. What should guide decision?",
                List.of("Consistency with user mental model and test evidence", "Personal taste only", "Most complex option", "Darkest color palette"),
                0
            ),
            written(
                "Explain how you would validate a dashboard redesign using usability testing.",
                List.of("users", "task", "feedback", "iteration")
            ),
            written(
                "Write a short plan to improve accessibility for a form-heavy student portal.",
                List.of("contrast", "keyboard", "label", "screen reader")
            )
        ));

        bank.put("Cybersecurity", List.of(
            mcq(
                "A login endpoint is vulnerable to brute force. Best immediate mitigation?",
                List.of("Rate limiting and account lock strategy", "Show stack traces", "Disable logging", "Store passwords in plain text"),
                0
            ),
            mcq(
                "Which practice best reduces SQL injection risk?",
                List.of("Parameterized queries/prepared statements", "String concatenation with filters", "Client-side validation only", "Base64-encoding user input"),
                0
            ),
            mcq(
                "A package CVE is reported. What should happen first?",
                List.of("Assess impact and patch/mitigate quickly", "Ignore until next quarter", "Hide alerts", "Disable dependency scanning"),
                0
            ),
            written(
                "Describe a secure authentication design for a web app handling student personal data.",
                List.of("jwt", "mfa", "hash", "session", "token")
            ),
            written(
                "How would you investigate suspicious repeated failed logins in production logs?",
                List.of("logs", "ip", "rate", "alert", "incident")
            )
        ));

        bank.put("Data Science", List.of(
            mcq(
                "Model accuracy is high but fails in production. Most likely issue?",
                List.of("Data drift and train-serving mismatch", "Too many comments in code", "Notebook theme", "GPU fan speed"),
                0
            ),
            mcq(
                "How to reduce data leakage in validation?",
                List.of("Split before preprocessing fit", "Use full dataset for scaling first", "Tune on test set", "Shuffle labels"),
                0
            ),
            mcq(
                "A class imbalance problem appears. Good first baseline approach?",
                List.of("Stratified split and class-aware metrics", "Only use accuracy metric", "Drop minority class", "Duplicate test rows"),
                0
            ),
            written(
                "Explain how you would monitor model performance drift after deployment.",
                List.of("drift", "metric", "monitor", "retrain")
            ),
            written(
                "Provide a short experiment plan for comparing two recommendation models.",
                List.of("baseline", "metric", "validation", "ab test")
            )
        ));

        bank.put("Cloud", List.of(
            mcq(
                "An app needs zero-downtime deploys. Which pattern is most suitable?",
                List.of("Blue-green or rolling deployment", "Manual stop-start every release", "Single server reboot", "No health checks"),
                0
            ),
            mcq(
                "Which is a core principle to harden cloud access?",
                List.of("Least privilege IAM", "Shared root account", "Publicly exposed admin ports", "No MFA"),
                0
            ),
            mcq(
                "Cost unexpectedly spikes overnight. First analysis step?",
                List.of("Check usage/monitoring by resource tags", "Delete logs", "Scale everything up", "Disable alerts"),
                0
            ),
            written(
                "How would you design a backup and disaster recovery strategy for a student platform in cloud?",
                List.of("backup", "recovery", "rto", "rpo", "replication")
            ),
            written(
                "Explain a secure CI/CD pipeline for deploying a web backend to cloud.",
                List.of("pipeline", "scan", "secret", "deploy", "rollback")
            )
        ));

        bank.put("Web Development", List.of(
            mcq(
                "A page is slow due to large JS bundle. Best first optimization?",
                List.of("Code-splitting and lazy loading", "Disable caching", "Inline every script", "Add more global CSS"),
                0
            ),
            mcq(
                "API requests fail due to CORS preflight. Typical fix?",
                List.of("Correct server CORS configuration", "Disable browser security", "Use random ports", "Rename endpoint"),
                0
            ),
            mcq(
                "How do you reduce regressions in critical flows?",
                List.of("Automated tests for key paths", "Manual checks only", "Skip code review", "Merge directly to main"),
                0
            ),
            written(
                "Describe how you would structure API error responses for a frontend-heavy application.",
                List.of("status", "message", "code", "validation")
            ),
            written(
                "How would you debug a production-only bug where dashboard data intermittently fails to load?",
                List.of("logs", "network", "retry", "timeout", "monitor")
            )
        ));

        bank.put("Networking", List.of(
            mcq(
                "Intermittent packet loss is reported. What do you check first?",
                List.of("Interface errors, congestion, and link health", "Wallpaper settings", "Browser bookmarks", "Keyboard layout"),
                0
            ),
            mcq(
                "A subnet is exhausted. What is a practical fix?",
                List.of("Re-plan CIDR allocation and segment correctly", "Disable DHCP", "Use one giant broadcast domain", "Ignore growth"),
                0
            ),
            mcq(
                "Sensitive traffic crosses public links. What should be enforced?",
                List.of("Encrypted tunnels/VPN", "Plain FTP", "Open guest Wi-Fi", "Default credentials"),
                0
            ),
            written(
                "Describe a troubleshooting flow for high latency between client and backend services.",
                List.of("latency", "traceroute", "dns", "routing", "packet")
            ),
            written(
                "How would you design network segmentation for admin and student workloads?",
                List.of("segment", "firewall", "subnet", "access control")
            )
        ));

        bank.put("Software Engineering", fallbackQuestionTemplates("Software Engineering"));
        return bank;
    }

    private List<QuestionTemplate> fallbackQuestionTemplates(String skill) {
        return List.of(
            mcq(
                "In a real project for " + skill + ", what most improves long-term maintainability?",
                List.of("Clear modular design and tests", "Large functions with mixed concerns", "Skipping code reviews", "No documentation"),
                0
            ),
            mcq(
                "A production defect appears after release. Best immediate response?",
                List.of("Triage impact, rollback or patch, then RCA", "Blame users", "Ignore until next sprint", "Delete monitoring alerts"),
                0
            ),
            mcq(
                "What best increases confidence in a new feature?",
                List.of("Validation with tests and measurable acceptance criteria", "Only visual inspection", "No QA due to deadlines", "Randomly sampled manual clicks"),
                0
            ),
            written(
                "Explain how you would break down a large feature in " + skill + " into deliverable tasks.",
                List.of("task", "milestone", "test", "deliverable")
            ),
            written(
                "How would you communicate technical risk to non-technical stakeholders in this domain?",
                List.of("risk", "impact", "mitigation", "timeline")
            )
        );
    }

    private SkillLevel deriveAssessedLevel(double accuracy) {
        if (accuracy >= 0.75) {
            return SkillLevel.ADVANCED;
        }
        if (accuracy >= 0.45) {
            return SkillLevel.INTERMEDIATE;
        }
        return SkillLevel.BEGINNER;
    }

    private String deriveKnowledgeBand(double accuracy) {
        if (accuracy >= 0.75) {
            return "High";
        }
        if (accuracy >= 0.45) {
            return "Medium";
        }
        return "Low";
    }

    private boolean isWrittenQuestion(Question question) {
        return "written".equalsIgnoreCase(question.questionType());
    }

    private boolean evaluateWrittenAnswer(String textAnswer, List<String> expectedKeywords) {
        if (textAnswer == null || textAnswer.isBlank()) {
            return false;
        }
        if (expectedKeywords == null || expectedKeywords.isEmpty()) {
            return textAnswer.trim().length() >= 25;
        }

        String normalizedAnswer = textAnswer.toLowerCase(Locale.ROOT);
        int matchedKeywords = 0;
        for (String keyword : expectedKeywords) {
            if (normalizedAnswer.contains(keyword.toLowerCase(Locale.ROOT))) {
                matchedKeywords++;
            }
        }
        return matchedKeywords >= Math.min(2, expectedKeywords.size());
    }

    private QuestionTemplate mcq(String question, List<String> options, int correctOptionIndex) {
        return new QuestionTemplate("mcq", question, options, correctOptionIndex, List.of());
    }

    private QuestionTemplate written(String question, List<String> expectedKeywords) {
        return new QuestionTemplate("written", question, List.of(), -1, expectedKeywords);
    }

    private SkillLevel adjustByTiming(SkillLevel level, List<Integer> times) {
        if (times == null || times.isEmpty()) {
            return level;
        }

        double avg = times.stream().mapToInt(Integer::intValue).average().orElse(0);
        if (avg < 8 || avg > 180) {
            return downgrade(level);
        }

        return level;
    }

    private SkillLevel downgrade(SkillLevel level) {
        if (level == SkillLevel.ADVANCED) {
            return SkillLevel.INTERMEDIATE;
        }
        if (level == SkillLevel.INTERMEDIATE) {
            return SkillLevel.BEGINNER;
        }
        return SkillLevel.BEGINNER;
    }

    private AssessmentQuestionResponse toQuestionResponse(Question question) {
        return new AssessmentQuestionResponse(
            question.questionId(),
            question.skillArea(),
            question.question(),
            question.questionType(),
            question.options(),
            question.scenarioBased(),
            question.recommendedTimeSec()
        );
    }

    private Map<String, SkillLevel> loadClaimedSkillLevels(Long userId) {
        List<CertificateClaimEntity> claims = certificateClaimRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<String, SkillLevel> merged = new LinkedHashMap<>();

        for (CertificateClaimEntity claim : claims) {
            Map<String, String> parsed = readMap(claim.getClaimedLevelsJson());
            for (Map.Entry<String, String> entry : parsed.entrySet()) {
                SkillLevel parsedLevel = parseSkillLevel(entry.getValue());
                SkillLevel existing = merged.get(entry.getKey());
                if (existing == null || parsedLevel.ordinal() > existing.ordinal()) {
                    merged.put(entry.getKey(), parsedLevel);
                }
            }
        }

        return merged;
    }

    private List<Question> readQuestions(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored assessment data is invalid");
        }
    }

    private Map<String, String> readMap(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored certificate data is invalid");
        }
    }

    private List<Map<String, Object>> readResponseRows(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }

        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store verification data");
        }
    }

    private Map<String, String> toStringMap(List<String> skills, SkillLevel level) {
        Map<String, String> map = new LinkedHashMap<>();
        for (String skill : skills) {
            map.put(skill, level.name());
        }
        return map;
    }

    private Map<String, String> toStringMap(Map<String, SkillLevel> map) {
        Map<String, String> output = new LinkedHashMap<>();
        map.forEach((key, value) -> output.put(key, value.name()));
        return output;
    }

    private SkillLevel parseSkillLevel(String input) {
        if (input == null || input.isBlank()) {
            return SkillLevel.BEGINNER;
        }

        try {
            return SkillLevel.valueOf(input.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return SkillLevel.BEGINNER;
        }
    }

    private String formatSkillLevel(SkillLevel level) {
        String lower = level.name().toLowerCase(Locale.ROOT);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private Integer asInteger(Object value) {
        if (value instanceof Integer integerValue) {
            return integerValue;
        }
        if (value instanceof Number numberValue) {
            return numberValue.intValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Integer.parseInt(stringValue);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean boolValue) {
            return boolValue;
        }
        if (value instanceof String stringValue) {
            return Boolean.parseBoolean(stringValue);
        }
        return false;
    }

    private double extractBehaviourPenalty(String behaviorMetricsJson) {
        if (behaviorMetricsJson == null || behaviorMetricsJson.isBlank()) {
            return 0.0;
        }

        try {
            Map<String, Object> parsed = objectMapper.readValue(behaviorMetricsJson, new TypeReference<>() {
            });
            Object penaltyValue = parsed.get("behaviour_penalty");
            if (penaltyValue instanceof Number numberValue) {
                return numberValue.doubleValue();
            }
            if (penaltyValue instanceof String stringValue) {
                return Double.parseDouble(stringValue);
            }
        } catch (Exception ignored) {
            return 0.0;
        }

        return 0.0;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private record Question(
        String questionId,
        String skillArea,
        String question,
        String questionType,
        List<String> options,
        int correctOptionIndex,
        List<String> expectedKeywords,
        boolean scenarioBased,
        int recommendedTimeSec
    ) {
    }

    private record QuestionTemplate(
        String questionType,
        String question,
        List<String> options,
        int correctOptionIndex,
        List<String> expectedKeywords
    ) {
    }
}
