import { serve } from 'bun';
import { app } from './app';
import { connectDatabase, disconnectDatabase } from './core/database';
import { startEvaluationWorker } from './worker/evaluation-worker';
import { redis } from './core/queue';
import { vectorDB } from './core';
import { config } from './core/config';


if (import.meta.main) {
  try {
    const worker = await initializeServices();

    const PORT = config.PORT || 3000;
    const server = serve({
      port: PORT,
      fetch: app.fetch,
    });

    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('🚀 Evaluation worker listening for jobs...');


    async function shutdown(signal: string) {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      try {
        await disconnectDatabase();
        await redis.quit();
        await vectorDB.disconnectVectorDB();
        await worker.close();

        server.stop();
        console.log('✅ All services closed cleanly');
        process.exit(0);
      } catch (err: any) {
        console.error('❌ Error during shutdown: ', err);
        process.exit(1);
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error: any) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function initializeServices() {
  console.log('🚀 Initializing services...');

  try {

    await connectDatabase();
    console.log('✅ Database connected');


    await redis.ping();
    console.log('✅ Redis connected');


    await vectorDB.connectVectorDB();
    await vectorDB.ensureCollections();
    console.log('✅ Vector database connected and collections ensured');


    const worker = startEvaluationWorker();
    console.log('✅ Evaluation worker started');

    return worker;
  } catch (error: any) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
}
