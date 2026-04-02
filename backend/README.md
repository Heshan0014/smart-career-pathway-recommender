# Backend (Spring Boot)

This folder contains the Spring Boot backend for authentication, user profile, and future recommendation APIs.

## Tech Stack
- Spring Boot 3 (Web, Data JPA, Validation)
- PostgreSQL
- JWT authentication (JJWT)
- BCrypt password hashing

## Environment
Create `.env` from `.env.example` and update values if needed:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION_MINUTES`
- `CORS_ALLOWED_ORIGINS`

## Run
Use Java 17+ and Maven:

```bash
mvn spring-boot:run
```

The backend runs on `http://localhost:8000`.

## Endpoints
- `GET /health`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Database tables are created automatically by Hibernate (`ddl-auto=update`).
