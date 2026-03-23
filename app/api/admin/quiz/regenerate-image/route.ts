/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { GoogleGenAI } from '@google/genai';
import { editNanobananaImage, resolveInlineImageData } from '@/lib/nanobanana';

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { quizId, locale, title, baseImageUrl } = (await req.json()) as { 
      quizId: string; 
      locale: string; 
      title: string; 
      baseImageUrl: string; 
    };

    if (!quizId || !locale || !title || !baseImageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const sourceImage = await resolveInlineImageData(baseImageUrl);

    console.log(`Regenerating ${locale} image for quiz ${quizId} from Japanese base...`);
    const langNames: Record<string, string> = { en: 'English', zh: 'Chinese', ja: 'Japanese' };
    const localizedPrompt = `Use the attached Japanese quiz image as the visual source.

Keep the composition, characters, objects, background, lighting, colors, and style as consistent as possible.
Remove the current text and replace it with only this ${langNames[locale] || locale} title text: "${title}".
Embed the new text naturally in the same design position and treatment as the original artwork.
Do not add subtitles, labels, UI, borders, or any extra text.
Return one finished localized image.`;

    const localizedImage = await editNanobananaImage(ai, sourceImage, localizedPrompt);
    if (!localizedImage?.data) {
      throw new Error('Image generation failed');
    }

    const newImageUrl = `data:${localizedImage.mimeType};base64,${localizedImage.data}`;

    return NextResponse.json({ imageUrl: newImageUrl });
  } catch (error: any) {
    console.error('Image Regeneration Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
