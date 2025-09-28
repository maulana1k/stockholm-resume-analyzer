import { getVectorClient } from '@/core/vector-db.js';
import { generateEmbedding } from './embedding-service.js';


interface SearchResult {
  similarityScore: number;
  jobDescription: string;
  scoringRubric: string;
  jobTitle: string;
  jobId: string;
}

export async function getJobScoring(
  fileContent: string,
  jobId: string
): Promise<SearchResult> {

  try {

    const client = getVectorClient();

    const contentVector = await generateEmbedding(fileContent);

    const res = await client.search('job_vacancies', {
      vector: contentVector,
      filter: {
        must: [
          { key: "jobId", match: { value: jobId } },
        ]
      },
      limit: 1,
      with_payload: true,
      with_vector: false
    });

    if (res.length === 0) {
      throw new Error(`Job ${jobId} not found in Qdrant`);
    }

    const match = res[0]!;

    return {
      jobId,
      jobTitle: match.payload?.title as string,
      similarityScore: 1 - match.score,
      jobDescription: match.payload?.job_description as string,
      scoringRubric: match.payload?.scoring_rubric as string
    };
  } catch (error: any) {
    console.error('Failed to search scoring on vector db:', error);
    throw new Error('Failed to search vector db');
  }
}