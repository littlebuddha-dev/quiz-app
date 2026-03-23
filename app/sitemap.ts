import type { MetadataRoute } from 'next';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { getSiteUrl } from '@/lib/site-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);

  const [quizzes, channels] = await Promise.all([
    prisma.quiz.findMany({
      select: { id: true, updatedAt: true, createdAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    }),
    prisma.channel.findMany({
      select: { id: true, updatedAt: true, createdAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/ranking`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
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
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ];

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
    priority: 0.6,
  }));

  return [...staticRoutes, ...quizRoutes, ...channelRoutes];
}
