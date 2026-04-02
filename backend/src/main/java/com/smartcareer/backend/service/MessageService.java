package com.smartcareer.backend.service;

import com.smartcareer.backend.dto.AdminReplyRequest;
import com.smartcareer.backend.dto.MessageResponse;
import com.smartcareer.backend.dto.SendMessageRequest;
import com.smartcareer.backend.entity.MessageEntity;
import com.smartcareer.backend.entity.UserEntity;
import com.smartcareer.backend.repository.MessageRepository;
import com.smartcareer.backend.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    /**
     * Send a message from a student
     */
    public MessageResponse sendMessage(Long studentId, SendMessageRequest request) {
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Message cannot be empty");
        }

        UserEntity student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        MessageEntity message = new MessageEntity();
        message.setStudent(student);
        message.setStudentMessage(request.getMessage().trim());
        message.setIsRead(false);
        message.setStudentRead(false);

        MessageEntity savedMessage = messageRepository.save(message);
        return convertToResponse(savedMessage);
    }

    /**
     * Get all messages for a student (student view)
     */
    public Page<MessageResponse> getMyMessages(Long studentId, Pageable pageable) {
        UserEntity student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        markStudentRepliesAsRead(studentId);

        Page<MessageEntity> messages = messageRepository.findByStudent(student, pageable);
        List<MessageResponse> responses = messages.getContent()
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, messages.getTotalElements());
    }

    /**
     * Get all messages for admin (admin view) - paginated
     */
    public Page<MessageResponse> getAllMessages(Pageable pageable) {
        Page<MessageEntity> messages = messageRepository.findAll(pageable);
        List<MessageResponse> responses = messages.getContent()
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, messages.getTotalElements());
    }

    /**
     * Get unread message count (for admin notification icon)
     */
    public long getUnreadMessageCount() {
        return messageRepository.countByIsReadFalse();
    }

    /**
     * Get unread replied message count for a student
     */
    public long getUnreadReplyCount(Long studentId) {
        return messageRepository.countByStudentIdAndAdminReplyIsNotNullAndStudentReadFalse(studentId);
    }

    /**
     * Mark replied messages as read for student after they open the inbox
     */
    public void markStudentRepliesAsRead(Long studentId) {
        List<MessageEntity> unreadReplies = messageRepository.findByStudentIdAndAdminReplyIsNotNullAndStudentReadFalse(studentId);
        if (unreadReplies.isEmpty()) {
            return;
        }

        unreadReplies.forEach(message -> message.setStudentRead(true));
        messageRepository.saveAll(unreadReplies);
    }

    /**
     * Mark message as read (admin marks when viewing)
     */
    public MessageResponse markAsRead(Long messageId) {
        MessageEntity message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        message.setIsRead(true);
        MessageEntity updatedMessage = messageRepository.save(message);
        return convertToResponse(updatedMessage);
    }

    /**
     * Admin replies to a message
     */
    public MessageResponse replyToMessage(Long messageId, AdminReplyRequest request) {
        if (request.getReply() == null || request.getReply().trim().isEmpty()) {
            throw new IllegalArgumentException("Reply cannot be empty");
        }

        MessageEntity message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        message.setAdminReply(request.getReply().trim());
        message.setRepliedAt(Instant.now());
        message.setIsRead(true);
        message.setStudentRead(false);

        MessageEntity updatedMessage = messageRepository.save(message);
        return convertToResponse(updatedMessage);
    }

    /**
     * Delete a message (admin action)
     */
    public void deleteMessage(Long messageId) {
        MessageEntity message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        messageRepository.delete(message);
    }

    /**
     * Convert MessageEntity to MessageResponse
     */
    private MessageResponse convertToResponse(MessageEntity message) {
        return new MessageResponse(
                message.getId(),
                message.getStudent().getId(),
                message.getStudent().getFullName(),
                message.getStudent().getEmail(),
                message.getStudentMessage(),
                message.getAdminReply(),
                message.getIsRead(),
                message.getStudentRead(),
                message.getCreatedAt(),
                message.getRepliedAt(),
                message.getUpdatedAt()
        );
    }
}
