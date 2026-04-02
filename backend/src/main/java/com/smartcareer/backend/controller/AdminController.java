package com.smartcareer.backend.controller;

import com.smartcareer.backend.dto.AdminDashboardStatsResponse;
import com.smartcareer.backend.dto.AdminProfileResponse;
import com.smartcareer.backend.dto.AdminStudentsResponse;
import com.smartcareer.backend.dto.UpdateProfileRequest;
import com.smartcareer.backend.service.AdminService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard/stats")
    public AdminDashboardStatsResponse getDashboardStats(@RequestHeader("Authorization") String authorizationHeader) {
        return adminService.getDashboardStats(authorizationHeader);
    }

    @GetMapping("/students")
    public AdminStudentsResponse getStudents(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestParam(name = "search", required = false) String search,
        @RequestParam(name = "profile_status", required = false) String profileStatus,
        @RequestParam(name = "quiz_status", required = false) String quizStatus,
        @RequestParam(name = "recommendation_status", required = false) String recommendationStatus,
        @RequestParam(name = "page", defaultValue = "0") int page,
        @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        return adminService.getStudents(
            authorizationHeader,
            search,
            profileStatus,
            quizStatus,
            recommendationStatus,
            page,
            size
        );
    }

    @GetMapping("/me")
    public AdminProfileResponse getAdminMe(@RequestHeader("Authorization") String authorizationHeader) {
        return adminService.getAdminMe(authorizationHeader);
    }

    @PatchMapping("/me")
    public AdminProfileResponse updateAdminMe(
        @RequestHeader("Authorization") String authorizationHeader,
        @org.springframework.web.bind.annotation.RequestBody UpdateProfileRequest request
    ) {
        return adminService.updateAdminMe(authorizationHeader, request);
    }
}
