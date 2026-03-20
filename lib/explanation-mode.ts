import type { Locale } from '@/app/types';

function toSingleLine(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function pickLeadSummary(explanation: string) {
  const normalized = toSingleLine(explanation);
  if (!normalized) return '';

  const sentences = normalized
    .split(/(?<=[。！？!?\.])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return normalized.slice(0, 120).trim();
  }

  const summary = sentences.slice(0, 2).join(' ').trim();
  return summary.length > 140 ? `${summary.slice(0, 140).trim()}…` : summary;
}

export function buildGentleExplanation(locale: Locale, answer: string, explanation: string | null | undefined) {
  const normalizedAnswer = toSingleLine(answer);
  const normalizedExplanation = explanation ? explanation.trim() : '';

  if (!normalizedExplanation) {
    return '';
  }

  const summary = pickLeadSummary(normalizedExplanation);

  if (!summary) {
    return normalizedExplanation;
  }

  if (normalizedAnswer && summary.includes(normalizedAnswer)) {
    return summary;
  }

  if (locale === 'en') {
    return `Key idea: ${normalizedAnswer}. ${summary}`;
  }

  if (locale === 'zh') {
    return `关键点是“${normalizedAnswer}”。${summary}`;
  }

  return `ポイントは「${normalizedAnswer}」です。${summary}`;
}
