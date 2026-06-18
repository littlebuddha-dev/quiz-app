import { GoogleGenAI } from '@google/genai';

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

  const baseImageBytes = response1.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data;
  if (!baseImageBytes) return console.log('Base image generation failed');

  try {
    const response2 = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
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
