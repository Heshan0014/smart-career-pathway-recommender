"""
Data Preprocessing & ML Pipeline
This script:
1. Loads data from your PostgreSQL database
2. Cleans and prepares it for ML training
3. Trains ML models
4. Evaluates model performance

Run: python data_preprocessing.py
"""

import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from datetime import datetime
import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

DB_CONFIG = {
    "host": "localhost",
    "database": "smart_career_db",
    "user": "postgres",
    "password": "your_password",  # Change this!
    "port": 5432
}

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        logger.info("✓ Connected to PostgreSQL")
        return conn
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise

# ============================================================================
# STEP 1: EXTRACT DATA FROM DATABASE
# ============================================================================

def extract_user_quiz_data():
    """
    Extract user quiz answers and career recommendation results
    This will be used as training data for the ML model
    """
    logger.info("\n[STEP 1] Extracting user quiz data from database...")
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Query: Get all quiz submissions with corresponding recommendations
        query = """
        SELECT 
            u.id,
            qs.answers,
            r.career_path,
            r.confidence_score,
            u.age,
            u.education_level,
            u.favorite_subject,
            u.favorite_field
        FROM users u
        LEFT JOIN quiz_submissions qs ON u.id = qs.user_id
        LEFT JOIN recommendations r ON u.id = r.user_id
        WHERE qs.answers IS NOT NULL
        ORDER BY u.id
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        logger.info(f"✓ Extracted {len(results)} records from database")
        
        cursor.close()
        conn.close()
        
        return results
    
    except Exception as e:
        logger.error(f"❌ Error extracting data: {e}")
        cursor.close()
        conn.close()
        raise

# ============================================================================
# STEP 2: CLEAN & PREPARE DATA
# ============================================================================

def preprocess_quiz_answers(answers_json):
    """Convert JSON answers to feature vector"""
    try:
        features = []
        
        # Average scores by category
        interests_scores = []
        skills_scores = []
        personality_scores = []
        career_scores = []
        education_scores = []
        
        for q_id, answer_obj in answers_json.items():
            answer = answer_obj.get('answer', '') if isinstance(answer_obj, dict) else answer_obj
            
            # Score mapping
            score_map = {
                "Yes": 8, "No": 2, "Sometimes": 5,
                "High": 8, "Medium": 5, "Low": 2,
                "Beginner": 3, "Intermediate": 6, "Advanced": 9,
                "Alone": 4, "In a team": 7, "Both": 5,
                "Creative": 7, "Analytical": 8, "Balanced": 6,
                "Watching videos": 5, "Reading materials": 6, "Hands-on practice": 8,
                "Keep trying": 8, "Ask for help": 6, "Avoid difficult": 2,
                "High salary": 7,  "Passion-based": 8, "Work-life balance": 6,
            }
            
            score = float(score_map.get(answer, 5))
            
            # Categorize by question ID
            q_num = int(q_id.replace('q', ''))
            
            if q_num <= 5:
                interests_scores.append(score)
            elif q_num <= 9:
                skills_scores.append(score)
            elif q_num <= 13:
                personality_scores.append(score)
            elif q_num <= 15:
                career_scores.append(score)
            else:
                education_scores.append(score)
        
        # Calculate averages
        features = [
            np.mean(interests_scores) if interests_scores else 5,
            np.mean(skills_scores) if skills_scores else 5,
            np.mean(personality_scores) if personality_scores else 5,
            np.mean(career_scores) if career_scores else 5,
            np.mean(education_scores) if education_scores else 5,
        ]
        
        return features
    
    except Exception as e:
        logger.warning(f"⚠️ Error preprocessing answers: {e}")
        return [5, 5, 5, 5, 5]  # Default average scores

def create_training_dataset(raw_data):
    """Convert raw data to ML-ready format"""
    logger.info("[STEP 2] Preparing data for ML training...")
    
    X_data = []  # Features
    y_data = []  # Labels (career paths)
    
    for record in raw_data:
        try:
            if record['answers'] and record['career_path']:
                features = preprocess_quiz_answers(record['answers'])
                X_data.append(features)
                y_data.append(record['career_path'])
        except Exception as e:
            logger.warning(f"⚠️ Skipping record {record['id']}: {e}")
            continue
    
    X = np.array(X_data)
    y = np.array(y_data)
    
    logger.info(f"✓ Prepared {len(X)} training samples")
    logger.info(f"  Features shape: {X.shape}")
    logger.info(f"  Career paths: {np.unique(y)}")
    
    return X, y

# ============================================================================
# STEP 3: LOAD KAGGLE COURSES DATA
# ============================================================================

def load_and_store_kaggle_courses(csv_path):
    """Load courses from Kaggle CSV and store in database"""
    logger.info(f"\n[STEP 3] Loading Kaggle courses from {csv_path}...")
    
    try:
        # Load CSV
        df = pd.read_csv(csv_path)
        logger.info(f"✓ Loaded {len(df)} courses from CSV")
        
        # Clean data
        df['price'].fillna(0, inplace=True)
        df['rating'].fillna(3.5, inplace=True)
        df['level'].fillna('Beginner', inplace=True)
        
        # Connect to DB
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert courses
        inserted_count = 0
        for idx, row in df.iterrows():
            try:
                cursor.execute("""
                    INSERT INTO courses 
                    (title, provider, level, category, skills, url, rating, price, difficulty_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    str(row.get('course_title', 'Unknown'))[:255],
                    str(row.get('provider', 'Unknown'))[:100],
                    str(row.get('level', 'Beginner'))[:50],
                    str(row.get('category', 'Other'))[:100],
                    str(row.get('skills', ''))[:500],
                    str(row.get('url', ''))[:500],
                    float(row.get('rating', 3.5)),
                    float(row.get('price', 0)),
                    int(row.get('difficulty_score', 5))
                ))
                inserted_count += 1
            except Exception as e:
                logger.warning(f"⚠️ Skipping course {idx}: {e}")
                continue
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"✓ Inserted {inserted_count} courses into database")
        
        return inserted_count
    
    except Exception as e:
        logger.error(f"❌ Error loading Kaggle data: {e}")
        raise

