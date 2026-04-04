# ML Implementation Guide for Smart Career Pathway Recommender

## PART 1: DATASETS - What You Need & Where to Get Them

### Step 1: Understand Your Data Needs

**Current Status:** You have users (profile, quiz answers) but NO course data
**What You Need:**
1. **Course Catalog Dataset** - List of available courses
2. **Skill-Course Mapping** - Which skills each course teaches
3. **Historical User Data** - User learning patterns (optional, for better ML)

### Step 2: Recommended Kaggle Datasets (FREE)

#### Option A: Simple Course Dataset (RECOMMENDED FOR BEGINNERS)
**Name:** "Udemy Courses Dataset" 
**Link:** https://www.kaggle.com/datasets/umarjon/udemy-courses-dataset
**What's in it:**
- Course title, level (Beginner/Intermediate/Advanced)
- Price, rating, instructors
- Category (Web Development, Data Science, etc.)
- Course description, skills taught

**Why this one:** Perfect size, includes skill tags, easy to understand

#### Option B: Complete Skill-Career Mapping
**Name:** "DataCamp Courses"
**Link:** https://www.kaggle.com/datasets/ananysharma/datacamp-courses
**What's in it:**
- Courses organized by career path
- Prerequisites and skill requirements
- Progression levels

#### Option C: User Learning Patterns (ADVANCED)
**Name:** "Student Performance Dataset"
**Link:** https://www.kaggle.com/datasets/dipam7/student-performance
**What's in it:**
- Historical user performance data
- Learning duration, completion rates
- Skill improvements over time

### Step 3: Do You NEED Datasets Right Now?

**SHORT ANSWER:** Not immediately, but yes for ML to work properly.

**Timeline:**
```
Current State (55-65% done)
↓
Phase 1 (WEEKS 1-2): Add Course Catalog Table to Database
  - Use Dataset A (Udemy Courses)
  - Store in PostgreSQL
  - No ML yet - just rule-based recommendations
↓
Phase 2 (WEEKS 3-4): Basic ML Model
  - Train on user quiz answers → career match
  - Use scikit-learn Random Forest
  - Still using Kaggle data as seed
↓
Phase 3 (WEEKS 4-5): Advanced ML
  - Add course recommendation engine
  - Predict mastery level progression
  - Full ML pipeline active
```

---

## PART 2: BEGINNER ML WORKFLOW (Step-by-Step)

### What is Machine Learning? (Simple Explanation)

Traditional code:
```
Input (quiz answers) 
  ↓ [Hard-coded IF statements]
Output (career recommendation)
```

ML approach:
```
Input (quiz answers)
  ↓ [Learn patterns from data]
Output (career recommendation) ← Better accuracy
```

