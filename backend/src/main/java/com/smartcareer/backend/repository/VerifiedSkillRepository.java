package com.smartcareer.backend.repository;

import com.smartcareer.backend.entity.VerifiedSkillEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VerifiedSkillRepository extends JpaRepository<VerifiedSkillEntity, Long> {
    List<VerifiedSkillEntity> findByUserIdOrderBySkillNameAsc(Long userId);
    Optional<VerifiedSkillEntity> findByUserIdAndSkillName(Long userId, String skillName);
    long countByUserId(Long userId);
}
