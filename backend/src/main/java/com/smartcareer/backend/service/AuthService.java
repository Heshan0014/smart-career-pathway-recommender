package com.smartcareer.backend.service;

import com.smartcareer.backend.config.AppProperties;
import com.smartcareer.backend.config.JwtUtil;
import com.smartcareer.backend.dto.AuthResponse;
import com.smartcareer.backend.dto.LoginRequest;
import com.smartcareer.backend.dto.SignupRequest;
import com.smartcareer.backend.dto.SignupResponse;
import com.smartcareer.backend.dto.UpdateProfileRequest;
import com.smartcareer.backend.dto.UserResponse;
import com.smartcareer.backend.entity.UserEntity;
import com.smartcareer.backend.entity.UserRole;
import com.smartcareer.backend.repository.QuizSubmissionRepository;
import com.smartcareer.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\d{10}$");
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile(".*[A-Z].*");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile(".*[a-z].*");
    private static final Pattern NUMBER_PATTERN = Pattern.compile(".*\\d.*");
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile(".*[^A-Za-z0-9\\s].*");
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile(".*\\s.*");
    private static final int RECOMMENDATION_REQUIRED_COMPLETION_PERCENTAGE = 80;
    private static final String PASSWORD_RULE_ERROR = "Password must be 8-128 chars with upper, lower, number, special and no spaces.";

    private final UserRepository userRepository;
    private final QuizSubmissionRepository quizSubmissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AppProperties appProperties;

    public AuthService(
        UserRepository userRepository,
        QuizSubmissionRepository quizSubmissionRepository,
        PasswordEncoder passwordEncoder,
        JwtUtil jwtUtil,
        AppProperties appProperties
    ) {
        this.userRepository = userRepository;
        this.quizSubmissionRepository = quizSubmissionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.appProperties = appProperties;
    }

    public SignupResponse signup(SignupRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already registered");
        }

        if (!isStrongPassword(request.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, PASSWORD_RULE_ERROR);
        }

        UserEntity user = new UserEntity();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setHashedPassword(passwordEncoder.encode(request.getPassword()));
        user.setUserRole(resolveRole(request.getUserRole()));

        UserEntity saved = userRepository.save(user);
        return new SignupResponse("User created successfully", saved.getId());
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        UserRole requestedRole = resolveRole(request.getUserRole());
        UserEntity user;

        if (requestedRole == UserRole.ADMIN) {
            user = authenticateAdmin(normalizedEmail, request.getPassword());
        } else {
            user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password"));

            if (!passwordEncoder.matches(request.getPassword(), user.getHashedPassword())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
            }

            UserRole actualRole = user.getUserRole() == null ? UserRole.STUDENT : user.getUserRole();
            if (actualRole != requestedRole) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Role mismatch. Please use the correct login portal");
            }
        }

        String accessToken = jwtUtil.generateToken(String.valueOf(user.getId()));
        UserResponse userResponse = toUserResponse(user);
        return new AuthResponse(accessToken, "bearer", userResponse);
    }

    public UserResponse me(String authorizationHeader) {
        return toUserResponse(getUserFromAuthorizationHeader(authorizationHeader));
    }

    public UserResponse updateMe(String authorizationHeader, UpdateProfileRequest request) {
        UserEntity currentUser = getUserFromAuthorizationHeader(authorizationHeader);

        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.length() < 2) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name must be at least 2 characters");
            }
            currentUser.setFullName(fullName);
        }

        if (request.getEmail() != null) {
            String normalizedEmail = request.getEmail().trim().toLowerCase();
            if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
            }
            userRepository.findByEmail(normalizedEmail).ifPresent(existing -> {
                if (!existing.getId().equals(currentUser.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already registered");
                }
            });
            currentUser.setEmail(normalizedEmail);
        }

        if (request.getPassword() != null) {
            String password = request.getPassword();
            if (!isStrongPassword(password)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, PASSWORD_RULE_ERROR);
            }
            currentUser.setHashedPassword(passwordEncoder.encode(password));
        }

        if (request.getGender() != null) {
            currentUser.setGender(request.getGender());
        }
        if (request.getAge() != null) {
            currentUser.setAge(request.getAge());
        }
        if (request.getAddress() != null) {
            currentUser.setAddress(request.getAddress());
        }
        if (request.getPhoneNumber() != null) {
            String phoneNumber = request.getPhoneNumber().trim();
            if (!phoneNumber.isEmpty() && !PHONE_PATTERN.matcher(phoneNumber).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number must have exactly 10 digits");
            }
            currentUser.setPhoneNumber(phoneNumber);
        }
        if (request.getFavoriteSubject() != null) {
            currentUser.setFavoriteSubject(request.getFavoriteSubject());
        }
        if (request.getFavoriteField() != null) {
            currentUser.setFavoriteField(request.getFavoriteField());
        }
        if (request.getProfileImage() != null) {
            currentUser.setProfileImage(request.getProfileImage());
        }
        if (request.getEducationLevel() != null) {
            currentUser.setEducationLevel(request.getEducationLevel());
        }
        if (request.getTalents() != null) {
            currentUser.setTalents(request.getTalents());
        }
        if (request.getHabits() != null) {
            currentUser.setHabits(request.getHabits());
        }
        if (request.getInterests() != null) {
            currentUser.setInterests(request.getInterests());
        }

        UserEntity updated = userRepository.save(currentUser);
        return toUserResponse(updated);
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
            // Backward compatibility for old email-subject tokens issued before migration.
            return userRepository.findByEmail(subject)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }
    }

    private UserResponse toUserResponse(UserEntity user) {
        ProfileCompletionSnapshot completionSnapshot = buildProfileCompletionSnapshot(user);
        boolean quizSubmitted = quizSubmissionRepository.findByUserId(user.getId()).isPresent();
        boolean recommendationEligible = completionSnapshot.percentage() >= RECOMMENDATION_REQUIRED_COMPLETION_PERCENTAGE
            && quizSubmitted;

        return new UserResponse(
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getUserRole() == null ? UserRole.STUDENT : user.getUserRole(),
            user.getGender(),
            user.getAge(),
            user.getAddress(),
            user.getPhoneNumber(),
            user.getFavoriteSubject(),
            user.getFavoriteField(),
            user.getProfileImage(),
            user.getEducationLevel(),
            user.getTalents(),
            user.getHabits(),
            user.getInterests(),
            completionSnapshot.percentage(),
            completionSnapshot.completedFields(),
            completionSnapshot.missingFields(),
            quizSubmitted,
            recommendationEligible,
            RECOMMENDATION_REQUIRED_COMPLETION_PERCENTAGE
        );
    }

    private ProfileCompletionSnapshot buildProfileCompletionSnapshot(UserEntity user) {
        List<String> completedFields = new ArrayList<>();
        List<String> missingFields = new ArrayList<>();

        trackStringField("Full Name", user.getFullName(), completedFields, missingFields);
        trackStringField("Email", user.getEmail(), completedFields, missingFields);
        trackStringField("Age", user.getAge(), completedFields, missingFields);
        trackStringField("Gender", user.getGender(), completedFields, missingFields);
        trackStringField("Education Level", user.getEducationLevel(), completedFields, missingFields);
        trackStringField("Address", user.getAddress(), completedFields, missingFields);
        trackStringField("Phone Number", user.getPhoneNumber(), completedFields, missingFields);
        trackStringField("Favorite Subject", user.getFavoriteSubject(), completedFields, missingFields);
        trackStringField("Favorite Field", user.getFavoriteField(), completedFields, missingFields);
        trackStringField("Profile Image", user.getProfileImage(), completedFields, missingFields);

        int totalFields = completedFields.size() + missingFields.size();
        int percentage = totalFields == 0 ? 0 : (int) Math.round((completedFields.size() * 100.0) / totalFields);

        return new ProfileCompletionSnapshot(percentage, completedFields, missingFields);
    }

    private void trackStringField(
        String label,
        String value,
        List<String> completedFields,
        List<String> missingFields
    ) {
        if (value != null && !value.trim().isEmpty()) {
            completedFields.add(label);
            return;
        }

        missingFields.add(label);
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

    private record ProfileCompletionSnapshot(int percentage, List<String> completedFields, List<String> missingFields) {
    }

    private UserRole resolveRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return UserRole.STUDENT;
        }

        try {
            return UserRole.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user_role must be ADMIN or STUDENT");
        }
    }

    private UserEntity authenticateAdmin(String normalizedEmail, String rawPassword) {
        // First, try to find admin by email in database
        UserEntity admin = userRepository.findByEmail(normalizedEmail)
            .filter(user -> user.getUserRole() == UserRole.ADMIN)
            .orElse(null);

        if (admin != null) {
            // Admin exists in database - validate against database credentials
            if (passwordEncoder.matches(rawPassword, admin.getHashedPassword())) {
                return admin;
            } else {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect admin email or password");
            }
        }

        // If not found in database, try to authenticate against config properties
        // This allows initial admin login with config credentials
        String configuredAdminEmail = appProperties.getAdminEmail().trim().toLowerCase();
        String configuredAdminPassword = appProperties.getAdminPassword();

        if (!configuredAdminEmail.equals(normalizedEmail) || !configuredAdminPassword.equals(rawPassword)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect admin email or password");
        }

        // Create or update admin user from config
        return userRepository.findByEmail(configuredAdminEmail)
            .map(existing -> {
                boolean needsUpdate = existing.getUserRole() != UserRole.ADMIN
                    || !passwordEncoder.matches(configuredAdminPassword, existing.getHashedPassword());

                if (needsUpdate) {
                    existing.setUserRole(UserRole.ADMIN);
                    existing.setHashedPassword(passwordEncoder.encode(configuredAdminPassword));
                    return userRepository.save(existing);
                }

                return existing;
            })
            .orElseGet(() -> {
                UserEntity newAdmin = new UserEntity();
                newAdmin.setFullName("System Admin");
                newAdmin.setEmail(configuredAdminEmail);
                newAdmin.setHashedPassword(passwordEncoder.encode(configuredAdminPassword));
                newAdmin.setUserRole(UserRole.ADMIN);
                return userRepository.save(newAdmin);
            });
    }
}
