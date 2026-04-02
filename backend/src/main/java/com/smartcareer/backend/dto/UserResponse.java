package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartcareer.backend.entity.UserRole;

import java.util.List;

public class UserResponse {

    private Long id;
    @JsonProperty("full_name")
    private String fullName;
    private String email;
    @JsonProperty("user_role")
    private UserRole userRole;
    private String gender;
    private String age;
    private String address;

    @JsonProperty("phone_number")
    private String phoneNumber;

    @JsonProperty("favorite_subject")
    private String favoriteSubject;

    @JsonProperty("favorite_field")
    private String favoriteField;

    @JsonProperty("profile_image")
    private String profileImage;

    @JsonProperty("education_level")
    private String educationLevel;
    private List<String> talents;
    private List<String> habits;
    private List<String> interests;

    @JsonProperty("profile_completion_percentage")
    private int profileCompletionPercentage;

    @JsonProperty("completed_fields")
    private List<String> completedFields;

    @JsonProperty("missing_fields")
    private List<String> missingFields;

    @JsonProperty("quiz_submitted")
    private boolean quizSubmitted;

    @JsonProperty("recommendation_eligible")
    private boolean recommendationEligible;

    @JsonProperty("recommendation_required_completion_percentage")
    private int recommendationRequiredCompletionPercentage;

    public UserResponse(Long id, String fullName, String email, UserRole userRole, String gender, String age, String address,
                        String phoneNumber, String favoriteSubject, String favoriteField, String profileImage,
                        String educationLevel, List<String> talents, List<String> habits, List<String> interests,
                        int profileCompletionPercentage, List<String> completedFields, List<String> missingFields,
                        boolean quizSubmitted, boolean recommendationEligible, int recommendationRequiredCompletionPercentage) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.userRole = userRole;
        this.gender = gender;
        this.age = age;
        this.address = address;
        this.phoneNumber = phoneNumber;
        this.favoriteSubject = favoriteSubject;
        this.favoriteField = favoriteField;
        this.profileImage = profileImage;
        this.educationLevel = educationLevel;
        this.talents = talents;
        this.habits = habits;
        this.interests = interests;
        this.profileCompletionPercentage = profileCompletionPercentage;
        this.completedFields = completedFields;
        this.missingFields = missingFields;
        this.quizSubmitted = quizSubmitted;
        this.recommendationEligible = recommendationEligible;
        this.recommendationRequiredCompletionPercentage = recommendationRequiredCompletionPercentage;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public UserRole getUserRole() {
        return userRole;
    }

    public String getGender() {
        return gender;
    }

    public String getAge() {
        return age;
    }

    public String getAddress() {
        return address;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getFavoriteSubject() {
        return favoriteSubject;
    }

    public String getFavoriteField() {
        return favoriteField;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public String getEducationLevel() {
        return educationLevel;
    }

    public List<String> getTalents() {
        return talents;
    }

    public List<String> getHabits() {
        return habits;
    }

    public List<String> getInterests() {
        return interests;
    }

    public int getProfileCompletionPercentage() {
        return profileCompletionPercentage;
    }

    public List<String> getCompletedFields() {
        return completedFields;
    }

    public List<String> getMissingFields() {
        return missingFields;
    }

    public boolean isQuizSubmitted() {
        return quizSubmitted;
    }

    public boolean isRecommendationEligible() {
        return recommendationEligible;
    }

    public int getRecommendationRequiredCompletionPercentage() {
        return recommendationRequiredCompletionPercentage;
    }
}
