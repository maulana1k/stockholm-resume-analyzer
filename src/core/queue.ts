import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';

export const redis = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const evaluationQueue = new Queue('evaluation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
  },
});

export const queueEvents = new QueueEvents('evaluation', {
  connection: redis,
});