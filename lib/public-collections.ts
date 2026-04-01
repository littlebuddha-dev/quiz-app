import type { Locale } from '@/app/types';

export type PublicCategoryRecord = {
  id: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  nameZh: string | null;
  minAge: number;
  maxAge: number | null;
  icon: string | null;
};

export const PUBLIC_AGE_GROUPS = [
  {
    key: 'preschool',
    min: 0,
    max: 6,
    label: { ja: '幼児', en: 'Preschool', zh: '幼儿' },
    rangeLabel: { ja: '0〜6歳', en: 'Ages 0-6', zh: '0-6岁' },
  },
  {
    key: 'elementary-lower',
    min: 6,
    max: 9,
    label: { ja: '小学校低学年', en: 'Elementary 1-3', zh: '小学低年级' },
    rangeLabel: { ja: '6〜9歳', en: 'Ages 6-9', zh: '6-9岁' },
  },
  {
    key: 'elementary-upper',
    min: 10,
    max: 12,
    label: { ja: '小学校高学年', en: 'Elementary 4-6', zh: '小学高年级' },
    rangeLabel: { ja: '10〜12歳', en: 'Ages 10-12', zh: '10-12岁' },
  },
  {
    key: 'middle-school',
    min: 13,
    max: 15,
    label: { ja: '中学生', en: 'Middle School', zh: '初中生' },
    rangeLabel: { ja: '13〜15歳', en: 'Ages 13-15', zh: '13-15岁' },
  },
  {
    key: 'high-school',
    min: 16,
    max: 18,
    label: { ja: '高校生', en: 'High School', zh: '高中生' },
    rangeLabel: { ja: '16〜18歳', en: 'Ages 16-18', zh: '16-18岁' },
  },
  {
    key: 'university',
    min: 18,
    max: 22,
    label: { ja: '大学生', en: 'University', zh: '大学生' },
    rangeLabel: { ja: '18〜22歳', en: 'Ages 18-22', zh: '18-22岁' },
  },
  {
    key: 'adult',
    min: 18,
    max: 100,
    label: { ja: '大人', en: 'Adults', zh: '成人' },
    rangeLabel: { ja: '18歳以上', en: '18 and older', zh: '18岁以上' },
  },
] as const;

export function pickPublicCategoryName(category: PublicCategoryRecord, locale: Locale) {
  if (locale === 'en') return category.nameEn || category.nameJa || category.name;
  if (locale === 'zh') return category.nameZh || category.nameJa || category.name;
  return category.nameJa || category.name;
}
