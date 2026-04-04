"""
FastAPI ML Service for Smart Career Pathway Recommender
This service handles:
1. Data preprocessing from Kaggle datasets
2. Training ML models (Random Forest, KNN)
3. Making predictions for career recommendations
4. Predicting skill mastery levels

Run: uvicorn ml_service:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import pickle
import os
from datetime import datetime
from typing import List, Dict, Optional
import logging

# ML Libraries
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# Database
import psycopg2
from psycopg2.extras import RealDictCursor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Smart Career ML Service",
    description="ML backend for career pathway recommendations",
    version="1.0.0"
)

# Enable CORS for communication with Java backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

DB_CONFIG = {
    "host": "localhost",
    "database": "smart_career_db",
    "user": "postgres",
    "password": "your_password",  # Change this
    "port": 5432
}

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

# ============================================================================
# DATA PREPROCESSING
# ============================================================================

class DataPreprocessor:
    """Handle data cleaning and feature engineering"""
    
    def __init__(self):
        self.label_encoders = {}
        self.scaler = StandardScaler()
    
    def load_kaggle_courses(self, csv_path: str) -> pd.DataFrame:
        """Load and validate Kaggle dataset"""
        try:
            df = pd.read_csv(csv_path)
            logger.info(f"Loaded {len(df)} courses from Kaggle")
            
            # Clean data
            df['title'].fillna('Unknown', inplace=True)
            df['level'].fillna('Beginner', inplace=True)
            df['rating'].fillna(3.5, inplace=True)
            
            return df
        except Exception as e:
            logger.error(f"Error loading Kaggle data: {e}")
            raise
    
    def extract_quiz_features(self, quiz_answers: Dict) -> np.ndarray:
        """
        Extract numerical features from quiz answers
        
        Quiz Questions (18 total):
        - Q1-Q5: Interests (category scores 0-10)
        - Q6-Q9: Skills Assessment (scores 0-10)
        - Q10-Q13: Personality (scores 0-10)
        - Q14-Q15: Career Preferences (scores 0-10)
        - Q16-Q18: Education (scores 0-10)
        """
        features = []
        
        # Category: Interests (average from Q1-Q5)
        interests_score = np.mean([
            self._score_answer(quiz_answers.get(f'q{i}', {}))
            for i in range(1, 6)
        ])
        features.append(interests_score)
        
        # Category: Skills Assessment (average from Q6-Q9)
        skills_score = np.mean([
            self._score_answer(quiz_answers.get(f'q{i}', {}))
            for i in range(6, 10)
        ])
        features.append(skills_score)
        
        # Category: Personality (average from Q10-Q13)
        personality_score = np.mean([
            self._score_answer(quiz_answers.get(f'q{i}', {}))
            for i in range(10, 14)
        ])
        features.append(personality_score)
        
        # Category: Career Preferences (average from Q14-Q15)
        career_score = np.mean([
            self._score_answer(quiz_answers.get(f'q{i}', {}))
            for i in range(14, 16)
        ])
        features.append(career_score)
        
        # Category: Education (average from Q16-Q18)
        education_score = np.mean([
            self._score_answer(quiz_answers.get(f'q{i}', {}))
            for i in range(16, 19)
        ])
        features.append(education_score)
        
        return np.array(features).reshape(1, -1)
    
    @staticmethod
    def _score_answer(answer_obj: Dict) -> float:
        """Convert answer to numerical score 0-10"""
        try:
            # Map text answers to scores
            answer_map = {
                "Yes": 8, "No": 2, "Sometimes": 5,
                "High": 8, "Medium": 5, "Low": 2,
                "Beginner": 3, "Intermediate": 6, "Advanced": 9,
                "Alone": 4, "In a team": 7, "Both": 5,
                "Creative": 7, "Analytical": 8, "Balanced": 6,
                "Watching videos": 5, "Reading materials": 6, "Hands-on practice": 8,
                "Keep trying": 8, "Ask for help": 6, "Avoid difficult": 2,
                "High salary": 7, "Passion-based": 8, "Work-life balance": 6,
            }
            
            answer_text = answer_obj.get('answer', 'Sometimes')
            return float(answer_map.get(answer_text, 5))
        except:
            return 5.0  # Default medium score

# ============================================================================
# ML MODELS
# ============================================================================

class CareerRecommenderModel:
    """Random Forest model for career path prediction"""
    
    def __init__(self, model_path: str = "models/career_recommender.pkl"):
        self.model_path = model_path
        self.model = None
        self.label_encoder = None
        self.scaler = StandardScaler()
        self.feature_names = ['interests_avg', 'skills_avg', 'personality_avg', 'career_avg', 'education_avg']
        
        if os.path.exists(model_path):
            self.load()
        else:
            logger.warning(f"Model not found at {model_path}. Train first!")
    
    def train(self, X_train, y_train):
        """Train Random Forest model"""
        logger.info("Training Career Recommender Model...")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X_train)
        
        # Encode labels
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y_train)
        
        # Train model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_scaled, y_encoded)
        
        logger.info("✓ Model trained successfully")
        self.save()
    
    def predict(self, X: np.ndarray) -> tuple:
        """
        Predict career path and confidence
        Returns: (career_path, confidence_score)
        """
        if self.model is None:
            raise ValueError("Model not trained. Load or train first.")
        
        X_scaled = self.scaler.transform(X)
        prediction = self.model.predict(X_scaled)[0]
        probabilities = self.model.predict_proba(X_scaled)[0]
        confidence = float(np.max(probabilities))
        
        career_path = self.label_encoder.inverse_transform([prediction])[0]
        
        return career_path, confidence
    
    def save(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'label_encoder': self.label_encoder,
                'scaler': self.scaler
            }, f)
        logger.info(f"✓ Model saved to {self.model_path}")
    
    def load(self):
        """Load model from disk"""
        with open(self.model_path, 'rb') as f:
            data = pickle.load(f)
            self.model = data['model']
            self.label_encoder = data['label_encoder']
            self.scaler = data['scaler']
        logger.info(f"✓ Model loaded from {self.model_path}")

class SkillMasteryClassifier:
    """KNN model for skill mastery level classification"""
    
    def __init__(self, model_path: str = "models/skill_classifier.pkl"):
        self.model_path = model_path
        self.model = None
        self.label_encoder = None
        self.scaler = StandardScaler()
        
        if os.path.exists(model_path):
            self.load()
    
    def train(self, X_train, y_train):
        """Train KNN model for skill mastery"""
        logger.info("Training Skill Mastery Classifier...")
        
        X_scaled = self.scaler.fit_transform(X_train)
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y_train)
        
        self.model = KNeighborsClassifier(n_neighbors=5)
        self.model.fit(X_scaled, y_encoded)
        
        logger.info("✓ Skill classifier trained")
        self.save()
    
    def predict(self, X: np.ndarray) -> tuple:
        """Predict skill mastery level"""
        if self.model is None:
            raise ValueError("Model not trained")
        
        X_scaled = self.scaler.transform(X)
        prediction = self.model.predict(X_scaled)[0]
        mastery_level = self.label_encoder.inverse_transform([prediction])[0]
        
        return mastery_level
    
    def save(self):
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'label_encoder': self.label_encoder,
                'scaler': self.scaler
            }, f)
    
    def load(self):
        with open(self.model_path, 'rb') as f:
            data = pickle.load(f)
            self.model = data['model']
            self.label_encoder = data['label_encoder']
            self.scaler = data['scaler']

# ============================================================================
# FASTAPI ENDPOINTS
# ============================================================================

# Initialize models
preprocessor = DataPreprocessor()
career_model = CareerRecommenderModel()
skill_model = SkillMasteryClassifier()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Smart Career ML Service",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/train-career-model")
async def train_career_model(csv_path: str = "data/udemy-courses.csv"):
    """
    Train career recommender model from Kaggle data
    
    This should be run once after downloading Kaggle dataset
    """
    try:
        # Load sample training data (in production, extract from DB)
        X_train = np.array([
            [8, 3, 5, 8, 7],  # High programming, low design -> Software Dev
            [3, 8, 7, 9, 8],  # Low programming, high design -> UI/UX
            [9, 2, 8, 7, 9],  # High programming, low design -> Software Dev
            [2, 9, 8, 9, 7],  # Low programming, high design -> UI/UX
            [7, 5, 6, 7, 8],  # Moderate all -> Data Science
        ])
        
        y_train = np.array([
            "Software Engineering",
            "UI/UX Design",
            "Software Engineering",
            "UI/UX Design",
            "Data Science / AI"
        ])
        
        career_model.train(X_train, y_train)
        
        return {"status": "success", "message": "Career model trained"}
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-career")
async def predict_career(quiz_answers: Dict):
    """
    Predict career path based on quiz answers
    
    Input:
    {
        "q1": {"answer": "Programming"},
        "q2": {"answer": "Python"},
        ...
    }
    
    Output:
    {
        "career_path": "Software Engineering",
        "confidence": 0.92,
        "reasons": [...]
    }
    """
    try:
        # Extract features from quiz
        X = preprocessor.extract_quiz_features(quiz_answers)
        
        # Make prediction
        career_path, confidence = career_model.predict(X)
        
        return {
            "career_path": career_path,
            "confidence": round(float(confidence), 3),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-skill-mastery")
async def predict_skill_mastery(
    skill_name: str,
    courses_completed: int,
    hours_practiced: int,
    quiz_score: float
):
    """
    Predict skill mastery level for a user
    
    Levels: Beginner, Intermediate, Advanced, Master
    """
    try:
        X = np.array([[courses_completed, hours_practiced, quiz_score]])
        mastery_level = skill_model.predict(X)
        
        return {
            "skill": skill_name,
            "mastery_level": mastery_level,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/status")
async def get_models_status():
    """Get status of all loaded ML models"""
    return {
        "career_recommender": {
            "loaded": career_model.model is not None,
            "path": career_model.model_path
        },
        "skill_classifier": {
            "loaded": skill_model.model is not None,
            "path": skill_model.model_path
        }
    }

@app.post("/import-kaggle-data")
async def import_kaggle_courses(csv_path: str):
    """
    Import courses from Kaggle CSV into PostgreSQL
    
    Usage: POST /import-kaggle-data?csv_path=udemy-courses.csv
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Load CSV
        df = preprocessor.load_kaggle_courses(csv_path)
        
        # Insert into database
        for idx, row in df.iterrows():
            cursor.execute("""
                INSERT INTO courses 
                (title, provider, description, level, category, skills, url, rating, difficulty_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                row.get('course_title', 'Unknown'),
                row.get('provider', 'Unknown'),
                row.get('description', ''),
                row.get('level', 'Beginner'),
                row.get('category', 'Other'),
                row.get('skills', ''),
                row.get('url', ''),
                float(row.get('rating', 3.5)),
                int(row.get('difficulty_score', 5))
            ))
        
        conn.commit()
        count = len(df)
        logger.info(f"✓ Imported {count} courses")
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "courses_imported": count}
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# RUN THE SERVICE
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
