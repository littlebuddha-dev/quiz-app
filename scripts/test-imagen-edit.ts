import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Generate a base image
  const response1 = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: 'A wide illustration of a solar system without any text.',
    config: {
      numberOfImages: 1,
      aspectRatio: '16:9',
      outputMimeType: 'image/jpeg',
    }
  });

  const baseImage = response1.generatedImages?.[0]?.image;
  if (!baseImage) return console.log('Base image generation failed');

  // Try to edit the image with text
  try {
    const response2 = await ai.models.generateImages({
      model: 'imagen-4.0-edit', // this is a common alias, let's see if it exists
      prompt: 'Write the word "HELLO" in big letters at the top.',
      config: {
        // Is edit supported in generateImages in this SDK? 
        // SDK doesn't natively type this well, we pass it as any
        originalImageAction: 'EDIT',
        image: baseImage,
      } as any
    });
    console.log('SUCCESS: Edit worked');
  } catch (err: any) {
    console.log(`Error editing: ${err.message}`);
  }
}

main().catch(console.error);
