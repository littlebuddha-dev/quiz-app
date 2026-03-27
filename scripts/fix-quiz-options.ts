// scripts/fix-quiz-options.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const quizId = 'cmn8c035g0002o99y5mnyey0s';
  const locales = ['ja', 'en', 'zh'];

  for (const locale of locales) {
    const translation = await prisma.quizTranslation.findUnique({
      where: { quizId_locale: { quizId, locale } }
    });

    if (translation && translation.options) {
      const options = translation.options as string[];
      // After first fix, length is 4. If it was 8, it needs fixing.
      // If it's already 4 but doesn't have \, we might want to re-fix.
      process.stdout.write(`Checking ${locale} for ${quizId}...\n`);
      
      const fixedOptions = [
        "$\\\\sqrt{34}\\\\, \\\\text{N}$",
        "$7\\\\, \\\\text{N}$",
        "$8\\\\, \\\\text{N}$",
        "$4\\\\, \\\\text{N}$"
      ];
      // Note: In JS string, \\\\ becomes \\ which becomes \ in DB (if stored as raw string)
      // Actually, Prisma handles strings. If I want \$7\, \text{N}$, I should use "$7\\, \\text{N}$".
      
      await prisma.quizTranslation.update({
        where: { id: translation.id },
        data: { options: [
          "$\\sqrt{34}\\, \\text{N}$",
          "$7\\, \\text{N}$",
          "$8\\, \\text{N}$",
          "$4\\, \\text{N}$"
        ] }
      });
      process.stdout.write(`Updated ${locale}.\n`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
