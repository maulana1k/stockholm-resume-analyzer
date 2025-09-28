import { Worker } from 'bullmq';
import { redis } from '../core/queue.js';
import { prisma } from '../core/database.js';
import { evalService } from '@/services/evaluation/index.js';


/**
 * Start the BullMQ worker that processes evaluation jobs.
 * Returns the Worker instance so caller can close() later.
 */
export function startEvaluationWorker() {
  const worker = new Worker(
    'evaluation',
    async job => {
      const { jobId } = job.data;

      try {
        await prisma.evaluationJob.update({
          where: { id: jobId },
          data: { status: 'PROCESSING' }
        });

        const result = await evalService.runEvaluation(jobId);

        await prisma.evaluationResult.create({
          data: {
            jobId,
            cvMatchRate: result.cvMatchRate,
            cvFeedback: result.cvFeedback,
            projectScore: result.projectScore,
            projectFeedback: result.projectFeedback,
            overallSummary: result.overallSummary,
            processedAt: new Date()
          }
        });

        await prisma.evaluationJob.update({
          where: { id: jobId },
          data: { status: 'COMPLETED' }
        });

        console.log(`✅ Evaluation completed for job ${jobId}`);
        return result;
      } catch (err: any) {
        console.error(`❌ Evaluation failed for job ${jobId}:`, err);
        await prisma.evaluationJob.update({
          where: { id: jobId },
          data: { status: 'FAILED' }
        });
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: 2
    }
  );

  worker.on('completed', job =>
    console.log(`Job ${job.id} completed successfully`)
  );
  worker.on('failed', (job, err: any) =>
    console.error(`Job ${job?.id} failed:`, err.message)
  );
  worker.on('error', (err: any) => console.error('Worker error:', err));

  return worker;
}
