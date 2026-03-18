
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: '算数', nameJa: '算数', nameEn: 'Math', nameZh: '算术', minAge: 0, maxAge: 12 },
    { name: '国語', nameJa: '国語', nameEn: 'Language', nameZh: '语文', minAge: 0, maxAge: 100 },
    { name: '理科', nameJa: '理科', nameEn: 'Science', nameZh: '科学', minAge: 0, maxAge: 100 },
    { name: '社会', nameJa: '社会', nameEn: 'Social Studies', nameZh: '社会', minAge: 0, maxAge: 100 },
    { name: '英語', nameJa: '英語', nameEn: 'English', nameZh: '英语', minAge: 0, maxAge: 100 },
    { name: '論理パズル', nameJa: '論理パズル', nameEn: 'Logic Puzzle', nameZh: '逻辑谜题', minAge: 0, maxAge: 100 },
    { name: 'プログラミング', nameJa: 'プログラミング', nameEn: 'Programming', nameZh: '编程', minAge: 0, maxAge: 100 },
    { name: '数学', nameJa: '数学', nameEn: 'Advanced Math', nameZh: '数学', minAge: 13, maxAge: 100 },
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
