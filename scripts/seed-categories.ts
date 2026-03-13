
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: '算数', minAge: 0, maxAge: 12 },
    { name: '国語', minAge: 0, maxAge: 100 },
    { name: '理科', minAge: 0, maxAge: 100 },
    { name: '社会', minAge: 0, maxAge: 100 },
    { name: '英語', minAge: 0, maxAge: 100 },
    { name: '論理パズル', minAge: 0, maxAge: 100 },
    { name: 'プログラミング', minAge: 0, maxAge: 100 },
    { name: '数学', minAge: 13, maxAge: 100 },
  ];

  for (const cat of categories) {
    // IDを名前と同じにすることで既存のQuizとの不整合を防ぐ (既存のQuiz.categoryIdは '算数' など)
    await prisma.category.upsert({
      where: { name: cat.name },
      update: cat,
      create: {
        id: cat.name, // ここを既存のcategoryIdに合わせる
        ...cat,
      },
    });
  }

  console.log('Categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
