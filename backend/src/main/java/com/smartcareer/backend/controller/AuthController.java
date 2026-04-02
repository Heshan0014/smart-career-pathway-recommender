package com.smartcareer.backend.controller;

import com.smartcareer.backend.dto.AuthResponse;
import com.smartcareer.backend.dto.LoginRequest;
import com.smartcareer.backend.dto.SignupRequest;
import com.smartcareer.backend.dto.SignupResponse;
import com.smartcareer.backend.dto.UpdateProfileRequest;
import com.smartcareer.backend.dto.UserResponse;
import com.smartcareer.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public SignupResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(@RequestHeader("Authorization") String authorizationHeader) {
        return authService.me(authorizationHeader);
    }

    @PatchMapping("/me")
    public UserResponse updateMe(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody UpdateProfileRequest request
    ) {
        return authService.updateMe(authorizationHeader, request);
    }
}
