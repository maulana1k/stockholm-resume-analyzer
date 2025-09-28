export interface CvScoreBreakdown {
  technicalSkills: number;
  experience: number;
  achievements: number;
  culturalFit: number;
}

export interface ProjectScoreBreakdown {
  correctness: number;
  codeQuality: number;
  resilience: number;
  documentation: number;
  creativity: number;
}

export function weightedCvScore(scores: CvScoreBreakdown): number {
  return (
    scores.technicalSkills * 0.40 +
    scores.experience * 0.25 +
    scores.achievements * 0.20 +
    scores.culturalFit * 0.15
  );
}

export function weightedProjectScore(scores: ProjectScoreBreakdown): number {
  return (
    scores.correctness * 0.30 +
    scores.codeQuality * 0.25 +
    scores.resilience * 0.20 +
    scores.documentation * 0.15 +
    scores.creativity * 0.10
  );
}
