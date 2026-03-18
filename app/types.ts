// Path: app/types.ts
// Title: Shared Types
// Purpose: Interfaces for Quiz, User, and i18n support across the application.

export type Locale = 'ja' | 'en' | 'zh';

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
  }>;
  channel?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}
