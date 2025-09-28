import { prisma } from '../../core/database.js';
import { llmService, ragService } from '../llm/index.js';
import fs from 'fs/promises';
import { getJobScoring } from '../llm/rag-service.js';
import { weightedCvScore, weightedProjectScore } from './scoring.js';


export interface CVStructuredData {
  skills: {
    technical: string[];
    soft: string[];
  };
  experience: Array<{ role: string; years: number; technologies: string[]; }>;
  projects: Array<{ name: string; description: string; technologies: string[]; }>;
}

export interface ProjectStructuredData {
  name: string;
  description: string;
  technologies: string[];
  architecture: string;
  keyFeatures: string[];
  responsibilities: string[];
  challenges: string[];
  outcomes: string[];
}


export interface CVEvaluation {
  scores: {
    technicalSkills: number;
    experience: number;
    achievements: number;
    culturalFit: number;
  };
  cvMatchRate: number;
  cvFeedback: string;
  strengths: string[];
  gaps: string[];
}

export interface ProjectEvaluation {
  scores: {
    correctness: number;
    codeQuality: number;
    resilience: number;
    documentation: number;
    creativity: number;
  };
  projectScore: number;
  projectFeedback: string;
  improvementSuggestions: string[];
}

export interface FinalEvaluation {
  cvMatchRate: number;
  cvFeedback: string;
  projectScore: number;
  projectFeedback: string;
  overallSummary: string;
}

/**
 * Run the full evaluation pipeline for a job.
 */
export async function runEvaluation(jobId: string): Promise<FinalEvaluation> {
  try {
    const job = await prisma.evaluationJob.findUnique({
      where: { id: jobId },
      include: { cvDocument: true, projectDocument: true }
    });
    if (!job) throw new Error(`Job ${jobId} not found`);

    const cvContent = await readDocumentContent(job.cvDocument.filePath);
    const projectContent = await readDocumentContent(job.projectDocument.filePath);








    const cvEval = await evaluateCV(cvContent, job.jobVacancyId);
    const projectEval = await evaluateProject(projectContent, job.jobVacancyId);
    const finalSummary = await generateFinalSummary(cvEval, projectEval);

    return {
      cvMatchRate: cvEval.cvMatchRate,
      cvFeedback: cvEval.cvFeedback,
      projectScore: projectEval.projectScore,
      projectFeedback: projectEval.projectFeedback,
      overallSummary: finalSummary
    };
  } catch (err) {
    console.error({ err }, `Evaluation failed for job ${jobId}\n`);
    throw err;
  }
}


/* ---------- Helpers ---------- */

async function readDocumentContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error({ err }, `Failed to read file ${filePath}`);
    throw new Error(`Could not read document content from ${filePath}`);
  }
}

async function extractCVStructure(cvText: string): Promise<CVStructuredData> {
  const prompt = `
Extract structured information from this CV:

CV CONTENT:
${cvText.substring(0, 8000)}

Return valid JSON:
{
  "skills": {"technical": string[], "soft": string[]},
  "experience": [{"role": string, "years": number, "technologies": string[]}],
  "projects": [{"name": string, "description": string, "technologies": string[]}]
}
`;
  return llmService.callLLMWithJSON<CVStructuredData>(
    prompt,
    'You are an expert at extracting structured information from CVs. Be accurate and thorough.'
  );
}

export async function extractProjectStructure(
  projectText: string
): Promise<ProjectStructuredData> {
  const prompt = `
Extract a structured JSON summary of the following project report.

PROJECT REPORT:
${projectText.substring(0, 8000)}

Return a **valid JSON object only** with the following schema:
{
  "name": string,                  
  "description": string,           
  "technologies": string[],        
  "architecture": string,          
  "keyFeatures": string[],         
  "responsibilities": string[],    
  "challenges": string[],          
  "outcomes": string[]             
}

Guidelines:
- Keep arrays concise but informative.
- If some field is missing from the text, return an empty string or empty array.
`;

  return llmService.callLLMWithJSON<ProjectStructuredData>(
    prompt,
    'You are a senior software engineer summarizing a technical project. Focus on accuracy and clarity.'
  );
}

export async function evaluateCV(
  cvText: string,

  jobVacancyId: string

): Promise<CVEvaluation> {


  const { similarityScore, jobDescription, jobTitle } =
    await getJobScoring(cvText, jobVacancyId);


  const cvStructured: CVStructuredData = await extractCVStructure(cvText);

  console.log({ jobTitle }, 'Evaluating resume score for job vacancy: ');



  const prompt = `
Evaluate the candidate CV against the job requirements using this WEIGHTED rubric.

JOB TITLE: ${jobTitle}

MATCH SCORE: ${(similarityScore * 100).toFixed(2)}%

JOB DESCRIPTION:
${jobDescription}

STRUCTURED CV DATA:
${JSON.stringify(cvStructured, null, 2)}

Scoring Rules (1–5):
Technical Skills Match:
  1 = Irrelevant skills
  2 = Few overlaps
  3 = Partial match
  4 = Strong match
  5 = Excellent + AI/LLM exposure
Experience Level:
  1 = <1 yr / trivial projects
  2 = 1–2 yrs
  3 = 2–3 yrs mid-scale projects
  4 = 3–4 yrs solid track record
  5 = 5+ yrs / high-impact projects
Relevant Achievements:
  1 = No clear achievements
  2 = Minimal improvements
  3 = Some measurable outcomes
  4 = Significant contributions
  5 = Major measurable impact
Cultural / Collaboration Fit:
  1 = Not demonstrated
  2 = Minimal
  3 = Average
  4 = Good
  5 = Excellent and well-demonstrated

Return only valid JSON:
{
  "scores": {
    "technicalSkills": number,
    "experience": number,
    "achievements": number,
    "culturalFit": number
  },
  "cvMatchRate": number,
  "cvFeedback": string,
  "strengths": string[],
  "gaps": string[]
}
`;


  return llmService.callLLMWithJSON<CVEvaluation>(
    prompt,
    'You are a CV evaluation specialist. Be objective and follow the rubric precisely.'
  );
}

