import { QdrantClient } from '@qdrant/qdrant-js';
import { config } from './config.js';


let isConnected = false;

const client = new QdrantClient({
  url: config.QDRANT_URL,
  apiKey: config.QDRANT_API_KEY || undefined
});

export async function connectVectorDB() {
  try {
    await client.getCollections();
    isConnected = true;
    console.log('✅ Qdrant vector database connected');
  } catch (err: any) {
    console.error('❌ Qdrant connection failed:', err);
    throw err;
  }
}

export async function ensureCollections() {
  const collections = await client.getCollections();
  const names = collections.collections.map(c => c.name);

  const create = async (name: string) => {
    await client.createCollection(name, {
      vectors: { size: 384, distance: 'Cosine' }
    });
    console.log(`✅ Created ${name} collection`);
  };

  if (!names.includes('job_vacancies')) await create('job_vacancies');
}

export function getVectorClient() {
  if (!isConnected) throw new Error('Vector database not connected');
  return client;
}

export function disconnectVectorDB() {
  isConnected = false;
}
