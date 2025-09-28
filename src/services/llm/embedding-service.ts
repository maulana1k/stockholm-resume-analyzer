import { config } from '@/core/config';

import OpenAI from 'openai';

const openai = config.OPENAI_API_KEY
  ? new OpenAI({ apiKey: config.OPENAI_API_KEY })
  : null;

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function simpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const embedding = new Array(384).fill(0);


  words.forEach(word => {
    const pos = stringHash(word) % 384;
    embedding[pos] += 1;
  });

  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  const embed = embedding.map(v => v / (mag || 1));

  return embed;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) return simpleEmbedding(text);


  try {
    const res = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });

    return res.data[0]?.embedding ?? [];
  } catch (err) {
    console.error({ err }, 'OpenAI embedding failed, using fallback',);
    return simpleEmbedding(text);
  }
}