# ============================================================================
# STEP 4: TRAIN ML MODEL
# ============================================================================

def train_ml_model(X, y):
    """Train and evaluate Random Forest model"""
    logger.info("\n[STEP 4] Training ML model...")
    
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
    from sklearn.preprocessing import LabelEncoder
    
    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Split data: 80% training, 20% testing
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    logger.info(f"  Training set: {len(X_train)} samples")
    logger.info(f"  Testing set: {len(X_test)} samples")
    
    # Train Random Forest
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    logger.info("✓ Model training completed")
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    
    logger.info("\n[EVALUATION RESULTS]")
    logger.info(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall:    {recall:.4f}")
    logger.info(f"  F1-Score:  {f1:.4f}")
    
    # Feature importance
    logger.info("\n[FEATURE IMPORTANCE]")
    feature_names = ['Interests', 'Skills', 'Personality', 'Career Pref', 'Education']
    for name, importance in zip(feature_names, model.feature_importances_):
        logger.info(f"  {name}: {importance:.4f}")
    
    return model, le, {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1
    }

# ============================================================================
# STEP 5: SAVE MODEL & REGISTER IN DATABASE
# ============================================================================

def save_model_metadata(metrics):
    """Save model metadata to database for tracking"""
    logger.info("\n[STEP 5] Saving model metadata...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO ml_models 
            (model_name, model_version, algorithm, test_accuracy, precision, recall, f1_score, 
             model_path, training_completed_at, deployed_at, is_active, training_data_size)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            'career_recommender',
            '1.0.0',
            'RandomForest',
            metrics['accuracy'],
            metrics['precision'],
            metrics['recall'],
            metrics['f1_score'],
            'models/career_recommender.pkl',
            datetime.now(),
            datetime.now(),
            True,
            500  # Update with actual count
        ))
        
        conn.commit()
        logger.info("✓ Model metadata saved to database")
    
    except Exception as e:
        logger.error(f"❌ Error saving metadata: {e}")
    
    finally:
        cursor.close()
        conn.close()

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Execute full ML pipeline"""
    logger.info("="*60)
    logger.info("SMART CAREER ML PIPELINE - DATA PREPROCESSING & TRAINING")
    logger.info("="*60)
    
    try:
        # Step 1: Extract data
        raw_data = extract_user_quiz_data()
        
        if len(raw_data) == 0:
            logger.warning("⚠️ No training data found. Insert sample data first.")
            # For demo, use hardcoded data
            logger.info("Using hardcoded demo data...")
            raw_data = [
                {'id': 1, 'answers': {'q1': {'answer': 'Programming'}, 'q2': {'answer': 'Yes'}}, 'career_path': 'Software Engineering'},
                {'id': 2, 'answers': {'q1': {'answer': 'Design'}, 'q2': {'answer': 'Yes'}}, 'career_path': 'UI/UX Design'},
            ]
        
        # Step 2: Prepare data
        X, y = create_training_dataset(raw_data)
        
        # Step 3: Load Kaggle courses (optional)
        # logger.info("\nWould you like to import Kaggle courses? (Path to CSV)")
        # Uncomment below to use:
        # csv_path = input("Enter CSV path (or press Enter to skip): ")
        # if csv_path:
        #     load_and_store_kaggle_courses(csv_path)
        
        # Step 4: Train model
        if len(X) > 0:
            model, label_encoder, metrics = train_ml_model(X, y)
            
            # Step 5: Save metadata
            save_model_metadata(metrics)
            
            logger.info("\n" + "="*60)
            logger.info("✓ PIPELINE COMPLETED SUCCESSFULLY")
            logger.info("="*60)
            logger.info("\nNext steps:")
            logger.info("1. Start FastAPI service: uvicorn ml_service:app --reload --port 8000")
            logger.info("2. Test endpoint: POST http://localhost:8000/predict-career")
            logger.info("3. Call from Java backend via REST API")
        
    except Exception as e:
        logger.error(f"\n❌ PIPELINE FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
