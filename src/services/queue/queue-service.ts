import { evaluationQueue } from '../../core/queue.js';

/** Add a job to the evaluation queue */
export async function addEvaluationJob(jobId: string) {
  return evaluationQueue.add('evaluate', { jobId }, { jobId });
}

/** Get a job's current status */
export async function getJobStatus(jobId: string) {
  const job = await evaluationQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: jobId,
    status: state,
    progress: job.progress,
    failedReason: job.failedReason
  };
}

/** Clean up old completed jobs */
export async function cleanupCompletedJobs(limit = 100) {
  const jobs = await evaluationQueue.getJobs(['completed'], 0, limit);
  await Promise.all(jobs.map(job => job.remove()));
}
