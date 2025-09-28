# AI Resume Analyzer

A sophisticated backend service that leverages AI to evaluate candidate CVs and project reports against job vacancies. The system provides structured assessments using LLM chaining and RAG (Retrieval-Augmented Generation) for accurate, context-aware evaluations.

## 🎯 Problem Statement & Use Case

### Problem
Traditional resume screening is time-consuming, subjective, and often misses nuanced qualifications. Hiring teams struggle to consistently evaluate candidates against specific job requirements, especially for technical roles requiring both CV analysis and project assessment.

### Use Case
- **Recruitment Agencies**: Automate initial candidate screening
- **Tech Companies**: Evaluate technical candidates with AI-powered consistency
- **HR Departments**: Streamline hiring processes with structured evaluations
- **Educational Institutions**: Assess student projects against industry standards

## 🏗️ Tech Stack

### Core Framework
- **Runtime**: Bun (v1.0+)
- **Web Framework**: Hono (ultra-fast Edge framework)
- **Language**: TypeScript

### Database & Storage
- **Relational DB**: MySQL 8.0 (via Prisma ORM)
- **Vector DB**: Qdrant (for semantic search and RAG)
- **Caching/Queue**: Redis + BullMQ

### AI/ML Components
- **LLM Provider**: OpenAI GPT-4 (with fallback to mock responses)
- **Embeddings**: OpenAI text-embedding-ada-002
- **File Processing**: Custom PDF/DOCX/text extraction

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Queue System**: BullMQ for async job processing

## 📁 Project Structure

```
project-root/
│
├── src/
│   ├── core/
│   │   ├── config.ts                   # Environment configurations
│   │   ├── database.ts                 # Prisma client instance
│   │   └── queue.ts                    # BullMQ Redis setup
│   │
│   ├── api/
│   │   └── index.ts                    # Route registration
│   ├── handler/
│   │   ├── evaluate.handler.ts         # Evaluate routes handler
│   │   ├── upload.handler.ts           # Upload file handler
│   │
│   ├── services/
│   │   ├── documents/
│   │   │   └── file-service.ts         # File upload & text extraction
│   │   ├── evaluation/
│   │   │   └── eval-service.ts         # Main evaluation pipeline
│   │   ├── queue/
│   │   │   └── queue-service.ts        # Job queue management
│   │   └── llm/
│   │       |── embeddding-service.ts   # Embedding text into vector
│   │       ├── llm-service.ts          # LLM calls with prompt chaining
│   │       └── rag-service.ts          # Vector search & context retrieval
│   │
│   ├── workers/
│   │   └── evaluation-worker.ts        # Background job processor
│   │
│   ├── types/
│   │   ├── evaluation.ts               # TypeScript interfaces
│   │   └── api.ts                      # API request/response types
│   │
│   └── app.ts                          # Hono app setup
│   └── index.ts                        # Application entry point
│
├── scripts/
│   ├── init-db.ts                      # Database initialization
│   └── seed-vectors.ts                 # Qdrant job description seeding
│
├── storage/uploads/                    # Local file storage
├── prisma/schema.prisma                # Database schema
├── docs/openapi.json                   # API specification
└── docker-compose.yml                  # Development environment
```

## 🚀 API Features

### 1. File Upload (`POST /api/upload`)
- Accepts CV and project report (PDF, DOCX, TXT)
- Validates file types and sizes (10MB max)
- Returns document IDs for evaluation

### 2. Evaluation Trigger (`POST /api/evaluate`)
- Initiates AI evaluation pipeline
- Supports multiple job vacancy contexts
- Returns job ID for status tracking

### 3. Result Retrieval (`GET /api/result/:id`)
- Checks evaluation job status
- Returns structured evaluation results
- Supports batch status checking

### Evaluation Pipeline (4-Step AI Process):
1. **CV Structure Extraction**: Skills, experience, projects
2. **Job Matching**: Compare CV with job requirements via RAG
3. **Project Assessment**: Evaluate against scoring rubric
4. **Final Synthesis**: Generate comprehensive summary

## ⚙️ Setup & Installation

### Prerequisites
- Bun v1.0 or later
- Docker & Docker Compose
- OpenAI API key (optional - mock mode available)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd ai-resume-analyzer

