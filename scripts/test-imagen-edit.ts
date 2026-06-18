import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Generate a base image
  const response1 = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image',
    contents: 'A wide illustration of a solar system without any text.',
    config: {
      responseModalities: ['IMAGE'],
    },
  });

  const baseImage = response1.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData;
  if (!baseImage) return console.log('Base image generation failed');

  // Try to edit the image with text
  try {
    const response2 = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: baseImage.data,
                mimeType: baseImage.mimeType || 'image/png',
              },
            },
            {
              text: 'Write the word "HELLO" in big letters at the top.',
            },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE'],
      },
    });
    const editedImage = response2.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData;
    console.log(editedImage ? 'SUCCESS: Edit worked' : 'No edited image returned');
  } catch (err: any) {
    console.log(`Error editing: ${err.message}`);
  }
}

main().catch(console.error);
