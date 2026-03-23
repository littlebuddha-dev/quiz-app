import { GoogleGenAI } from '@google/genai';

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

  const baseImageBytes = response1.generatedImages?.[0]?.image?.imageBytes;
  if (!baseImageBytes) return console.log('Base image generation failed');

  try {
    const response2 = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview', // Or nano-banana-pro-preview
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: baseImageBytes,
                mimeType: 'image/jpeg'
              }
            },
            {
              text: 'Keep the background exactly the same, but write the Japanese text "よぞらを かんさつしよう！" horizontally across the top.'
            }
          ]
        }
      ],
      config: {
        responseModalities: ['IMAGE'],
      }
    });

    const parts = response2.candidates?.[0]?.content?.parts;
    if (parts?.[0]?.inlineData) {
      console.log(`SUCCESS! Received edited image length: ${parts[0].inlineData.data?.length}`);
    } else {
      console.log('No image returned for edit.');
    }
  } catch (err: any) {
    console.log(`Error editing: ${err.message}`);
  }
}

main().catch(console.error);
