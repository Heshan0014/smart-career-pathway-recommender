package com.smartcareer.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AppProperties {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-minutes}")
    private int jwtExpirationMinutes;

    @Value("${app.cors.allowed-origins}")
    private String corsAllowedOrigins;

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${admin.password}")
    private String adminPassword;

    public String getJwtSecret() {
        return jwtSecret;
    }

    public int getJwtExpirationMinutes() {
        return jwtExpirationMinutes;
    }

    public String getCorsAllowedOrigins() {
        return corsAllowedOrigins;
    }

    public String getAdminEmail() {
        return adminEmail;
    }

    public String getAdminPassword() {
        return adminPassword;
    }
}
