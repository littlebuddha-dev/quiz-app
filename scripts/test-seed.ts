import { GoogleGenAI } from '@google/genai';

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompts = [
    'A wide illustration of a solar system. At the top, write exactly this Japanese text: "よぞらを かんさつしよう！"',
    'A wide illustration of a solar system. At the top, write exactly this English text: "Let\'s observe the night sky!"',
  ];

  for (const prompt of prompts) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: prompt,
        config: {
          responseModalities: ['IMAGE'],
        }
      });

      const imgBase64 = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data;
      if (imgBase64) {
        console.log(`SUCCESS! Generated image for prompt with length: ${imgBase64.length}`);
      }
    } catch (err: any) {
      console.log(`Error: ${err.message}`);
    }
  }
}

main().catch(console.error);
