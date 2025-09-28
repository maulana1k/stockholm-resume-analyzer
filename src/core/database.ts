import { PrismaClient } from '@prisma/client';
import { config } from './config.js';


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (config.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error: any) {
    console.error({ error }, '❌ Database connection failed:');
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}