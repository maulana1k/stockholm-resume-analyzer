
import { z } from 'zod';


export const UploadRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  cv: z.instanceof(File),
  projectReport: z.instanceof(File)
});

export type UploadRequest = z.infer<typeof UploadRequestSchema>;

export interface UploadResponse {
  author: string;
  cvDocumentId: string;
  projectDocumentId: string;
  message: string;
}


export const EvaluationRequestSchema = z.object({
  author: z.string(),
  jobVacancyId: z.string(),
  cvDocumentId: z.string().uuid('Invalid CV document ID'),
  projectDocumentId: z.string().uuid('Invalid project document ID')
});

export type EvaluationRequest = z.infer<typeof EvaluationRequestSchema>;

export interface EvaluationStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt?: string;
  updatedAt?: string;
  result?: EvaluationResult;
  error?: string;
}

export interface EvaluationResult {
  cv_match_rate: number;
  cv_feedback: string;
  project_score: number;
  project_feedback: string;
  overall_summary: string;
}

