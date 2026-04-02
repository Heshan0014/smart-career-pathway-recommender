package com.smartcareer.backend.controller;

import com.smartcareer.backend.config.JwtUtil;
import com.smartcareer.backend.dto.AdminReplyRequest;
import com.smartcareer.backend.dto.MessageResponse;
import com.smartcareer.backend.dto.SendMessageRequest;
import com.smartcareer.backend.entity.UserEntity;
import com.smartcareer.backend.entity.UserRole;
import com.smartcareer.backend.repository.UserRepository;
import com.smartcareer.backend.service.MessageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/messages")
public class MessageController {

    private final MessageService messageService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public MessageController(MessageService messageService, JwtUtil jwtUtil, UserRepository userRepository) {
        this.messageService = messageService;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    /**
     * Student sends a message
     * Endpoint: POST /api/v1/messages/send
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody SendMessageRequest request) {
        try {
            UserEntity student = getAuthenticatedUser(authHeader);
            if (student.getUserRole() != UserRole.STUDENT) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only students can send messages");
            }

            MessageResponse response = messageService.sendMessage(student.getId(), request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Student gets their messages
     * Endpoint: GET /api/v1/messages/my-messages?page=0&size=10
     */
    @GetMapping("/my-messages")
    public ResponseEntity<?> getMyMessages(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            UserEntity student = getAuthenticatedUser(authHeader);
            if (student.getUserRole() != UserRole.STUDENT) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only students can view their messages");
            }

            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<MessageResponse> messages = messageService.getMyMessages(student.getId(), pageable);
            return ResponseEntity.ok(messages);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Student unread reply count for red notification badge
     * Endpoint: GET /api/v1/messages/my-unread-count
     */
    @GetMapping("/my-unread-count")
    public ResponseEntity<?> getMyUnreadReplyCount(
            @RequestHeader("Authorization") String authHeader) {
        try {
            UserEntity student = getAuthenticatedUser(authHeader);
            if (student.getUserRole() != UserRole.STUDENT) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only students can view their messages");
            }

            long unreadCount = messageService.getUnreadReplyCount(student.getId());
            return ResponseEntity.ok("{ \"unreadCount\": " + unreadCount + " }");
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Student marks replies as read after opening message inbox
     * Endpoint: PUT /api/v1/messages/my-mark-read
     */
    @PutMapping("/my-mark-read")
    public ResponseEntity<?> markMyRepliesAsRead(
            @RequestHeader("Authorization") String authHeader) {
        try {
            UserEntity student = getAuthenticatedUser(authHeader);
            if (student.getUserRole() != UserRole.STUDENT) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only students can view their messages");
            }

            messageService.markStudentRepliesAsRead(student.getId());
            return ResponseEntity.ok("{ \"message\": \"Messages marked as read\" }");
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Admin gets all messages
     * Endpoint: GET /api/v1/messages/admin/all?page=0&size=20
     */
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllMessages(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            UserEntity admin = getAuthenticatedUser(authHeader);
            if (admin.getUserRole() != UserRole.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can access messages");
            }

            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<MessageResponse> messages = messageService.getAllMessages(pageable);
            return ResponseEntity.ok(messages);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Admin gets unread message count (for notification icon)
     * Endpoint: GET /api/v1/messages/admin/unread-count
     */
    @GetMapping("/admin/unread-count")
    public ResponseEntity<?> getUnreadCount(
            @RequestHeader("Authorization") String authHeader) {
        try {
            UserEntity admin = getAuthenticatedUser(authHeader);
            if (admin.getUserRole() != UserRole.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can access messages");
            }

            long unreadCount = messageService.getUnreadMessageCount();
            return ResponseEntity.ok("{ \"unreadCount\": " + unreadCount + " }");
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Admin marks message as read
     * Endpoint: PUT /api/v1/messages/{messageId}/mark-read
     */
    @PutMapping("/{messageId}/mark-read")
    public ResponseEntity<?> markAsRead(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long messageId) {
        try {
            UserEntity admin = getAuthenticatedUser(authHeader);
            if (admin.getUserRole() != UserRole.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can access messages");
            }

            MessageResponse response = messageService.markAsRead(messageId);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Admin replies to a message
     * Endpoint: POST /api/v1/messages/{messageId}/reply
     */
    @PostMapping("/{messageId}/reply")
    public ResponseEntity<?> replyToMessage(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long messageId,
            @RequestBody AdminReplyRequest request) {
        try {
            UserEntity admin = getAuthenticatedUser(authHeader);
            if (admin.getUserRole() != UserRole.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can access messages");
            }

            MessageResponse response = messageService.replyToMessage(messageId, request);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    /**
     * Admin deletes a message
     * Endpoint: DELETE /api/v1/messages/{messageId}
     */
    @DeleteMapping("/{messageId}")
    public ResponseEntity<?> deleteMessage(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long messageId) {
        try {
            UserEntity admin = getAuthenticatedUser(authHeader);
            if (admin.getUserRole() != UserRole.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can access messages");
            }

            messageService.deleteMessage(messageId);
            return ResponseEntity.ok("{ \"message\": \"Message deleted successfully\" }");
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body("{ \"error\": \"" + e.getReason() + "\" }");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{ \"error\": \"" + e.getMessage() + "\" }");
        }
    }

    private UserEntity getAuthenticatedUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login to system");
        }

        String token = authHeader.substring(7);
        String subject = jwtUtil.extractSubject(token);

        try {
            Long userId = Long.parseLong(subject);
            return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login to system"));
        } catch (NumberFormatException ex) {
            return userRepository.findByEmail(subject)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login to system"));
        }
    }
}
