import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';

export const runtime = 'nodejs';
export const revalidate = 3600;

function trimText(value: string | null | undefined, maxLength: number) {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const locale = request.nextUrl.searchParams.get('locale') || 'ja';
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          name: true,
          nameJa: true,
          nameEn: true,
          nameZh: true,
        },
      },
      translations: {
        select: {
          locale: true,
          title: true,
          question: true,
        },
      },
    },
  });

  if (!quiz) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fff8ec 0%, #f3f7ff 100%)',
            color: '#1f2a44',
            fontSize: 56,
            fontWeight: 800,
          }}
        >
          Cue Quiz
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const translation =
    quiz.translations.find((item) => item.locale === locale) ||
    quiz.translations.find((item) => item.locale === 'ja') ||
    quiz.translations[0];

  const categoryLabel =
    (locale === 'en'
      ? quiz.category?.nameEn
      : locale === 'zh'
        ? quiz.category?.nameZh
        : quiz.category?.nameJa) ||
    quiz.category?.name ||
    'Cue';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #fff8ec 0%, #eef5ff 45%, #f9fbff 100%)',
          padding: '56px 64px',
          color: '#1f2a44',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            borderRadius: 9999,
            background: '#ffffffcc',
            color: '#d97706',
            padding: '12px 22px',
            fontSize: 28,
            fontWeight: 700,
            border: '2px solid #fde7b0',
          }}
        >
          {categoryLabel}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>
            {trimText(translation?.title || 'Cue Quiz', 56)}
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.35,
              color: '#43506a',
              maxWidth: '92%',
            }}
          >
            {trimText(translation?.question, 120)}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#61708f',
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          <div>cue.college</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#f59e0b',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: '#f59e0b',
              }}
            />
            Learn with Fun
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
