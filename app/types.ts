// Path: app/types.ts
// Title: Shared Types
// Purpose: Interfaces for Quiz, User, and i18n support across the application.

export type Locale = 'ja' | 'en' | 'zh';

export interface Quiz {
  id: string;
  title: string;
  category: string;
  targetAge: number;
  question: string;
  hint: string;
  answer: string;
  imageUrl: string;
  type: 'CHOICE' | 'TEXT';
  options?: string[];
}