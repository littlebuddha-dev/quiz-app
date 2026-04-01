import type { MetadataRoute } from 'next';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { getSiteUrl } from '@/lib/site-config';
import { PUBLIC_AGE_GROUPS } from '@/lib/public-collections';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const fallbackNow = new Date();
  const fallbackStaticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: fallbackNow,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/ranking`,
      lastModified: fallbackNow,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${siteUrl}/courses`,
      lastModified: fallbackNow,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/new`,
      lastModified: fallbackNow,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${siteUrl}/popular`,
      lastModified: fallbackNow,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: fallbackNow,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: fallbackNow,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ];

  try {
    const { env } = await getCloudflareContext({ async: true });
    const prisma = createPrisma(env);

    const [quizzes, channels, categories] = await Promise.all([
      prisma.quiz.findMany({
        select: { id: true, updatedAt: true, createdAt: true, categoryId: true, targetAge: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      prisma.channel.findMany({
        select: { id: true, updatedAt: true, createdAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      }),
      prisma.category.findMany({
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    const latestQuizDate = quizzes[0]?.updatedAt || quizzes[0]?.createdAt || fallbackNow;
    const latestChannelDate = channels[0]?.updatedAt || channels[0]?.createdAt || latestQuizDate;
    const latestCategoryDate = categories[0]?.createdAt || latestQuizDate;

    const staticRoutes: MetadataRoute.Sitemap = [
      {
        url: `${siteUrl}/`,
        lastModified: latestQuizDate,
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${siteUrl}/ranking`,
        lastModified: latestQuizDate,
        changeFrequency: 'daily',
        priority: 0.85,
      },
      {
        url: `${siteUrl}/courses`,
        lastModified: latestCategoryDate,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${siteUrl}/new`,
        lastModified: latestQuizDate,
        changeFrequency: 'hourly',
        priority: 0.95,
      },
      {
        url: `${siteUrl}/popular`,
        lastModified: latestQuizDate,
        changeFrequency: 'daily',
        priority: 0.95,
      },
      {
        url: `${siteUrl}/privacy`,
        lastModified: fallbackNow,
        changeFrequency: 'monthly',
        priority: 0.2,
      },
      {
        url: `${siteUrl}/terms`,
        lastModified: fallbackNow,
        changeFrequency: 'monthly',
        priority: 0.2,
      },
      {
        url: `${siteUrl}/contact`,
        lastModified: fallbackNow,
        changeFrequency: 'monthly',
        priority: 0.2,
      },
    ];

    const latestQuizDateByCategory = new Map<string, Date>();
    const latestQuizDateByAgeGroup = new Map<string, Date>();

    for (const quiz of quizzes) {
      const quizDate = quiz.updatedAt || quiz.createdAt || fallbackNow;
      const previousCategoryDate = latestQuizDateByCategory.get(quiz.categoryId);
      if (!previousCategoryDate || quizDate > previousCategoryDate) {
        latestQuizDateByCategory.set(quiz.categoryId, quizDate);
      }

      for (const group of PUBLIC_AGE_GROUPS) {
        if (quiz.targetAge >= group.min && quiz.targetAge <= group.max) {
          const previousAgeDate = latestQuizDateByAgeGroup.get(group.key);
          if (!previousAgeDate || quizDate > previousAgeDate) {
            latestQuizDateByAgeGroup.set(group.key, quizDate);
          }
        }
      }
    }

    const quizRoutes: MetadataRoute.Sitemap = quizzes.map((quiz) => ({
      url: `${siteUrl}/watch/${quiz.id}`,
      lastModified: quiz.updatedAt || quiz.createdAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const channelRoutes: MetadataRoute.Sitemap = channels.map((channel) => ({
      url: `${siteUrl}/channel/${channel.id}`,
      lastModified: channel.updatedAt || channel.createdAt,
      changeFrequency: 'weekly',
      priority: 0.65,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${siteUrl}/category/${category.id}`,
      lastModified: latestQuizDateByCategory.get(category.id) || category.createdAt || latestCategoryDate,
      changeFrequency: 'weekly',
      priority: 0.88,
    }));

    const ageRoutes: MetadataRoute.Sitemap = PUBLIC_AGE_GROUPS.map((group) => ({
      url: `${siteUrl}/age/${group.key}`,
      lastModified: latestQuizDateByAgeGroup.get(group.key) || latestQuizDate,
      changeFrequency: 'weekly',
      priority: 0.84,
    }));

    return [...staticRoutes, ...quizRoutes, ...channelRoutes, ...categoryRoutes, ...ageRoutes];
  } catch (error) {
    console.error('Failed to build dynamic sitemap entries:', error);
    return fallbackStaticRoutes;
  }
}