### The ML Pipeline (5 Steps)

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: COLLECT DATA                                       │
│  (Where: Your database + Kaggle datasets)                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: PREPARE & CLEAN                                    │
│  (Remove errors, convert to numbers, normalize)             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: TRAIN MODEL                                        │
│  (Show data to ML algorithm, it learns patterns)            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: TEST MODEL                                         │
│  (Check accuracy on new data it hasn't seen)                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: DEPLOY & USE                                       │
│  (Use in production - Java backend calls Python service)    │
└─────────────────────────────────────────────────────────────┘
```

### The Programs You'll Use

```
DataFlows:
User → React (Frontend)
     → Spring Boot (Java Backend) [PORT 8001]
     → PostgreSQL (Database)
     ↓
ML Pipeline:
Jupyter Notebook (Learning & Testing)
  ↓
FastAPI (Python Service) [PORT 8000]
  ↓
scikit-learn (Machine Learning Library)
```

**Installation Plan:**
1. ✅ Jupyter Notebook - For learning & experimenting
2. ✅ FastAPI - Python web service to serve ML models
3. ✅ scikit-learn - ML algorithms (Random Forest, KNN)
4. ✅ pandas - Data manipulation
5. ✅ numpy - Mathematical operations

---

## PART 3: HOW TO DOWNLOAD & USE DATASETS

### Step 1: Download from Kaggle

**Prerequisites:**
- Kaggle account (free): https://www.kaggle.com/register
- Kaggle API installed

**Windows PowerShell Commands:**

```powershell
# Install Kaggle CLI
pip install kaggle

# Download Udemy Courses Dataset
kaggle datasets download -d umarjon/udemy-courses-dataset

# Unzip
Expand-Archive -Path udemy-courses-dataset.zip -DestinationPath .\udemy-data\

# Result: CSV file with course data
```

### Step 2: Explore the Data (Using Python)

```python
import pandas as pd

# Load the dataset
df = pd.read_csv('udemy-data.csv')

# See first few rows
print(df.head())

# See column names
print(df.columns)

# See data types
print(df.dtypes)

# Basic statistics
print(df.describe())
```

### Step 3: Understand the Data Structure

**Example Kaggle Dataset Structure:**

```
id  | title                    | level        | skills                  | category
----|--------------------------|--------------|-------------------------|------------------
1   | Python for Beginners     | Beginner     | Python,OOP              | Software Dev
2   | Advanced Python          | Advanced     | Python,Design Patterns  | Software Dev
3   | Data Science 101         | Beginner     | Python,DataAnalysis     | Data Science
4   | Machine Learning Pro     | Advanced     | Python,ML,Algorithms    | Data Science
```

---

## PART 4: DATABASE DESIGN - How to Insert Dataset

### Add New Tables to PostgreSQL

```sql
-- 1. Course Catalog Table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    provider VARCHAR(100),
    level VARCHAR(50),  -- 'Beginner', 'Intermediate', 'Advanced', 'Master'
    category VARCHAR(100),
    skills TEXT,  -- comma-separated or JSON array
    url VARCHAR(500),
    rating DECIMAL(3,2),
    duration_hours INT,
    difficulty_score INT,  -- 1-10
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Course Enrollment Tracking
CREATE TABLE user_courses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(50),  -- 'recommended', 'in_progress', 'completed'
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    progress_percentage INT DEFAULT 0  -- 0-100
);

-- 3. Skill Mastery Tracking
CREATE TABLE user_skills (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100),
    mastery_level VARCHAR(50),  -- 'Beginner', 'Intermediate', 'Advanced', 'Master'
    confidence_score DECIMAL(3,2),  -- 0.0 - 1.0
    last_assessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Certificate Storage
CREATE TABLE user_certificates (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id),
    title VARCHAR(255),
    provider VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    certificate_url VARCHAR(500),
    status VARCHAR(50),  -- 'pending', 'verified', 'rejected'
    verification_score DECIMAL(3,2),  -- 0.0 - 1.0
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Learning Path Progress
CREATE TABLE user_learning_paths (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_path VARCHAR(100),  -- 'Software Engineering', 'Data Science', etc.
    current_level VARCHAR(50),  -- 'Beginner', 'Intermediate', 'Advanced', 'Master'
    progress_percentage INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    target_level VARCHAR(50)
);
```

### How to Insert Kaggle Data into PostgreSQL

**Using Python + SQLAlchemy (FastAPI):**

```python
import pandas as pd
from sqlalchemy import create_engine

# 1. Load Kaggle CSV
df = pd.read_csv('udemy-courses-dataset.csv')

# 2. Connect to PostgreSQL
engine = create_engine('postgresql://user:password@localhost:5432/smart_career_db')

# 3. Clean & Transform Data
df = df[['course_title', 'provider', 'level', 'category', 'skills']].copy()
df.columns = ['title', 'provider', 'level', 'category', 'skills']

# 4. Filter by your career paths
valid_levels = ['Beginner', 'Intermediate', 'Advanced']
df = df[df['level'].isin(valid_levels)]

# 5. Insert into PostgreSQL
df.to_sql('courses', engine, if_exists='append', index=False)
print("✓ Inserted {num} courses into database")
```

---

## PART 5: HOW THE SYSTEM ANALYZES DATA FOR RECOMMENDATIONS

### Current System (Rule-Based - What You Have)

```
User Quiz Answers
  ↓
