import { GoogleGenAI } from '@google/genai';

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompts = [
    'A wide illustration of a solar system. At the top, write exactly this Japanese text: "よぞらを かんさつしよう！"',
    'A wide illustration of a solar system. At the top, write exactly this English text: "Let\'s observe the night sky!"',
  ];

  for (const prompt of prompts) {
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg',
        } as any // Using any to pass potential undocumented parameters like seed
      });

      const imgBase64 = response.generatedImages?.[0]?.image?.imageBytes;
      if (imgBase64) {
        console.log(`SUCCESS! Generated image for prompt with length: ${imgBase64.length}`);
      }
    } catch (err: any) {
      console.log(`Error: ${err.message}`);
    }
  }
}

main().catch(console.error);
