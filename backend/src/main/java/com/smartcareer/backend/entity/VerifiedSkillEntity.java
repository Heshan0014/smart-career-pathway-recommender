package com.smartcareer.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(
    name = "verified_skills",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "skill_name"})
)
public class VerifiedSkillEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "skill_name", nullable = false)
    private String skillName;

    @Enumerated(EnumType.STRING)
    @Column(name = "claimed_level", nullable = false)
    private SkillLevel claimedLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessed_level", nullable = false)
    private SkillLevel assessedLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "verified_level", nullable = false)
    private SkillLevel verifiedLevel;

    @Column(name = "levels_matched", nullable = false)
    private boolean levelsMatched;

    @Column(name = "certificate_credibility", nullable = false)
    private double certificateCredibility;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public String getSkillName() {
        return skillName;
    }

    public void setSkillName(String skillName) {
        this.skillName = skillName;
    }

    public SkillLevel getClaimedLevel() {
        return claimedLevel;
    }

    public void setClaimedLevel(SkillLevel claimedLevel) {
        this.claimedLevel = claimedLevel;
    }

    public SkillLevel getAssessedLevel() {
        return assessedLevel;
    }

    public void setAssessedLevel(SkillLevel assessedLevel) {
        this.assessedLevel = assessedLevel;
    }

    public SkillLevel getVerifiedLevel() {
        return verifiedLevel;
    }

    public void setVerifiedLevel(SkillLevel verifiedLevel) {
        this.verifiedLevel = verifiedLevel;
    }

    public boolean isLevelsMatched() {
        return levelsMatched;
    }

    public void setLevelsMatched(boolean levelsMatched) {
        this.levelsMatched = levelsMatched;
    }

    public double getCertificateCredibility() {
        return certificateCredibility;
    }

    public void setCertificateCredibility(double certificateCredibility) {
        this.certificateCredibility = certificateCredibility;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
