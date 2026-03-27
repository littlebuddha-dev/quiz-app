// Path: scripts/verify-quiz-gen.ts
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import { getRandomTopicFromCurriculum } from '../lib/ai-prompts';

dotenv.config();

async function test() {
  console.log('--- Testing Random Topic Selection ---');
  const age = 8;
  const categories = ['理科', 'Science'];
  const topic = getRandomTopicFromCurriculum(age, categories);
  console.log(`Age: ${age}, Categories: ${categories}`);
  console.log(`Selected Topic: ${topic}`);

  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not found in .env, skipping API call test.');
    return;
  }

  console.log('\n--- Note: Full API test requires running the dev server ---');
  console.log('You can test the API by running:');
  console.log('curl -X POST http://localhost:3000/api/quiz-generator -H "Content-Type: application/json" -d \'{"topic": "", "targetAge": 8}\'');
}

test().catch(console.error);
