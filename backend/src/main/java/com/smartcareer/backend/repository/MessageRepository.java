package com.smartcareer.backend.repository;

import com.smartcareer.backend.entity.MessageEntity;
import com.smartcareer.backend.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, Long> {
    
    // Find all messages for a specific student
    List<MessageEntity> findByStudent(UserEntity student);
    
    // Find all messages (for admin)
    Page<MessageEntity> findAll(Pageable pageable);
    
    // Find unread messages (for admin notification)
    long countByIsReadFalse();

    // Find unread replies for a student
    long countByStudentIdAndAdminReplyIsNotNullAndStudentReadFalse(Long studentId);
    
    // Find unread messages for pagination
    Page<MessageEntity> findByIsReadFalse(Pageable pageable);
    
    // Find messages by student (with pagination)
    Page<MessageEntity> findByStudent(UserEntity student, Pageable pageable);
    
    // Find message by id and student (for validation)
    Optional<MessageEntity> findByIdAndStudent(Long id, UserEntity student);

    // Find student messages that need to be marked as read after opening inbox
    List<MessageEntity> findByStudentIdAndAdminReplyIsNotNullAndStudentReadFalse(Long studentId);
}
