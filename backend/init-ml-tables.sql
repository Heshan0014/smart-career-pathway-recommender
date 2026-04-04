-- SQL Script: Initialize ML Tables for Smart Career Pathway Recommender
-- Run this in your PostgreSQL database to add ML-related tables

-- ============================================================================
-- TABLE 1: COURSE CATALOG (Import from Kaggle Udemy Courses Dataset)
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,  -- 'Udemy', 'Coursera', 'freeCodeCamp', etc.
    description TEXT,
    level VARCHAR(50) NOT NULL,  -- 'Beginner', 'Intermediate', 'Advanced'
    category VARCHAR(100) NOT NULL,  -- 'Web Development', 'Data Science', etc.
    skills TEXT,  -- Comma-separated: 'Python,Django,REST APIs'
    url VARCHAR(500),
    rating DECIMAL(3,2),  -- 0-5
    num_reviews INT DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    duration_hours INT DEFAULT 0,
    difficulty_score INT DEFAULT 5,  -- 1-10
    prerequisites TEXT,  -- Comma-separated skill names
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE 2: SKILL MASTERY LEVELS (Define skill progression for each user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_skills (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    mastery_level VARCHAR(50) NOT NULL,  -- 'Beginner', 'Intermediate', 'Advanced', 'Master'
    confidence_score DECIMAL(3,2) DEFAULT 0.5,  -- 0.0 - 1.0 (0% - 100%)
    courses_completed INT DEFAULT 0,
    hours_practiced INT DEFAULT 0,
    last_practiced TIMESTAMP,
    last_assessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

-- ============================================================================
-- TABLE 3: USER COURSE ENROLLMENT (Track course progress)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_courses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'recommended',  -- 'recommended', 'clicked', 'in_progress', 'completed', 'abandoned'
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    progress_percentage INT DEFAULT 0,  -- 0-100
    time_spent_hours DECIMAL(10,2) DEFAULT 0,
    last_accessed TIMESTAMP,
    rating INT,  -- 1-5 stars (user review)
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- ============================================================================
-- TABLE 4: USER CERTIFICATES (Certificate tracking & verification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_certificates (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    certificate_id VARCHAR(255) UNIQUE,  -- Issuer ID/Serial Number
    issue_date DATE NOT NULL,
    expiry_date DATE,
    certificate_url VARCHAR(500),
    certificate_image_base64 LONGTEXT,  -- Store image as base64 for verification
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'verified', 'rejected', 'expired'
    verification_score DECIMAL(3,2) DEFAULT 0,  -- 0.0 - 1.0 (ML confidence)
    verification_checks JSONB,  -- Store verification results: {ocr_valid: true, signature_valid: true, ...}
    verified_by INT REFERENCES users(id),  -- Admin who verified
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE 5: USER LEARNING PATHS (Career path progression tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_learning_paths (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    career_path VARCHAR(100) NOT NULL,  -- 'Software Engineering', 'Data Science', 'UI/UX Design', etc.
    current_level VARCHAR(50) NOT NULL DEFAULT 'Beginner',
    target_level VARCHAR(50) DEFAULT 'Master',
    progress_percentage INT DEFAULT 0,
    courses_recommended INT DEFAULT 0,
    courses_completed INT DEFAULT 0,
    courses_in_progress INT DEFAULT 0,
    certificates_earned INT DEFAULT 0,
    skill_categories JSONB,  -- {Python: Intermediate, Web Dev: Beginner, ...}
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE 6: COURSE RECOMMENDATIONS (Store ML predictions for analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rank INT,  -- 1 = top recommendation, 2 = second, etc.
    confidence_score DECIMAL(3,2),  -- 0.0 - 1.0 (ML model confidence)
    recommendation_reason TEXT,
    is_taken_action BOOLEAN DEFAULT FALSE,  -- Did user click/enroll?
    was_helpful BOOLEAN,  -- User feedback: yes/no/null
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP  -- Recommendation validity period
);

-- ============================================================================
-- TABLE 7: ML MODEL METADATA (Track model versions & performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ml_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,  -- 'career_recommender', 'skill_classifier', etc.
    model_version VARCHAR(50),
    algorithm VARCHAR(100),  -- 'RandomForest', 'XGBoost', 'KNN', etc.
    training_data_size INT,
    test_accuracy DECIMAL(5,4),
    validation_accuracy DECIMAL(5,4),
    precision DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    model_path VARCHAR(255),  -- Where .pkl file is stored
    training_completed_at TIMESTAMP,
    deployed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX idx_user_courses_course_id ON user_courses(course_id);
CREATE INDEX idx_user_certificates_user_id ON user_certificates(user_id);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_course_recommendations_user_id ON course_recommendations(user_id);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_level ON courses(level);
CREATE INDEX idx_user_learning_paths_user_id ON user_learning_paths(user_id);
CREATE INDEX idx_course_recommendations_created_at ON course_recommendations(generated_at);

-- ============================================================================
-- SAMPLE DATA INSERTION (Once Kaggle data is downloaded)
-- ============================================================================

-- Insert sample courses manually (REPLACE with Kaggle data import)
INSERT INTO courses (title, provider, description, level, category, skills, url, rating, difficulty_score)
VALUES 
    ('Python Basics', 'Udemy', 'Learn Python programming fundamentals', 'Beginner', 'Software Development', 'Python,OOP', 'https://udemy.com/python-basics', 4.5, 2),
    ('Advanced Python Patterns', 'Udemy', 'Master design patterns in Python', 'Advanced', 'Software Development', 'Python,Design Patterns,Architecture', 'https://udemy.com/advanced-python', 4.8, 8),
    ('UI/UX Design Bootcamp', 'Coursera', 'Complete UI/UX design course', 'Intermediate', 'UI/UX Design', 'Figma,Prototyping,User Research', 'https://coursera.org/uxdesign', 4.6, 6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: User Progress Dashboard
CREATE OR REPLACE VIEW v_user_progress AS
SELECT 
    u.id AS user_id,
    u.full_name,
    ulp.career_path,
    ulp.current_level,
    COUNT(DISTINCT uc.id) AS courses_started,
    COUNT(DISTINCT CASE WHEN uc.status = 'completed' THEN 1 END) AS courses_completed,
    COUNT(DISTINCT uuc.id) AS certificates_earned,
    ulp.progress_percentage,
    ulp.updated_at
FROM users u
LEFT JOIN user_learning_paths ulp ON u.id = ulp.user_id
LEFT JOIN user_courses uc ON u.id = uc.user_id
LEFT JOIN user_certificates uuc ON u.id = uuc.user_id AND uuc.status = 'verified'
GROUP BY u.id, u.full_name, ulp.career_path, ulp.current_level, ulp.progress_percentage, ulp.updated_at;

-- View: Course Difficulty Distribution (for ML feature engineering)
CREATE OR REPLACE VIEW v_course_stats AS
SELECT 
    category,
    level,
    COUNT(*) AS course_count,
    AVG(difficulty_score) AS avg_difficulty,
    AVG(rating) AS avg_rating
FROM courses
WHERE is_active = TRUE
GROUP BY category, level;

-- View: User Skill Progress (for skill mastery ML model)
CREATE OR REPLACE VIEW v_user_skills_progress AS
SELECT 
    us.user_id,
    us.skill_name,
    us.mastery_level,
    COUNT(uc.id) AS courses_for_skill,
    COUNT(DISTINCT CASE WHEN uc.status = 'completed' THEN 1 END) AS courses_completed,
    us.confidence_score,
    us.last_assessed
FROM user_skills us
LEFT JOIN user_courses uc ON us.user_id = uc.user_id 
    AND uc.course_id IN (SELECT id FROM courses WHERE skills LIKE CONCAT('%', us.skill_name, '%'))
GROUP BY us.user_id, us.skill_name, us.mastery_level, us.confidence_score, us.last_assessed;

-- ============================================================================
-- CALL THIS AFTER KAGGLE DATA IMPORT
-- ============================================================================
-- Run the Python script ml-data-importer.py to populate courses from Kaggle
