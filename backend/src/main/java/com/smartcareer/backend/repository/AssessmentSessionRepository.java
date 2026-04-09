package com.smartcareer.backend.repository;

import com.smartcareer.backend.entity.AssessmentSessionEntity;
import com.smartcareer.backend.entity.AssessmentSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AssessmentSessionRepository extends JpaRepository<AssessmentSessionEntity, Long> {
    Optional<AssessmentSessionEntity> findTopByUserIdAndStatusOrderByStartedAtDesc(Long userId, AssessmentSessionStatus status);
    Optional<AssessmentSessionEntity> findTopByUserIdAndStatusOrderByCompletedAtDesc(Long userId, AssessmentSessionStatus status);
    Optional<AssessmentSessionEntity> findTopByUserIdOrderByStartedAtDesc(Long userId);
    Optional<AssessmentSessionEntity> findByIdAndUserId(Long id, Long userId);
}
