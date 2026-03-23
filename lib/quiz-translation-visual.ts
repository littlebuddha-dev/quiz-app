export type QuizVisualMode = 'generated' | 'overlay';

export type QuizVisualOverlayItem = {
  id: string;
  kind: 'title';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  align?: 'left' | 'center';
  maxLines?: number;
};

export type QuizVisualData = {
  version: 1;
  safeZone: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  overlays: QuizVisualOverlayItem[];
};

type TableInfoRow = {
  name: string;
};

type QuizTranslationVisualPrisma = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
};

let ensured = false;
let ensurePromise: Promise<void> | null = null;

function isDuplicateColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('duplicate column name');
}

export async function ensureQuizTranslationVisualColumns(prisma: QuizTranslationVisualPrisma) {
  if (ensured) return;
  if (ensurePromise) {
    await ensurePromise;
    return;
  }

  ensurePromise = (async () => {
    // データベースプロバイダーの特定
    const provider = (prisma as any)._activeProvider || 'sqlite';

    let columnNames = new Set<string>();

    if (provider === 'sqlite') {
      const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(
        'PRAGMA table_info("QuizTranslation")'
      );
      columnNames = new Set(columns.map((column) => column.name));
    } else if (provider === 'postgresql') {
      const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'QuizTranslation'"
      );
      columnNames = new Set(columns.map((column) => column.column_name));
    }

    // カラム追加の実行
    const addColumn = async (name: string, type: string) => {
      if (!columnNames.has(name)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "QuizTranslation" ADD COLUMN "${name}" ${type}`);
      }
    };

    try {
      await addColumn('visualMode', "TEXT DEFAULT 'generated'");
      await addColumn('visualData', 'TEXT');
      ensured = true;
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error;
      ensured = true; // すでにある場合はOK
    }
  })();

  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}


export function parseQuizVisualData(value: unknown): QuizVisualData | null {
  if (!value) return null;

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray((parsed as QuizVisualData).overlays)) return null;
    return parsed as QuizVisualData;
  } catch {
    return null;
  }
}

export function serializeQuizVisualData(value: QuizVisualData | string | null | undefined) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function buildDefaultOverlayVisualData(title: string): QuizVisualData {
  return {
    version: 1,
    safeZone: {
      x: 0.06,
      y: 0.06,
      w: 0.28,
      h: 0.12,
    },
    overlays: [
      {
        id: 'title',
        kind: 'title',
        x: 0.06,
        y: 0.06,
        w: 0.28,
        h: 0.12,
        text: title,
        align: 'left',
        maxLines: 2,
      },
    ],
  };
}
