import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { EvaluationRequestSchema, UploadRequestSchema, } from "../types/api.js";

import { uploadHandler } from "@/handler/upload.handler.js";
import { evaluateHandler } from "@/handler/evaluate.handler.js";
import { prisma } from "@/core/database.js";
import { redis } from "bun";
import { vectorDB } from "@/core/index.js";

export const api = new Hono();

api.post("/upload",
  zValidator("form", UploadRequestSchema),
  uploadHandler.upload
);

api.post(
  "/evaluate",
  zValidator("json", EvaluationRequestSchema),
  evaluateHandler.evaluate
);

api.get(
  "/result",
  evaluateHandler.getResults
);

api.get(
  "/result/:id",
  evaluateHandler.getResultById
);

api.get('/job_vacancies', async (c) => {
  const client = vectorDB.getVectorClient();

  const res = await client.scroll('job_vacancies', {
    with_payload: true,
    limit: 1000
  });

  const jobs = (res.points ?? []).map(p => p.payload);

  return c.json({ jobs });
});

api.get('/health', async (c) => {
  try {

    await prisma.$queryRaw`SELECT 1`;


    await redis.ping();

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        queue: 'active'
      }
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503);
  }
});
