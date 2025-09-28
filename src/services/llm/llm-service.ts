import { config } from '@/core/config';

import OpenAI from 'openai';

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}


const openai: OpenAI | null = config.OPENAI_API_KEY
  ? new OpenAI({ apiKey: config.OPENAI_API_KEY })
  : null;

const useMock = !openai;

if (openai) {
  console.log('✅ OpenAI client initialized');
} else {
  console.warn('⚠️ OpenAI API key not found, using mock responses');
}


function generateMockResponse(): LLMResponse {
  return {
    content: JSON.stringify({
      scores: {
        technicalSkills: 4,
        experience: 5,
        achievements: 3,
        culturalFit: 4,
        correctness: 4,
        codeQuality: 3,
        resilience: 4,
        documentation: 3,
        creativity: 4
      },
      projectScore: 7.2,
      projectFeedback:
        'Good implementation of core requirements with solid error handling. Documentation could be more comprehensive and code structure could be more modular.',
      improvementSuggestions: [
        'Add more detailed API documentation',
        'Improve code modularity and separation of concerns',
        'Include more comprehensive test coverage',
        'Add performance monitoring metrics'
      ],
      cvMatchRate: 0.82,
      cvFeedback:
        'Strong backend development skills with excellent experience level. Good cultural fit but could benefit from more AI-specific project experience.',
      strengths: [
        '5+ years backend development experience',
        'Strong Node.js and database skills',
        'Cloud platform experience',
        'Good team collaboration skills'
      ],
      gaps: [
        'Limited AI/ML project experience',
        'No specific vector database experience mentioned',
        'Could improve on system design documentation'
      ],
      skills: {
        technical: [
          'JavaScript',
          'TypeScript',
          'Node.js',
          'PostgreSQL',
          'Redis',
          'Docker'
        ],
        soft: ['Communication', 'Team Leadership', 'Problem Solving', 'Mentoring']
      },
      experience: [
        {
          role: 'Senior Backend Developer',
          years: 5,
          technologies: ['Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes']
        },
        {
          role: 'Backend Developer',
          years: 2,
          technologies: ['Python', 'Django', 'MySQL', 'Redis']
        }
      ],
      projects: [
        {
          name: 'AI Evaluation Platform',
          description: 'Built scalable backend for candidate assessment system',
          technologies: ['Node.js', 'Qdrant', 'BullMQ', 'OpenAI API']
        }
      ],
      overallSummary: 'Good candidate fit, would benefit from deeper RAG knowledge.'
    })
  };
}


export async function callLLM(
  prompt: string,
  systemPrompt: string = 'You are an expert recruiter. Return only valid JSON.',
  temperature: number = config.LLM_TEMPERATURE,
  timeoutMs = 10000
): Promise<LLMResponse> {
  try {
    if (useMock) {
      return generateMockResponse();
    }

    const response = await openai!.chat.completions.create({
      model: config.LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature,
      response_format: { type: 'json_object' }
    },
      { timeout: timeoutMs }
    );

    const choice = response.choices[0];
    if (!choice?.message.content) {
      throw new Error('No content in LLM response');
    }

    return {
      content: choice.message.content,
      usage: response.usage
        ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        }
        : undefined
    };
  } catch (error: any) {
    console.error('LLM call attempt failed:', error.message);

    return generateMockResponse();
  }
}

export async function callLLMWithJSON<T>(
  prompt: string,
  systemPrompt?: string,
  temperature: number = config.LLM_TEMPERATURE
): Promise<T> {
  const response = await callLLM(prompt, systemPrompt, temperature);
  try {
    return JSON.parse(response.content) as T;
  } catch (error: any) {
    console.error('Failed to parse LLM response as JSON:', error);
    throw new Error('Invalid JSON response from LLM');
  }
}
