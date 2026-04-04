# Technology Stack Finalization

## Frontend
- **Framework**: React.js with Tailwind CSS
- **Purpose**: User interface for student profile management, career recommendations, course tracking, and job matching.
- **Additional Libraries**: Axios for API calls, React Router for navigation, Tailwind for styling.

## Backend
- **Number of Services**: 1 backend service.
  - Spring Boot (Java): For authentication, user management, recommendation engine APIs, and data processing.
- **Modules**:
  - User authentication and profile management (Spring Boot).
  - Recommendation engine integration (Spring Boot).
  - Course tracking and certificate upload (Spring Boot).
  - Job matching logic (Spring Boot).
- **Database**: 
  - PostgreSQL for core application data.
  - Optional Neo4j for ontology/knowledge graph (career pathways and relationships).
- **Authentication**: JWT-based authentication in Spring Boot.

## AI/ML Engineering
- **Models**: Random Forest, KNN for recommendations; Sentence-BERT for NLP embeddings.
- **Libraries**: scikit-learn, sentence-transformers, pandas, numpy.
- **Deployment**: Integrated into FastAPI backend for real-time inference.

## Integration Frameworks
- **API Communication**: RESTful APIs with Spring Boot.
- **ML Integration**: Python ML modules integrated directly into backend services.

## Cloud Platforms
- **Primary Cloud**: Optional (local-first development).
- **Services**:
  - PostgreSQL managed database (Cloud SQL, RDS, or Azure Database for PostgreSQL).
  - Optional Neo4j Aura for managed ontology graph.
- **Deployment**: Containerize with Docker and deploy backend/frontend independently.

## Development Tools
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Environment**: Java 17 + Maven (backend), Node.js (frontend)

This stack keeps the project simple and maintainable while supporting strong AI/ML capability.