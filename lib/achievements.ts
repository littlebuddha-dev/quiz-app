// Path: lib/achievements.ts
// Title: Achievement Badge System
// Purpose: クイズ履歴からバッジを判定するロジック。DBスキーマ変更不要。

export interface Achievement {
  id: string;
  icon: string;
  label: Record<'ja' | 'en' | 'zh', string>;
  description: Record<'ja' | 'en' | 'zh', string>;
  unlocked: boolean;
  progress?: number; // 0-100
}

export interface AchievementInput {
  totalSolved: number;
  totalCorrect: number;
  uniqueCategories: number;
  totalCategories: number;
  currentStreak: number;
  bestStreak: number;
  totalComments: number;
}

const BADGE_DEFS: Omit<Achievement, 'unlocked' | 'progress'>[] = [
  {
    id: 'first_quiz',
    icon: '🌱',
    label: { ja: 'はじめの一歩', en: 'First Step', zh: '第一步' },
    description: { ja: '最初のクイズに挑戦した', en: 'Solved your first quiz', zh: '完成了第一道题' },
  },
  {
    id: 'solver_10',
    icon: '⭐',
    label: { ja: '10問クリア', en: '10 Solved', zh: '10题达成' },
    description: { ja: '10問正解した', en: 'Got 10 correct answers', zh: '答对了10道题' },
  },
  {
    id: 'solver_50',
    icon: '🌟',
    label: { ja: '50問マスター', en: '50 Mastered', zh: '50题大师' },
    description: { ja: '50問正解した', en: 'Got 50 correct answers', zh: '答对了50道题' },
  },
  {
    id: 'solver_100',
    icon: '💫',
    label: { ja: '100問の星', en: 'Century Star', zh: '百题之星' },
    description: { ja: '100問正解した', en: 'Got 100 correct answers', zh: '答对了100道题' },
  },
  {
    id: 'explorer',
    icon: '🧭',
    label: { ja: '冒険家', en: 'Explorer', zh: '探险家' },
    description: { ja: '3つ以上のジャンルに挑戦した', en: 'Explored 3+ categories', zh: '挑战了3个以上分类' },
  },
  {
    id: 'all_rounder',
    icon: '🏆',
    label: { ja: 'オールラウンダー', en: 'All-Rounder', zh: '全能选手' },
    description: { ja: '全ジャンルに挑戦した', en: 'Tried every category', zh: '尝试了所有分类' },
  },
  {
    id: 'streak_3',
    icon: '🔥',
    label: { ja: '3日連続', en: '3-Day Streak', zh: '3天连续' },
    description: { ja: '3日連続で学習した', en: 'Studied 3 days in a row', zh: '连续学习3天' },
  },
  {
    id: 'streak_7',
    icon: '💪',
    label: { ja: '1週間の鬼', en: 'Week Warrior', zh: '一周勇士' },
    description: { ja: '7日連続で学習した', en: 'Studied 7 days in a row', zh: '连续学习7天' },
  },
  {
    id: 'streak_30',
    icon: '👑',
    label: { ja: '30日の王者', en: 'Monthly Champion', zh: '月度冠军' },
    description: { ja: '30日連続で学習した', en: '30-day study streak!', zh: '连续学习30天！' },
  },
  {
    id: 'commentator',
    icon: '💬',
    label: { ja: 'コメンテーター', en: 'Commentator', zh: '评论家' },
    description: { ja: 'コメントを5件以上投稿した', en: 'Posted 5+ comments', zh: '发布了5条以上评论' },
  },
  {
    id: 'accuracy_90',
    icon: '🎯',
    label: { ja: '精密射手', en: 'Sharp Shooter', zh: '精准射手' },
    description: { ja: '正答率90%以上（20問以上）', en: '90%+ accuracy (20+ quizzes)', zh: '正确率超过90%（20题以上）' },
  },
];

/**
 * ユーザーの学習データからバッジを判定する。
 */
export function calculateAchievements(input: AchievementInput): Achievement[] {
  const { totalSolved, totalCorrect, uniqueCategories, totalCategories, currentStreak, bestStreak, totalComments } = input;
  const accuracy = totalSolved > 0 ? (totalCorrect / totalSolved) * 100 : 0;
  const maxStreak = Math.max(currentStreak, bestStreak);

  const checks: Record<string, { unlocked: boolean; progress?: number }> = {
    first_quiz: { unlocked: totalSolved >= 1, progress: Math.min(totalSolved, 1) * 100 },
    solver_10: { unlocked: totalCorrect >= 10, progress: Math.min(totalCorrect / 10, 1) * 100 },
    solver_50: { unlocked: totalCorrect >= 50, progress: Math.min(totalCorrect / 50, 1) * 100 },
    solver_100: { unlocked: totalCorrect >= 100, progress: Math.min(totalCorrect / 100, 1) * 100 },
    explorer: { unlocked: uniqueCategories >= 3, progress: Math.min(uniqueCategories / 3, 1) * 100 },
    all_rounder: {
      unlocked: totalCategories > 0 && uniqueCategories >= totalCategories,
      progress: totalCategories > 0 ? Math.min(uniqueCategories / totalCategories, 1) * 100 : 0,
    },
    streak_3: { unlocked: maxStreak >= 3, progress: Math.min(maxStreak / 3, 1) * 100 },
    streak_7: { unlocked: maxStreak >= 7, progress: Math.min(maxStreak / 7, 1) * 100 },
    streak_30: { unlocked: maxStreak >= 30, progress: Math.min(maxStreak / 30, 1) * 100 },
    commentator: { unlocked: totalComments >= 5, progress: Math.min(totalComments / 5, 1) * 100 },
    accuracy_90: {
      unlocked: totalSolved >= 20 && accuracy >= 90,
      progress: totalSolved >= 20 ? Math.min(accuracy / 90, 1) * 100 : (totalSolved / 20) * 100,
    },
  };

  return BADGE_DEFS.map((def) => ({
    ...def,
    unlocked: checks[def.id]?.unlocked ?? false,
    progress: Math.round(checks[def.id]?.progress ?? 0),
  }));
}
