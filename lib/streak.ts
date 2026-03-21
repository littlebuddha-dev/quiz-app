// Path: lib/streak.ts
// Title: Daily Streak Calculator
// Purpose: QuizHistoryのcreatedAtから連続学習日数を算出するユーティリティ

/**
 * 学習履歴の日付配列から連続学習ストリーク情報を算出する。
 * DBスキーマ変更不要 — QuizHistory.createdAt を利用。
 */
export interface StreakInfo {
  /** 現在の連続日数（今日学習済みなら今日を含む） */
  currentStreak: number;
  /** 今日学習したかどうか */
  hasStudiedToday: boolean;
  /** 過去最大の連続日数 */
  bestStreak: number;
}

/**
 * 日付を YYYY-MM-DD 形式に変換（JST 基準）
 */
function toDateLabel(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/**
 * QuizHistory の createdAt 配列からストリーク情報を算出する。
 * @param historyDates QuizHistory の createdAt の配列
 */
export function calculateStreak(historyDates: Date[]): StreakInfo {
  if (historyDates.length === 0) {
    return { currentStreak: 0, hasStudiedToday: false, bestStreak: 0 };
  }

  // 学習した日付のユニーク集合を作成（JST基準）
  const uniqueDays = new Set<string>();
  for (const date of historyDates) {
    uniqueDays.add(toDateLabel(date));
  }

  // 日付をソート（新しい順）
  const sortedDays = Array.from(uniqueDays).sort().reverse();

  const todayLabel = toDateLabel(new Date());
  const hasStudiedToday = uniqueDays.has(todayLabel);

  // 現在のストリークを計算
  let currentStreak = 0;
  const startDate = new Date();
  const startJst = new Date(startDate.getTime() + 9 * 60 * 60 * 1000);

  // 今日未学習なら昨日から数え始める
  if (!hasStudiedToday) {
    startJst.setDate(startJst.getDate() - 1);
  }

  const checkDate = new Date(startJst);
  for (let i = 0; i < 365; i++) {
    const label = checkDate.toISOString().slice(0, 10);
    if (uniqueDays.has(label)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 過去最大のストリークを計算
  let bestStreak = 0;
  let tempStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

  return { currentStreak, hasStudiedToday, bestStreak };
}
