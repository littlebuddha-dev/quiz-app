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
    const { categoryId, targetAge, imageUrl, title, question, hint, answer, options, type } = body;

    if (!categoryId || !title || !question || !answer || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // クイズを手動作成
    const newQuiz = await prisma.quiz.create({
      data: {
        categoryId,
        targetAge: Number(targetAge) || 6,
        imageUrl: imageUrl || '',
        translations: {
          create: {
            locale: 'ja',
            title,
            question,
            hint: hint || '',
            answer,
            type,
            options: type === 'CHOICE' ? options : null,
          },
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
    const { id, categoryId, targetAge, imageUrl, title, question, hint, answer, options, type } = body;

    if (!id || !categoryId || !title || !question || !answer || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        categoryId,
        targetAge: Number(targetAge) || 6,
        imageUrl: imageUrl || '',
        translations: {
          upsert: {
            where: { quizId_locale: { quizId: id, locale: 'ja' } },
            create: {
              locale: 'ja',
              title,
              question,
              hint: hint || '',
              answer,
              type,
              options: type === 'CHOICE' ? options : null,
            },
            update: {
              title,
              question,
              hint: hint || '',
              answer,
              type,
              options: type === 'CHOICE' ? options : null,
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, quiz: updatedQuiz });
  } catch (error) {
    console.error('Admin Quiz Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
