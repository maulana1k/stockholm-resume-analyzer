import type { Context } from 'hono';
import type { EvaluationRequest, EvaluationResult, EvaluationStatus } from '../types/api.js';
import { prisma } from '../core/database.js';
import { queueService } from '@/services/queue/index.js';


async function evaluate(c: Context<{}, '/evaluate', { out: { json: EvaluationRequest; }; }>) {
  try {
    const { author, jobVacancyId, cvDocumentId, projectDocumentId } = c.req.valid('json') as EvaluationRequest;


    const [cvDocument, projectDocument] = await Promise.all([
      prisma.document.findUnique({ where: { id: cvDocumentId } }),
      prisma.document.findUnique({ where: { id: projectDocumentId } }),
    ]);

    if (!cvDocument) {
      return c.json({ error: 'CV document not found' }, 404);
    }
    if (!projectDocument) {
      return c.json({ error: 'Project document not found' }, 404);
    }


    const job = await prisma.evaluationJob.create({
      data: {
        author,
        status: 'QUEUED',
        jobVacancyId,
        cvDocumentId: cvDocument.id,
        projectDocumentId: projectDocument.id
      },
      include: {
        cvDocument: true,
        projectDocument: true
      }
    });


    await queueService.addEvaluationJob(job.id);

    const response: EvaluationStatus = {
      id: job.id,
      status: 'queued'
    };

    return c.json(response, 202);

  } catch (error: any) {
    console.error('Evaluate failed:', error);
    return c.json({
      error: 'Evaluation failed to start',
      message: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
}

async function getResultById(c: Context) {
  try {
    const jobId = c.req.param('id');

    if (!jobId) {
      return c.json({ error: 'Job ID is required' }, 400);
    }


    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return c.json({ error: 'Invalid job ID format' }, 400);
    }


    const job = await prisma.evaluationJob.findUnique({
      where: { id: jobId },
      include: {
        result: true,
        cvDocument: true,
        projectDocument: true
      }
    });

    if (!job) {
      return c.json({ error: 'Evaluation job not found' }, 404);
    }


    const statusMap = {
      'QUEUED': 'queued',
      'PROCESSING': 'processing',
      'COMPLETED': 'completed',
      'FAILED': 'failed'
    } as const;

    const apiStatus = statusMap[job.status];


    const baseResponse: EvaluationStatus = {
      id: job.id,
      status: apiStatus,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    };


    if (job.status === 'COMPLETED' && job.result) {
      const resultWithData: EvaluationStatus & { result: EvaluationResult; } = {
        ...baseResponse,
        result: {
          cv_match_rate: job.result.cvMatchRate || 0,
          cv_feedback: job.result.cvFeedback || 'No feedback available',
          project_score: job.result.projectScore || 0,
          project_feedback: job.result.projectFeedback || 'No feedback available',
          overall_summary: job.result.overallSummary || 'No summary available'
        }
      };
      return c.json(resultWithData, 200);
    }


    if (job.status === 'FAILED') {
      const failedResponse: EvaluationStatus & { error?: string; } = {
        ...baseResponse,
        error: 'Evaluation failed - please try uploading the documents again'
      };
      return c.json(failedResponse, 200);
    }


    return c.json(baseResponse, 200);

  } catch (error: any) {
    console.error('Result fetch failed:', error);

    return c.json({
      error: 'Failed to fetch evaluation result',
      message: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
}

async function getResults(c: Context) {
  try {
    const limit = parseInt(c.req.query('limit') ?? '20', 10);
    const offset = parseInt(c.req.query('offset') ?? '0', 10);

    const jobs = await prisma.evaluationJob.findMany({
      skip: offset,
      take: limit,
      include: {
        result: true,
        cvDocument: true,
        projectDocument: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const statusMap = {
      'QUEUED': 'queued',
      'PROCESSING': 'processing',
      'COMPLETED': 'completed',
      'FAILED': 'failed'
    } as const;

    const response = jobs.map(job => {
      const base: EvaluationStatus = {
        id: job.id,
        status: statusMap[job.status],
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString()
      };

      if (job.status === 'COMPLETED' && job.result) {
        return {
          ...base,
          result: {
            cv_match_rate: job.result.cvMatchRate || 0,
            cv_feedback: job.result.cvFeedback || 'No feedback available',
            project_score: job.result.projectScore || 0,
            project_feedback: job.result.projectFeedback || 'No feedback available',
            overall_summary: job.result.overallSummary || 'No summary available'
          }
        };
      }

      if (job.status === 'FAILED') {
        return { ...base, error: 'Evaluation failed - please try uploading the documents again' };
      }

      return base;
    });

    return c.json({ results: response, count: response.length }, 200);

  } catch (error: any) {
    console.error('Fetching all results failed:', error);
    return c.json({
      error: 'Failed to fetch evaluation results',
      message: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
}


export const evaluateHandler = {
  evaluate,
  getResultById,
  getResults
};