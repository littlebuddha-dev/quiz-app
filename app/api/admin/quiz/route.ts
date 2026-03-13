import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// 権限チェックのヘルパー
async function isAdminOrParent() {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  return user && (user.role === 'ADMIN' || user.role === 'PARENT');
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await isAdminOrParent();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { categoryId, targetAge, imageUrl, translations } = body;

    if (!categoryId || !translations || !translations.ja) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // クイズを手動作成 (複数言語対応)
    const newQuiz = await prisma.quiz.create({
      data: {
        categoryId,
        targetAge: Number(targetAge) || 6,
        imageUrl: imageUrl || '',
        translations: {
          create: Object.entries(translations).map(([locale, data]: [string, any]) => ({
            locale,
            title: data.title || '',
            question: data.question || '',
            hint: data.hint || '',
            answer: data.answer || '',
            type: data.type || 'TEXT',
            options: data.type === 'CHOICE' ? data.options : null,
            // @ts-ignore
            imageUrl: data.imageUrl || null,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, quiz: newQuiz });
  } catch (error) {
    console.error('Admin Quiz Create Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const isAuthorized = await isAdminOrParent();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, categoryId, targetAge, imageUrl, translations } = body;

    if (!id || !categoryId || !translations) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // クイズの基本情報を更新
    await prisma.quiz.update({
      where: { id },
      data: {
        categoryId,
        targetAge: Number(targetAge) || 6,
        imageUrl: imageUrl || '',
      },
    });

    // 各翻訳を順次upsert (SQLiteのロック問題を避けるため)
    for (const [locale, data] of Object.entries(translations) as [string, any][]) {
      await prisma.quizTranslation.upsert({
        where: { quizId_locale: { quizId: id, locale } },
        create: {
          quizId: id,
          locale,
          title: data.title || '',
          question: data.question || '',
          hint: data.hint || '',
          answer: data.answer || '',
          type: data.type || 'TEXT',
          options: data.type === 'CHOICE' ? data.options : null,
          // @ts-ignore
          imageUrl: data.imageUrl || null,
        },
        update: {
          title: data.title || '',
          question: data.question || '',
          hint: data.hint || '',
          answer: data.answer || '',
          type: data.type || 'TEXT',
          options: data.type === 'CHOICE' ? data.options : null,
          // @ts-ignore
          imageUrl: data.imageUrl || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin Quiz Update Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuthorized = await isAdminOrParent();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { target } = await req.json();
    if (!target) {
        return NextResponse.json({ error: 'Missing target ID' }, { status: 400 });
    }

    await prisma.quiz.delete({
      where: { id: target },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Quiz Delete Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
