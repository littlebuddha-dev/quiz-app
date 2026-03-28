import { PrismaClient } from '@prisma/client';
import { access } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, 'public');

function isUploadPath(value) {
  return typeof value === 'string' && value.startsWith('/uploads/');
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

async function fileExists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function toAbsoluteUploadPath(assetPath) {
  return path.join(publicRoot, assetPath.replace(/^\/+/, ''));
}

function summarize(records) {
  return records.reduce(
    (acc, record) => {
      const value = record.imageUrl;
      if (!value) {
        acc.empty += 1;
      } else if (isDataUrl(value)) {
        acc.dataUrl += 1;
      } else if (isUploadPath(value)) {
        acc.uploadPath += 1;
      } else {
        acc.external += 1;
      }
      return acc;
    },
    { empty: 0, dataUrl: 0, uploadPath: 0, external: 0 }
  );
}

async function main() {
  const [quizzes, translations, channels] = await Promise.all([
    prisma.quiz.findMany({
      select: { id: true, imageUrl: true },
    }),
    prisma.quizTranslation.findMany({
      select: { id: true, quizId: true, locale: true, imageUrl: true },
    }),
    prisma.channel.findMany({
      select: { id: true, avatarUrl: true },
    }),
  ]);

  const missingFiles = [];

  for (const quiz of quizzes) {
    if (!isUploadPath(quiz.imageUrl)) continue;
    const absolutePath = toAbsoluteUploadPath(quiz.imageUrl);
    if (!(await fileExists(absolutePath))) {
      missingFiles.push({ type: 'quiz', id: quiz.id, imageUrl: quiz.imageUrl });
    }
  }

  for (const translation of translations) {
    if (!isUploadPath(translation.imageUrl)) continue;
    const absolutePath = toAbsoluteUploadPath(translation.imageUrl);
    if (!(await fileExists(absolutePath))) {
      missingFiles.push({
        type: 'translation',
        id: translation.id,
        quizId: translation.quizId,
        locale: translation.locale,
        imageUrl: translation.imageUrl,
      });
    }
  }

  for (const channel of channels) {
    if (!isUploadPath(channel.avatarUrl)) continue;
    const absolutePath = toAbsoluteUploadPath(channel.avatarUrl);
    if (!(await fileExists(absolutePath))) {
      missingFiles.push({ type: 'channel', id: channel.id, imageUrl: channel.avatarUrl });
    }
  }

  const channelRecords = channels.map((channel) => ({
    id: channel.id,
    imageUrl: channel.avatarUrl,
  }));

  const report = {
    quizzes: summarize(quizzes),
    translations: summarize(translations),
    channels: summarize(channelRecords),
    missingFilesCount: missingFiles.length,
    missingFiles: missingFiles.slice(0, 20),
  };

  console.log(JSON.stringify(report, null, 2));

  if (missingFiles.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
