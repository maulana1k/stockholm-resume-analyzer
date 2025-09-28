import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  PORT: parseInt(process.env.PORT || '3000'),


  DATABASE_URL: process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/ai_evaluator',


  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',


  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',


  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  LLM_MODEL: process.env.LLM_MODEL || 'gpt-4',
  LLM_TEMPERATURE: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),


  UPLOAD_DIR: process.env.UPLOAD_DIR || './storage/uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'),


  NODE_ENV: process.env.NODE_ENV || 'development'
} as const;

export type Config = typeof config;