Hard-coded Keywords
  ("Python" → Software Engineering)
  ("Design" → UI/UX Design)
  ↓
Scoring
  (Count matches, assign weights)
  ↓
Top Career Path
```

**Problem:** Doesn't learn from data, inflexible

### New System (ML-Based - What You Need)

```
Step 1: COLLECT USER DATA
├─ Quiz answers (18 questions)
├─ Profile information (age, education, etc.)
├─ Course completions
└─ Certificates earned

Step 2: PREPARE DATA FOR ML
├─ Convert text → numbers
│  Example: "Python" = [1, 0, 0, 0]
│          "Design" = [0, 0, 1, 0]
├─ Handle missing values
└─ Normalize scales (0-1 range)

Step 3: SIMPLE ML EXAMPLE - Decision Tree
Input:  [Programming: 8/10, Design: 2/10, ...]
         ↓
       (Is Programming > 5?)
         Yes ↓
       (Is Data Analysis > 6?)
         No ↓
       Output: Software Engineering ✓

Step 4: BETTER ML - Random Forest
(Ensemble of 100 Decision Trees)
├─ Each tree votes
├─ Most common vote = final prediction
└─ More accurate than single tree

Step 5: DEPLOY IN PRODUCTION
Java Backend (Port 8001)
  ↓ [REST API call]
Python FastAPI Service (Port 8000)
  ↓ [Load trained model]
  ↓ [Make prediction]
Response: Career Path + Confidence Score
```

### The Key Algorithm: Random Forest for Career Recommendation

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pandas as pd

# Step 1: Prepare Training Data
# From your database + Kaggle data

training_data = {
    'quiz_programming_score': [8, 3, 9, 4, 7],
    'quiz_design_score': [2, 8, 1, 9, 2],
    'quiz_analysis_score': [7, 5, 8, 3, 6],
    'profile_age': [22, 25, 20, 23, 21],
    'profile_education': ['Bachelor', 'Diploma', 'Bachelor', 'Highschool', 'Bachelor'],
    'career_path': ['Software Dev', 'UI/UX Design', 'Software Dev', 'UI/UX Design', 'Software Dev']
}

df_train = pd.DataFrame(training_data)

# Step 2: Encode categorical variables (convert text to numbers)
le = LabelEncoder()
df_train['education_encoded'] = le.fit_transform(df_train['profile_education'])

# Step 3: Separate features (X) and target (y)
X = df_train[['quiz_programming_score', 'quiz_design_score', 'quiz_analysis_score', 'profile_age', 'education_encoded']]
y = df_train['career_path']

# Step 4: Train Model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

# Step 5: Make Predictions
new_user = [[8, 2, 7, 22, 1]]  # [programming, design, analysis, age, education]
prediction = model.predict(new_user)
confidence = model.predict_proba(new_user).max()

print(f"Career Path: {prediction[0]}")
print(f"Confidence: {confidence:.2%}")
```

---

## PART 6: COMPLETE IMPLEMENTATION ROADMAP

### Week 1-2: Foundation
- ✓ Understand datasets
- ✓ Download Kaggle Udemy dataset
- ✓ Design database schema (tables above)
- ✓ Insert course data into PostgreSQL
- Create Python FastAPI service skeleton
- Add `/predict-career` endpoint

### Week 3: Basic ML
- Build data preprocessing pipeline
- Train Random Forest on quiz data
- Evaluate model accuracy
- Save trained model

### Week 4: Integration
- Connect Java backend to Python service
- Add course recommendation endpoint
- Update frontend to show courses

### Week 5: Advanced Features
- Build skill mastery classifier
- Certificate verification pipeline
- Progression engine

---

## NEXT IMMEDIATE STEPS

1. **Download Udemy Dataset** from Kaggle
2. **Add 5 new tables** to your PostgreSQL database (see SQL above)
3. **Insert 100+ courses** from dataset
4. **Create Python FastAPI service** on port 8000
5. **Build data preprocessing** script in Python
6. **Train your first ML model** (Random Forest)
7. **Connect Java → Python** REST API

Would you like me to code any of these steps for you?
