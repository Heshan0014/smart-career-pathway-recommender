package com.smartcareer.backend.repository;

import com.smartcareer.backend.entity.CertificateClaimEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificateClaimRepository extends JpaRepository<CertificateClaimEntity, Long> {
    List<CertificateClaimEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    java.util.Optional<CertificateClaimEntity> findByIdAndUserId(Long id, Long userId);
    void deleteByUserId(Long userId);
}
