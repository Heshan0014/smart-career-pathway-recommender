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
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SkillVerificationService {

    private static final Pattern YEARS_PATTERN = Pattern.compile("(\\d+)\\s*(year|years)", Pattern.CASE_INSENSITIVE);
    private static final int QUESTION_TIME_LIMIT_SEC = 90;
    private static final int SINGLE_SKILL_QUESTION_COUNT = 20;
    private static final int MULTI_SKILL_QUESTION_COUNT = 10;

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

        return buildCertificateAnalysis(request).response();
    }

    @Transactional
    public CertificateAnalysisResponse saveCertificates(String authorizationHeader, CertificateAnalysisRequest request) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        ensureStageOneComplete(user);

        List<CertificateEntryRequest> mergedRequests = mergeCertificatesForSave(user.getId(), request.getCertificates());

        CertificateAnalysisRequest mergedRequest = new CertificateAnalysisRequest();
        mergedRequest.setCertificates(mergedRequests);
        CertificateAnalysisComputation computation = buildCertificateAnalysis(mergedRequest);
        certificateClaimRepository.deleteByUserId(user.getId());

        List<CertificateClaimEntity> entitiesToSave = computation.entitiesToSave();
        for (CertificateClaimEntity entity : entitiesToSave) {
            entity.setUser(user);
        }
        certificateClaimRepository.saveAll(entitiesToSave);
        removeStaleVerifiedSkills(user.getId());

        return new CertificateAnalysisResponse(
            computation.response().getDetectedSkills(),
            "Certificate skills saved successfully. " + computation.response().getAnalysisSummary(),
            Instant.now()
        );
    }

    private List<CertificateEntryRequest> mergeCertificatesForSave(Long userId, List<CertificateEntryRequest> incomingCertificates) {
        Map<String, CertificateEntryRequest> byKey = new LinkedHashMap<>();

        List<CertificateClaimEntity> existingClaims = certificateClaimRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (CertificateClaimEntity existing : existingClaims) {
            CertificateEntryRequest entry = toCertificateEntryRequest(existing);
            byKey.put(certificateRequestKey(entry), entry);
        }

        for (CertificateEntryRequest incoming : incomingCertificates) {
            String key = certificateRequestKey(incoming);
            CertificateEntryRequest existing = byKey.get(key);
            byKey.put(key, mergeCertificateEntry(existing, incoming));
        }

        return new ArrayList<>(byKey.values());
    }

    private CertificateEntryRequest mergeCertificateEntry(CertificateEntryRequest existing, CertificateEntryRequest incoming) {
        if (existing == null) {
            return incoming;
        }

        CertificateEntryRequest merged = new CertificateEntryRequest();
        merged.setCertificateImageBase64(firstNonBlank(incoming.getCertificateImageBase64(), existing.getCertificateImageBase64()));
        merged.setTitle(firstNonBlank(incoming.getTitle(), existing.getTitle()));
        merged.setProvider(firstNonBlank(incoming.getProvider(), existing.getProvider()));
        merged.setDescription(firstNonBlank(incoming.getDescription(), existing.getDescription()));
        merged.setCertificateContent(firstNonBlank(incoming.getCertificateContent(), existing.getCertificateContent()));
        return merged;
    }

    private String firstNonBlank(String preferred, String fallback) {
        String preferredSafe = safe(preferred);
        if (!preferredSafe.isEmpty()) {
            return preferredSafe;
        }
        return safe(fallback);
    }

    private CertificateEntryRequest toCertificateEntryRequest(CertificateClaimEntity claim) {
        CertificateEntryRequest entry = new CertificateEntryRequest();
        entry.setTitle(claim.getCertificateTitle());
        entry.setProvider(claim.getProvider());
        entry.setDescription(claim.getDescription());
        entry.setCertificateContent(claim.getCertificateContent());
        entry.setCertificateImageBase64(claim.getCertificateImageBase64());
        return entry;
    }

    private String certificateRequestKey(CertificateEntryRequest cert) {
        String image = safe(cert.getCertificateImageBase64());
        if (!image.isEmpty()) {
            return "IMG::" + image;
        }

        return "TEXT::"
            + safe(cert.getTitle()) + "::"
            + safe(cert.getProvider()) + "::"
            + safe(cert.getDescription()) + "::"
            + safe(cert.getCertificateContent());
    }

    @Transactional
    public void deleteCertificate(String authorizationHeader, Long certificateId) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        ensureStageOneComplete(user);

        CertificateClaimEntity certificate = certificateClaimRepository.findByIdAndUserId(certificateId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Certificate not found"));

        certificateClaimRepository.delete(certificate);
        removeStaleVerifiedSkills(user.getId());
    }

    private CertificateAnalysisComputation buildCertificateAnalysis(CertificateAnalysisRequest request) {
        Map<String, SkillLevel> mergedClaims = new LinkedHashMap<>();
        List<CertificateClaimEntity> entitiesToSave = new ArrayList<>();

        for (CertificateEntryRequest cert : request.getCertificates()) {
            String text = certificateSignalText(cert);

            if (text.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No text was extracted from image. Please try a clearer certificate image.");
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
            entity.setCertificateTitle(defaultCertificateTitle(cert));
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

        List<DetectedSkillResponse> detected = mergedClaims.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> new DetectedSkillResponse(entry.getKey(), formatSkillLevel(entry.getValue())))
            .toList();

        String summary = detected.size() + " skill areas were identified from uploaded certificate images.";

        return new CertificateAnalysisComputation(
            new CertificateAnalysisResponse(detected, summary, Instant.now()),
            entitiesToSave
        );
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

        if (existingStarted != null && shouldReuseStartedSession(existingStarted, claimedLevels)) {
            session = existingStarted;
            internalQuestions = readQuestions(existingStarted.getQuestionsJson());
        } else {
            internalQuestions = generateAssessmentQuestions(claimedLevels);
            session = existingStarted != null ? existingStarted : new AssessmentSessionEntity();
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
        int perSkillQuestionCount = claimedLevels.size() <= 1 ? SINGLE_SKILL_QUESTION_COUNT : MULTI_SKILL_QUESTION_COUNT;
        return new StartAssessmentResponse(
            session.getId(),
            detectedSkillResponses,
            questions,
            totalTimeLimitSec,
            perSkillQuestionCount,
            session.getStartedAt()
        );
    }

    private boolean shouldReuseStartedSession(AssessmentSessionEntity session, Map<String, SkillLevel> claimedLevels) {
        if (session == null || session.getQuestionsJson() == null || session.getQuestionsJson().isBlank()) {
            return false;
        }

        List<Question> questions = readQuestions(session.getQuestionsJson());
        if (questions.isEmpty()) {
            return false;
        }

        int expectedPerSkill = claimedLevels.size() <= 1 ? SINGLE_SKILL_QUESTION_COUNT : MULTI_SKILL_QUESTION_COUNT;
        int expectedTotal = claimedLevels.size() * expectedPerSkill;
        if (questions.size() != expectedTotal) {
            return false;
        }

        Set<String> expectedSkills = claimedLevels.keySet();
        Set<String> actualSkills = new java.util.HashSet<>();
        for (Question question : questions) {
            actualSkills.add(question.skillArea());
        }

        return actualSkills.equals(expectedSkills);
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

    private void removeStaleVerifiedSkills(Long userId) {
        Map<String, SkillLevel> claimedLevels = loadClaimedSkillLevels(userId);
        if (claimedLevels.isEmpty()) {
            verifiedSkillRepository.deleteByUserId(userId);
            return;
        }

        List<VerifiedSkillEntity> existingSkills = verifiedSkillRepository.findByUserIdOrderBySkillNameAsc(userId);
        List<VerifiedSkillEntity> stale = existingSkills.stream()
            .filter(item -> !claimedLevels.containsKey(item.getSkillName()))
            .toList();
        if (!stale.isEmpty()) {
            verifiedSkillRepository.deleteAll(stale);
        }
    }

    private String defaultCertificateTitle(CertificateEntryRequest cert) {
        String title = safe(cert.getTitle());
        if (!title.isEmpty()) {
            return title;
        }
        return "Uploaded Certificate";
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
        Map<String, List<String>> keywordMap = new LinkedHashMap<>();
        keywordMap.put("Python", List.of("python", "pandas", "numpy", "django", "flask", "fastapi", "pycharm", "jupyter"));
        keywordMap.put("UI/UX", List.of("ui", "ux", "figma", "wireframe", "prototype", "user research", "user experience", "workshop"));
        keywordMap.put("Cybersecurity", List.of("cyber", "security", "owasp", "penetration", "vulnerability"));
        keywordMap.put("Data Science", List.of("data science", "machine learning", "analytics", "model", "statistics", "deep learning", "tensorflow", "pytorch", "scikit", "data analysis", "ai"));
        keywordMap.put("Cloud", List.of("cloud", "aws", "azure", "gcp", "kubernetes", "docker", "devops", "terraform", "ci/cd", "ci cd", "jenkins"));
        keywordMap.put("Web Development", List.of("javascript", "typescript", "react", "angular", "vue", "spring", "spring boot", "node", "nodejs", "web development", "frontend", "backend", "rest api", "html", "css"));
        keywordMap.put("Networking", List.of("network", "tcp", "routing", "switching", "ccna"));
        keywordMap.put("Software Engineering", List.of("software engineering", "java", "c++", "c#", "oop", "object oriented", "algorithms", "data structures", "git", "version control", "design patterns", "sql", "database", "mysql", "postgresql"));

        String bestSkill = null;
        int bestScore = 0;
        for (Map.Entry<String, List<String>> entry : keywordMap.entrySet()) {
            int score = keywordHitScore(text, entry.getValue());
            if (score > bestScore) {
                bestScore = score;
                bestSkill = entry.getKey();
            }
        }

        if (bestSkill == null) {
            return List.of("Software Engineering");
        }

        return List.of(bestSkill);
    }

    private int keywordHitScore(String text, List<String> keywords) {
        int score = 0;
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                score++;
            }
        }
        return score;
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

    private List<Question> generateAssessmentQuestions(Map<String, SkillLevel> claimedLevels) {
        Random random = new Random();
        List<Question> allQuestions = new ArrayList<>();

        List<String> skills = new ArrayList<>(claimedLevels.keySet());
        if (skills.isEmpty()) {
            skills.add("Software Engineering");
            claimedLevels = new HashMap<>(claimedLevels);
            claimedLevels.put("Software Engineering", SkillLevel.INTERMEDIATE);
        }

        Map<String, List<QuestionTemplate>> bank = questionBank();
        Map<String, List<LeveledQuestionTemplate>> templatesBySkill = new LinkedHashMap<>();
        int perSkillQuestionCount = skills.size() <= 1 ? SINGLE_SKILL_QUESTION_COUNT : MULTI_SKILL_QUESTION_COUNT;

        for (String skill : skills) {
            List<QuestionTemplate> templates = bank.getOrDefault(skill, fallbackQuestionTemplates(skill));
            List<LeveledQuestionTemplate> leveledTemplates = assignDifficultyBands(templates);
            List<LeveledQuestionTemplate> orderedTemplates = orderByClaimedLevel(
                leveledTemplates,
                claimedLevels.getOrDefault(skill, SkillLevel.INTERMEDIATE),
                random
            );

            List<LeveledQuestionTemplate> uniqueTemplates = new ArrayList<>();
            Set<String> seenKeys = new java.util.HashSet<>();
            for (LeveledQuestionTemplate template : orderedTemplates) {
                String key = (template.template().questionType() + "::" + template.template().question()).toLowerCase(Locale.ROOT);
                if (seenKeys.add(key)) {
                    uniqueTemplates.add(template);
                }
            }
            int takeCount = Math.min(perSkillQuestionCount, uniqueTemplates.size());
            templatesBySkill.put(skill, new ArrayList<>(uniqueTemplates.subList(0, takeCount)));
        }

        int maxPerSkill = templatesBySkill.values().stream().mapToInt(List::size).max().orElse(0);
        if (maxPerSkill <= 0) {
            return allQuestions;
        }
        int sequence = 1;

        // Interleave skills so multi-skill users get level-priority questions across all detected skills.
        for (int i = 0; i < maxPerSkill; i++) {
            for (String skill : skills) {
                List<LeveledQuestionTemplate> templates = templatesBySkill.getOrDefault(skill, List.of());
                if (i >= templates.size()) {
                    continue;
                }

                LeveledQuestionTemplate template = templates.get(i);
                allQuestions.add(new Question(
                    "Q-" + skill.replaceAll("\\s+", "-").toUpperCase(Locale.ROOT) + "-" + sequence + "-" + Math.abs(random.nextInt()),
                    skill,
                    template.template().question(),
                    template.template().questionType(),
                    template.template().options(),
                    template.template().correctOptionIndex(),
                    template.template().expectedKeywords(),
                    true,
                    QUESTION_TIME_LIMIT_SEC
                ));
                sequence++;
            }
        }
        return allQuestions;
    }

    private String bandLabel(SkillLevel band) {
        return switch (band) {
            case BEGINNER -> "[LOW]";
            case INTERMEDIATE -> "[MEDIUM]";
            case ADVANCED -> "[HIGH]";
        };
    }

    private List<LeveledQuestionTemplate> assignDifficultyBands(List<QuestionTemplate> templates) {
        List<LeveledQuestionTemplate> leveled = new ArrayList<>();
        for (QuestionTemplate template : templates) {
            SkillLevel level = extractBandFromQuestion(template.question());
            leveled.add(new LeveledQuestionTemplate(template, level));
        }
        return leveled;
    }

    private SkillLevel extractBandFromQuestion(String question) {
        if (question != null) {
            String normalized = question.toUpperCase(Locale.ROOT);
            if (normalized.startsWith("[LOW]")) {
                return SkillLevel.BEGINNER;
            }
            if (normalized.startsWith("[HIGH]")) {
                return SkillLevel.ADVANCED;
            }
        }
        return SkillLevel.INTERMEDIATE;
    }

    private List<LeveledQuestionTemplate> orderByClaimedLevel(
        List<LeveledQuestionTemplate> templates,
        SkillLevel claimedLevel,
        Random random
    ) {
        List<LeveledQuestionTemplate> low = new ArrayList<>();
        List<LeveledQuestionTemplate> medium = new ArrayList<>();
        List<LeveledQuestionTemplate> high = new ArrayList<>();

        for (LeveledQuestionTemplate template : templates) {
            switch (template.level()) {
                case BEGINNER -> low.add(template);
                case ADVANCED -> high.add(template);
                default -> medium.add(template);
            }
        }

        Collections.shuffle(low, random);
        Collections.shuffle(medium, random);
        Collections.shuffle(high, random);

        List<LeveledQuestionTemplate> ordered = new ArrayList<>();
        switch (claimedLevel) {
            case BEGINNER -> {
                ordered.addAll(low);
                ordered.addAll(medium);
                ordered.addAll(high);
            }
            case ADVANCED -> {
                ordered.addAll(high);
                ordered.addAll(medium);
                ordered.addAll(low);
            }
            default -> {
                ordered.addAll(medium);
                ordered.addAll(low);
                ordered.addAll(high);
            }
        }
        return ordered;
    }

    private Map<String, List<QuestionTemplate>> questionBank() {
        Map<String, List<QuestionTemplate>> bank = new HashMap<>();

        bank.put("Python", pythonQuestionTemplates());
        bank.put("UI/UX", uiuxQuestionTemplates());
        bank.put("Cybersecurity", cybersecurityQuestionTemplates());
        bank.put("Data Science", dataScienceQuestionTemplates());
        bank.put("Cloud", cloudQuestionTemplates());
        bank.put("Web Development", webDevelopmentQuestionTemplates());
        bank.put("Networking", networkingQuestionTemplates());
        bank.put("Software Engineering", softwareEngineeringQuestionTemplates());
        return bank;
    }

    private List<QuestionTemplate> fallbackQuestionTemplates(String skill) {
        return softwareEngineeringQuestionTemplates();
    }

    private List<QuestionTemplate> pythonQuestionTemplates() {
        return List.of(
            mcq("[LOW] Python: Which is best to handle input validation safely?", lowOptions(), 0),
            mcq("[LOW] Python: What helps beginners avoid runtime errors quickly?", lowOptions(), 0),
            mcq("[LOW] Python: Which step improves code readability first?", lowOptions(), 0),
            mcq("[LOW] Python: How should you manage simple file read failures?", lowOptions(), 0),
            mcq("[LOW] Python: Best first step before optimizing code speed?", lowOptions(), 0),
            mcq("[LOW] Python: What is the safest way to parse uncertain data?", lowOptions(), 0),
            written("[LOW] Python: Describe a simple debugging workflow for beginner scripts.", List.of("print", "error", "step", "fix")),
            written("[LOW] Python: Explain basic exception handling in a student API task.", List.of("try", "except", "message", "validation")),

            mcq("[MEDIUM] Python: Best approach for modular service design?", mediumOptions(), 0),
            mcq("[MEDIUM] Python: How to ensure reliable dependency management?", mediumOptions(), 0),
            mcq("[MEDIUM] Python: What improves API reliability under normal load?", mediumOptions(), 0),
            mcq("[MEDIUM] Python: Best testing strategy for utility modules?", mediumOptions(), 0),
            written("[MEDIUM] Python: Explain how you would profile and optimize one slow endpoint.", List.of("profile", "metric", "bottleneck", "optimize")),
            written("[MEDIUM] Python: Describe logging and monitoring setup for production debugging.", List.of("logging", "trace", "monitor", "alert")),

            mcq("[HIGH] Python: Best architecture for high-throughput async processing?", highOptions(), 0),
            mcq("[HIGH] Python: Which strategy best improves resilience at scale?", highOptions(), 0),
            mcq("[HIGH] Python: Best security posture for sensitive data flows?", highOptions(), 0),
            written("[HIGH] Python: Describe a scalable architecture for model-serving with rollback.", List.of("architecture", "scale", "rollback", "availability")),
            written("[HIGH] Python: Explain concurrency tradeoffs for CPU-bound and IO-bound workloads.", List.of("thread", "process", "async", "tradeoff")),
            written("[HIGH] Python: Provide an observability design for distributed Python services.", List.of("metrics", "logs", "tracing", "sla"))
        );
    }

    private List<QuestionTemplate> uiuxQuestionTemplates() {
        return List.of(
            mcq("[LOW] UI/UX: What is the first step in improving form usability?", lowOptions(), 0),
            mcq("[LOW] UI/UX: Which choice best supports readable text layouts?", lowOptions(), 0),
            mcq("[LOW] UI/UX: What helps users find actions faster?", lowOptions(), 0),
            mcq("[LOW] UI/UX: Which approach improves basic accessibility quickly?", lowOptions(), 0),
            mcq("[LOW] UI/UX: What is best for responsive mobile screens first?", lowOptions(), 0),
            mcq("[LOW] UI/UX: Which practice reduces confusion in navigation?", lowOptions(), 0),
            written("[LOW] UI/UX: Describe a simple wireframe validation process.", List.of("user", "task", "feedback", "iterate")),
            written("[LOW] UI/UX: Explain how to check contrast and keyboard accessibility.", List.of("contrast", "keyboard", "focus", "label")),

            mcq("[MEDIUM] UI/UX: Best method to evaluate user drop-off points?", mediumOptions(), 0),
            mcq("[MEDIUM] UI/UX: How to maintain consistency across components?", mediumOptions(), 0),
            mcq("[MEDIUM] UI/UX: Which process improves interaction flow decisions?", mediumOptions(), 0),
            mcq("[MEDIUM] UI/UX: What should guide design-system evolution?", mediumOptions(), 0),
            written("[MEDIUM] UI/UX: Explain usability test design with measurable outcomes.", List.of("metric", "task", "insight", "iteration")),
            written("[MEDIUM] UI/UX: Describe handoff strategy between design and frontend teams.", List.of("spec", "component", "handoff", "qa")),

            mcq("[HIGH] UI/UX: Best approach for complex multi-role journey redesign?", highOptions(), 0),
            mcq("[HIGH] UI/UX: Which strategy ensures cross-platform accessibility governance?", highOptions(), 0),
            mcq("[HIGH] UI/UX: What supports scalable design decisions in large products?", highOptions(), 0),
            written("[HIGH] UI/UX: Describe research synthesis for conflicting stakeholder goals.", List.of("evidence", "tradeoff", "prioritize", "outcome")),
            written("[HIGH] UI/UX: Explain experiment design for validating major UX changes.", List.of("hypothesis", "ab", "metric", "decision")),
            written("[HIGH] UI/UX: Provide an accessibility roadmap for enterprise interfaces.", List.of("audit", "standard", "training", "monitor"))
        );
    }

    private List<QuestionTemplate> cybersecurityQuestionTemplates() {
        return List.of(
            mcq("[LOW] Cybersecurity: Best immediate mitigation for brute-force login attempts?", lowOptions(), 0),
            mcq("[LOW] Cybersecurity: Which practice most reduces SQL injection risk?", lowOptions(), 0),
            mcq("[LOW] Cybersecurity: What is first action after CVE alert?", lowOptions(), 0),
            mcq("[LOW] Cybersecurity: Which step improves password safety quickly?", lowOptions(), 0),
            mcq("[LOW] Cybersecurity: What protects basic session handling?", lowOptions(), 0),
            mcq("[LOW] Cybersecurity: Which control helps block unsafe user input?", lowOptions(), 0),
            written("[LOW] Cybersecurity: Describe secure authentication basics for a student portal.", List.of("hash", "token", "mfa", "session")),
            written("[LOW] Cybersecurity: Explain how to triage repeated failed logins.", List.of("ip", "rate", "alert", "block")),

            mcq("[MEDIUM] Cybersecurity: Best strategy for secure API design in production?", mediumOptions(), 0),
            mcq("[MEDIUM] Cybersecurity: How should dependency patching be prioritized?", mediumOptions(), 0),
            mcq("[MEDIUM] Cybersecurity: Which incident response step is most critical early?", mediumOptions(), 0),
            mcq("[MEDIUM] Cybersecurity: What strengthens defense against credential stuffing?", mediumOptions(), 0),
            written("[MEDIUM] Cybersecurity: Explain practical threat modeling for a web backend.", List.of("asset", "threat", "risk", "mitigation")),
            written("[MEDIUM] Cybersecurity: Describe secure secrets management and rotation.", List.of("secret", "vault", "rotation", "audit")),

            mcq("[HIGH] Cybersecurity: Best design for zero-trust in distributed services?", highOptions(), 0),
            mcq("[HIGH] Cybersecurity: Which strategy improves advanced detection coverage?", highOptions(), 0),
            mcq("[HIGH] Cybersecurity: Best posture for compliance and operational risk balance?", highOptions(), 0),
            written("[HIGH] Cybersecurity: Describe incident forensics workflow for production breach.", List.of("timeline", "evidence", "contain", "recover")),
            written("[HIGH] Cybersecurity: Explain defense-in-depth architecture for student data.", List.of("layer", "segmentation", "monitor", "control")),
            written("[HIGH] Cybersecurity: Provide a security automation roadmap for CI/CD.", List.of("scan", "policy", "gate", "rollback"))
        );
    }

    private List<QuestionTemplate> dataScienceQuestionTemplates() {
        return List.of(
            mcq("[LOW] Data Science: What is first step before model training?", lowOptions(), 0),
            mcq("[LOW] Data Science: Which practice reduces data quality issues early?", lowOptions(), 0),
            mcq("[LOW] Data Science: How should train/test split be handled?", lowOptions(), 0),
            mcq("[LOW] Data Science: What helps avoid simple overfitting mistakes?", lowOptions(), 0),
            mcq("[LOW] Data Science: Which metric choice should match business goal?", lowOptions(), 0),
            mcq("[LOW] Data Science: Best way to begin reproducible experiments?", lowOptions(), 0),
            written("[LOW] Data Science: Explain basic data-cleaning workflow for noisy data.", List.of("missing", "outlier", "clean", "validate")),
            written("[LOW] Data Science: Describe simple feature engineering checks.", List.of("feature", "leakage", "scale", "encode")),

            mcq("[MEDIUM] Data Science: Best approach for class imbalance issues?", mediumOptions(), 0),
            mcq("[MEDIUM] Data Science: How should model comparison be executed fairly?", mediumOptions(), 0),
            mcq("[MEDIUM] Data Science: Which workflow improves robust validation?", mediumOptions(), 0),
            mcq("[MEDIUM] Data Science: What is strongest approach to monitor drift?", mediumOptions(), 0),
            written("[MEDIUM] Data Science: Explain error-analysis process after failed production results.", List.of("slice", "error", "bias", "improve")),
            written("[MEDIUM] Data Science: Describe an experiment plan for two model candidates.", List.of("baseline", "metric", "compare", "decision")),

            mcq("[HIGH] Data Science: Best architecture for online model evaluation?", highOptions(), 0),
            mcq("[HIGH] Data Science: Which strategy supports scalable training pipelines?", highOptions(), 0),
            mcq("[HIGH] Data Science: Best governance approach for regulated ML systems?", highOptions(), 0),
            written("[HIGH] Data Science: Describe feature-store design for multi-model teams.", List.of("feature", "version", "lineage", "serving")),
            written("[HIGH] Data Science: Explain advanced monitoring and retraining policy.", List.of("drift", "threshold", "trigger", "retrain")),
            written("[HIGH] Data Science: Provide production ML architecture with rollback strategy.", List.of("deployment", "canary", "rollback", "observability"))
        );
    }

    private List<QuestionTemplate> cloudQuestionTemplates() {
        return List.of(
            mcq("[LOW] Cloud: Which action strengthens IAM basics first?", lowOptions(), 0),
            mcq("[LOW] Cloud: Best first step for safe compute setup?", lowOptions(), 0),
            mcq("[LOW] Cloud: Which storage choice depends on access pattern?", lowOptions(), 0),
            mcq("[LOW] Cloud: What improves backup reliability quickly?", lowOptions(), 0),
            mcq("[LOW] Cloud: Which monitoring signal is essential at start?", lowOptions(), 0),
            mcq("[LOW] Cloud: What helps avoid basic cloud cost mistakes?", lowOptions(), 0),
            written("[LOW] Cloud: Explain simple deployment checklist for backend release.", List.of("health", "config", "rollback", "verify")),
            written("[LOW] Cloud: Describe network security group baseline for web services.", List.of("port", "allow", "deny", "least privilege")),

            mcq("[MEDIUM] Cloud: Best practice for autoscaling policy definition?", mediumOptions(), 0),
            mcq("[MEDIUM] Cloud: How should secrets be managed in CI/CD?", mediumOptions(), 0),
            mcq("[MEDIUM] Cloud: Which strategy improves availability-zone resilience?", mediumOptions(), 0),
            mcq("[MEDIUM] Cloud: What is strongest approach for incident response readiness?", mediumOptions(), 0),
            written("[MEDIUM] Cloud: Explain container operations plan for reliable rollouts.", List.of("image", "health", "rollout", "monitor")),
            written("[MEDIUM] Cloud: Describe cost optimization process with measurable controls.", List.of("tag", "budget", "rightsizing", "review")),

            mcq("[HIGH] Cloud: Best design for multi-region disaster recovery?", highOptions(), 0),
            mcq("[HIGH] Cloud: Which method supports policy-as-code governance at scale?", highOptions(), 0),
            mcq("[HIGH] Cloud: What enables secure platform architecture for many teams?", highOptions(), 0),
            written("[HIGH] Cloud: Describe SRE strategy for reliability objectives and incident control.", List.of("slo", "error budget", "alert", "postmortem")),
            written("[HIGH] Cloud: Explain hybrid-cloud connectivity architecture decisions.", List.of("latency", "routing", "redundancy", "security")),
            written("[HIGH] Cloud: Provide an end-to-end cloud governance framework.", List.of("policy", "audit", "compliance", "automation"))
        );
    }

    private List<QuestionTemplate> webDevelopmentQuestionTemplates() {
        return List.of(
            mcq("[LOW] Web Development: Best first fix for broken form validation flow?", lowOptions(), 0),
            mcq("[LOW] Web Development: Which approach improves semantic HTML quality?", lowOptions(), 0),
            mcq("[LOW] Web Development: What helps prevent common JavaScript runtime issues?", lowOptions(), 0),
            mcq("[LOW] Web Development: Which step improves API error handling for users?", lowOptions(), 0),
            mcq("[LOW] Web Development: Best first action for routing-related page issues?", lowOptions(), 0),
            mcq("[LOW] Web Development: Which strategy improves CSS maintainability early?", lowOptions(), 0),
            written("[LOW] Web Development: Explain basic debugging workflow for a failing page.", List.of("console", "network", "error", "fix")),
            written("[LOW] Web Development: Describe safe input handling for user-submitted forms.", List.of("sanitize", "validate", "feedback", "reject")),

            mcq("[MEDIUM] Web Development: Best architecture for reusable UI components?", mediumOptions(), 0),
            mcq("[MEDIUM] Web Development: Which approach improves frontend performance reliably?", mediumOptions(), 0),
            mcq("[MEDIUM] Web Development: What is strongest API contract design practice?", mediumOptions(), 0),
            mcq("[MEDIUM] Web Development: Which testing mix best reduces regressions?", mediumOptions(), 0),
            written("[MEDIUM] Web Development: Explain authentication flow design for SPAs and APIs.", List.of("token", "refresh", "session", "secure")),
            written("[MEDIUM] Web Development: Describe release checklist for zero-downtime updates.", List.of("build", "migrate", "health", "rollback")),

            mcq("[HIGH] Web Development: Best strategy for high-load frontend/backend scaling?", highOptions(), 0),
            mcq("[HIGH] Web Development: Which pattern improves distributed debugging efficiency?", highOptions(), 0),
            mcq("[HIGH] Web Development: Best security architecture for multi-tenant web apps?", highOptions(), 0),
            written("[HIGH] Web Development: Describe observability design for fullstack production systems.", List.of("trace", "metric", "log", "correlation")),
            written("[HIGH] Web Development: Explain performance engineering plan for critical APIs.", List.of("latency", "throughput", "cache", "benchmark")),
            written("[HIGH] Web Development: Provide resilience strategy for dependent external services.", List.of("timeout", "retry", "circuit", "fallback"))
        );
    }

    private List<QuestionTemplate> networkingQuestionTemplates() {
        return List.of(
            mcq("[LOW] Networking: What is first step when connectivity is unstable?", lowOptions(), 0),
            mcq("[LOW] Networking: Which check helps identify DNS misconfiguration quickly?", lowOptions(), 0),
            mcq("[LOW] Networking: Best first action for subnet planning basics?", lowOptions(), 0),
            mcq("[LOW] Networking: What improves secure Wi-Fi baseline immediately?", lowOptions(), 0),
            mcq("[LOW] Networking: Which practice supports routing clarity for beginners?", lowOptions(), 0),
            mcq("[LOW] Networking: What check helps diagnose high latency basics?", lowOptions(), 0),
            written("[LOW] Networking: Explain a simple troubleshooting flow for packet loss.", List.of("interface", "error", "latency", "path")),
            written("[LOW] Networking: Describe baseline firewall rules for student and admin traffic.", List.of("allow", "deny", "segment", "policy")),

            mcq("[MEDIUM] Networking: Best strategy for VLAN segmentation design?", mediumOptions(), 0),
            mcq("[MEDIUM] Networking: Which method improves traffic analysis decisions?", mediumOptions(), 0),
            mcq("[MEDIUM] Networking: Best approach for redundancy in critical links?", mediumOptions(), 0),
            mcq("[MEDIUM] Networking: Which practice improves VPN operational reliability?", mediumOptions(), 0),
            written("[MEDIUM] Networking: Explain routing optimization process using measured data.", List.of("route", "metric", "latency", "optimize")),
            written("[MEDIUM] Networking: Describe incident triage for intermittent network failures.", List.of("scope", "isolate", "evidence", "recover")),

            mcq("[HIGH] Networking: Best architecture for hybrid connectivity at scale?", highOptions(), 0),
            mcq("[HIGH] Networking: Which strategy supports zero-trust network posture?", highOptions(), 0),
            mcq("[HIGH] Networking: Best method for capacity planning under growth?", highOptions(), 0),
            written("[HIGH] Networking: Describe advanced diagnostics workflow for multi-site outages.", List.of("trace", "path", "root cause", "mitigation")),
            written("[HIGH] Networking: Explain network automation approach for policy consistency.", List.of("automation", "template", "validation", "audit")),
            written("[HIGH] Networking: Provide architecture plan for secure segmented enterprise traffic.", List.of("segment", "control", "monitor", "enforce"))
        );
    }

    private List<QuestionTemplate> softwareEngineeringQuestionTemplates() {
        return List.of(
            mcq("[LOW] Software Engineering: Best first step to clarify requirements?", lowOptions(), 0),
            mcq("[LOW] Software Engineering: Which habit improves code readability fastest?", lowOptions(), 0),
            mcq("[LOW] Software Engineering: What helps reduce simple bugs before release?", lowOptions(), 0),
            mcq("[LOW] Software Engineering: Which practice improves commit quality?", lowOptions(), 0),
            mcq("[LOW] Software Engineering: How should basic errors be communicated to users?", lowOptions(), 0),
            mcq("[LOW] Software Engineering: Which step makes debugging more systematic?", lowOptions(), 0),
            written("[LOW] Software Engineering: Explain a small feature delivery workflow.", List.of("task", "code", "test", "review")),
            written("[LOW] Software Engineering: Describe basic validation and error-handling approach.", List.of("input", "validate", "error", "message")),

            mcq("[MEDIUM] Software Engineering: Best modular architecture approach for maintainability?", mediumOptions(), 0),
            mcq("[MEDIUM] Software Engineering: Which testing strategy best protects critical flows?", mediumOptions(), 0),
            mcq("[MEDIUM] Software Engineering: What is strongest release management practice?", mediumOptions(), 0),
            mcq("[MEDIUM] Software Engineering: Which approach controls technical debt over time?", mediumOptions(), 0),
            written("[MEDIUM] Software Engineering: Explain observability setup for service reliability.", List.of("metric", "alert", "log", "trace")),
            written("[MEDIUM] Software Engineering: Describe code review checklist for quality and security.", List.of("readability", "test", "risk", "security")),

            mcq("[HIGH] Software Engineering: Best architecture decision for large-scale systems?", highOptions(), 0),
            mcq("[HIGH] Software Engineering: Which pattern improves resilience under dependency failures?", highOptions(), 0),
            mcq("[HIGH] Software Engineering: Best strategy for performance engineering at scale?", highOptions(), 0),
            written("[HIGH] Software Engineering: Describe end-to-end system design with tradeoffs.", List.of("architecture", "tradeoff", "scale", "reliability")),
            written("[HIGH] Software Engineering: Explain security-by-design across SDLC phases.", List.of("threat", "control", "review", "verify")),
            written("[HIGH] Software Engineering: Provide operational excellence roadmap for a mature platform.", List.of("slo", "incident", "automation", "improvement"))
        );
    }

    private List<String> lowOptions() {
        return List.of(
            "Use clear fundamentals, validate each step, and confirm outcome",
            "Skip foundational checks and guess quickly",
            "Ignore user impact and proceed without review",
            "Delay all validation until production"
        );
    }

    private List<String> mediumOptions() {
        return List.of(
            "Use structured design, testing, and iterative improvement",
            "Depend only on intuition without metrics",
            "Skip review to save time",
            "Avoid documenting decisions"
        );
    }

    private List<String> highOptions() {
        return List.of(
            "Apply architecture-level controls, observability, and continuous verification",
            "Use one fixed pattern regardless of context",
            "Prioritize speed over reliability and security",
            "Disable monitoring to reduce overhead"
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

    private String certificateSignalText(CertificateEntryRequest cert) {
        String certificateContent = safe(cert.getCertificateContent());
        if (!certificateContent.isEmpty()) {
            return (safe(cert.getTitle()) + " " + certificateContent).trim();
        }

        return String.join(" ",
            safe(cert.getTitle()),
            safe(cert.getDescription()),
            safe(cert.getProvider())
        ).trim();
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

    private record LeveledQuestionTemplate(
        QuestionTemplate template,
        SkillLevel level
    ) {
    }

    private record CertificateAnalysisComputation(
        CertificateAnalysisResponse response,
        List<CertificateClaimEntity> entitiesToSave
    ) {
    }
}
