// Path: app/types.ts
// Title: Shared Types
// Purpose: Interfaces for Quiz, User, and i18n support across the application.

export type Locale = 'ja' | 'en' | 'zh';
export type QuizVisualMode = 'generated' | 'image_only';


export interface WeakCategoryInsight {
  categoryId: string;
  label: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  focusQuizIds: string[];
}

export interface StudyRecommendations {
  todayLabel: string;
  dailyQuizIds: string[];
  reviewQuizIds: string[];
  missionQuizIds: string[];
  weakCategories: WeakCategoryInsight[];
  solvedTodayCount: number;
  dailyGoalTarget: number;
  currentStreak: number;
  bestStreak: number;
  hasStudiedToday: boolean;
}

export interface Quiz {
  id: string;
  category: string;
  targetAge: number;
  imageUrl: string;
  translations: Record<Locale, {
    title: string;
    question: string;
    hint: string;
    answer: string;
    explanation?: string | null;
    type: 'CHOICE' | 'TEXT';
    options?: string[];
    imageUrl?: string | null;
    visualMode?: QuizVisualMode | null;
  }>;
  channel?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
  viewCount?: number;
}
