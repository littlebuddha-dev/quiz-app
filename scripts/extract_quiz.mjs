import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';

async function main() {
  const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/83f689c33607da907c0249ee03d9b54a4590f55829507af71e6c0f1273bc39c9.sqlite';
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const row = await db.get(
    "SELECT * FROM QuizTranslation WHERE quizId = 'cmn17udez0002zz0xkboj200z' AND locale = 'ja'"
  );

  if (row) {
    fs.writeFileSync('quiz_data.json', JSON.stringify(row, null, 2));
    console.log('Quiz data saved to quiz_data.json');
  } else {
    console.log('Quiz not found');
  }

  await db.close();
}

main().catch(console.error);
