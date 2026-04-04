package com.smartcareer.backend.service;

import com.smartcareer.backend.config.JwtUtil;
import com.smartcareer.backend.dto.AdminDashboardStatsResponse;
import com.smartcareer.backend.dto.AdminProfileResponse;
import com.smartcareer.backend.dto.AdminStudentRowResponse;
import com.smartcareer.backend.dto.AdminStudentsResponse;
import com.smartcareer.backend.dto.UpdateProfileRequest;
import com.smartcareer.backend.entity.QuizSubmissionEntity;
import com.smartcareer.backend.entity.UserEntity;
import com.smartcareer.backend.entity.UserRole;
import com.smartcareer.backend.repository.QuizSubmissionRepository;
import com.smartcareer.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\d{10}$");
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile(".*[A-Z].*");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile(".*[a-z].*");
    private static final Pattern NUMBER_PATTERN = Pattern.compile(".*\\d.*");
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile(".*[^A-Za-z0-9\\s].*");
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile(".*\\s.*");
    private static final int PROFILE_COMPLETION_THRESHOLD = 80;
    private static final String PASSWORD_RULE_ERROR = "Password must be 8-128 chars with upper, lower, number, special and no spaces.";

    private final UserRepository userRepository;
    private final QuizSubmissionRepository quizSubmissionRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
        UserRepository userRepository,
        QuizSubmissionRepository quizSubmissionRepository,
        JwtUtil jwtUtil,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.quizSubmissionRepository = quizSubmissionRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    public AdminDashboardStatsResponse getDashboardStats(String authorizationHeader) {
        getAdminFromAuthorizationHeader(authorizationHeader);
        List<StudentSnapshot> snapshots = buildStudentSnapshots();

        long totalStudents = snapshots.size();
        long completedProfiles = snapshots.stream().filter(StudentSnapshot::profileCompleted).count();
        long quizSubmittedCount = snapshots.stream().filter(StudentSnapshot::quizSubmitted).count();
        long recommendationReadyCount = snapshots.stream().filter(StudentSnapshot::recommendationEligible).count();
        long pendingProfiles = totalStudents - completedProfiles;

        return new AdminDashboardStatsResponse(
            totalStudents,
            completedProfiles,
            pendingProfiles,
            quizSubmittedCount,
            recommendationReadyCount,
            Instant.now()
        );
    }

    public AdminStudentsResponse getStudents(
        String authorizationHeader,
        String search,
        String profileStatus,
        String quizStatus,
        String recommendationStatus,
        int page,
        int size
    ) {
        getAdminFromAuthorizationHeader(authorizationHeader);

        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be greater than or equal to 0");
        }
        if (size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "size must be between 1 and 100");
        }

        List<StudentSnapshot> snapshots = buildStudentSnapshots();
        List<StudentSnapshot> filtered = applyFilters(snapshots, search, profileStatus, quizStatus, recommendationStatus);

        filtered.sort(Comparator
            .comparing(StudentSnapshot::lastUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(StudentSnapshot::studentId, Comparator.reverseOrder()));

        int start = page * size;
        int end = Math.min(start + size, filtered.size());
        List<AdminStudentRowResponse> rows = new ArrayList<>();

        if (start < filtered.size()) {
            rows = filtered.subList(start, end).stream()
                .map(item -> new AdminStudentRowResponse(
                    item.studentId(),
                    item.fullName(),
                    item.email(),
                    item.profileCompletionPercentage(),
                    item.quizSubmitted(),
                    item.recommendationEligible(),
                    item.lastUpdatedAt()
                ))
                .toList();
        }

        int totalPages = filtered.isEmpty() ? 0 : (int) Math.ceil(filtered.size() / (double) size);
        return new AdminStudentsResponse(rows, page, size, filtered.size(), totalPages);
    }

    public AdminProfileResponse getAdminMe(String authorizationHeader) {
        return toAdminProfileResponse(getAdminFromAuthorizationHeader(authorizationHeader));
    }

    public AdminProfileResponse updateAdminMe(String authorizationHeader, UpdateProfileRequest request) {
        UserEntity admin = getAdminFromAuthorizationHeader(authorizationHeader);

        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.length() < 2) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name must be at least 2 characters");
            }
            admin.setFullName(fullName);
        }

        if (request.getEmail() != null) {
            String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
            if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
            }

            userRepository.findByEmail(normalizedEmail).ifPresent(existing -> {
                if (!existing.getId().equals(admin.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already registered");
                }
            });
            admin.setEmail(normalizedEmail);
        }

        if (request.getPassword() != null) {
            String password = request.getPassword();
            if (!isStrongPassword(password)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, PASSWORD_RULE_ERROR);
            }
            admin.setHashedPassword(passwordEncoder.encode(password));
        }

        if (request.getPhoneNumber() != null) {
            String phoneNumber = request.getPhoneNumber().trim();
            if (!phoneNumber.isEmpty() && !PHONE_PATTERN.matcher(phoneNumber).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number must have exactly 10 digits");
            }
            admin.setPhoneNumber(phoneNumber);
        }

        if (request.getAddress() != null) {
            admin.setAddress(request.getAddress().trim());
        }

        if (request.getProfileImage() != null) {
            admin.setProfileImage(request.getProfileImage());
        }

        UserEntity updated = userRepository.save(admin);
        return toAdminProfileResponse(updated);
    }

    private List<StudentSnapshot> buildStudentSnapshots() {
        List<UserEntity> students = userRepository.findAll().stream()
            .filter(user -> user.getUserRole() == UserRole.STUDENT)
            .toList();

        List<QuizSubmissionEntity> submissions = quizSubmissionRepository.findAll();
        Set<Long> quizSubmittedUserIds = submissions.stream()
            .map(submission -> submission.getUser().getId())
            .collect(Collectors.toSet());

        return students.stream().map(student -> {
            int completionPercentage = calculateProfileCompletionPercentage(student);
            boolean quizSubmitted = quizSubmittedUserIds.contains(student.getId());
            boolean profileCompleted = completionPercentage >= PROFILE_COMPLETION_THRESHOLD;
            boolean recommendationEligible = profileCompleted && quizSubmitted;
            Instant lastUpdatedAt = student.getUpdatedAt() != null ? student.getUpdatedAt() : student.getCreatedAt();

            return new StudentSnapshot(
                student.getId(),
                student.getFullName(),
                student.getEmail(),
                completionPercentage,
                profileCompleted,
                quizSubmitted,
                recommendationEligible,
                lastUpdatedAt
            );
        }).toList();
    }

    private List<StudentSnapshot> applyFilters(
        List<StudentSnapshot> snapshots,
        String search,
        String profileStatus,
        String quizStatus,
        String recommendationStatus
    ) {
        return snapshots.stream()
            .filter(item -> matchesSearch(item, search))
            .filter(item -> matchesProfileStatus(item, profileStatus))
            .filter(item -> matchesQuizStatus(item, quizStatus))
            .filter(item -> matchesRecommendationStatus(item, recommendationStatus))
            .toList();
    }

    private boolean matchesSearch(StudentSnapshot snapshot, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }

        String term = search.trim().toLowerCase(Locale.ROOT);
        return snapshot.fullName().toLowerCase(Locale.ROOT).contains(term)
            || snapshot.email().toLowerCase(Locale.ROOT).contains(term);
    }

    private boolean matchesProfileStatus(StudentSnapshot snapshot, String profileStatus) {
        if (profileStatus == null || profileStatus.isBlank()) {
            return true;
        }

        return switch (profileStatus.trim().toLowerCase(Locale.ROOT)) {
            case "completed" -> snapshot.profileCompleted();
            case "pending" -> !snapshot.profileCompleted();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_status must be completed or pending");
        };
    }

    private boolean matchesQuizStatus(StudentSnapshot snapshot, String quizStatus) {
        if (quizStatus == null || quizStatus.isBlank()) {
            return true;
        }

        return switch (quizStatus.trim().toLowerCase(Locale.ROOT)) {
            case "submitted" -> snapshot.quizSubmitted();
            case "pending" -> !snapshot.quizSubmitted();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "quiz_status must be submitted or pending");
        };
    }

    private boolean matchesRecommendationStatus(StudentSnapshot snapshot, String recommendationStatus) {
        if (recommendationStatus == null || recommendationStatus.isBlank()) {
            return true;
        }

        return switch (recommendationStatus.trim().toLowerCase(Locale.ROOT)) {
            case "ready" -> snapshot.recommendationEligible();
            case "blocked" -> !snapshot.recommendationEligible();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recommendation_status must be ready or blocked");
        };
    }

    private int calculateProfileCompletionPercentage(UserEntity user) {
        Map<String, String> checks = new HashMap<>();
        checks.put("fullName", user.getFullName());
        checks.put("email", user.getEmail());
        checks.put("age", user.getAge());
        checks.put("gender", user.getGender());
        checks.put("educationLevel", user.getEducationLevel());
        checks.put("address", user.getAddress());
        checks.put("phoneNumber", user.getPhoneNumber());
        checks.put("favoriteSubject", user.getFavoriteSubject());
        checks.put("profileImage", user.getProfileImage());

        long completed = checks.values().stream()
            .filter(value -> value != null && !value.trim().isEmpty())
            .count();

        return (int) Math.round((completed * 100.0) / checks.size());
    }

    private boolean isStrongPassword(String password) {
        if (password == null || password.length() < 8 || password.length() > 128) {
            return false;
        }

        return UPPERCASE_PATTERN.matcher(password).matches()
            && LOWERCASE_PATTERN.matcher(password).matches()
            && NUMBER_PATTERN.matcher(password).matches()
            && SPECIAL_CHAR_PATTERN.matcher(password).matches()
            && !WHITESPACE_PATTERN.matcher(password).matches();
    }

    private UserEntity getAdminFromAuthorizationHeader(String authorizationHeader) {
        UserEntity user = getUserFromAuthorizationHeader(authorizationHeader);
        if (user.getUserRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return user;
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

    private AdminProfileResponse toAdminProfileResponse(UserEntity admin) {
        return new AdminProfileResponse(
            admin.getId(),
            admin.getFullName(),
            admin.getEmail(),
            admin.getPhoneNumber(),
            admin.getAddress(),
            admin.getProfileImage()
        );
    }

    private record StudentSnapshot(
        Long studentId,
        String fullName,
        String email,
        int profileCompletionPercentage,
        boolean profileCompleted,
        boolean quizSubmitted,
        boolean recommendationEligible,
        Instant lastUpdatedAt
    ) {
    }
}
