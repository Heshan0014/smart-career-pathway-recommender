package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class UpdateProfileRequest {

    @JsonProperty("full_name")
    private String fullName;

    private String email;
    private String password;

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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getAge() {
        return age;
    }

    public void setAge(String age) {
        this.age = age;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getFavoriteSubject() {
        return favoriteSubject;
    }

    public void setFavoriteSubject(String favoriteSubject) {
        this.favoriteSubject = favoriteSubject;
    }

    public String getFavoriteField() {
        return favoriteField;
    }

    public void setFavoriteField(String favoriteField) {
        this.favoriteField = favoriteField;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    public String getEducationLevel() {
        return educationLevel;
    }

    public void setEducationLevel(String educationLevel) {
        this.educationLevel = educationLevel;
    }

    public List<String> getTalents() {
        return talents;
    }

    public void setTalents(List<String> talents) {
        this.talents = talents;
    }

    public List<String> getHabits() {
        return habits;
    }

    public void setHabits(List<String> habits) {
        this.habits = habits;
    }

    public List<String> getInterests() {
        return interests;
    }

    public void setInterests(List<String> interests) {
        this.interests = interests;
    }
}