# Install dependencies
bun install

# Copy environment file
cp .env.example .env
```

### 2. Environment Configuration
Edit `.env` file:
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/ai_evaluator"

# Redis
REDIS_URL="redis://localhost:6379"

# Qdrant
QDRANT_URL="http://localhost:6333"

# OpenAI (optional - system works in mock mode without key)
OPENAI_API_KEY="your_openai_api_key_here"

# Application
PORT=3000
NODE_ENV=development
```

### 3. Start Infrastructure
```bash
# Start databases (MySQL, Redis, Qdrant)
bun run docker:up-db

# Initialize database schema
bun run db:push

# Seed vector database with job vacancies
bun run db:seed
```

### 4. Start Application
```bash
# Development mode (with hot reload)
bun run dev

# Or build and start production
bun run build
bun run start
```

### 5. Full Docker Deployment (Alternative)
```bash
# Build and start all services
bun run docker:build
bun run docker:up
```

## 🧪 Testing the Application

### 1. Health Check
```bash
curl http://localhost:3000/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "vector_db": "connected"
  }
}
```

### 2. Upload Test Files
```bash
# Using curl to upload sample files
curl -X POST http://localhost:3000/api/upload \
  -F "name=John Doe" \
  -F "cv=@sample_cv.pdf" \
  -F "projectReport=@sample_project.pdf"
```

**Expected Response:**
```json
{
  "cvDocumentId": "123e4567-e89b-12d3-a456-426614174000",
  "projectDocumentId": "123e4567-e89b-12d3-a456-426614174001",
  "message": "Files uploaded successfully. Use these IDs to call /evaluate."
}
```

### 3. Start Evaluation
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "author": "John Doe",
    "jobVacancyId": "job-1",
    "cvDocumentId": "123e4567-e89b-12d3-a456-426614174000",
    "projectDocumentId": "123e4567-e89b-12d3-a456-426614174001"
  }'
```

**Expected Response:**
```json
{
  "id": "456e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

### 4. Check Results
```bash
# Check status
curl http://localhost:3000/api/result/456e4567-e89b-12d3-a456-426614174000

# Detailed results
curl http://localhost:3000/api/result/456e4567-e89b-12d3-a456-426614174000/detailed
```

**Completed Evaluation Response:**
```json
{
  "id": "456e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "result": {
    "cv_match_rate": 0.82,
    "cv_feedback": "Strong backend skills with 5+ years experience...",
    "project_score": 7.5,
    "project_feedback": "Good implementation of core requirements...",
    "overall_summary": "Strong candidate with excellent technical foundation..."
  }
}
```

## 🎨 Sample Test Files

Create these sample files for testing:

### sample_cv.txt
```
John Doe - Senior Developer
5+ years Node.js experience
Skills: JavaScript, TypeScript, PostgreSQL, AWS
Projects: E-commerce platform, AI assessment tool
```

### sample_project.txt
```
Project: AI Evaluation System
Built scalable backend with error handling
Implemented RAG system with vector database
Includes comprehensive documentation
```

## ⚠️ Troubleshooting

### Common Issues:

1. **Database Connection Issues**:
   ```bash
   # Check if databases are running
   docker ps
   
   # Reset databases
   bun run docker:down
   bun run docker:up-db
   bun run db:push
   ```

2. **Vector DB Seeding Problems**:
   ```bash
   # Re-seed vector database
   bun run db:seed
   ```

3. **File Upload Errors**:
   - Ensure files are < 10MB
   - Supported formats: PDF, DOCX, TXT
   - Check storage directory permissions

### Logs & Monitoring:
```bash
# View application logs
tail -f logs/app.log

# Check queue status
curl http://localhost:3000/health
```

## 💡 Development Notes

- **Mock Mode**: System works without OpenAI API key using realistic mock responses
- **Async Processing**: All evaluations run in background via BullMQ queues
- **Error Resilience**: Comprehensive retry logic and circuit breakers
- **Scalability**: Microservices-ready architecture with containerization

## 📈 Next Steps

- [ ] Add authentication and rate limiting
- [ ] Implement advanced analytics dashboard
- [ ] Add multi-LLM provider support
- [ ] Create admin interface for job vacancy management
- [ ] Add email notifications for completed evaluations

