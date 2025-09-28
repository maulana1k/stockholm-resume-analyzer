import { z } from 'zod';

export const EvaluationJobStatus = z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED']);
export type EvaluationJobStatus = z.infer<typeof EvaluationJobStatus>;

export const DocumentType = z.enum(['CV', 'PROJECT_REPORT', 'JOB_DESCRIPTION']);
export type DocumentType = z.infer<typeof DocumentType>;

export const CVEvaluationScores = z.object({
  technicalSkills: z.number().min(1).max(5),
  experienceLevel: z.number().min(1).max(5),
  relevantAchievements: z.number().min(1).max(5),
  culturalFit: z.number().min(1).max(5),
});

export const ProjectEvaluationScores = z.object({
  correctness: z.number().min(1).max(5),
  codeQuality: z.number().min(1).max(5),
  resilience: z.number().min(1).max(5),
  documentation: z.number().min(1).max(5),
  creativity: z.number().min(1).max(5),
});

export const EvaluationResult = z.object({
  cvMatchRate: z.number().min(0).max(1),
  cvFeedback: z.string(),
  cvScores: CVEvaluationScores,
  projectScore: z.number().min(0).max(10),
  projectFeedback: z.string(),
  projectScores: ProjectEvaluationScores,
  overallSummary: z.string(),
});
export const EvaluationJobData = z.object({
  jobId: z.string(),
  documentIds: z.array(z.string()),
  cvText: z.string().optional(),
  projectText: z.string().optional(),
});

export type EvaluationJobData = z.infer<typeof EvaluationJobData>;

export type EvaluationResult = z.infer<typeof EvaluationResult>;