export async function evaluateProject(
  projectText: string,
  jobVacancyId: string
): Promise<ProjectEvaluation> {


  const { similarityScore, scoringRubric, jobTitle } =
    await getJobScoring(projectText, jobVacancyId);


  const projectStructured: ProjectStructuredData =
    await extractProjectStructure(projectText);

  console.log({ jobTitle }, 'Evaluating project score for job vacancy: ');


  const prompt = `
Evaluate the following project using the weighted rubric.

JOB ROLE: ${jobVacancyId}

MATCH SCORE: ${(similarityScore * 100).toFixed(2)}%

STRUCTURED PROJECT SUMMARY:
${JSON.stringify(projectStructured, null, 2)}

PROJECT SCORING RUBRIC:
${scoringRubric}


Weights & 1–5 Scale:
- Correctness Prompt design, LLM chaining, RAG injection
- Code Quality & Structure
- Resilience & Error Handling
- Documentation & Explanation
- Creativity / Bonus

Scoring Rules (1–5):
Correctness (meets requirement):
  1 = Not implemented 
  2 = Minimal attempt 
  3 = Works partially 
  4 = Works correctly 
  5 = Fully correct + thoughtful
Code Quality (clean, modular, testable):
   1 = Poor 
   2 = Some structure 
   3 = Decent modularity
   4 = Good structure + some tests
   5 = Excellent quality + strong tests
Resilience (handles failures, retries):
   1 = Missing 
   2 = Minimal 
   3 = Partial handling
  4 = Solid handling
  5 = Robust, production-ready
Documentation (clear README, explanation of trade-offs):
  1 = Missing, 
  2 = Minimal, 
  3 = Adequate, 
  4 = Clear, 
  5 = Excellent + insightfu
Creativity / Bonus (optional improvements like authentication, deployment, dashboards):
  1 = None
  2 = Very basic
  3 = Useful extras
  4 = Strong enhancements
  5 = Outstanding creativity

Return only **valid JSON**:
{
  "scores": {
    "correctness": number,
    "codeQuality": number,
    "resilience": number,
    "documentation": number,
    "creativity": number
  },
  "projectScore": number,
  "projectFeedback": string,
  "improvementSuggestions": string[]
}
`;


  return llmService.callLLMWithJSON<ProjectEvaluation>(
    prompt,
    'You are a project evaluation specialist. Be objective and adhere to the scoring rubric strictly.'
  );
}

async function generateFinalSummary(
  cvEval: CVEvaluation,
  projectEval: ProjectEvaluation,

): Promise<string> {
  const cvWeighted = weightedCvScore(cvEval.scores);
  const projectWeighted = weightedProjectScore(projectEval.scores);
  const overallScore = ((cvWeighted + projectWeighted) / 2).toFixed(2);

  const prompt = `
Provide a concise 3–5 sentence hiring-manager assessment based on the
weighted scores and feedback below.

CV EVALUATION:
- Match Rate: ${(cvEval.cvMatchRate * 20).toFixed(1)}%
- Weighted Score (0–5): ${cvWeighted.toFixed(2)}
- Feedback: ${cvEval.cvFeedback}
- Strengths: ${cvEval.strengths.join(', ') || 'None'}
- Gaps: ${cvEval.gaps.join(', ')}
- Technical Skills: ${cvEval.scores.technicalSkills}/5
- Experience: ${cvEval.scores.experience}/5
- Achievements: ${cvEval.scores.achievements}/5
- Cultural Fit: ${cvEval.scores.culturalFit}/5

PROJECT EVALUATION:
- Weighted Score (0–5): ${projectWeighted.toFixed(2)}
- Feedback: ${projectEval.projectFeedback}
- Correctness: ${projectEval.scores.correctness}/5
- Code Quality: ${projectEval.scores.codeQuality}/5
- Resilience: ${projectEval.scores.resilience}/5
- Documentation: ${projectEval.scores.documentation}/5
- Creativity: ${projectEval.scores.creativity}/5
- Improvement Suggestions: ${projectEval.improvementSuggestions.join(', ')}

Overall Weighted Score (0–5): ${overallScore}

Return only a polished paragraph summarizing key strengths, weaknesses,
fit for the role, and a clear hire/no-hire recommendation.
`;

  const response = await llmService.callLLM(
    prompt,
    'You are a hiring manager providing final candidate assessment. Be professional and decisive.'
  );

  const raw = String(response.content ?? '');
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object' && 'overallSummary' in parsed) {
      const summary = (parsed as Record<string, unknown>).overallSummary;
      return typeof summary === 'string' ? summary : JSON.stringify(summary);
    }
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

/* ---------- Public API ---------- */

