import { vectorDB } from "@/core";
import { embeddingService } from "@/services/llm";

const jobVacancies = [
  {
    id: 1,
    title: 'Senior Backend Developer - AI Platform',
    jobId: 'JOB-BE-512',
    job_description: `Senior Backend Developer - AI Platform

We are looking for a Senior Backend Developer to join our AI Platform team. You will be responsible for building scalable backend systems that power our AI evaluation platform.

Technical Requirements:
- 5+ years backend development experience with Node.js/Python
- Strong experience with PostgreSQL, Redis, and vector databases
- Knowledge of Docker, Kubernetes, and cloud platforms (AWS/Azure)
- Experience with AI/ML systems and LLM integrations
- Familiarity with message queues (BullMQ, RabbitMQ)

Experience Level:
- Senior level: 5+ years software development
- Project leadership experience required
- Experience with scalable system design
- Agile methodology proficiency`,


    scoring_rubric: `Project Evaluation Criteria for Backend Developer Role:

Correctness (Backend Requirements):
- Implements proper prompt design and chaining
- Builds effective RAG systems with vector databases
- Implements robust error handling and retry logic
- Creates scalable microservices architecture
- Integrates with LLM APIs properly

Code Quality Standards:
- Clean, modular Node.js/TypeScript code
- Proper database schema design
- API design best practices (REST/GraphQL)
- Comprehensive testing strategy
- Performance optimization

Resilience Evaluation:
- Implements proper error handling for LLM APIs
- Adds retry mechanisms with exponential backoff
- Handles rate limiting and timeouts gracefully
- Includes comprehensive logging and monitoring
- Implements circuit breaker patterns

Documentation Requirements:
- Clear API documentation
- Database schema documentation
- Deployment and setup instructions
- Error handling guidelines`
  },
  {
    id: 2,
    title: 'Full Stack Developer - Evaluation Tools',
    jobId: 'JOB-FS-512',
    job_description: `Full Stack Developer - Evaluation Tools

Join our team as a Full Stack Developer to build innovative candidate evaluation tools. You'll work on both frontend and backend components of our assessment platform.

Technical Requirements:
- 3+ years full stack development experience
- Proficiency in React, TypeScript, Node.js
- Experience with database design and optimization
- Knowledge of authentication and authorization systems
- Understanding of DevOps and deployment processes

Frontend Skills:
- React with TypeScript experience
- State management (Redux/Zustand)
- Responsive design and CSS frameworks
- Real-time data visualization
- User experience optimization`,

    scoring_rubric: `Project Evaluation Criteria for Full Stack Role:

Correctness (Full Stack Requirements):
- Implements both frontend and backend components
- Creates responsive and user-friendly interfaces
- Builds proper API integrations
- Implements real-time features if required
- Ensures end-to-end functionality

Code Quality Standards:
- Clean React/TypeScript components
- Proper component separation and reusability
- Backend API design and implementation
- State management best practices
- Cross-browser compatibility

UI/UX Evaluation:
- Intuitive user interface design
- Responsive layout and mobile compatibility
- Loading states and user feedback
- Error handling and user messaging
- Accessibility considerations

Full Stack Integration:
- Proper API communication between frontend/backend
- Data flow management
- Authentication and authorization implementation
- Performance optimization across stack`
  },
  {
    id: 3,
    title: 'AI/ML Engineer - Candidate Assessment',
    jobId: 'JOB-MLE-512',

    job_description: `AI/ML Engineer - Candidate Assessment

We seek an AI/ML Engineer to enhance our candidate assessment algorithms. You'll work on improving our AI evaluation models and RAG systems.

Technical Requirements:
- 4+ years AI/ML engineering experience
- Strong background in natural language processing
- Experience with OpenAI GPT models and prompt engineering
- Knowledge of vector databases and similarity search
- Understanding of machine learning evaluation metrics

AI/ML Skills:
- Python, PyTorch, TensorFlow experience
- Prompt engineering and optimization
- RAG system design and implementation
- Model evaluation and fine-tuning
- Data analysis and visualization`,

    scoring_rubric: `Project Evaluation Criteria for AI/ML Role:

Correctness (AI/ML Requirements):
- Implements effective prompt engineering strategies
- Builds proper RAG systems with context retrieval
- Implements accurate scoring algorithms
- Handles AI API interactions correctly
- Ensures evaluation accuracy and consistency

AI/ML Quality Standards:
- Proper prompt design and optimization
- Effective context retrieval and ranking
- Accurate scoring methodology
- Model performance evaluation
- Error analysis and improvement

Technical Implementation:
- Proper use of AI/ML libraries and frameworks
- Efficient vector search implementation
- Scalable model serving architecture
- Comprehensive testing of AI components
- Performance optimization for AI workflows`
  }
];

async function seedVectorDB() {
  try {
    console.log('🚀 Starting vector database seeding...');


    await vectorDB.connectVectorDB();
    await vectorDB.ensureCollections();


    console.log('📋 Seeding job vacancies and rubrics...');

    for (const job of jobVacancies) {

      const fullContent = `JOB: ${job.title}\n\nJOB DESCRIPTION:\n${job.job_description}\n\nSCORING RUBRIC:\n${job.scoring_rubric}`;

      const embedding = await embeddingService.generateEmbedding(fullContent);

      await vectorDB.getVectorClient().upsert('job_vacancies', {
        points: [{
          id: job.id,
          vector: embedding,
          payload: {
            jobId: job.jobId,
            title: job.title,
            job_description: job.job_description,
            scoring_rubric: job.scoring_rubric,
            full_content: fullContent
          }
        }]
      });
      console.log(`✅ Added job: ${job.title}`);
      const res = await vectorDB.getVectorClient().search('job_vacancies', {
        vector: embedding,
        filter: {
          must: [
            { key: "jobId", match: { value: job.jobId } },
          ]
        },
        limit: 1,
        with_payload: true,
        with_vector: false

      });
      console.log(`✅ Data fetched: ${res[0]?.payload}`);

    }


    console.log('🎉 Vector database seeding completed!');
    console.log(`📁 Total items: ${jobVacancies.length}`);

  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  try {
    await seedVectorDB();
    console.log("seeding done");
  } catch (err: any) {
    console.error("seeding failed", err);
    process.exit(1);
  }
}
